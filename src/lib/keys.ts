import { supabase } from "@/integrations/supabase/client";

export interface ProxyKey {
  key: string;
  type: 'Normal' | 'Premium';
  status: 'Activa' | 'Usada' | 'Expirada' | 'Bloqueada';
  duration: string;
  durationMs: number;
  createdAt: string;
  usedBy?: string;
  activatedAt?: string;
  expiresAt?: string;
}

export interface ActiveUser {
  name: string;
  key: string;
  type: string;
  loginAt: string;
  expiresAt: string;
  blocked: boolean;
}

// Convert DB row to ProxyKey
function rowToKey(row: any): ProxyKey {
  const k: ProxyKey = {
    key: row.key,
    type: row.type as ProxyKey['type'],
    status: row.status as ProxyKey['status'],
    duration: row.duration,
    durationMs: row.duration_ms,
    createdAt: row.created_at,
    usedBy: row.used_by ?? undefined,
    activatedAt: row.activated_at ?? undefined,
    expiresAt: row.expires_at ?? undefined,
  };
  // Auto-expire
  if (k.status === 'Usada' && k.expiresAt && new Date(k.expiresAt) < new Date()) {
    k.status = 'Expirada';
  }
  return k;
}

function rowToUser(row: any): ActiveUser {
  return {
    name: row.name,
    key: row.key,
    type: row.type,
    loginAt: row.login_at,
    expiresAt: row.expires_at ?? '',
    blocked: row.blocked,
  };
}

export async function getKeys(): Promise<ProxyKey[]> {
  const { data, error } = await supabase.from('proxy_keys').select('*').order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(rowToKey);
}

export async function saveKey(k: ProxyKey): Promise<void> {
  await supabase.from('proxy_keys').upsert({
    key: k.key,
    type: k.type,
    status: k.status,
    duration: k.duration,
    duration_ms: k.durationMs,
    created_at: k.createdAt,
    used_by: k.usedBy ?? null,
    activated_at: k.activatedAt ?? null,
    expires_at: k.expiresAt ?? null,
  }, { onConflict: 'key' });
}

export async function getActiveUsers(): Promise<ActiveUser[]> {
  const { data, error } = await supabase.from('active_users').select('*').order('login_at', { ascending: false });
  if (error || !data) return [];
  return data.map(rowToUser);
}

export async function registerActiveUser(name: string, key: string, type: string, expiresAt: string) {
  await supabase.from('active_users').upsert({
    name,
    key,
    type,
    login_at: new Date().toISOString(),
    expires_at: expiresAt || null,
    blocked: false,
  }, { onConflict: 'key' });
}

export async function blockUser(key: string) {
  await supabase.from('active_users').update({ blocked: true }).eq('key', key);
}

export async function unblockUser(key: string) {
  await supabase.from('active_users').update({ blocked: false }).eq('key', key);
}

export async function kickUser(key: string) {
  await supabase.from('active_users').delete().eq('key', key);
}

export async function deleteUser(key: string) {
  await supabase.from('active_users').delete().eq('key', key);
  await supabase.from('proxy_keys').delete().eq('key', key);
}

export async function reduceKeyTime(key: string, reduceMs: number) {
  const { data } = await supabase.from('proxy_keys').select('expires_at, status').eq('key', key).single();
  if (!data || !data.expires_at) return;
  const newExpiry = new Date(new Date(data.expires_at).getTime() - reduceMs);
  const newStatus = newExpiry < new Date() ? 'Expirada' : data.status;
  await supabase.from('proxy_keys').update({
    expires_at: newExpiry.toISOString(),
    status: newStatus,
  }).eq('key', key);
}

export async function addKeyTime(key: string, addMs: number) {
  const { data } = await supabase.from('proxy_keys').select('expires_at, status').eq('key', key).single();
  if (!data || !data.expires_at) return;
  const newExpiry = new Date(new Date(data.expires_at).getTime() + addMs);
  await supabase.from('proxy_keys').update({
    expires_at: newExpiry.toISOString(),
    status: 'Usada',
  }).eq('key', key);
  // Also update active_users
  await supabase.from('active_users').update({
    expires_at: newExpiry.toISOString(),
  }).eq('key', key);
}

export async function isUserBlocked(key: string): Promise<boolean> {
  const clean = key.trim().toUpperCase();
  const { data } = await supabase.from('active_users').select('blocked').ilike('key', clean).single();
  return data?.blocked ?? false;
}

export function generateKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segment = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `PROXY-${segment()}-${segment()}`;
}

export async function generateKeys(count: number, type: ProxyKey['type'], duration: string): Promise<ProxyKey[]> {
  const durationMap: Record<string, number> = {
    '1 minuto': 60 * 1000,
    '1 día': 24 * 60 * 60 * 1000,
    '7 días': 7 * 24 * 60 * 60 * 1000,
    '30 días': 30 * 24 * 60 * 60 * 1000,
  };

  const newKeys: ProxyKey[] = [];
  const rows: any[] = [];
  for (let i = 0; i < count; i++) {
    const k: ProxyKey = {
      key: generateKey(),
      type,
      status: 'Activa',
      duration,
      durationMs: durationMap[duration] || 0,
      createdAt: new Date().toISOString(),
    };
    newKeys.push(k);
    rows.push({
      key: k.key,
      type: k.type,
      status: k.status,
      duration: k.duration,
      duration_ms: k.durationMs,
      created_at: k.createdAt,
    });
  }
  await supabase.from('proxy_keys').insert(rows);
  return newKeys;
}

export async function validateKey(inputKey: string): Promise<ProxyKey | null> {
  const clean = inputKey.trim().toUpperCase();
  const { data } = await supabase.from('proxy_keys').select('*').ilike('key', clean).eq('status', 'Activa').single();
  if (!data) return null;
  return rowToKey(data);
}

export async function activateKey(inputKey: string, userName: string): Promise<ProxyKey | null> {
  const clean = inputKey.trim().toUpperCase();
  const { data } = await supabase.from('proxy_keys').select('*').ilike('key', clean).eq('status', 'Activa').single();
  if (!data) return null;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + data.duration_ms).toISOString();

  const { error } = await supabase.from('proxy_keys').update({
    status: 'Usada',
    used_by: userName,
    activated_at: now.toISOString(),
    expires_at: expiresAt,
  }).eq('key', data.key);

  if (error) return null;

  return {
    key: data.key,
    type: data.type as ProxyKey['type'],
    status: 'Usada',
    duration: data.duration,
    durationMs: data.duration_ms,
    createdAt: data.created_at,
    usedBy: userName,
    activatedAt: now.toISOString(),
    expiresAt,
  };
}

export async function deleteKey(key: string) {
  await supabase.from('proxy_keys').delete().eq('key', key);
}
