import { supabase } from "@/integrations/supabase/client";

export interface Announcement {
  id: string;
  title: string;
  description: string | null;
  media_url: string | null;
  media_type: string | null;
  link_url: string | null;
  link_label: string | null;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminProfile {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  verified: boolean;
  updated_at: string;
}

export async function listAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await (supabase as any)
    .from("announcements")
    .select("*")
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) { console.error(error); return []; }
  return data as Announcement[];
}

export async function createAnnouncement(payload: Partial<Announcement>) {
  const { error } = await (supabase as any).from("announcements").insert({
    title: payload.title || "Sin título",
    description: payload.description ?? null,
    media_url: payload.media_url ?? null,
    media_type: payload.media_type ?? null,
    link_url: payload.link_url ?? null,
    link_label: payload.link_label ?? null,
    pinned: payload.pinned ?? false,
  });
  if (error) throw error;
}

export async function updateAnnouncement(id: string, payload: Partial<Announcement>) {
  const { error } = await (supabase as any).from("announcements").update(payload).eq("id", id);
  if (error) throw error;
}

export async function deleteAnnouncement(id: string) {
  const { error } = await (supabase as any).from("announcements").delete().eq("id", id);
  if (error) throw error;
}

export async function togglePinAnnouncement(id: string, pinned: boolean) {
  await updateAnnouncement(id, { pinned });
}

export async function uploadChannelMedia(file: File): Promise<{ url: string; type: string }> {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("channel").upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  const { data } = (supabase as any).storage.from("channel").getPublicUrl(path);
  const type = file.type.startsWith("video") ? "video" : "image";
  return { url: data.publicUrl, type };
}

export async function getAdminProfile(): Promise<AdminProfile | null> {
  const { data, error } = await (supabase as any)
    .from("admin_profile")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) { console.error(error); return null; }
  return data as AdminProfile | null;
}

export async function updateAdminProfile(id: string, payload: Partial<AdminProfile>) {
  const { error } = await (supabase as any).from("admin_profile").update(payload).eq("id", id);
  if (error) throw error;
}

export async function uploadAdminAvatar(file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "png";
  const path = `admin/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("channel").upload(path, file, {
    cacheControl: "31536000",
    upsert: true,
    contentType: file.type,
  });
  if (error) throw error;
  const { data } = (supabase as any).storage.from("channel").getPublicUrl(path);
  return data.publicUrl;
}
