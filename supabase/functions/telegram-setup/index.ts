// Setup webhook + bot avatar + commands.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const secret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/telegram-webhook`;

  const out: any = {};

  // Webhook
  const wh = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, secret_token: secret, allowed_updates: ["callback_query", "message"] }),
  });
  out.webhook = await wh.json();

  // Commands menu
  const cmds = await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      commands: [
        { command: "help", description: "Ver todos los comandos" },
        { command: "pendientes", description: "Pedidos en revisión" },
        { command: "ultimos", description: "Últimos 10 pedidos" },
        { command: "buscar", description: "Buscar pedido por ID" },
        { command: "aprobar", description: "Aprobar y generar key" },
        { command: "rechazar", description: "Rechazar pedido" },
        { command: "reenviarkey", description: "Reenviar key asignada" },
        { command: "stats", description: "Estadísticas globales" },
        { command: "keys", description: "Keys activas disponibles" },
        { command: "logs", description: "Logs de un pedido" },
        { command: "cancelar", description: "Cancelar pedido" },
      ],
    }),
  });
  out.commands = await cmds.json();

  // Set bot avatar from public url provided in body { avatar_url }
  try {
    const body = await req.json().catch(() => ({}));
    const avatarUrl = body?.avatar_url;
    if (avatarUrl) {
      const img = await fetch(avatarUrl);
      const blob = await img.blob();
      const fd = new FormData();
      fd.append("photo", blob, "avatar.jpg");
      const ph = await fetch(`https://api.telegram.org/bot${token}/setUserProfilePhotos?` + new URLSearchParams({}), {
        method: "POST", body: fd,
      });
      out.avatar = await ph.json();
    }
  } catch (e) { out.avatar_error = String(e); }

  return new Response(JSON.stringify({ webhook_url: url, ...out }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
