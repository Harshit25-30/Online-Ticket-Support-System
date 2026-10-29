// Deploy:  supabase functions deploy chat
// Secret:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const { messages = [], tickets = [] } = await req.json();
  const system = `You are the support assistant for a vehicle ticket booking website.
Users buy tickets in the "Buy ticket" tab and get a unique Ticket ID like TKT-XXXXXXXX. They can see tickets in "My tickets".
For cancellations, refunds or any problem they use the "Support" tab (pick ticket, describe issue); human admins reply there. Admins cannot buy tickets.
Statuses: confirmed, cancelled, refunded, resolved. Be brief and friendly. Never invent ticket details; use only this data about the user's tickets:
${JSON.stringify(tickets)}`;
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: "claude-haiku-5-5", max_tokens: 400, system, messages: messages.slice(-10) }),
  });
  const j = await r.json();
  return new Response(JSON.stringify({ reply: j.content?.[0]?.text ?? "Sorry, I couldn't answer that." }),
    { headers: { ...cors, "content-type": "application/json" } });
});
