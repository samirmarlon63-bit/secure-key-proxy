import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-telegram-bot-api-secret-token",
};

const ADMIN_PASSWORD = "valhalla117";

const DURATION_MS: Record<string, number> = {
  "1 minuto": 60 * 1000,
  "1 día": 24 * 60 * 60 * 1000,
  "7 días": 7 * 24 * 60 * 60 * 1000,
  "30 días": 30 * 24 * 60 * 60 * 1000,
};

const ADD_TIME_MS: Record<string, number> = {
  "30m": 30 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "6h": 6 * 60 * 60 * 1000,
  "12h": 12 * 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
};

const MAIN_KEYBOARD = {
  keyboard: [
    [{ text: "Generar Key" }, { text: "Keys activas" }],
    [{ text: "Usuarios" }, { text: "Stats" }],
    [{ text: "Pendientes" }, { text: "Últimos" }],
    [{ text: "Stats" }, { text: "Ayuda" }],
    [{ text: "Inicio" }],
  ],
  resize_keyboard: true,
  is_persistent: true,
};

async function tg(method: string, body: any) {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!token) {
    console.error("TELEGRAM_BOT_TOKEN is not configured");
    return null;
  }
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) console.error("tg api error", method, response.status, await response.text());
    return response;
  } catch (e) {
    console.error("tg error", method, e);
    return null;
  }
}

const reply = (chat_id: number, text: string, extra: any = {}) =>
  tg("sendMessage", { chat_id, text, parse_mode: "HTML", reply_markup: MAIN_KEYBOARD, ...extra });

const ack = (id: string, text = "OK") =>
  tg("answerCallbackQuery", { callback_query_id: id, text });

const editCaption = (chat_id: number, message_id: number, caption: string) =>
  tg("editMessageCaption", { chat_id, message_id, caption, parse_mode: "HTML" });

const deleteMessage = (chat_id: number, message_id: number) =>
  tg("deleteMessage", { chat_id, message_id });

// Pending interactive flows: chat_id -> { type, step, data }
const pending = new Map<string, any>();

function isAllowedAdmin(chatId: number, adminId: string): boolean {
  return !adminId || String(chatId) === String(adminId);
}

async function isAuthed(supabase: any, chatId: number, adminId: string): Promise<boolean> {
  if (!isAllowedAdmin(chatId, adminId)) return false;
  const { data } = await supabase.from("telegram_admin_sessions")
    .select("chat_id").eq("chat_id", String(chatId)).maybeSingle();
  if (data) {
    await supabase.from("telegram_admin_sessions")
      .update({ last_seen_at: new Date().toISOString() }).eq("chat_id", String(chatId));
  }
  return !!data;
}

async function saveAuth(supabase: any, chatId: number) {
  await supabase.from("telegram_admin_sessions").upsert({
    chat_id: String(chatId),
    authenticated_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
  }, { onConflict: "chat_id" });
}

async function clearAuth(supabase: any, chatId: number) {
  await supabase.from("telegram_admin_sessions").delete().eq("chat_id", String(chatId));
}

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
  return `FFV-${seg()}-${seg()}`;
}

async function createKey(supabase: any, type: string, duration: string): Promise<string> {
  const durationMs = DURATION_MS[duration] || 0;
  const key = genKey();
  await supabase.from("proxy_keys").insert({
    key, type, status: "Activa",
    duration, duration_ms: durationMs,
    created_at: new Date().toISOString(),
  });
  return key;
}

async function generateKeyForOrder(supabase: any, order: any): Promise<string> {
  const key = await createKey(supabase, "Normal", order.duration);
  await supabase.from("payment_logs").insert({
    payment_id: order.payment_id, event: "key_generated", detail: { key, by: "telegram_admin" },
  });
  return key;
}

function helpText(): string {
  return (
    "<b>FFVALHALLA — Admin Bot</b>\n\n" +
    "Usa los botones de abajo o estos comandos:\n\n" +
    "/generar — generar nueva key (interactivo)\n" +
    "/keys — keys activas disponibles\n" +
    "/pendientes — pedidos en revisión\n" +
    "/ultimos — últimos 10 pedidos\n" +
    "/buscar HG-XXXX — buscar pedido\n" +
    "/aprobar HG-XXXX — aprobar y generar key\n" +
    "/rechazar HG-XXXX [motivo] — rechazar\n" +
    "/reenviarkey HG-XXXX — reenviar key\n" +
    "/stats — estadísticas\n" +
    "/logs HG-XXXX — logs de pedido\n" +
    "/cancelar HG-XXXX — cancelar pedido\n" +
    "/logout — cerrar sesión admin"
  );
}

async function handleTextOrCommand(
  supabase: any,
  chat_id: number,
  text: string,
  adminId: string,
) {
  const cid = String(chat_id);
  const trimmed = text.trim();

  // Auth gate
  if (!isAuthed(chat_id, adminId)) {
    if (trimmed === "/start" || trimmed === "Inicio") {
      pending.set(cid, { type: "auth" });
      await tg("sendMessage", {
        chat_id, parse_mode: "HTML",
        text: "<b>FFVALHALLA Admin</b>\nIngresa la contraseña secreta para continuar:",
        reply_markup: { remove_keyboard: true },
      });
      return;
    }
    if (pending.get(cid)?.type === "auth" || trimmed === ADMIN_PASSWORD) {
      if (trimmed === ADMIN_PASSWORD) {
        authed.add(cid);
        pending.delete(cid);
        await reply(chat_id,
          "<b>Acceso concedido</b>\n\nBienvenido al panel de FFVALHALLA.\nUsa la barra inferior para todas las funciones.");
        return;
      }
      await tg("sendMessage", { chat_id, text: "Contraseña incorrecta. Intenta de nuevo:" });
      return;
    }
    await tg("sendMessage", {
      chat_id, text: "Envía /start para iniciar.",
      reply_markup: { remove_keyboard: true },
    });
    return;
  }

  // Authed: handle pending interactive flows first
  const p = pending.get(cid);
  if (p?.type === "gen_type") {
    const t = trimmed.toLowerCase();
    if (t !== "normal" && t !== "premium") {
      await reply(chat_id, "Elige <b>Normal</b> o <b>Premium</b>.");
      return;
    }
    pending.set(cid, { type: "gen_duration", data: { type: t === "premium" ? "Premium" : "Normal" } });
    await tg("sendMessage", {
      chat_id, parse_mode: "HTML",
      text: "Duración:",
      reply_markup: {
        keyboard: [
          [{ text: "1 día" }, { text: "7 días" }],
          [{ text: "30 días" }, { text: "1 minuto" }],
          [{ text: "Cancelar" }],
        ],
        resize_keyboard: true,
      },
    });
    return;
  }
  if (p?.type === "gen_duration") {
    if (trimmed.includes("Cancelar")) {
      pending.delete(cid);
      await reply(chat_id, "Cancelado.");
      return;
    }
    if (!DURATION_MS[trimmed]) {
      await reply(chat_id, "Duración inválida.");
      return;
    }
    const key = await createKey(supabase, p.data.type, trimmed);
    pending.delete(cid);
    await reply(chat_id,
      `<b>Key generada</b>\n\nTipo: ${p.data.type}\nDuración: ${trimmed}\n<code>${key}</code>`);
    return;
  }

  // Button shortcuts
  switch (trimmed) {
    case "Inicio":
    case "/inicio":
      await reply(chat_id, "<b>FFVALHALLA — Panel principal</b>\nElige una opción de la barra inferior.");
      return;
    case "Ayuda":
    case "/help":
    case "/start":
      await reply(chat_id, helpText());
      return;
    case "Generar Key":
    case "/generar": {
      pending.set(cid, { type: "gen_type" });
      await tg("sendMessage", {
        chat_id, parse_mode: "HTML",
        text: "Tipo de key:",
        reply_markup: {
          keyboard: [[{ text: "Normal" }, { text: "Premium" }], [{ text: "Cancelar" }]],
          resize_keyboard: true,
        },
      });
      return;
    }
    case "Keys activas":
    case "/keys": {
      const { data } = await supabase.from("proxy_keys").select("duration,type").eq("status", "Activa");
      const counts: Record<string, number> = {};
      (data || []).forEach((k: any) => {
        const label = `${k.type} · ${k.duration}`;
        counts[label] = (counts[label] || 0) + 1;
      });
      const txt = Object.entries(counts).map(([d, n]) => `• ${d}: <b>${n}</b>`).join("\n") || "Sin keys disponibles.";
      await reply(chat_id, `<b>Keys disponibles</b>\n${txt}`);
      return;
    }
    case "Pendientes":
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
    case "Últimos":
    case "/ultimos": {
      const { data } = await supabase.from("payment_orders").select("*")
        .order("created_at", { ascending: false }).limit(10);
      const txt = (data || []).map((o: any) =>
        `<code>${o.payment_id}</code> [${o.status}] ${o.alias} ${o.duration}`
      ).join("\n") || "Sin pedidos.";
      await reply(chat_id, `<b>Últimos pedidos</b>\n${txt}`);
      return;
    }
    case "Stats":
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
    case "/logout":
      authed.delete(cid);
      pending.delete(cid);
      await tg("sendMessage", { chat_id, text: "Sesión cerrada.", reply_markup: { remove_keyboard: true } });
      return;
  }

  // Parameterized commands
  const [cmd, ...args] = trimmed.split(/\s+/);
  switch (cmd.toLowerCase()) {
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
      await reply(chat_id, `Key reenviada para <b>${o.alias}</b>:\n<code>${o.assigned_key}</code>`);
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
      await reply(chat_id, "No reconozco eso. Usa la barra inferior o /help.");
  }
}

async function deriveSecret(token: string): Promise<string> {
  const data = new TextEncoder().encode(`telegram-webhook:${token}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const token = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
  const expected = token ? await deriveSecret(token) : "";
  const got = req.headers.get("x-telegram-bot-api-secret-token") || "";
  if (!expected || got !== expected) {
    console.error("Invalid Telegram webhook secret");
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const adminId = Deno.env.get("TELEGRAM_ADMIN_ID") || "";

  // Always respond 200 quickly so Telegram never marks the webhook as failed.
  let update: any;
  try {
    update = await req.json();
  } catch {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (update.message?.text) {
      const text = update.message.text;
      const chat_id = update.message.chat.id;
      await handleTextOrCommand(supabase, chat_id, text, adminId);
      return new Response("ok", { headers: corsHeaders });
    }

    const cb = update.callback_query;
    if (!cb) return new Response("ok", { headers: corsHeaders });

    const data: string = cb.data || "";
    const [action, paymentId] = data.split(":");
    const chat_id = cb.message?.chat?.id;
    const message_id = cb.message?.message_id;

    if (!isAuthed(Number(chat_id), adminId)) {
      await ack(cb.id, "Envía /start y autentícate primero.");
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
  } catch (e) {
    console.error("processing error", e);
  }

  return new Response("ok", { headers: corsHeaders });
});
