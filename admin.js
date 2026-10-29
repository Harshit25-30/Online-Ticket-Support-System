let tickets = [], reqs = [], cur = null, rcur = null;
setupTabs();
(async () => { if (!(await requireRole("admin"))) return; loadTickets(); loadReqs(); })();

// ---------- tickets ----------
async function loadTickets() {
  const { data, error } = await sb.from("tickets").select("*, profiles(full_name,email)").order("created_at", { ascending: false });
  if (error) return toast(error.message);
  tickets = data; renderTickets();
}
function renderTickets() {
  const q = $("#q").value.trim().toLowerCase(), st = $("#st").value;
  const list = tickets.filter(t => (!st || t.status === st) &&
    (!q || [t.ticket_code, t.vehicle_number, t.profiles?.email].some(v => (v || "").toLowerCase().includes(q))));
  $("#s1").textContent = tickets.length;
  $("#s2").textContent = tickets.filter(t => t.status === "confirmed").length;
  $("#s3").textContent = tickets.filter(t => ["cancelled", "refunded"].includes(t.status)).length;
  $("#s4").textContent = tickets.filter(t => t.status === "resolved").length;
  $("#rows").innerHTML = list.map(t => `<tr class="click" data-id="${esc(t.id)}"><td class="code">${esc(t.ticket_code)}</td>
    <td>${esc(t.profiles?.full_name || "")}<br><small>${esc(t.profiles?.email || "")}</small></td>
    <td>${esc(t.vehicle_type)} · ${esc(t.vehicle_number)}</td><td>${esc(t.route_from)} → ${esc(t.route_to)}</td>
    <td>${esc(t.travel_date)}</td><td>${money(t.price)}</td><td><span class="badge ${esc(t.status)}">${esc(t.status)}</span></td></tr>`).join("")
    || `<tr><td colspan="7"><small>No tickets found.</small></td></tr>`;
  document.querySelectorAll("#rows tr.click").forEach(r => r.onclick = () => openTicket(r.dataset.id));
}
$("#q").oninput = $("#st").onchange = renderTickets;

function openTicket(id) {
  cur = tickets.find(t => t.id === id);
  $("#d-code").textContent = cur.ticket_code;
  $("#d-info small").textContent = `${cur.profiles?.email || ""} · ${cur.passengers} passenger(s) · booked ${new Date(cur.created_at).toLocaleString()}`;
  $("#d-st").value = cur.status; $("#d-note").value = cur.support_note || "";
  $("#m").classList.add("open");
}
$("#d-close").onclick = () => $("#m").classList.remove("open");
$("#d-save").onclick = async () => {
  const { error } = await sb.rpc("admin_update_ticket", { p_id: cur.id, p_status: $("#d-st").value, p_note: $("#d-note").value });
  if (error) return toast(error.message);
  toast("Saved"); $("#m").classList.remove("open"); loadTickets();
};

// ---------- support requests ----------
async function loadReqs() {
  const { data, error } = await sb.from("support_requests")
    .select("*, tickets(ticket_code), profiles(full_name,email)").order("created_at", { ascending: false });
  if (error) return toast(error.message);
  reqs = data; renderReqs();
}
function renderReqs() {
  const q = $("#rq-q").value.trim().toLowerCase(), st = $("#rq-st").value;
  $("#rq-n").textContent = reqs.filter(r => r.status === "open").length ? `(${reqs.filter(r => r.status === "open").length} open)` : "";
  const list = reqs.filter(r => (!st || r.status === st) &&
    (!q || [r.tickets?.ticket_code, r.profiles?.email].some(v => (v || "").toLowerCase().includes(q))));
  $("#rq-rows").innerHTML = list.map(r => `<tr class="click" data-id="${esc(r.id)}"><td class="code">${esc(r.tickets?.ticket_code)}</td>
    <td>${esc(r.profiles?.full_name || "")}<br><small>${esc(r.profiles?.email || "")}</small></td>
    <td>${esc(nice(r.issue_type))}<br><small>${esc(r.message)}</small></td>
    <td><span class="badge ${esc(r.status)}">${esc(nice(r.status))}</span></td><td>${new Date(r.created_at).toLocaleDateString()}</td></tr>`).join("")
    || `<tr><td colspan="5"><small>No support requests.</small></td></tr>`;
  document.querySelectorAll("#rq-rows tr.click").forEach(r => r.onclick = () => openReq(r.dataset.id));
}
$("#rq-q").oninput = $("#rq-st").onchange = renderReqs;

function openReq(id) {
  rcur = reqs.find(x => x.id === id);
  $("#r-code").textContent = rcur.tickets?.ticket_code;
  $("#r-info small").textContent = `${rcur.profiles?.email || ""} · ${nice(rcur.issue_type)}`;
  $("#r-msg").textContent = rcur.message; $("#r-st").value = rcur.status; $("#r-reply").value = rcur.admin_reply || "";
  $("#rm").classList.add("open");
}
$("#r-close").onclick = () => $("#rm").classList.remove("open");
$("#r-save").onclick = async () => {
  const { error } = await sb.rpc("admin_update_request", { p_id: rcur.id, p_status: $("#r-st").value, p_reply: $("#r-reply").value });
  if (error) return toast(error.message);
  toast("Reply saved"); $("#rm").classList.remove("open"); loadReqs();
};
