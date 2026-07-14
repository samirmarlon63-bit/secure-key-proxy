import { useEffect, useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import VideoBackground from "@/components/VideoBackground";
import VerifiedBadge from "@/components/VerifiedBadge";
import VideoModal from "@/components/VideoModal";
import { Shield, Globe, User, KeyRound, PlayCircle, ShoppingCart, X, ArrowRight } from "lucide-react";
import { activateKey, isUserBlocked } from "@/lib/keys";
import { LOGIN_AVATAR, EXAMPLE_VIDEO, RAVE_MASCOT, PANEL_REESEND } from "@/lib/assets";
import { useI18n, LANGUAGES } from "@/lib/i18n";

// Shared glassmorphism style for floating elements — subtle transparency + blue border
const glass = {
  background: "rgba(10,20,40,0.28)",
  border: "1px solid rgba(120,190,255,0.45)",
  backdropFilter: "blur(14px) saturate(140%)",
  WebkitBackdropFilter: "blur(14px) saturate(140%)",
  boxShadow: "0 8px 24px -12px rgba(0,120,255,0.35), 0 0 0 1px rgba(29,155,240,0.12) inset",
} as const;

const Login = () => {
  const { t, lang, setLang } = useI18n();
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);
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
    const cleanKey = key.replace(/\D/g, '');
    if (!cleanName || !cleanKey) { setError("Error"); return; }

    setLoading(true);
    try {
      if (await isUserBlocked(cleanKey)) {
        setError("Error");
        setLoading(false);
        return;
      }
      const k = await activateKey(cleanKey, cleanName);
      if (!k) {
        setError("Error");
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
      setError("Error");
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-5 py-8">
      <VideoBackground />

      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700;800&display=swap"
        rel="stylesheet"
      />

      {/* Very light global blur behind content for legibility */}
      <div
        aria-hidden
        className="fixed inset-0 z-0 pointer-events-none"
        style={{ backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)", background: "rgba(0,0,0,0.15)" }}
      />

      <form
        onSubmit={onSubmit}
        className="relative z-10 w-full max-w-sm flex flex-col items-center gap-5"
        style={{ animation: "loginFadeSlide 0.7s cubic-bezier(0.16,1,0.3,1) both" }}
      >
        <style>{`
          @keyframes loginFadeSlide { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
          .login-item { animation: loginFadeSlide 0.7s cubic-bezier(0.16,1,0.3,1) both; }
          .login-item:nth-child(1) { animation-delay: 0.05s; }
          .login-item:nth-child(2) { animation-delay: 0.12s; }
          .login-item:nth-child(3) { animation-delay: 0.19s; }
          .login-item:nth-child(4) { animation-delay: 0.26s; }
          .login-item:nth-child(5) { animation-delay: 0.33s; }
          .login-item:nth-child(6) { animation-delay: 0.40s; }
          .login-item:nth-child(7) { animation-delay: 0.47s; }
          .login-input:focus { border-color: rgba(120,200,255,0.9) !important; box-shadow: 0 0 0 3px rgba(29,155,240,0.25), 0 8px 24px -12px rgba(0,120,255,0.4) !important; }
          .login-btn { transition: transform 0.18s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s ease, filter 0.25s ease; }
          .login-btn:hover { transform: translateY(-1px); filter: brightness(1.08); }
          .login-btn:active { transform: scale(0.97); }
        `}</style>

        {/* Avatar */}
        <div className="login-item relative flex items-center justify-center">
          <div
            className="p-[3px] rounded-full"
            style={{
              background: "conic-gradient(from 0deg, #00b8ff, #4ddcff, #0066ff, #00b8ff, #1e90ff)",
              boxShadow: "0 0 32px rgba(0,184,255,0.55), 0 0 12px rgba(77,220,255,0.5)",
            }}
          >
            <div className="p-[2px] rounded-full bg-background/60 backdrop-blur-md">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-black">
                <img src={LOGIN_AVATAR} alt="Reseend" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="login-item flex flex-col items-center gap-1">
          <div className="flex items-center gap-1.5">
            <h1
              className="text-4xl font-extrabold tracking-tight"
              style={{
                fontFamily: "'Space Grotesk', system-ui, sans-serif",
                background: "linear-gradient(180deg, #ffffff 0%, #9fd0ff 55%, #4db8ff 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                letterSpacing: "-0.03em",
                textShadow: "0 2px 20px rgba(0,120,255,0.25)",
              }}
            >
              Reseend
            </h1>
            <VerifiedBadge size={22} />
          </div>
          <p className="text-[10px] text-white/50 tracking-[0.25em] uppercase font-medium">
            {t("secureGateway")}
          </p>
        </div>

        {/* Language selector — floating */}
        <div className="login-item relative">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sky-300 pointer-events-none z-10" />
          <select
            aria-label={t("language")}
            value={lang}
            onChange={(e) => setLang(e.target.value as typeof lang)}
            className="login-input appearance-none rounded-full pl-9 pr-4 py-2 text-[11px] text-white focus:outline-none transition-all"
            style={glass}
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code} className="bg-background text-foreground">
                {l.label}
              </option>
            ))}
          </select>
        </div>

        {/* Error — compact, only when present */}
        {error && (
          <div
            className="login-item text-[11px] text-red-100 px-3 py-1.5 rounded-full font-medium"
            style={{
              background: "rgba(220,40,60,0.18)",
              border: "1px solid rgba(255,120,140,0.5)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            }}
          >
            {error}
          </div>
        )}

        {/* User input — floating glass */}
        <div className="login-item w-full">
          <label className="text-[10px] text-white/50 uppercase tracking-[0.2em] font-semibold mb-2 block pl-1">
            {t("user")}
          </label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-200/70" />
            <input
              type="text"
              placeholder={t("userPlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="username"
              className="login-input w-full rounded-2xl pl-11 pr-4 py-3.5 text-base text-white placeholder:text-white/35 focus:outline-none transition-all"
              style={glass}
            />
          </div>
        </div>

        {/* Access key — floating glass */}
        <div className="login-item w-full">
          <label className="text-[10px] text-white/50 uppercase tracking-[0.2em] font-semibold mb-2 block pl-1">
            {t("accessKey")}
          </label>
          <div className="relative">
            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-200/70" />
            <input
              type="text"
              placeholder={t("keyPlaceholder")}
              value={key}
              onChange={(e) => setKey(e.target.value.replace(/\D/g, '').slice(0, 8))}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              autoComplete="off"
              className="login-input w-full rounded-2xl pl-11 pr-4 py-3.5 text-base font-mono tracking-[0.2em] text-white placeholder:text-white/35 focus:outline-none transition-all"
              style={glass}
            />
          </div>
        </div>

        {/* Enter */}
        <button
          type="submit"
          disabled={loading}
          className="login-item login-btn w-full py-3.5 rounded-2xl text-sm font-bold tracking-wide text-white disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(210,235,255,0.9) 100%)",
            color: "#04122a",
            border: "1px solid rgba(255,255,255,0.6)",
            boxShadow: "0 10px 28px -10px rgba(120,190,255,0.55), 0 0 0 1px rgba(29,155,240,0.2) inset",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
          }}
        >
          {loading ? t("verifying") : t("enter")}
        </button>

        {/* Comprar Key */}
        <button
          type="button"
          onClick={() => setBuyOpen(true)}
          className="login-item login-btn relative w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-sm font-bold tracking-wide text-white overflow-visible"
          style={{
            background: "linear-gradient(135deg, rgba(6,18,43,0.55) 0%, rgba(11,111,209,0.7) 55%, rgba(77,196,255,0.75) 100%)",
            border: "1px solid rgba(120,200,255,0.7)",
            backdropFilter: "blur(14px) saturate(150%)",
            WebkitBackdropFilter: "blur(14px) saturate(150%)",
            boxShadow: "0 0 0 1px rgba(29,155,240,0.3) inset, 0 0 24px rgba(29,155,240,0.45), 0 14px 32px -12px rgba(29,155,240,0.6)",
          }}
        >
          <ShoppingCart className="w-[18px] h-[18px]" />
          <span>Comprar Key</span>

          <img
            src={RAVE_MASCOT}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="pointer-events-none select-none absolute -bottom-5 -right-4 w-20 h-auto"
            style={{ filter: "drop-shadow(0 10px 18px rgba(0,120,255,0.4))", transform: "scaleX(-1)" }}
          />
        </button>

        {/* Ver demostración */}
        <button
          type="button"
          onClick={() => setVideoOpen(true)}
          className="login-item login-btn w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-sm font-semibold tracking-wide text-white"
          style={{
            background: "linear-gradient(135deg, rgba(10,42,85,0.5) 0%, rgba(11,111,209,0.55) 55%, rgba(29,155,240,0.6) 100%)",
            border: "1px solid rgba(120,190,255,0.55)",
            backdropFilter: "blur(14px) saturate(140%)",
            WebkitBackdropFilter: "blur(14px) saturate(140%)",
            boxShadow: "0 0 0 1px rgba(29,155,240,0.18) inset, 0 10px 26px -10px rgba(29,155,240,0.5)",
          }}
        >
          <PlayCircle className="w-[18px] h-[18px]" />
          <span>{t("seeDemo")}</span>
        </button>

        <p className="login-item text-[9px] text-white/35 leading-relaxed text-center pt-2">
          {t("footer")}<br />{t("footer2")}
        </p>
      </form>

      <VideoModal
        open={videoOpen}
        onClose={() => setVideoOpen(false)}
        src={EXAMPLE_VIDEO}
        title={t("demo")}
      />

      {buyOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center px-5 animate-fade-in"
          style={{ background: "rgba(2,6,20,0.75)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}
          onClick={() => setBuyOpen(false)}
        >
          <button
            onClick={() => setBuyOpen(false)}
            aria-label="Cerrar"
            className="absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 active:scale-95 border border-white/15 text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>

          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[340px] animate-scale-in"
          >
            <div
              className="rounded-2xl p-5 space-y-4"
              style={{
                background: "linear-gradient(180deg, rgba(10,20,40,0.85) 0%, rgba(6,12,26,0.9) 100%)",
                border: "1.5px solid rgba(77,184,255,0.55)",
                boxShadow: "0 0 0 1px rgba(29,155,240,0.2) inset, 0 0 40px rgba(29,155,240,0.35), 0 20px 60px -14px rgba(0,120,255,0.55)",
              }}
            >
              <h2
                className="text-center text-lg font-bold tracking-tight"
                style={{
                  fontFamily: "'Space Grotesk', system-ui, sans-serif",
                  background: "linear-gradient(180deg, #ffffff 0%, #9fd0ff 60%, #4db8ff 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Panel Reesend
              </h2>

              <div
                className="relative rounded-xl overflow-hidden bg-black"
                style={{
                  border: "1.5px solid rgba(77,184,255,0.6)",
                  boxShadow: "0 10px 30px -10px rgba(29,155,240,0.55), 0 0 0 1px rgba(29,155,240,0.18) inset",
                }}
              >
                <img src={PANEL_REESEND} alt="Panel Reesend" loading="eager" decoding="async" className="w-full h-auto block" />
              </div>

              <button
                type="button"
                onClick={() => {
                  window.open("https://t.me/wildzinv_bot", "_blank", "noopener,noreferrer");
                  setBuyOpen(false);
                }}
                className="relative w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-base font-bold tracking-wide text-white active:scale-[0.98] transition-transform"
                style={{
                  background: "linear-gradient(135deg, #06122b 0%, #0b6fd1 50%, #4dc4ff 100%)",
                  border: "1px solid rgba(120,200,255,0.7)",
                  boxShadow: "0 0 0 1px rgba(29,155,240,0.35) inset, 0 0 22px rgba(29,155,240,0.55), 0 14px 34px -10px rgba(29,155,240,0.7)",
                }}
              >
                Continuar
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
