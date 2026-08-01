import { useEffect, useState } from "react";
import { Upload, Save, RotateCcw, Palette } from "lucide-react";
import {
  useAppSettings,
  uploadSettingsFile,
  SETTINGS_FIELDS,
  DEFAULT_SETTINGS,
  type AppSettings,
} from "@/lib/appSettings";

export default function AppearanceAdmin() {
  const { settings, save } = useAppSettings();
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [busy, setBusy] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setDraft(settings); }, [settings]);

  const setField = (k: keyof AppSettings, v: string) =>
    setDraft(d => ({ ...d, [k]: v }));

  const handleUpload = async (k: keyof AppSettings, file: File) => {
    setBusy(k);
    try {
      const url = await uploadSettingsFile(file);
      setField(k, url);
    } catch (err: any) {
      alert("Error al subir: " + err.message);
    } finally {
      setBusy(null);
    }
  };

  const handleSave = async () => {
    setBusy("save");
    try {
      await save(draft);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setBusy(null);
    }
  };

  const mediaFields = SETTINGS_FIELDS.filter(f => f.kind !== "text");
  const textFields = SETTINGS_FIELDS.filter(f => f.kind === "text");

  return (
    <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
      <div className="glass-card p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-red-400" />
          <span className="text-sm font-mono font-medium">recursos_visuales</span>
        </div>

        {mediaFields.map(({ key, label, kind }) => {
          const value = draft[key];
          return (
            <div key={key} className="rounded-xl border border-border/60 p-3 space-y-2 bg-background/40">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">{label}</span>

              {value && (
                <div
                  className="rounded-lg overflow-hidden bg-black max-h-32 flex items-center justify-center"
                  style={{ border: "1.5px solid rgba(255,60,60,0.5)" }}
                >
                  {kind === "video" ? (
                    <video src={value} className="w-full max-h-32 object-cover" muted playsInline controls />
                  ) : (
                    <img src={value} alt="" className="max-h-32 object-contain" />
                  )}
                </div>
              )}

              <input
                value={value}
                onChange={e => setField(key, e.target.value)}
                placeholder="URL del recurso"
                className="w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-[11px] font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />

              <div className="flex items-center gap-2">
                <label className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-secondary/40 border border-border cursor-pointer text-xs font-mono text-muted-foreground hover:text-foreground">
                  <Upload className="w-3.5 h-3.5" />
                  {busy === key ? "Subiendo…" : "Subir archivo"}
                  <input
                    type="file"
                    accept={kind === "video" ? "video/*" : "image/*"}
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(key, f); e.target.value = ""; }}
                  />
                </label>
                <button
                  onClick={() => setField(key, DEFAULT_SETTINGS[key])}
                  className="px-3 py-2 rounded-lg border border-border text-xs font-mono text-muted-foreground hover:text-foreground flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3 h-3" /> Original
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-mono font-medium">titulos_y_textos</span>
        </div>
        {textFields.map(({ key, label }) => (
          <label key={key} className="block">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">{label}</span>
            <input
              value={draft[key]}
              onChange={e => setField(key, e.target.value)}
              className="mt-1 w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </label>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={busy !== null}
        className="w-full bg-primary text-primary-foreground font-mono font-medium py-3 rounded-lg text-sm active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <Save className="w-4 h-4" />
        {busy === "save" ? "Guardando…" : saved ? "Guardado" : "Aplicar cambios"}
      </button>
      <p className="text-[10px] text-muted-foreground text-center">
        Los cambios se aplican al instante en toda la aplicación.
      </p>
    </div>
  );
}
