import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import VideoBackground from "@/components/VideoBackground";
import VerifiedBadge from "@/components/VerifiedBadge";
import { Shield, Lock, Fingerprint, Mail, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import defaultAvatar from "@/assets/profile-avatar.jpeg";

const Login = () => {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"choose" | "email" | "code">("choose");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        const u = session.user;
        const name = (u.user_metadata?.full_name as string) || (u.user_metadata?.name as string) || u.email || "Usuario";
        localStorage.setItem(
          "proxy_session",
          JSON.stringify({ name, key: "auth", type: "auth", expiresAt: null, duration: null })
        );
        navigate("/proxy");
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) navigate("/proxy");
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        setError("No se pudo iniciar sesión con Google.");
        setLoading(false);
      }
    } catch {
      setError("Error de conexión con Google.");
      setLoading(false);
    }
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !email.includes("@")) {
      setError("Ingresa un correo válido.");
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true, emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (err) {
      setError("No se pudo enviar el código. Intenta de nuevo.");
      return;
    }
    setMode("code");
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const c = code.trim();
    if (c.length < 6) {
      setError("Ingresa el código de 6 dígitos.");
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: c,
      type: "email",
    });
    setLoading(false);
    if (err) {
      setError("Código incorrecto o expirado.");
      return;
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4">
      <VideoBackground />

      <div className="relative z-10 w-full max-w-sm animate-fade-in-up">
        {/* Avatar with TikTok-style red story ring */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative mb-3">
            <div
              className="p-[3px] rounded-full"
              style={{
                background: "conic-gradient(from 0deg, #ff0050, #ff4d6d, #ff0050, #c9184a, #ff0050)",
                boxShadow: "0 0 24px rgba(255,0,80,0.55), 0 0 8px rgba(255,77,109,0.6)",
              }}
            >
              <div className="p-[2px] rounded-full bg-background">
                <div className="w-24 h-24 rounded-full overflow-hidden">
                  <img src={defaultAvatar} alt="Profile" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mb-1">
            <h1 className="text-lg font-bold text-foreground tracking-tight">Hermanos Gamers</h1>
            <VerifiedBadge />
          </div>
          <p className="text-[10px] text-muted-foreground/70 tracking-widest uppercase">Secure Gateway v2.4</p>
        </div>

        <div className="flex items-center justify-center gap-4 mb-5">
          {[
            { icon: Shield, label: "AES-256" },
            { icon: Lock, label: "TLS 1.3" },
            { icon: Fingerprint, label: "Auth" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-1.5 bg-secondary/40 border border-border/40 rounded-full px-3 py-1">
              <Icon className="w-3 h-3 text-emerald-400" />
              <span className="text-[9px] text-muted-foreground font-medium">{label}</span>
            </div>
          ))}
        </div>

        <div className="glass-card p-5 glow-border">
          <div className="flex items-center gap-2 mb-5 pb-3 border-b border-border/30">
            {mode !== "choose" && (
              <button
                type="button"
                onClick={() => { setMode(mode === "code" ? "email" : "choose"); setError(""); }}
                className="w-8 h-8 rounded-lg bg-secondary/60 border border-border/40 flex items-center justify-center hover:bg-secondary"
              >
                <ArrowLeft className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
            {mode === "choose" && (
              <div className="w-8 h-8 rounded-lg bg-secondary/60 border border-border/40 flex items-center justify-center">
                <Shield className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
            <div>
              <span className="text-xs text-foreground font-semibold block">
                {mode === "choose" && "Acceso Seguro"}
                {mode === "email" && "Acceso por correo"}
                {mode === "code" && "Verifica tu código"}
              </span>
              <span className="text-[9px] text-muted-foreground/60">
                {mode === "choose" && "Elige tu método de inicio de sesión"}
                {mode === "email" && "Te enviaremos un código a tu Gmail"}
                {mode === "code" && `Código enviado a ${email}`}
              </span>
            </div>
          </div>

          {error && (
            <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-2.5 mb-3">{error}</p>
          )}

          {mode === "choose" && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogle}
                disabled={loading}
                className="w-full bg-white text-gray-800 font-semibold py-3 rounded-lg text-sm hover:bg-gray-100 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3 border border-border/40"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continuar con Google
              </button>

              <div className="flex items-center gap-2 my-1">
                <div className="flex-1 h-px bg-border/40" />
                <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider">o</span>
                <div className="flex-1 h-px bg-border/40" />
              </div>

              <button
                type="button"
                onClick={() => { setMode("email"); setError(""); }}
                className="w-full bg-foreground text-background font-semibold py-3 rounded-lg text-sm hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" /> Recibir código por correo
              </button>
            </div>
          )}

          {mode === "email" && (
            <form onSubmit={handleSendCode} className="space-y-3">
              <div>
                <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-medium mb-1 block">Correo electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <input
                    type="email"
                    placeholder="tucorreo@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="w-full bg-secondary/40 border border-border/50 rounded-lg pl-10 pr-4 py-2.5 text-base text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-foreground text-background font-semibold py-2.5 rounded-lg text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? "Enviando..." : "Enviar código"}
              </button>
            </form>
          )}

          {mode === "code" && (
            <form onSubmit={handleVerifyCode} className="space-y-3">
              <div>
                <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-medium mb-1 block">Código de 6 dígitos</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="w-full bg-secondary/40 border border-border/50 rounded-lg px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-foreground text-background font-semibold py-2.5 rounded-lg text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? "Verificando..." : "Verificar y entrar"}
              </button>
              <button
                type="button"
                onClick={handleSendCode}
                disabled={loading}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Reenviar código
              </button>
            </form>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-[9px] text-muted-foreground/40 leading-relaxed">
            Secure Proxy Configuration System — Encrypted Connection
            <br />All sessions are monitored and protected.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
