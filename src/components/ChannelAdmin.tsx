import { useEffect, useState } from "react";
import { Pin, Trash2, Plus, Save, Upload, Rss, Image as ImageIcon, User, Edit2 } from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";
import { PROFILE_AVATAR } from "@/lib/assets";
import {
  listAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  togglePinAnnouncement,
  uploadChannelMedia,
  getAdminProfile,
  updateAdminProfile,
  uploadAdminAvatar,
  type Announcement,
  type AdminProfile,
} from "@/lib/channel";

export default function ChannelAdmin() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(false);

  // New announcement form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [pinned, setPinned] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string | null>(null);

  // Profile edit state
  const [profileEditing, setProfileEditing] = useState(false);
  const [pName, setPName] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [pVerified, setPVerified] = useState(true);
  const [pAvatar, setPAvatar] = useState<string | null>(null);

  const refresh = async () => {
    const [a, p] = await Promise.all([listAnnouncements(), getAdminProfile()]);
    setItems(a);
    setProfile(p);
    if (p) {
      setPName(p.name);
      setPDesc(p.description || "");
      setPVerified(p.verified);
      setPAvatar(p.avatar_url);
    }
  };
  useEffect(() => { refresh(); }, []);

  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setLoading(true);
    try {
      const { url, type } = await uploadChannelMedia(f);
      setMediaUrl(url);
      setMediaType(type);
    } catch (err: any) {
      alert("Error al subir: " + err.message);
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  const handlePublish = async () => {
    if (!title.trim()) { alert("Título requerido"); return; }
    setLoading(true);
    try {
      await createAnnouncement({
        title: title.trim(),
        description: description.trim() || null,
        media_url: mediaUrl,
        media_type: mediaType,
        link_url: linkUrl.trim() || null,
        link_label: linkLabel.trim() || null,
        pinned,
      });
      setTitle(""); setDescription(""); setLinkUrl(""); setLinkLabel("");
      setPinned(false); setMediaUrl(null); setMediaType(null);
      await refresh();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setLoading(true);
    try {
      const url = await uploadAdminAvatar(f);
      setPAvatar(url);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      await updateAdminProfile(profile.id, {
        name: pName.trim() || "Reseend",
        description: pDesc.trim() || null,
        verified: pVerified,
        avatar_url: pAvatar,
      });
      setProfileEditing(false);
      await refresh();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
      {/* Profile card */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-mono font-medium">admin_profile</span>
          <button
            onClick={() => setProfileEditing(v => !v)}
            className="ml-auto text-[10px] font-mono text-red-400 hover:text-red-300 flex items-center gap-1"
          >
            <Edit2 className="w-3 h-3" /> {profileEditing ? "Cancelar" : "Editar"}
          </button>
        </div>

        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-14 h-14 rounded-full overflow-hidden shrink-0"
            style={{ boxShadow: "0 0 0 2px rgba(255,60,60,0.9), 0 0 18px rgba(255,60,60,0.55)" }}
          >
            <img src={pAvatar || profile?.avatar_url || PROFILE_AVATAR} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-foreground truncate">{profile?.name || "Reseend"}</span>
              {profile?.verified && <VerifiedBadge className="w-3.5 h-3.5" />}
            </div>
            <p className="text-[11px] text-muted-foreground truncate">{profile?.description}</p>
          </div>
        </div>

        {profileEditing && (
          <div className="space-y-3 border-t border-border/40 pt-3">
            <label className="block">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Nombre</span>
              <input
                value={pName}
                onChange={e => setPName(e.target.value)}
                className="mt-1 w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Descripción</span>
              <textarea
                value={pDesc}
                onChange={e => setPDesc(e.target.value)}
                rows={2}
                className="mt-1 w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={pVerified} onChange={e => setPVerified(e.target.checked)} />
              Mostrar insignia verificada
            </label>
            <div className="flex items-center gap-2">
              <label className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-secondary/40 border border-border cursor-pointer text-xs font-mono text-muted-foreground hover:text-foreground">
                <Upload className="w-3.5 h-3.5" /> Cambiar avatar
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </label>
              <button
                onClick={handleSaveProfile}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-mono font-medium active:scale-95 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" /> Guardar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New announcement */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Plus className="w-4 h-4 text-red-400" />
          <span className="text-sm font-mono font-medium">nuevo_comunicado</span>
        </div>

        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Título"
          className="w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Descripción / contenido"
          rows={3}
          className="w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            placeholder="Enlace (opcional)"
            className="bg-secondary/40 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <input
            value={linkLabel}
            onChange={e => setLinkLabel(e.target.value)}
            placeholder="Texto del botón"
            className="bg-secondary/40 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {mediaUrl && (
          <div className="rounded-lg overflow-hidden border border-red-500/40 max-h-40">
            {mediaType === "video" ? (
              <video src={mediaUrl} className="w-full" controls playsInline />
            ) : (
              <img src={mediaUrl} alt="" className="w-full object-cover" />
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <label className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-secondary/40 border border-border cursor-pointer text-xs font-mono text-muted-foreground hover:text-foreground">
            <ImageIcon className="w-3.5 h-3.5" /> {mediaUrl ? "Reemplazar" : "Subir imagen/video"}
            <input type="file" accept="image/*,video/*" className="hidden" onChange={handleMediaSelect} />
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground px-3 py-2 rounded-lg border border-border cursor-pointer">
            <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} />
            <Pin className="w-3 h-3" /> Fijar
          </label>
        </div>

        <button
          onClick={handlePublish}
          disabled={loading || !title.trim()}
          className="w-full bg-primary text-primary-foreground font-mono font-medium py-2.5 rounded-lg text-sm active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Rss className="w-4 h-4" /> Publicar
        </button>
      </div>

      {/* Existing announcements */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Rss className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-mono font-medium">comunicados [{items.length}]</span>
        </div>

        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">Aún no hay comunicados.</p>
        ) : (
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-0.5">
            {items.map(a => (
              <div
                key={a.id}
                className="rounded-xl border p-3 bg-background/40"
                style={{ borderColor: "rgba(255,60,60,0.35)" }}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-sm font-semibold text-foreground leading-tight">{a.title}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => togglePinAnnouncement(a.id, !a.pinned).then(refresh)}
                      className={`p-1.5 rounded-md ${a.pinned ? "bg-red-500/20 text-red-400" : "bg-secondary/40 text-muted-foreground"} hover:opacity-80`}
                      title="Fijar"
                    >
                      <Pin className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => { if (confirm("¿Eliminar comunicado?")) deleteAnnouncement(a.id).then(refresh); }}
                      className="p-1.5 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                {a.description && <p className="text-[11px] text-muted-foreground line-clamp-2 mb-1">{a.description}</p>}
                <span className="text-[9px] text-muted-foreground/60 font-mono">
                  {new Date(a.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
