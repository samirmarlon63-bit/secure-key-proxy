import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RECIPIENT = "ModifaxffLopez";

async function validateReceiptWithAI(imageBase64: string, mime: string, expectedAmount: number) {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return { ok: false, reason: "AI no configurada", raw: null };

  const prompt = `Analiza esta imagen como comprobante de pago de PayPal. Devuelve estrictamente JSON con esta estructura usando la herramienta validate_receipt.
Verifica:
- is_paypal: ¿Es un comprobante real de PayPal? (true/false)
- recipient_name: Nombre del destinatario que aparece (ej: "Modifaxff Lopez", "ModifaxffLopez", o el que veas)
- recipient_match: ¿El destinatario coincide con "${RECIPIENT}" o "Modifaxff Lopez"? (true/false)
- amount_detected: Monto numérico detectado en USD
- amount_match: ¿El monto detectado es exactamente ${expectedAmount} USD? (true/false)
- confidence: 0.0 a 1.0
- notes: notas breves`;

  const body = {
    model: "google/gemini-2.5-flash",
    messages: [{
      role: "user",
      content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: `data:${mime};base64,${imageBase64}` } },
      ],
    }],
    tools: [{
      type: "function",
      function: {
        name: "validate_receipt",
        description: "Devuelve la validación del comprobante",
        parameters: {
          type: "object",
          properties: {
            is_paypal: { type: "boolean" },
            recipient_name: { type: "string" },
            recipient_match: { type: "boolean" },
            amount_detected: { type: "number" },
            amount_match: { type: "boolean" },
            confidence: { type: "number" },
            notes: { type: "string" },
          },
          required: ["is_paypal", "recipient_match", "amount_match", "confidence"],
        },
      },
    }],
    tool_choice: { type: "function", function: { name: "validate_receipt" } },
  };

  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text();
    return { ok: false, reason: `IA error ${r.status}`, raw: t };
  }
  const j = await r.json();
  const args = j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) return { ok: false, reason: "IA sin respuesta", raw: j };
  const parsed = typeof args === "string" ? JSON.parse(args) : args;
  return { ok: true, ...parsed };
}

async function sendTelegramReview(order: any, receiptUrl: string, validation: any) {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const adminId = Deno.env.get("TELEGRAM_ADMIN_ID");
  if (!token || !adminId) return null;

  const caption =
    `<b>Nuevo comprobante</b>\n` +
    `ID: <code>${order.payment_id}</code>\n` +
    `Usuario: ${order.alias}${order.email ? ` (${order.email})` : ""}\n` +
    `Plan: ${order.duration}\n` +
    `Monto: ${order.amount} USD\n` +
    `Fecha: ${new Date().toLocaleString("es-ES")}\n\n` +
    `<b>IA:</b> PayPal=${validation.is_paypal ? "✓" : "✗"} | ` +
    `Receptor=${validation.recipient_match ? "✓" : "✗"} | ` +
    `Monto=${validation.amount_match ? "✓" : "✗"} | ` +
    `Conf=${(validation.confidence ?? 0).toFixed(2)}\n` +
    `Detectado: ${validation.recipient_name || "?"} / ${validation.amount_detected ?? "?"} USD`;

  const r = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: adminId,
      photo: receiptUrl,
      caption,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[
          { text: "✅ Aprobar", callback_data: `approve:${order.payment_id}` },
          { text: "❌ Rechazar", callback_data: `reject:${order.payment_id}` },
        ]],
      },
    }),
  });
  const j = await r.json();
  return j?.result?.message_id ?? null;
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

    // Upload receipt
    const bytes = Uint8Array.from(atob(image_base64), (c) => c.charCodeAt(0));
    const ext = (mime || "image/jpeg").split("/")[1] || "jpg";
    const path = `${order.payment_id}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("receipts")
      .upload(path, bytes, { contentType: mime || "image/jpeg", upsert: true });
    if (upErr) throw upErr;
    const { data: pub } = supabase.storage.from("receipts").getPublicUrl(path);
    const receiptUrl = pub.publicUrl;

    // AI validation
    const validation = await validateReceiptWithAI(image_base64, mime || "image/jpeg", Number(order.amount));

    const aiOk = validation.ok && validation.is_paypal && validation.recipient_match && validation.amount_match;

    if (!aiOk) {
      const reason = !validation.ok
        ? (validation.reason || "Validación IA falló")
        : `IA rechazó: PayPal=${validation.is_paypal} Receptor=${validation.recipient_match} Monto=${validation.amount_match}`;
      await supabase.from("payment_orders").update({
        receipt_url: receiptUrl,
        ai_validation: validation,
        status: "REJECTED",
        rejection_reason: reason,
      }).eq("id", order.id);
      return new Response(JSON.stringify({ status: "REJECTED", reason }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send to Telegram
    const msgId = await sendTelegramReview(order, receiptUrl, validation);

    await supabase.from("payment_orders").update({
      receipt_url: receiptUrl,
      ai_validation: validation,
      status: "PENDING",
      telegram_message_id: msgId,
      rejection_reason: null,
    }).eq("id", order.id);

    return new Response(JSON.stringify({ status: "PENDING" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
