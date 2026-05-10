import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-telegram-bot-api-secret-token",
};

const DURATION_MS: Record<string, number> = {
  "1 día": 24 * 60 * 60 * 1000,
  "7 días": 7 * 24 * 60 * 60 * 1000,
  "30 días": 30 * 24 * 60 * 60 * 1000,
};

async function tg(method: string, body: any) {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  return fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}
const reply = (chat_id: number, text: string) => tg("sendMessage", { chat_id, text, parse_mode: "HTML" });
const ack = (id: string, text = "OK") => tg("answerCallbackQuery", { callback_query_id: id, text });
const editCaption = (chat_id: number, message_id: number, caption: string) =>
  tg("editMessageCaption", { chat_id, message_id, caption, parse_mode: "HTML" });
const deleteMessage = (chat_id: number, message_id: number) =>
  tg("deleteMessage", { chat_id, message_id });

async function deleteReceipt(supabase: any, order: any) {
  try {
    if (order?.receipt_url) {
      const marker = "/receipts/";
      const idx = order.receipt_url.indexOf(marker);
      if (idx >= 0) {
        const path = decodeURIComponent(order.receipt_url.slice(idx + marker.length).split("?")[0]);
        await supabase.storage.from("receipts").remove([path]);
      }
    }
    await supabase.from("payment_orders").update({ receipt_url: null }).eq("id", order.id);
    await supabase.from("payment_logs").insert({
      payment_id: order.payment_id, event: "receipt_deleted", detail: { reason: "rejected" },
    });
  } catch (e) {
    console.error("deleteReceipt error", e);
  }
}

function genKey(): string {
  const c = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const seg = () => Array.from({ length: 4 }, () => c[Math.floor(Math.random() * c.length)]).join("");
  return `PROXY-${seg()}-${seg()}`;
}

async function generateKeyForOrder(supabase: any, order: any): Promise<string> {
  const durationMs = DURATION_MS[order.duration] || 0;
  const key = genKey();
  await supabase.from("proxy_keys").insert({
    key, type: "Normal", status: "Activa",
    duration: order.duration, duration_ms: durationMs,
    created_at: new Date().toISOString(),
  });
  await supabase.from("payment_logs").insert({
    payment_id: order.payment_id, event: "key_generated", detail: { key, by: "telegram_admin" },
  });
  return key;
}

async function handleCommand(supabase: any, chat_id: number, text: string, adminId: string) {
  if (String(chat_id) !== String(adminId)) {
    await reply(chat_id, "No autorizado.");
    return;
  }
  const [cmd, ...args] = text.trim().split(/\s+/);

  switch (cmd.toLowerCase()) {
    case "/start":
    case "/help": {
      await reply(chat_id,
        "<b>Hermanos Gamers - Admin Bot</b>\n\n" +
        "/pendientes — pedidos en revisión\n" +
        "/ultimos — últimos 10 pedidos\n" +
        "/buscar HG-XXXX — buscar pedido\n" +
        "/reenviarkey HG-XXXX — reenviar key asignada\n" +
        "/aprobar HG-XXXX — aprobar y generar key\n" +
        "/rechazar HG-XXXX [motivo] — rechazar pedido\n" +
        "/stats — estadísticas\n" +
        "/keys — keys activas disponibles\n" +
        "/logs HG-XXXX — logs de un pedido\n" +
        "/cancelar HG-XXXX — cancelar pedido");
      return;
    }
    case "/pendientes": {
      const { data } = await supabase.from("payment_orders").select("*")
        .eq("status", "PENDING").order("created_at", { ascending: false }).limit(15);
      if (!data?.length) { await reply(chat_id, "Sin pedidos pendientes."); return; }
      const txt = data.map((o: any) =>
        `<code>${o.payment_id}</code> · ${o.alias} · ${o.duration} · ${o.amount_display || o.amount}`
      ).join("\n");
      await reply(chat_id, `<b>Pendientes (${data.length})</b>\n${txt}`);
      return;
    }
    case "/ultimos": {
      const { data } = await supabase.from("payment_orders").select("*")
        .order("created_at", { ascending: false }).limit(10);
      const txt = (data || []).map((o: any) =>
        `<code>${o.payment_id}</code> [${o.status}] ${o.alias} ${o.duration}`
      ).join("\n") || "Sin pedidos.";
      await reply(chat_id, `<b>Últimos pedidos</b>\n${txt}`);
      return;
    }
    case "/buscar": {
      const id = args[0]; if (!id) { await reply(chat_id, "Uso: /buscar HG-XXXX"); return; }
      const { data: o } = await supabase.from("payment_orders").select("*").eq("payment_id", id).maybeSingle();
      if (!o) { await reply(chat_id, "No encontrado."); return; }
      await reply(chat_id,
        `<b>${o.payment_id}</b>\nUsuario: ${o.alias}\nEmail: ${o.email || "—"}\n` +
        `Plan: ${o.duration} · ${o.amount_display || o.amount}\nMétodo: ${o.payment_method}\n` +
        `Estado: <b>${o.status}</b>\nKey: <code>${o.assigned_key || "—"}</code>\n` +
        `Fecha: ${new Date(o.created_at).toLocaleString("es-ES")}`);
      return;
    }
    case "/reenviarkey": {
      const id = args[0]; if (!id) { await reply(chat_id, "Uso: /reenviarkey HG-XXXX"); return; }
      const { data: o } = await supabase.from("payment_orders").select("*").eq("payment_id", id).maybeSingle();
      if (!o) { await reply(chat_id, "Pedido no encontrado."); return; }
      if (o.status !== "APPROVED" || !o.assigned_key) { await reply(chat_id, "Pedido no aprobado o sin key."); return; }
      await supabase.from("payment_logs").insert({
        payment_id: o.payment_id, event: "resend_key",
        detail: { key: o.assigned_key, email: o.email },
      });
      await reply(chat_id,
        `Key reenviada para <b>${o.alias}</b>:\n<code>${o.assigned_key}</code>\n` +
        `${o.email ? `Email: ${o.email}` : "Sin email - el usuario la verá en la web"}`);
      return;
    }
    case "/aprobar": {
      const id = args[0]; if (!id) { await reply(chat_id, "Uso: /aprobar HG-XXXX"); return; }
      const { data: o } = await supabase.from("payment_orders").select("*").eq("payment_id", id).maybeSingle();
      if (!o) { await reply(chat_id, "No encontrado."); return; }
      if (o.status === "APPROVED") { await reply(chat_id, `Ya aprobado. Key: <code>${o.assigned_key}</code>`); return; }
      const key = await generateKeyForOrder(supabase, o);
      await supabase.from("payment_orders").update({ status: "APPROVED", assigned_key: key, rejection_reason: null }).eq("id", o.id);
      await reply(chat_id, `Aprobado <code>${o.payment_id}</code>\nKey: <code>${key}</code>`);
      return;
    }
    case "/rechazar": {
      const id = args[0]; if (!id) { await reply(chat_id, "Uso: /rechazar HG-XXXX [motivo]"); return; }
      const reason = args.slice(1).join(" ") || "Rechazado por administrador";
      const { data: o } = await supabase.from("payment_orders").select("*").eq("payment_id", id).maybeSingle();
      if (!o) { await reply(chat_id, "No encontrado."); return; }
      await supabase.from("payment_orders").update({ status: "REJECTED", rejection_reason: reason }).eq("id", o.id);
      await supabase.from("payment_logs").insert({ payment_id: id, event: "rejected", detail: { reason } });
      await deleteReceipt(supabase, o);
      if (o.telegram_message_id) { try { await deleteMessage(Number(adminId), Number(o.telegram_message_id)); } catch {} }
      await reply(chat_id, `Rechazado <code>${id}</code>\nComprobante eliminado.\nMotivo: ${reason}`);
      return;
    }
    case "/cancelar": {
      const id = args[0]; if (!id) { await reply(chat_id, "Uso: /cancelar HG-XXXX"); return; }
      await supabase.from("payment_orders").update({ status: "REJECTED", rejection_reason: "Cancelado por admin" }).eq("payment_id", id);
      await reply(chat_id, `Cancelado <code>${id}</code>`);
      return;
    }
    case "/stats": {
      const { data } = await supabase.from("payment_orders").select("status, amount, payment_method");
      const all = data || [];
      const by = (s: string) => all.filter((o: any) => o.status === s).length;
      const totalUsd = all.filter((o: any) => o.status === "APPROVED" && o.payment_method === "paypal")
        .reduce((s: number, o: any) => s + Number(o.amount), 0);
      const totalDia = all.filter((o: any) => o.status === "APPROVED" && o.payment_method === "diamonds")
        .reduce((s: number, o: any) => s + Number(o.amount), 0);
      await reply(chat_id,
        `<b>Estadísticas</b>\n` +
        `Aprobados: ${by("APPROVED")}\nPendientes: ${by("PENDING")}\n` +
        `Rechazados: ${by("REJECTED")}\nEsperando: ${by("AWAITING_RECEIPT")}\n` +
        `Total: ${all.length}\n\nIngresos PayPal: $${totalUsd}\nDiamantes: ${totalDia}`);
      return;
    }
    case "/keys": {
      const { data } = await supabase.from("proxy_keys").select("duration").eq("status", "Activa");
      const counts: Record<string, number> = {};
      (data || []).forEach((k: any) => counts[k.duration] = (counts[k.duration] || 0) + 1);
      const txt = Object.entries(counts).map(([d, n]) => `${d}: ${n}`).join("\n") || "Sin keys.";
      await reply(chat_id, `<b>Keys disponibles</b>\n${txt}`);
      return;
    }
    case "/logs": {
      const id = args[0]; if (!id) { await reply(chat_id, "Uso: /logs HG-XXXX"); return; }
      const { data } = await supabase.from("payment_logs").select("*")
        .eq("payment_id", id).order("created_at", { ascending: false }).limit(15);
      const txt = (data || []).map((l: any) =>
        `${new Date(l.created_at).toLocaleTimeString("es-ES")} · ${l.event}`
      ).join("\n") || "Sin logs.";
      await reply(chat_id, `<b>Logs ${id}</b>\n${txt}`);
      return;
    }
    default:
      await reply(chat_id, "Comando desconocido. /help para ver lista.");
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const expected = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
  const got = req.headers.get("x-telegram-bot-api-secret-token");
  if (!expected || got !== expected) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const adminId = Deno.env.get("TELEGRAM_ADMIN_ID") || "";

  try {
    const update = await req.json();

    // Text command
    if (update.message?.text) {
      const text = update.message.text;
      const chat_id = update.message.chat.id;
      if (text.startsWith("/")) await handleCommand(supabase, chat_id, text, adminId);
      return new Response("ok", { headers: corsHeaders });
    }

    const cb = update.callback_query;
    if (!cb) return new Response("ok", { headers: corsHeaders });

    const data: string = cb.data || "";
    const [action, paymentId] = data.split(":");
    const chat_id = cb.message?.chat?.id;
    const message_id = cb.message?.message_id;

    if (String(cb.from?.id) !== String(adminId)) {
      await ack(cb.id, "No autorizado");
      return new Response("ok", { headers: corsHeaders });
    }

    const { data: order } = await supabase.from("payment_orders").select("*").eq("payment_id", paymentId).maybeSingle();
    if (!order) { await ack(cb.id, "No encontrado"); return new Response("ok", { headers: corsHeaders }); }

    if (action === "approve") {
      if (order.status === "APPROVED") { await ack(cb.id, "Ya aprobado"); return new Response("ok", { headers: corsHeaders }); }
      const key = await generateKeyForOrder(supabase, order);
      await supabase.from("payment_orders").update({ status: "APPROVED", assigned_key: key, rejection_reason: null }).eq("id", order.id);
      await editCaption(chat_id, message_id,
        `<b>APROBADO</b>\nID: <code>${order.payment_id}</code>\nUsuario: ${order.alias}\nPlan: ${order.duration}\nKey: <code>${key}</code>`);
      await ack(cb.id, "Aprobado");
    } else if (action === "reject") {
      await supabase.from("payment_orders").update({ status: "REJECTED", rejection_reason: "Rechazado por administrador" }).eq("id", order.id);
      await deleteReceipt(supabase, order);
      await ack(cb.id, "Rechazado");
      try { await deleteMessage(chat_id, message_id); } catch {}
    } else if (action === "info") {
      await ack(cb.id,
        `${order.alias} · ${order.duration} · ${order.amount_display || order.amount} · ${order.email || "sin email"}`);
    }
    return new Response("ok", { headers: corsHeaders });
  } catch (e) {
    console.error("webhook error", e);
    return new Response("ok", { headers: corsHeaders });
  }
});
