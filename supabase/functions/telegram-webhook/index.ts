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
    [{ text: "Usuarios" }, { text: "Pendientes" }],
    [{ text: "Últimos" }, { text: "Stats" }],
    [{ text: "Ayuda" }, { text: "Inicio" }],
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

// Pending interactive flows are persisted in DB to survive edge function cold starts.
async function getPending(supabase: any, chatId: number): Promise<any> {
  const { data } = await supabase.from("telegram_admin_sessions")
    .select("pending").eq("chat_id", String(chatId)).maybeSingle();
  return data?.pending ?? null;
}
async function setPending(supabase: any, chatId: number, value: any) {
  await supabase.from("telegram_admin_sessions").upsert({
    chat_id: String(chatId), pending: value, last_seen_at: new Date().toISOString(),
  }, { onConflict: "chat_id" });
}
async function clearPending(supabase: any, chatId: number) {
  await supabase.from("telegram_admin_sessions").update({ pending: null }).eq("chat_id", String(chatId));
}

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
  return `RAVE-${seg()}-${seg()}`;
}

async function createKey(supabase: any, type: string, duration: string): Promise<string> {
  const durationMs = DURATION_MS[duration] || 0;
  const key = genKey();
  const { error } = await supabase.from("proxy_keys").insert({
    key, type, status: "Activa",
    duration, duration_ms: durationMs,
    created_at: new Date().toISOString(),
  });
  if (error) throw new Error(`createKey failed: ${error.message}`);
  return key;
}

async function createKeys(supabase: any, type: string, duration: string, quantity: number): Promise<string[]> {
  const count = Math.max(1, Math.min(100, Number(quantity) || 1));
  const durationMs = DURATION_MS[duration] || 0;
  const rows = Array.from({ length: count }, () => ({
    key: genKey(),
    type,
    status: "Activa",
    duration,
    duration_ms: durationMs,
    created_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from("proxy_keys").insert(rows);
  if (error) throw new Error(`createKeys failed: ${error.message}`);
  return rows.map((r) => r.key);
}

function cleanKey(value = ""): string {
  return value.trim().toUpperCase();
}

function timeLeft(expiresAt?: string): string {
  if (!expiresAt) return "—";
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expirada";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

async function changeKeyTime(supabase: any, key: string, deltaMs: number): Promise<string> {
  const { data, error } = await supabase.from("proxy_keys")
    .select("key,expires_at,status").ilike("key", cleanKey(key)).maybeSingle();
  if (error || !data || !data.expires_at) return "Key no encontrada o sin expiración activa.";
  const next = new Date(new Date(data.expires_at).getTime() + deltaMs);
  const status = next.getTime() <= Date.now() ? "Expirada" : "Usada";
  const expires_at = next.toISOString();
  await supabase.from("proxy_keys").update({ expires_at, status }).eq("key", data.key);
  await supabase.from("active_users").update({ expires_at }).eq("key", data.key);
  return `Tiempo actualizado para <code>${data.key}</code>\nExpira: ${next.toLocaleString("es-ES")}\nRestante: ${timeLeft(expires_at)}`;
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
    "<b>Rave — Admin Bot</b>\n\n" +
    "Usa los botones de abajo o estos comandos:\n\n" +
    "/generar — generar nueva key (interactivo)\n" +
    "/generar Normal 7 días 5 — generar varias keys\n" +
    "/keys — keys activas disponibles\n" +
    "/usuarios — usuarios activos\n" +
    "/bloquear KEY — bloquear usuario\n" +
    "/desbloquear KEY — desbloquear usuario\n" +
    "/sacar KEY — sacar sesión activa\n" +
    "/eliminarusuario KEY — eliminar usuario y key\n" +
    "/sumar KEY 1h — agregar tiempo: 30m, 1h, 6h, 12h, 1d, 7d\n" +
    "/reducir KEY 6h — reducir tiempo\n" +
    "/eliminarkey KEY — eliminar key\n" +
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
  
  const trimmed = text.trim();

  // Auth gate
  const authed = await isAuthed(supabase, chat_id, adminId);
  if (!authed) {
    if (!isAllowedAdmin(chat_id, adminId)) {
      await tg("sendMessage", { chat_id, text: "Acceso denegado.", reply_markup: { remove_keyboard: true } });
      return;
    }
    if (trimmed === "/start" || trimmed === "Inicio") {
      await setPending(supabase, chat_id, { type: "auth" });
      await tg("sendMessage", {
        chat_id, parse_mode: "HTML",
        text: "<b>Rave Admin</b>\nIngresa la contraseña secreta para continuar:",
        reply_markup: { remove_keyboard: true },
      });
      return;
    }
    if ((await getPending(supabase, chat_id))?.type === "auth" || trimmed === ADMIN_PASSWORD) {
      if (trimmed === ADMIN_PASSWORD) {
        await saveAuth(supabase, chat_id);
        await clearPending(supabase, chat_id);
        await reply(chat_id,
          "<b>Acceso concedido</b>\n\nBienvenido al panel de Rave.\nUsa la barra inferior para todas las funciones.");
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
  const p = await getPending(supabase, chat_id);
  if (p?.type === "gen_type") {
    const t = trimmed.toLowerCase();
    if (t.includes("cancelar")) {
      await clearPending(supabase, chat_id);
      await reply(chat_id, "Cancelado.");
      return;
    }
    if (t !== "normal" && t !== "premium") {
      await reply(chat_id, "Elige <b>Normal</b> o <b>Premium</b>.");
      return;
    }
    await setPending(supabase, chat_id, { type: "gen_duration", data: { type: t === "premium" ? "Premium" : "Normal" } });
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
      await clearPending(supabase, chat_id);
      await reply(chat_id, "Cancelado.");
      return;
    }
    if (!DURATION_MS[trimmed]) {
      await reply(chat_id, "Duración inválida.");
      return;
    }
    await setPending(supabase, chat_id, { type: "gen_quantity", data: { type: p.data.type, duration: trimmed } });
    await tg("sendMessage", {
      chat_id, parse_mode: "HTML",
      text: "Cantidad de keys (1-100):",
      reply_markup: { keyboard: [[{ text: "1" }, { text: "5" }, { text: "10" }], [{ text: "Cancelar" }]], resize_keyboard: true },
    });
    return;
  }
  if (p?.type === "gen_quantity") {
    if (trimmed.includes("Cancelar")) {
      await clearPending(supabase, chat_id);
      await reply(chat_id, "Cancelado.");
      return;
    }
    const quantity = Number(trimmed);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      await reply(chat_id, "Cantidad inválida. Escribe un número entre 1 y 100.");
      return;
    }
    const keys = await createKeys(supabase, p.data.type, p.data.duration, quantity);
    await clearPending(supabase, chat_id);
    await reply(chat_id,
      `<b>${keys.length} key${keys.length === 1 ? "" : "s"} generada${keys.length === 1 ? "" : "s"}</b>\n\nTipo: ${p.data.type}\nDuración: ${p.data.duration}\n${keys.map((key) => `<code>${key}</code>`).join("\n")}`);
    return;
  }

  // Button shortcuts
  switch (trimmed) {
    case "Inicio":
    case "/inicio":
      await reply(chat_id, "<b>Rave — Panel principal</b>\nElige una opción de la barra inferior.");
      return;
    case "Ayuda":
    case "/help":
    case "/start":
      await reply(chat_id, helpText());
      return;
    case "Generar Key":
    case "Generar Contraseña":
    case "Generar contraseña":
    case "/generar": {
      const direct = trimmed.match(/^\/generar\s+(Normal|Premium)\s+(.+?)\s+(\d+)$/i);
      if (direct) {
        const type = direct[1].toLowerCase() === "premium" ? "Premium" : "Normal";
        const duration = direct[2].trim();
        const quantity = Number(direct[3]);
        if (!DURATION_MS[duration]) { await reply(chat_id, "Duración inválida. Usa: 1 minuto, 1 día, 7 días o 30 días."); return; }
        const keys = await createKeys(supabase, type, duration, quantity);
        await reply(chat_id, `<b>${keys.length} keys generadas</b>\nTipo: ${type}\nDuración: ${duration}\n\n${keys.map((k) => `<code>${k}</code>`).join("\n")}`);
        return;
      }
      await setPending(supabase, chat_id, { type: "gen_type" });
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
      const { data } = await supabase.from("proxy_keys").select("key,duration,type,status,used_by,expires_at").order("created_at", { ascending: false }).limit(80);
      const counts: Record<string, number> = {};
      (data || []).filter((k: any) => k.status === "Activa").forEach((k: any) => {
        const label = `${k.type} · ${k.duration}`;
        counts[label] = (counts[label] || 0) + 1;
      });
      const summary = Object.entries(counts).map(([d, n]) => `• ${d}: <b>${n}</b>`).join("\n") || "Sin keys disponibles.";
      const latest = (data || []).slice(0, 20).map((k: any) => `<code>${k.key}</code> · ${k.type} · ${k.duration} · ${k.status}${k.used_by ? ` · ${k.used_by}` : ""}`).join("\n");
      await reply(chat_id, `<b>Keys disponibles</b>\n${summary}\n\n<b>Últimas keys</b>\n${latest || "Sin keys."}`);
      return;
    }
    case "Usuarios":
    case "/usuarios": {
      const { data } = await supabase.from("active_users").select("*").order("login_at", { ascending: false }).limit(30);
      const txt = (data || []).map((u: any) =>
        `<b>${u.name}</b> ${u.blocked ? "[BLOQUEADO]" : "[ONLINE]"}\n<code>${u.key}</code> · ${u.type} · ${timeLeft(u.expires_at)}`
      ).join("\n\n") || "Sin sesiones activas.";
      await reply(chat_id, `<b>Usuarios activos (${data?.length || 0})</b>\n${txt}`);
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
      const [{ data }, { data: keyRows }, { data: userRows }] = await Promise.all([
        supabase.from("payment_orders").select("status, amount, payment_method"),
        supabase.from("proxy_keys").select("status"),
        supabase.from("active_users").select("blocked"),
      ]);
      const all = data || [];
      const keys = keyRows || [];
      const users = userRows || [];
      const by = (s: string) => all.filter((o: any) => o.status === s).length;
      const keyBy = (s: string) => keys.filter((k: any) => k.status === s).length;
      const totalUsd = all.filter((o: any) => o.status === "APPROVED" && o.payment_method === "paypal")
        .reduce((s: number, o: any) => s + Number(o.amount), 0);
      const totalDia = all.filter((o: any) => o.status === "APPROVED" && o.payment_method === "diamonds")
        .reduce((s: number, o: any) => s + Number(o.amount), 0);
      await reply(chat_id,
        `<b>Estadísticas</b>\n` +
        `Keys: ${keys.length} · Activas: ${keyBy("Activa")} · Usadas: ${keyBy("Usada")} · Expiradas: ${keyBy("Expirada")}\n` +
        `Usuarios: ${users.length} · Online: ${users.filter((u: any) => !u.blocked).length} · Bloqueados: ${users.filter((u: any) => u.blocked).length}\n\n` +
        `Aprobados: ${by("APPROVED")}\nPendientes: ${by("PENDING")}\n` +
        `Rechazados: ${by("REJECTED")}\nEsperando: ${by("AWAITING_RECEIPT")}\n` +
        `Total: ${all.length}\n\nIngresos PayPal: $${totalUsd}\nDiamantes: ${totalDia}`);
      return;
    }
    case "/logout":
      await clearAuth(supabase, chat_id);
      await clearPending(supabase, chat_id);
      await tg("sendMessage", { chat_id, text: "Sesión cerrada.", reply_markup: { remove_keyboard: true } });
      return;
  }

  // Parameterized commands
  const [cmd, ...args] = trimmed.split(/\s+/);
  switch (cmd.toLowerCase()) {
    case "/generar": {
      const typeArg = args[0]?.toLowerCase();
      const quantityArg = args[args.length - 1];
      const duration = args.slice(1, -1).join(" ");
      const type = typeArg === "premium" ? "Premium" : typeArg === "normal" ? "Normal" : "";
      const quantity = Number(quantityArg);
      if (!type || !DURATION_MS[duration] || !Number.isInteger(quantity)) {
        await reply(chat_id, "Uso: /generar Normal 7 días 5");
        return;
      }
      const keys = await createKeys(supabase, type, duration, quantity);
      await reply(chat_id, `<b>${keys.length} keys generadas</b>\nTipo: ${type}\nDuración: ${duration}\n\n${keys.map((k) => `<code>${k}</code>`).join("\n")}`);
      return;
    }
    case "/eliminarkey": {
      const key = cleanKey(args[0]); if (!key) { await reply(chat_id, "Uso: /eliminarkey KEY"); return; }
      await supabase.from("proxy_keys").delete().ilike("key", key);
      await reply(chat_id, `Key eliminada: <code>${key}</code>`);
      return;
    }
    case "/bloquear": {
      const key = cleanKey(args[0]); if (!key) { await reply(chat_id, "Uso: /bloquear KEY"); return; }
      await supabase.from("active_users").update({ blocked: true }).ilike("key", key);
      await reply(chat_id, `Usuario bloqueado: <code>${key}</code>`);
      return;
    }
    case "/desbloquear": {
      const key = cleanKey(args[0]); if (!key) { await reply(chat_id, "Uso: /desbloquear KEY"); return; }
      await supabase.from("active_users").update({ blocked: false }).ilike("key", key);
      await reply(chat_id, `Usuario desbloqueado: <code>${key}</code>`);
      return;
    }
    case "/sacar": {
      const key = cleanKey(args[0]); if (!key) { await reply(chat_id, "Uso: /sacar KEY"); return; }
      await supabase.from("active_users").delete().ilike("key", key);
      await reply(chat_id, `Sesión removida: <code>${key}</code>`);
      return;
    }
    case "/eliminarusuario": {
      const key = cleanKey(args[0]); if (!key) { await reply(chat_id, "Uso: /eliminarusuario KEY"); return; }
      await supabase.from("active_users").delete().ilike("key", key);
      await supabase.from("proxy_keys").delete().ilike("key", key);
      await reply(chat_id, `Usuario y key eliminados: <code>${key}</code>`);
      return;
    }
    case "/sumar":
    case "/reducir": {
      const key = cleanKey(args[0]);
      const amount = args[1]?.toLowerCase();
      const ms = ADD_TIME_MS[amount];
      if (!key || !ms) { await reply(chat_id, `Uso: ${cmd.toLowerCase()} KEY 1h\nOpciones: 30m, 1h, 6h, 12h, 1d, 7d`); return; }
      await reply(chat_id, await changeKeyTime(supabase, key, cmd.toLowerCase() === "/reducir" ? -ms : ms));
      return;
    }
    case "/buscar": {
      const id = args[0]; if (!id) { await reply(chat_id, "Uso: /buscar HG-XXXX"); return; }
      const { data: o } = await supabase.from("payment_orders").select("*").eq("payment_id", id).maybeSingle();
      if (!o) {
        const { data: k } = await supabase.from("proxy_keys").select("*").ilike("key", cleanKey(id)).maybeSingle();
        if (!k) { await reply(chat_id, "No encontrado."); return; }
        await reply(chat_id, `<b>Key</b>\n<code>${k.key}</code>\nTipo: ${k.type}\nEstado: <b>${k.status}</b>\nDuración: ${k.duration}\nUsuario: ${k.used_by || "—"}\nRestante: ${timeLeft(k.expires_at)}`);
        return;
      }
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

  let update: any;
  try { update = await req.json(); } catch { return new Response("ok", { headers: corsHeaders }); }

  const adminId = Deno.env.get("TELEGRAM_ADMIN_ID") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Process asynchronously so Telegram gets an instant 200 and NEVER retries/freezes.
  const process = async () => {
    const supabase = createClient(supabaseUrl, serviceKey);
    try {
      if (update.message?.text) {
        await handleTextOrCommand(supabase, update.message.chat.id, update.message.text, adminId);
        return;
      }
      const cb = update.callback_query;
      if (!cb) return;

      const data: string = cb.data || "";
      const [action, paymentId] = data.split(":");
      const chat_id = cb.message?.chat?.id;
      const message_id = cb.message?.message_id;

      if (!(await isAuthed(supabase, Number(chat_id), adminId))) {
        await ack(cb.id, "Envía /start y autentícate primero.");
        return;
      }

      const { data: order } = await supabase.from("payment_orders").select("*").eq("payment_id", paymentId).maybeSingle();
      if (!order) { await ack(cb.id, "No encontrado"); return; }

      if (action === "approve") {
        if (order.status === "APPROVED") { await ack(cb.id, "Ya aprobado"); return; }
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
  };

  // @ts-ignore EdgeRuntime.waitUntil keeps the task alive after response is returned.
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
    // @ts-ignore
    EdgeRuntime.waitUntil(process());
  } else {
    process();
  }

  return new Response("ok", { headers: corsHeaders });
});
