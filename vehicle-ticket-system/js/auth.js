let signup = false;
pwToggle("#pw", "#eye"); pwToggle("#npw", "#eye2");

function setMode(s) {
  signup = s;
  $("#nameRow").classList.toggle("hidden", !s);
  $("#secRow").classList.toggle("hidden", !s);
  $("#forgotRow").classList.toggle("hidden", s);
  $("#rp").classList.add("hidden");
  $("#go").textContent = s ? "Create account" : "Login";
  $("#tl").classList.toggle("active", !s); $("#ts").classList.toggle("active", s);
  $("#err").textContent = "";
}
$("#tl").onclick = () => setMode(false);
$("#ts").onclick = () => setMode(true);

async function route() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;
  const { data: p } = await sb.from("profiles").select("role").eq("id", session.user.id).single();
  location.href = p?.role === "admin" ? "admin.html" : "user.html";
}

$("#f").onsubmit = async e => {
  e.preventDefault(); $("#err").textContent = ""; $("#err").style.color = "";
  const email = $("#email").value.trim(), password = $("#pw").value;
  if (signup && !$("#sa").value.trim()) { $("#err").textContent = "Please enter a security answer."; return; }
  const r = signup
    ? await sb.auth.signUp({ email, password, options: { data: { full_name: $("#name").value.trim() } } })
    : await sb.auth.signInWithPassword({ email, password });
  if (r.error) { $("#err").textContent = r.error.message; return; }
  if (signup) {
    if (!r.data.session) { $("#err").textContent = "Account created. Please log in."; return; }
    const q = await sb.rpc("set_security_qa", { q: $("#sq").value, a: $("#sa").value });
    if (q.error) { $("#err").textContent = "Account created, but security question was not saved: " + q.error.message; return; }
  }
  route();
};

// Forgot password: security question, no email and no link
$("#forgot").onclick = async e => {
  e.preventDefault(); $("#err").textContent = "";
  const email = $("#email").value.trim();
  if (!email) { $("#err").textContent = "Type your email above first, then click Forgot password."; return; }
  const { data, error } = await sb.rpc("get_security_question", { p_email: email });
  if (error) { $("#err").textContent = error.message; return; }
  if (!data) { $("#err").textContent = "No security question found for this email."; return; }
  $("#qtext").textContent = data; $("#rerr").textContent = ""; $("#rp").classList.remove("hidden");
};
$("#rbtn").onclick = async () => {
  $("#rerr").textContent = "";
  const { data, error } = await sb.rpc("reset_password_with_answer", { p_email: $("#email").value.trim(), a: $("#ra").value, new_pw: $("#npw").value });
  if (error) { $("#rerr").textContent = error.message; return; }
  if (!data) { $("#rerr").textContent = "Wrong answer, or new password is shorter than 6 characters."; return; }
  $("#rp").classList.add("hidden"); $("#pw").value = ""; $("#ra").value = ""; $("#npw").value = "";
  $("#err").style.color = "var(--ok)"; $("#err").textContent = "Password updated. Log in with your new password.";
};
route();
