// Helper to register the Telegram webhook. Call once.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const secret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/telegram-webhook`;
  const r = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, secret_token: secret, allowed_updates: ["callback_query"] }),
  });
  const j = await r.json();
  return new Response(JSON.stringify({ webhook_url: url, telegram: j }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
