import { useEffect, useState } from "react";
import { Pin, Rss, ExternalLink } from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";
import { PROFILE_AVATAR, AUTH_GLOBE } from "@/lib/assets";
import {
  listAnnouncements,
  getAdminProfile,
  type Announcement,
  type AdminProfile,
} from "@/lib/channel";

export default function ChannelView() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [a, p] = await Promise.all([listAnnouncements(), getAdminProfile()]);
      if (!mounted) return;
      setItems(a);
      setProfile(p);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  const avatar = profile?.avatar_url || PROFILE_AVATAR;
  const name = profile?.name || "Reseend";
  const desc = profile?.description || "Panel oficial Reseend";

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header / profile */}
      <div
        className="rounded-2xl p-4 border border-white/10 bg-black/50 backdrop-blur-xl"
        style={{ boxShadow: "0 10px 30px -12px rgba(0,0,0,0.6), 0 0 22px rgba(255,60,60,0.08)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="relative w-14 h-14 rounded-full overflow-hidden shrink-0"
            style={{
              boxShadow: "0 0 0 2px rgba(255,60,60,0.9), 0 0 18px rgba(255,60,60,0.55)",
            }}
          >
            <img src={avatar} alt={name} className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-foreground truncate">{name}</span>
              {profile?.verified !== false && <VerifiedBadge className="w-3.5 h-3.5" />}
            </div>
            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{desc}</p>
          </div>
          <img
            src={AUTH_GLOBE}
            alt=""
            className="w-6 h-6 object-contain shrink-0"
            style={{ filter: "drop-shadow(0 0 6px rgba(255,60,60,0.5))" }}
          />
        </div>
      </div>

      {/* Section title */}
      <div className="flex items-center gap-2 px-1">
        <Rss className="w-3.5 h-3.5 text-red-400" />
        <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">
          Canal
        </span>
      </div>

      {loading && (
        <div className="text-center text-xs text-muted-foreground py-10">Cargando…</div>
      )}

      {!loading && items.length === 0 && (
        <div className="text-center text-xs text-muted-foreground py-10 border border-dashed border-white/10 rounded-2xl">
          Aún no hay comunicados.
        </div>
      )}

      {items.map((a) => (
        <article
          key={a.id}
          className="rounded-2xl overflow-hidden border bg-black/50 backdrop-blur-xl"
          style={{
            borderColor: "rgba(255,60,60,0.55)",
            boxShadow:
              "0 10px 30px -14px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,60,60,0.15), 0 0 22px rgba(255,60,60,0.12)",
          }}
        >
          {a.media_url && (
            <div className="w-full max-h-[320px] overflow-hidden bg-black">
              {a.media_type === "video" ? (
                <video
                  src={a.media_url}
                  className="w-full h-full object-cover"
                  controls
                  playsInline
                  preload="metadata"
                />
              ) : (
                <img
                  src={a.media_url}
                  alt={a.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              )}
            </div>
          )}
          <div className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground leading-tight">
                {a.title}
              </h3>
              {a.pinned && (
                <span className="flex items-center gap-1 text-[9px] uppercase tracking-widest text-red-400 shrink-0 mt-0.5">
                  <Pin className="w-3 h-3" /> Fijado
                </span>
              )}
            </div>
            {a.description && (
              <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {a.description}
              </p>
            )}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-muted-foreground">
                {new Date(a.created_at).toLocaleString()}
              </span>
              {a.link_url && (
                <a
                  href={a.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-medium text-red-300 hover:text-red-200 transition-colors"
                >
                  {a.link_label || "Abrir"} <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
