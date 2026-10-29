let fares = {}, myTickets = [], myRequests = [];
setupTabs();
(async () => {
  if (!(await requireRole("user"))) return;
  const { data, error } = await sb.from("fares").select("*");
  if (error) return toast(error.message);
  data.forEach(f => fares[f.vehicle_type] = +f.price_per_passenger);
  $("#vt").innerHTML = data.map(f => `<option>${esc(f.vehicle_type)}</option>`).join("");
  $("#date").min = new Date().toISOString().slice(0, 10);
  calc(); loadTickets(); loadRequests();
})();

const calc = () => $("#total").textContent = money((fares[$("#vt").value] || 0) * (+$("#pax").value || 0));
$("#vt").onchange = $("#pax").oninput = calc;

// ---- buy ticket
$("#f").onsubmit = async e => {
  e.preventDefault(); $("#err").textContent = "";
  const { data, error } = await sb.rpc("buy_ticket", {
    p_vehicle_type: $("#vt").value, p_vehicle_number: $("#vn").value,
    p_from: $("#from").value, p_to: $("#to").value,
    p_date: $("#date").value, p_pax: +$("#pax").value
  });
  if (error) { $("#err").textContent = error.message; return; }
  $("#tc").textContent = data.ticket_code; $("#ok").classList.add("open");
  e.target.reset(); $("#pax").value = 1; calc(); loadTickets();
};
$("#close").onclick = () => $("#ok").classList.remove("open");
$("#copy").onclick = () => { navigator.clipboard?.writeText($("#tc").textContent); toast("Copied"); };

// ---- my tickets
async function loadTickets() {
  const { data, error } = await sb.from("tickets").select("*").order("created_at", { ascending: false });
  if (error) return toast(error.message);
  myTickets = data;
  $("#empty").classList.toggle("hidden", myTickets.length > 0);
  $("#rows").innerHTML = myTickets.map(t => `<tr><td class="code">${esc(t.ticket_code)}</td>
    <td>${esc(t.vehicle_type)} · ${esc(t.vehicle_number)}</td><td>${esc(t.route_from)} → ${esc(t.route_to)}</td>
    <td>${esc(t.travel_date)}</td><td>${money(t.price)}</td><td><span class="badge ${esc(t.status)}">${esc(t.status)}</span></td></tr>`).join("");
  $("#s-ticket").innerHTML = myTickets.map(t => `<option value="${esc(t.id)}">${esc(t.ticket_code)} · ${esc(t.route_from)} → ${esc(t.route_to)}</option>`).join("");
}

// ---- support requests
async function loadRequests() {
  const { data, error } = await sb.from("support_requests").select("*, tickets(ticket_code)").order("created_at", { ascending: false });
  if (error) return toast(error.message);
  myRequests = data;
  $("#s-empty").classList.toggle("hidden", data.length > 0);
  $("#s-rows").innerHTML = data.map(r => `<tr><td class="code">${esc(r.tickets?.ticket_code)}</td>
    <td>${esc(nice(r.issue_type))}<br><small>${esc(r.message)}</small></td>
    <td><span class="badge ${esc(r.status)}">${esc(nice(r.status))}</span></td>
    <td>${esc(r.admin_reply || "Waiting for support…")}</td></tr>`).join("");
}
$("#sf").onsubmit = async e => {
  e.preventDefault(); $("#s-err").textContent = "";
  if (!$("#s-ticket").value) { $("#s-err").textContent = "Buy a ticket first."; return; }
  const { error } = await sb.rpc("raise_request", {
    p_ticket: $("#s-ticket").value, p_type: $("#s-type").value, p_msg: $("#s-msg").value });
  if (error) { $("#s-err").textContent = error.message; return; }
  e.target.reset(); toast("Request sent to support"); loadRequests();
};
