import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-telegram-bot-api-secret-token",
};

async function tg(method: string, body: any) {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  return fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function answerCallback(id: string, text: string) {
  return tg("answerCallbackQuery", { callback_query_id: id, text, show_alert: false });
}

async function editCaption(chat_id: number, message_id: number, caption: string) {
  return tg("editMessageCaption", { chat_id, message_id, caption, parse_mode: "HTML" });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const expected = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
  const got = req.headers.get("x-telegram-bot-api-secret-token");
  if (!expected || got !== expected) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const update = await req.json();
    const cb = update.callback_query;
    if (!cb) return new Response("ok", { headers: corsHeaders });

    const data: string = cb.data || "";
    const [action, paymentId] = data.split(":");
    const chat_id = cb.message?.chat?.id;
    const message_id = cb.message?.message_id;

    const { data: order } = await supabase
      .from("payment_orders").select("*").eq("payment_id", paymentId).single();

    if (!order) {
      await answerCallback(cb.id, "Pedido no encontrado");
      return new Response("ok", { headers: corsHeaders });
    }

    if (action === "approve") {
      if (order.status === "APPROVED") {
        await answerCallback(cb.id, "Ya aprobado");
        return new Response("ok", { headers: corsHeaders });
      }
      // Find available key
      const { data: key } = await supabase
        .from("proxy_keys")
        .select("*")
        .eq("status", "Activa")
        .eq("duration", order.duration)
        .limit(1)
        .maybeSingle();

      if (!key) {
        await answerCallback(cb.id, `Sin keys disponibles (${order.duration})`);
        return new Response("ok", { headers: corsHeaders });
      }

      // Mark key as reserved (status stays Activa until user logs in; we just assign)
      await supabase.from("payment_orders").update({
        status: "APPROVED",
        assigned_key: key.key,
      }).eq("id", order.id);

      // Remove this key from inventory pool by marking it 'Activa' but linking via assigned_key
      // (we leave key as 'Activa' so the user can still activate it via login flow)

      await editCaption(chat_id, message_id,
        `<b>✅ APROBADO</b>\nID: <code>${order.payment_id}</code>\nUsuario: ${order.alias}\nKey: <code>${key.key}</code>`);
      await answerCallback(cb.id, "Aprobado");
    } else if (action === "reject") {
      await supabase.from("payment_orders").update({
        status: "REJECTED",
        rejection_reason: "Rechazado por el administrador",
      }).eq("id", order.id);
      await editCaption(chat_id, message_id,
        `<b>❌ RECHAZADO</b>\nID: <code>${order.payment_id}</code>\nUsuario: ${order.alias}`);
      await answerCallback(cb.id, "Rechazado");
    } else {
      await answerCallback(cb.id, "Acción desconocida");
    }

    return new Response("ok", { headers: corsHeaders });
  } catch (e) {
    console.error("webhook error", e);
    return new Response("ok", { headers: corsHeaders });
  }
});
