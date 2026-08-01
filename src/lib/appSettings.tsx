import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  RAVE_LOGO, LOGIN_AVATAR, PROFILE_AVATAR, LOGIN_BG_VIDEO, PANEL_REESEND,
  EXAMPLE_VIDEO, RAVE_MASCOT, AUTH_GLOBE,
} from "@/lib/assets";

export interface AppSettings {
  // Media
  bgVideo: string;
  bgImage: string;
  loginAvatar: string;
  profileAvatar: string;
  logo: string;
  authGlobe: string;
  mascot: string;
  banner: string;
  demoVideo: string;
  // Texts
  brandTitle: string;
  brandSubtitle: string;
  loginTitle: string;
  loginSubtitle: string;
  buyTitle: string;
  buyButtonLabel: string;
  channelTitle: string;
  telegramUrl: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  bgVideo: LOGIN_BG_VIDEO,
  bgImage: "",
  loginAvatar: LOGIN_AVATAR,
  profileAvatar: PROFILE_AVATAR,
  logo: RAVE_LOGO,
  authGlobe: AUTH_GLOBE,
  mascot: RAVE_MASCOT,
  banner: PANEL_REESEND,
  demoVideo: EXAMPLE_VIDEO,
  brandTitle: "Reseend",
  brandSubtitle: "",
  loginTitle: "Acceso seguro",
  loginSubtitle: "",
  buyTitle: "Panel Reesend",
  buyButtonLabel: "Comprar Key",
  channelTitle: "Canal",
  telegramUrl: "https://t.me/wildzinv_bot",
};

export const SETTINGS_FIELDS: {
  key: keyof AppSettings;
  label: string;
  kind: "image" | "video" | "text";
}[] = [
  { key: "bgVideo", label: "Video de fondo", kind: "video" },
  { key: "bgImage", label: "Imagen de fondo (reemplaza el video)", kind: "image" },
  { key: "loginAvatar", label: "Foto de perfil (login)", kind: "image" },
  { key: "profileAvatar", label: "Foto de perfil (app / canal)", kind: "image" },
  { key: "logo", label: "Logo principal", kind: "image" },
  { key: "authGlobe", label: "Logo del canal / Auth", kind: "image" },
  { key: "mascot", label: "Personaje / mascota", kind: "image" },
  { key: "banner", label: "Banner publicitario", kind: "image" },
  { key: "demoVideo", label: "Video de demostración", kind: "video" },
  { key: "brandTitle", label: "Título de marca", kind: "text" },
  { key: "brandSubtitle", label: "Subtítulo de marca", kind: "text" },
  { key: "loginTitle", label: "Título del login", kind: "text" },
  { key: "loginSubtitle", label: "Texto secundario del login", kind: "text" },
  { key: "buyTitle", label: "Título del modal de compra", kind: "text" },
  { key: "buyButtonLabel", label: "Texto del botón de compra", kind: "text" },
  { key: "channelTitle", label: "Título del canal", kind: "text" },
  { key: "telegramUrl", label: "Enlace de Telegram", kind: "text" },
];

interface Ctx {
  settings: AppSettings;
  rowId: string | null;
  refresh: () => Promise<void>;
  save: (patch: Partial<AppSettings>) => Promise<void>;
}

const AppSettingsContext = createContext<Ctx>({
  settings: DEFAULT_SETTINGS,
  rowId: null,
  refresh: async () => {},
  save: async () => {},
});

function merge(data: any): AppSettings {
  const out = { ...DEFAULT_SETTINGS };
  if (data && typeof data === "object") {
    for (const k of Object.keys(DEFAULT_SETTINGS) as (keyof AppSettings)[]) {
      const v = data[k];
      if (typeof v === "string" && v.trim() !== "") out[k] = v;
    }
  }
  return out;
}

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const cached = localStorage.getItem("app_settings_cache");
      return cached ? merge(JSON.parse(cached)) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });
  const [rowId, setRowId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from("app_settings")
      .select("id, data")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return;
    setRowId(data.id);
    setSettings(merge(data.data));
    try { localStorage.setItem("app_settings_cache", JSON.stringify(data.data || {})); } catch {}
  }, []);

  useEffect(() => {
    refresh();
    const ch = (supabase as any)
      .channel("app_settings_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "app_settings" }, () => refresh())
      .subscribe();
    return () => { (supabase as any).removeChannel(ch); };
  }, [refresh]);

  const save = useCallback(async (patch: Partial<AppSettings>) => {
    const next = { ...settings, ...patch };
    const payload: Record<string, string> = {};
    for (const k of Object.keys(DEFAULT_SETTINGS) as (keyof AppSettings)[]) {
      payload[k] = next[k];
    }
    if (rowId) {
      const { error } = await (supabase as any)
        .from("app_settings")
        .update({ data: payload, updated_at: new Date().toISOString() })
        .eq("id", rowId);
      if (error) throw error;
    } else {
      const { data, error } = await (supabase as any)
        .from("app_settings")
        .insert({ data: payload })
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (data) setRowId(data.id);
    }
    setSettings(next as AppSettings);
    try { localStorage.setItem("app_settings_cache", JSON.stringify(payload)); } catch {}
  }, [settings, rowId]);

  return (
    <AppSettingsContext.Provider value={{ settings, rowId, refresh, save }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  return useContext(AppSettingsContext);
}

export async function uploadSettingsFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "bin";
  const path = `settings/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("channel").upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  const { data } = (supabase as any).storage.from("channel").getPublicUrl(path);
  return data.publicUrl as string;
}
