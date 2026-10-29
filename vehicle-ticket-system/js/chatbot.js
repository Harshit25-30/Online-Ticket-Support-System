// Chatbot: ticket / request lookups are answered locally from the user's own data.
// Other questions go to the Supabase Edge Function "chat" (Claude); if it isn't deployed, simple FAQ answers are used.
const history = [];
const FAQ = [
  [/buy|purchase|book/i, "Open the 'Buy ticket' tab, fill in vehicle, route, date and passengers, then press Pay & buy. You'll get a unique Ticket ID (TKT-XXXXXXXX)."],
  [/cancel|refund|problem|issue|support|help/i, "Open the 'Support' tab, pick your ticket, describe the problem and submit. Our team will reply there."],
  [/id|code/i, "Your Ticket ID is shown right after purchase and in the 'My tickets' tab. Quote it to support."],
];
function say(text, who) { const d = document.createElement("div"); d.className = "m " + who; d.textContent = text; $("#msgs").append(d); $("#msgs").scrollTop = 1e9; return d; }
function fmt(t) { return `${t.ticket_code}: ${t.vehicle_type} ${t.vehicle_number}, ${t.route_from} → ${t.route_to} on ${t.travel_date}, ${t.passengers} pax, ${money(t.price)} — status: ${t.status}${t.support_note ? "\nSupport note: " + t.support_note : ""}`; }
function fmtReq(r) { return `${r.tickets?.ticket_code} · ${nice(r.issue_type)} — ${nice(r.status)}\nReply: ${r.admin_reply || "waiting for support"}`; }

$("#chat-btn").onclick = () => {
  $("#chat").classList.toggle("open");
  if (!$("#msgs").children.length) say("Hi! Send a Ticket ID (like TKT-1A2B3C4D) to see its status, ask 'my requests' for support updates, or ask me anything about booking.", "bot");
};
$("#cf").onsubmit = async e => {
  e.preventDefault();
  const text = $("#ci").value.trim(); if (!text) return; $("#ci").value = "";
  say(text, "me");
  const m = text.match(/TKT-[A-Z0-9]{8}/i);
  if (m) { const t = myTickets.find(x => x.ticket_code === m[0].toUpperCase());
    return say(t ? fmt(t) : "I couldn't find that ticket on your account.", "bot"); }
  if (/my request|request status|support status/i.test(text))
    return say(myRequests.length ? myRequests.slice(0, 5).map(fmtReq).join("\n\n") : "You have no support requests yet.", "bot");
  if (/my tickets|list/i.test(text) && myTickets.length) return say(myTickets.slice(0, 5).map(fmt).join("\n\n"), "bot");
  history.push({ role: "user", content: text });
  const wait = say("…", "bot");
  try {
    const { data, error } = await sb.functions.invoke("chat", { body: {
      messages: history.slice(-10),
      tickets: myTickets.slice(0, 10).map(({ ticket_code, vehicle_type, route_from, route_to, travel_date, status }) => ({ ticket_code, vehicle_type, route_from, route_to, travel_date, status })) } });
    if (error || !data?.reply) throw error || new Error("empty");
    wait.textContent = data.reply; history.push({ role: "assistant", content: data.reply });
  } catch {
    const f = FAQ.find(([re]) => re.test(text));
    wait.textContent = f ? f[1] : "I can't reach the AI assistant right now. Please use the Support tab with your Ticket ID.";
  }
};
