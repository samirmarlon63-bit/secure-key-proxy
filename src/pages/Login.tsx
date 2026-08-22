import { useEffect, useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import VideoBackground from "@/components/VideoBackground";
import VerifiedBadge from "@/components/VerifiedBadge";
import VideoModal from "@/components/VideoModal";
import { Shield, Lock, Globe, KeyRound, PlayCircle, ShoppingCart, X, ArrowRight, LogOut, Loader2 } from "lucide-react";
import { activateKey, isUserBlocked } from "@/lib/keys";
import { useAppSettings } from "@/lib/appSettings";
import ChannelView from "@/components/ChannelView";
import { useI18n, LANGUAGES } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

const Login = () => {
  const { t, lang, setLang } = useI18n();
  const { settings } = useAppSettings();
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [account, setAccount] = useState<{ name: string; email: string; avatar: string | null } | null>(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);
  const [channelOpen, setChannelOpen] = useState(false);
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

  // Google (OAuth 2.0 / OpenID Connect) session state
  useEffect(() => {
    const mapUser = (user: { user_metadata?: Record<string, unknown>; email?: string | null } | null) => {
      if (!user) return null;
      const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>;
      return {
        name: meta.full_name || meta.name || (user.email ?? "").split("@")[0] || "Usuario",
        email: user.email ?? "",
        avatar: meta.avatar_url || meta.picture || null,
      };
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAccount(mapUser(session?.user ?? null));
    });

    supabase.auth.getUser().then(({ data }) => {
      setAccount(mapUser(data.user));
      setAuthLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const onGoogle = async () => {
    setError("");
    setGoogleLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError("No se pudo iniciar sesión con Google");
      setGoogleLoading(false);
      return;
    }
    if (result.redirected) return;
    setGoogleLoading(false);
  };

  const onLogout = async () => {
    await supabase.auth.signOut();
    setAccount(null);
    setKey("");
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!account) return;
    const cleanName = account.name.trim();
    const cleanKey = key.replace(/\D/g, '');
    if (!cleanKey) { setError("Error"); return; }

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
            <span aria-hidden className="absolute inset-0 rounded-full pointer-events-none animate-avatar-wave" style={{ boxShadow: "0 0 0 0 rgba(255,59,59,0.55)" }} />
            <span aria-hidden className="absolute inset-0 rounded-full pointer-events-none animate-avatar-wave" style={{ boxShadow: "0 0 0 0 rgba(255,59,59,0.45)", animationDelay: "0.9s" }} />
            <div
              className="relative p-[3px] rounded-full animate-avatar-pulse"
              style={{
                background: "conic-gradient(from 0deg, #ff3b3b, #ff7a7a, #c81e1e, #ff3b3b, #ff4444)",
                boxShadow: "0 0 28px rgba(255,59,59,0.6), 0 0 10px rgba(255,122,122,0.55)",
              }}
            >
              <div className="p-[2px] rounded-full bg-background">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-black">
                  <img src={settings.loginAvatar} alt={settings.brandTitle} className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mb-1">
            <h1
              className="text-3xl font-bold tracking-tight"
              style={{
                fontFamily: "'Space Grotesk', system-ui, sans-serif",
                background: "linear-gradient(180deg, #ffffff 0%, #ffb3b3 60%, #ff4d4d 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                letterSpacing: "-0.02em",
              }}
            >
              {settings.brandTitle}
            </h1>
            <VerifiedBadge size={20} />
          </div>
          <p className="text-[10px] text-muted-foreground/70 tracking-widest uppercase">{settings.brandSubtitle || t("secureGateway")}</p>
        </div>

        {/* Acceso al Canal */}
        <button
          type="button"
          onClick={() => setChannelOpen(true)}
          className="w-full flex items-center gap-3 mb-4 px-4 py-3 rounded-2xl active:scale-[0.98] transition-transform"
          style={{
            background: "linear-gradient(180deg, rgba(40,10,10,0.7) 0%, rgba(26,6,6,0.75) 100%)",
            border: "1.5px solid rgba(255,77,77,0.5)",
            boxShadow: "0 0 22px rgba(240,29,29,0.25), 0 12px 30px -14px rgba(255,40,40,0.5)",
          }}
        >
          <img
            src={settings.authGlobe}
            alt=""
            className="w-7 h-7 object-contain shrink-0"
            style={{ filter: "drop-shadow(0 0 7px rgba(255,60,60,0.65))" }}
          />
          <span className="text-sm font-semibold text-foreground">{settings.channelTitle}</span>
          <span className="ml-auto flex items-center gap-1 text-[10px] text-red-300 font-medium">
            Abrir <ArrowRight className="w-3 h-3" />
          </span>
        </button>

        <div className="flex items-center justify-center gap-2 mb-5 flex-wrap">
          {[
            { icon: Shield, label: t("aes"), logo: null as string | null },
            { icon: Lock, label: t("tls"), logo: null as string | null },
            { icon: Globe, label: t("auth"), logo: settings.authGlobe },
          ].map(({ icon: Icon, label, logo }) => (
            <div key={label} className="flex items-center gap-1.5 bg-secondary/40 border border-border/40 rounded-full px-3 py-1">
              {logo ? (
                <img src={logo} alt="" className="w-4 h-4 object-contain" style={{ filter: "drop-shadow(0 0 4px rgba(255,60,60,0.55))" }} />
              ) : (
                <Icon className="w-3 h-3 text-red-400" />
              )}
              <span className="text-[9px] text-muted-foreground font-medium">{label}</span>
            </div>
          ))}
        </div>

        <form
          onSubmit={onSubmit}
          className="relative glass-card p-5 space-y-4 rounded-2xl overflow-hidden"
          style={{
            border: "1.5px solid rgba(255,77,77,0.55)",
            boxShadow:
              "0 0 0 1px rgba(240,29,29,0.18) inset, 0 0 32px rgba(240,29,29,0.28), 0 18px 50px -14px rgba(255,40,40,0.5)",
            background:
              "linear-gradient(180deg, rgba(40,10,10,0.72) 0%, rgba(26,6,6,0.78) 100%)",
          }}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(255,120,120,0.9), transparent)" }}
          />

          <div className="flex items-center gap-2 pb-3 border-b border-red-500/20">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-400/40 flex items-center justify-center">
              <Shield className="w-4 h-4 text-red-300" />
            </div>
            <div className="flex-1">
              <span className="text-xs text-foreground font-semibold block">{t("secureAccess")}</span>
              <span className="text-[9px] text-muted-foreground/60">{t("enterCreds")}</span>
            </div>
            <div className="relative">
              <Globe className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-red-300 pointer-events-none" />
              <select
                aria-label={t("language")}
                value={lang}
                onChange={(e) => setLang(e.target.value as typeof lang)}
                className="appearance-none bg-secondary/60 border border-red-400/30 rounded-md pl-7 pr-2 py-1 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-red-400 max-w-[110px]"
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

          {authLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 text-red-300 animate-spin" />
            </div>
          ) : !account ? (
            <button
              type="button"
              onClick={onGoogle}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 bg-white text-[#1f1f1f] font-semibold py-3 rounded-xl text-sm hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-60"
              style={{ boxShadow: "0 10px 26px -12px rgba(0,0,0,0.6)" }}
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z" />
                  <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A8.997 8.997 0 0 0 9 18z" />
                  <path fill="#FBBC05" d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.01-2.34z" />
                  <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A8.997 8.997 0 0 0 .96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58z" />
                </svg>
              )}
              <span>Continuar con Google</span>
            </button>
          ) : (
            <>
              <div
                className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,77,77,0.35)" }}
              >
                <div className="w-9 h-9 rounded-full overflow-hidden bg-black shrink-0 border border-red-400/40">
                  <img src={account.avatar || settings.loginAvatar} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-foreground truncate">{account.name}</span>
                  <span className="block text-[10px] text-muted-foreground/70 truncate">{account.email}</span>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  aria-label="Salir"
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 active:scale-95 border border-white/15 text-white transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-medium mb-1 block">{t("accessKey")}</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <input
                    type="text"
                    placeholder={t("keyPlaceholder")}
                    value={key}
                    onChange={(e) => setKey(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={8}
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
            </>
          )}


          {/* Comprar Key — premium CTA */}
          <button
            type="button"
            onClick={() => setBuyOpen(true)}
            className="relative w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-bold tracking-wide text-white overflow-hidden active:scale-[0.98] transition-transform"
            style={{
              background: "linear-gradient(135deg, #2b0606 0%, #c81e1e 50%, #ff5555 100%)",
              border: "1px solid rgba(255,120,120,0.7)",
              boxShadow:
                "0 0 0 1px rgba(240,29,29,0.35) inset, 0 0 22px rgba(240,29,29,0.55), 0 14px 34px -10px rgba(240,29,29,0.7)",
            }}
          >
            <span
              aria-hidden
              className="absolute inset-0 opacity-50 pointer-events-none"
              style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.28), rgba(255,255,255,0) 50%)" }}
            />
            <ShoppingCart className="relative w-[18px] h-[18px]" />
            <span className="relative">{settings.buyButtonLabel}</span>
          </button>

          {/* Función Exemplo — premium button with mascot pointing at it */}
          <div className="relative pt-1">
            <button
              type="button"
              onClick={() => setVideoOpen(true)}
              className="relative group w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-semibold tracking-wide text-white overflow-hidden active:scale-[0.98] transition-transform"
              style={{
                background:
                  "linear-gradient(135deg, #550a0a 0%, #c81e1e 55%, #f01d1d 100%)",
                border: "1px solid rgba(255,120,120,0.55)",
                boxShadow:
                  "0 0 0 1px rgba(240,29,29,0.25) inset, 0 10px 28px -8px rgba(240,29,29,0.55), 0 2px 8px rgba(0,0,0,0.4)",
              }}
            >
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

            <img
              src={settings.mascot}
              alt=""
              aria-hidden="true"
              loading="eager"
              decoding="async"
              draggable={false}
              className="pointer-events-none select-none absolute -bottom-6 -right-3 w-24 h-auto z-10"
              style={{
                filter: "drop-shadow(0 10px 18px rgba(255,40,40,0.35))",
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
        src={settings.demoVideo}
        title={t("demo")}
      />

      {channelOpen && (
        <div className="fixed inset-0 z-[9999] flex flex-col" style={{ background: "rgba(2,2,6,0.92)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
          <div className="flex items-center gap-3 px-4 py-3 border-b border-red-500/25 shrink-0">
            <img src={settings.authGlobe} alt="" className="w-6 h-6 object-contain" style={{ filter: "drop-shadow(0 0 6px rgba(255,60,60,0.6))" }} />
            <span className="text-sm font-semibold text-foreground">{settings.channelTitle}</span>
            <button
              onClick={() => setChannelOpen(false)}
              aria-label="Cerrar"
              className="ml-auto w-9 h-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 active:scale-95 border border-white/15 text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <ChannelView />
          </div>
        </div>
      )}

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
                background: "linear-gradient(180deg, rgba(40,10,10,0.85) 0%, rgba(26,6,6,0.9) 100%)",
                border: "1.5px solid rgba(255,77,77,0.55)",
                boxShadow:
                  "0 0 0 1px rgba(240,29,29,0.2) inset, 0 0 40px rgba(240,29,29,0.35), 0 20px 60px -14px rgba(255,40,40,0.55)",
              }}
            >
              <h2
                className="text-center text-lg font-bold tracking-tight"
                style={{
                  fontFamily: "'Space Grotesk', system-ui, sans-serif",
                  background: "linear-gradient(180deg, #ffffff 0%, #ffb3b3 60%, #ff4d4d 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  letterSpacing: "-0.01em",
                }}
              >
                {settings.buyTitle}
              </h2>

              <div
                className="relative rounded-xl overflow-hidden bg-black"
                style={{
                  border: "1.5px solid rgba(255,77,77,0.6)",
                  boxShadow: "0 10px 30px -10px rgba(240,29,29,0.55), 0 0 0 1px rgba(240,29,29,0.18) inset",
                }}
              >
                <img
                  src={settings.banner}
                  alt={settings.buyTitle}
                  loading="eager"
                  decoding="async"
                  className="w-full h-auto block"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  window.open(settings.telegramUrl, "_blank", "noopener,noreferrer");
                  setBuyOpen(false);
                }}
                className="relative w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-base font-bold tracking-wide text-white active:scale-[0.98] transition-transform"
                style={{
                  background: "linear-gradient(135deg, #2b0606 0%, #c81e1e 50%, #ff5555 100%)",
                  border: "1px solid rgba(255,120,120,0.7)",
                  boxShadow:
                    "0 0 0 1px rgba(240,29,29,0.35) inset, 0 0 22px rgba(240,29,29,0.55), 0 14px 34px -10px rgba(240,29,29,0.7)",
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
