const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = n => "₹" + Number(n).toLocaleString("en-IN");
const nice = s => String(s ?? "").replace(/_/g, " ");

// Check login + role. Wrong role -> redirect to the right panel.
async function requireRole(role) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { location.href = "index.html"; return null; }
  const { data: p } = await sb.from("profiles").select("*").eq("id", session.user.id).single();
  if (!p) { await sb.auth.signOut(); location.href = "index.html"; return null; }
  if (p.role !== role) { location.href = p.role === "admin" ? "admin.html" : "user.html"; return null; }
  $("#who").textContent = (p.full_name || p.email) + " (" + p.role + ")";
  $("#logout").onclick = async () => { await sb.auth.signOut(); location.href = "index.html"; };
  return p;
}
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 4000);
}
// Tabs: buttons have data-t="<section id>"
function setupTabs() {
  const btns = [...document.querySelectorAll("[data-t]")];
  btns.forEach(b => b.onclick = () => btns.forEach(x => {
    x.classList.toggle("active", x === b);
    $("#" + x.dataset.t).classList.toggle("hidden", x !== b);
  }));
}
// Show / Hide password button
function pwToggle(inputSel, btnSel) {
  $(btnSel).onclick = () => {
    const hidden = $(inputSel).type === "password";
    $(inputSel).type = hidden ? "text" : "password";
    $(btnSel).textContent = hidden ? "Hide" : "Show";
  };
}
