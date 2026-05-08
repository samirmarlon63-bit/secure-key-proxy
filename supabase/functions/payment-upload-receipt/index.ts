import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function log(supabase: any, payment_id: string, event: string, detail: any) {
  try { await supabase.from("payment_logs").insert({ payment_id, event, detail }); } catch {}
}

async function looksLikeReceipt(imageBase64: string, mime: string): Promise<{ ok: boolean; reason: string; raw?: any }> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return { ok: true, reason: "AI no configurada (auto-aprobado a revisión)" };

  // Videos: skip AI, send straight to admin
  if (mime.startsWith("video/")) return { ok: true, reason: "video - revisión manual" };

  const body = {
    model: "google/gemini-2.5-flash",
    messages: [{
      role: "user",
      content: [
        { type: "text", text: "¿Esta imagen parece un comprobante de pago (PayPal, banco, transferencia, recarga de diamantes, app de pago, etc.)? Responde solo con la herramienta." },
        { type: "image_url", image_url: { url: `data:${mime};base64,${imageBase64}` } },
      ],
    }],
    tools: [{
      type: "function",
      function: {
        name: "check",
        parameters: {
          type: "object",
          properties: {
            is_receipt: { type: "boolean", description: "true si parece un comprobante de pago de cualquier tipo" },
            reason: { type: "string" },
          },
          required: ["is_receipt"],
        },
      },
    }],
    tool_choice: { type: "function", function: { name: "check" } },
  };

  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) return { ok: true, reason: `IA error ${r.status} - revisión manual` };
    const j = await r.json();
    const args = j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return { ok: true, reason: "IA sin respuesta - revisión manual" };
    const parsed = typeof args === "string" ? JSON.parse(args) : args;
    return { ok: !!parsed.is_receipt, reason: parsed.reason || (parsed.is_receipt ? "comprobante detectado" : "no parece comprobante"), raw: parsed };
  } catch (e) {
    return { ok: true, reason: "IA timeout - revisión manual" };
  }
}

async function sendTelegramWithRetry(supabase: any, order: any, mediaUrl: string, isVideo: boolean, aiReason: string): Promise<number | null> {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const adminId = Deno.env.get("TELEGRAM_ADMIN_ID");
  if (!token || !adminId) {
    await log(supabase, order.payment_id, "telegram_skip", { reason: "missing token or admin id" });
    return null;
  }

  const method = order.payment_method === "diamonds" ? "Diamantes Free Fire" : "PayPal";
  const caption =
    `<b>Nuevo comprobante</b>\n` +
    `ID: <code>${order.payment_id}</code>\n` +
    `Usuario: ${order.alias}${order.email ? ` (${order.email})` : ""}\n` +
    `Plan: ${order.duration}\n` +
    `Método: ${method}\n` +
    `Monto: ${order.amount_display || order.amount}\n` +
    `Fecha: ${new Date().toLocaleString("es-ES")}\n` +
    `IA: ${aiReason}`;

  const reply_markup = {
    inline_keyboard: [[
      { text: "Aprobar", callback_data: `approve:${order.payment_id}` },
      { text: "Rechazar", callback_data: `reject:${order.payment_id}` },
    ], [
      { text: "Ver info", callback_data: `info:${order.payment_id}` },
    ]],
  };

  const endpoint = isVideo ? "sendVideo" : "sendPhoto";
  const payload: any = { chat_id: adminId, caption, parse_mode: "HTML", reply_markup };
  if (isVideo) payload.video = mediaUrl; else payload.photo = mediaUrl;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${token}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (j.ok) {
        await log(supabase, order.payment_id, "telegram_sent", { attempt, message_id: j.result.message_id });
        return j.result.message_id;
      }
      await log(supabase, order.payment_id, "telegram_fail", { attempt, response: j });
    } catch (e) {
      await log(supabase, order.payment_id, "telegram_error", { attempt, error: String(e) });
    }
    await new Promise((r) => setTimeout(r, 800 * attempt));
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { tracking_token, image_base64, mime } = await req.json();
    if (!tracking_token || !image_base64) throw new Error("Datos incompletos");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: order, error: oErr } = await supabase
      .from("payment_orders").select("*").eq("tracking_token", tracking_token).single();
    if (oErr || !order) throw new Error("Pedido no encontrado");
    if (order.status === "APPROVED") throw new Error("Pedido ya aprobado");

    const isVideo = (mime || "").startsWith("video/");
    const ext = (mime || "image/jpeg").split("/")[1]?.split(";")[0] || (isVideo ? "mp4" : "jpg");
    const path = `${order.payment_id}-${Date.now()}.${ext}`;

    const bytes = Uint8Array.from(atob(image_base64), (c) => c.charCodeAt(0));
    const { error: upErr } = await supabase.storage.from("receipts")
      .upload(path, bytes, { contentType: mime || "image/jpeg", upsert: true });
    if (upErr) throw upErr;
    const { data: pub } = supabase.storage.from("receipts").getPublicUrl(path);
    const receiptUrl = pub.publicUrl;

    const ai = await looksLikeReceipt(image_base64, mime || "image/jpeg");
    await log(supabase, order.payment_id, "ai_check", { ok: ai.ok, reason: ai.reason });

    if (!ai.ok) {
      await supabase.from("payment_orders").update({
        receipt_url: receiptUrl,
        ai_validation: { ok: false, reason: ai.reason },
        status: "REJECTED",
        rejection_reason: "El archivo no parece un comprobante de pago",
      }).eq("id", order.id);
      return new Response(JSON.stringify({ status: "REJECTED", reason: "No parece comprobante" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const msgId = await sendTelegramWithRetry(supabase, order, receiptUrl, isVideo, ai.reason);

    await supabase.from("payment_orders").update({
      receipt_url: receiptUrl,
      ai_validation: { ok: true, reason: ai.reason },
      status: "PENDING",
      telegram_message_id: msgId,
      rejection_reason: null,
    }).eq("id", order.id);

    return new Response(JSON.stringify({ status: "PENDING", telegram_sent: !!msgId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
