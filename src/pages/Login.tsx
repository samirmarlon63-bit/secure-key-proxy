import { useEffect, useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import VideoBackground from "@/components/VideoBackground";
import VerifiedBadge from "@/components/VerifiedBadge";
import VideoModal from "@/components/VideoModal";
import { Shield, Lock, Globe, User, KeyRound, PlayCircle } from "lucide-react";
import { activateKey, isUserBlocked } from "@/lib/keys";
import { RAVE_LOGO, EXAMPLE_VIDEO, RAVE_MASCOT } from "@/lib/assets";
import { useI18n, LANGUAGES } from "@/lib/i18n";

const Login = () => {
  const { t, lang, setLang } = useI18n();
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const raw = localStorage.getItem("proxy_session");
    if (!raw) return;
    try {
      const session = JSON.parse(raw);
      if (session?.expiresAt && new Date(session.expiresAt).getTime() > Date.now()) navigate("/proxy", { replace: true });
      else localStorage.removeItem("proxy_session");
    } catch {
      localStorage.removeItem("proxy_session");
    }
  }, [navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const cleanName = name.trim();
    const cleanKey = key.replace(/[\u200B-\u200D\uFEFF\s]/g, '').trim().toUpperCase();
    if (!cleanName) { setError(t("errUser")); return; }
    if (!cleanKey) { setError(t("errKey")); return; }

    setLoading(true);
    try {
      if (await isUserBlocked(cleanKey)) {
        setError(t("errBlocked"));
        setLoading(false);
        return;
      }
      const k = await activateKey(cleanKey, cleanName);
      if (!k) {
        setError(t("errInvalid"));
        setLoading(false);
        return;
      }
      localStorage.setItem("proxy_session", JSON.stringify({
        name: cleanName,
        key: k.key,
        type: k.type,
        expiresAt: k.expiresAt,
        duration: k.duration,
      }));
      navigate("/proxy");
    } catch {
      setError(t("errConn"));
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4">
      <VideoBackground />

      {/* Font for the brand title */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap"
        rel="stylesheet"
      />

      <div className="relative z-10 w-full max-w-sm animate-fade-in-up">
        <div className="flex flex-col items-center mb-6">
          <div className="relative mb-3 flex items-center justify-center">
            <div
              className="p-[3px] rounded-full"
              style={{
                background: "conic-gradient(from 0deg, #00b8ff, #4ddcff, #0066ff, #00b8ff, #1e90ff)",
                boxShadow: "0 0 28px rgba(0,184,255,0.6), 0 0 10px rgba(77,220,255,0.55)",
              }}
            >
              <div className="p-[2px] rounded-full bg-background">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-black">
                  <img src={RAVE_LOGO} alt="Rave" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mb-1">
            <h1
              className="text-3xl font-bold tracking-tight"
              style={{
                fontFamily: "'Space Grotesk', system-ui, sans-serif",
                background: "linear-gradient(180deg, #ffffff 0%, #9fd0ff 60%, #4db8ff 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                letterSpacing: "-0.02em",
              }}
            >
              Rave
            </h1>
            <VerifiedBadge size={20} />
          </div>
          <p className="text-[10px] text-muted-foreground/70 tracking-widest uppercase">{t("secureGateway")}</p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-5 flex-wrap">
          {[
            { icon: Shield, label: t("aes") },
            { icon: Lock, label: t("tls") },
            { icon: Globe, label: t("auth") },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-1.5 bg-secondary/40 border border-border/40 rounded-full px-3 py-1">
              <Icon className="w-3 h-3 text-sky-400" />
              <span className="text-[9px] text-muted-foreground font-medium">{label}</span>
            </div>
          ))}
        </div>

        <form
          onSubmit={onSubmit}
          className="glass-card p-5 space-y-4 rounded-2xl"
          style={{
            border: "1.5px solid rgba(77,184,255,0.55)",
            boxShadow:
              "0 0 0 1px rgba(29,155,240,0.18) inset, 0 0 28px rgba(29,155,240,0.22), 0 12px 40px -12px rgba(0,120,255,0.45)",
          }}
        >
          <div className="flex items-center gap-2 pb-3 border-b border-sky-500/20">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-400/40 flex items-center justify-center">
              <Shield className="w-4 h-4 text-sky-300" />
            </div>
            <div className="flex-1">
              <span className="text-xs text-foreground font-semibold block">{t("secureAccess")}</span>
              <span className="text-[9px] text-muted-foreground/60">{t("enterCreds")}</span>
            </div>
            <div className="relative">
              <Globe className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sky-300 pointer-events-none" />
              <select
                aria-label={t("language")}
                value={lang}
                onChange={(e) => setLang(e.target.value as typeof lang)}
                className="appearance-none bg-secondary/60 border border-sky-400/30 rounded-md pl-7 pr-2 py-1 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-sky-400 max-w-[110px]"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code} className="bg-background text-foreground">
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-2.5">{error}</p>
          )}

          <div>
            <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-medium mb-1 block">{t("user")}</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
              <input
                type="text"
                placeholder={t("userPlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="username"
                className="w-full bg-secondary/40 border border-border/50 rounded-lg pl-10 pr-4 py-2.5 text-base text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-medium mb-1 block">{t("accessKey")}</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
              <input
                type="text"
                placeholder={t("keyPlaceholder")}
                value={key}
                onChange={(e) => setKey(e.target.value.toUpperCase())}
                autoComplete="off"
                className="w-full bg-secondary/40 border border-border/50 rounded-lg pl-10 pr-4 py-2.5 text-base font-mono tracking-wider text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-foreground text-background font-semibold py-3 rounded-lg text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? t("verifying") : t("enter")}
          </button>

          {/* Função Exemplo — premium button with mascot pointing at it */}
          <div className="relative pt-1">
            <button
              type="button"
              onClick={() => setVideoOpen(true)}
              className="relative group w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-semibold tracking-wide text-white overflow-hidden active:scale-[0.98] transition-transform"
              style={{
                background:
                  "linear-gradient(135deg, #0a2a55 0%, #0b6fd1 55%, #1d9bf0 100%)",
                border: "1px solid rgba(120,190,255,0.55)",
                boxShadow:
                  "0 0 0 1px rgba(29,155,240,0.25) inset, 0 10px 28px -8px rgba(29,155,240,0.55), 0 2px 8px rgba(0,0,0,0.4)",
              }}
            >
              {/* subtle sheen */}
              <span
                aria-hidden
                className="absolute inset-0 opacity-40"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.25), rgba(255,255,255,0) 45%)",
                }}
              />
              <PlayCircle className="relative w-[18px] h-[18px]" />
              <span className="relative">{t("seeDemo")}</span>
            </button>

            {/* Mascot pointing at the button — chroma-free PNG, static */}
            <img
              src={RAVE_MASCOT}
              alt=""
              aria-hidden="true"
              loading="eager"
              decoding="async"
              draggable={false}
              className="pointer-events-none select-none absolute -bottom-6 -right-3 w-24 h-auto z-10"
              style={{
                filter: "drop-shadow(0 10px 18px rgba(0,120,255,0.35))",
                transform: "scaleX(-1)",
              }}
            />
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-[9px] text-muted-foreground/40 leading-relaxed">
            {t("footer")}
            <br />{t("footer2")}
          </p>
        </div>
      </div>

      <VideoModal
        open={videoOpen}
        onClose={() => setVideoOpen(false)}
        src={EXAMPLE_VIDEO}
        title={t("demo")}
      />
    </div>
  );
};

export default Login;
