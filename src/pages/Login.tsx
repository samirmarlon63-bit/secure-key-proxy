import { useEffect, useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import VideoBackground from "@/components/VideoBackground";
import VerifiedBadge from "@/components/VerifiedBadge";
import VideoModal from "@/components/VideoModal";
import { Shield, Lock, Fingerprint, User, KeyRound, PlayCircle } from "lucide-react";
import { activateKey, isUserBlocked } from "@/lib/keys";
import { RAVE_LOGO, EXAMPLE_VIDEO, RAVE_MASCOT } from "@/lib/assets";

const Login = () => {
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
    if (!cleanName) { setError("Insira seu nome de usuário."); return; }
    if (!cleanKey) { setError("Insira sua key de acesso."); return; }

    setLoading(true);
    try {
      if (await isUserBlocked(cleanKey)) {
        setError("Esta key está bloqueada. Contate o administrador.");
        setLoading(false);
        return;
      }
      const k = await activateKey(cleanKey, cleanName);
      if (!k) {
        setError("Key inválida ou expirada. Verifique e tente novamente.");
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
      setError("Erro de conexão. Tente novamente.");
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
          <div className="relative mb-3">
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

        <form onSubmit={onSubmit} className="glass-card p-5 glow-border space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border/30">
            <div className="w-8 h-8 rounded-lg bg-secondary/60 border border-border/40 flex items-center justify-center">
              <Shield className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <span className="text-xs text-foreground font-semibold block">Acesso Seguro</span>
              <span className="text-[9px] text-muted-foreground/60">Insira suas credenciais</span>
            </div>
          </div>

          {error && (
            <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-2.5">{error}</p>
          )}

          <div>
            <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-medium mb-1 block">Usuário</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
              <input
                type="text"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="username"
                className="w-full bg-secondary/40 border border-border/50 rounded-lg pl-10 pr-4 py-2.5 text-base text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-medium mb-1 block">Key de acesso</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
              <input
                type="text"
                placeholder="RAVE-XXXX-XXXX"
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
            {loading ? "Verificando..." : "Entrar"}
          </button>

          {/* Función Ejemplo — elegant compact button */}
          <button
            type="button"
            onClick={() => setVideoOpen(true)}
            className="group w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium tracking-wide text-white/90 active:scale-[0.98] transition-all"
            style={{
              background:
                "linear-gradient(140deg, rgba(29,155,240,0.18), rgba(29,155,240,0.06))",
              border: "1px solid rgba(120,190,255,0.35)",
              boxShadow:
                "0 0 0 1px rgba(29,155,240,0.15) inset, 0 6px 20px rgba(29,155,240,0.18)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          >
            <PlayCircle className="w-4 h-4 text-[#4db8ff] group-hover:text-white transition-colors" />
            <span>Função Ejemplo</span>
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-[9px] text-muted-foreground/40 leading-relaxed">
            Sistema de Configuração de Proxy Seguro — Conexão Criptografada
            <br />Todas as sessões são monitoradas e protegidas.
          </p>
        </div>
      </div>

      <VideoModal
        open={videoOpen}
        onClose={() => setVideoOpen(false)}
        src={EXAMPLE_VIDEO}
        title="Função Ejemplo"
      />
    </div>
  );
};

export default Login;
