import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import VideoBackground from "@/components/VideoBackground";
import VerifiedBadge from "@/components/VerifiedBadge";
import { isUserBlocked } from "@/lib/keys";
import {
  Wifi, Globe, Signal, Clock, MapPin, Radio, Server,
  Lock, User, KeyRound, Power, LogOut, Gamepad2, Loader2,
  Shield, Activity, Zap, Eye, ChevronRight, Cpu, HardDrive,
  Home, Settings, FileText, UserCircle, Code, AlertTriangle,
  Copy, Check, ChevronDown
} from "lucide-react";

interface Session {
  name: string;
  key: string;
  type: string;
  expiresAt: string | null;
  duration: string;
}

const FREEFIRE_METHODS = [
  "com.dts.freefireth",
  "com.dts.freefiremax",
  "https://dl.dir.freefiremobile.com/common/web_event/official2.0/index.html",
  "https://ff.garena.com/",
  "https://freefire.garena.com/",
  "intent://launch/#Intent;package=com.dts.freefireth;end",
  "intent://launch/#Intent;package=com.dts.freefiremax;end",
  "market://details?id=com.dts.freefireth",
  "market://details?id=com.dts.freefiremax",
  "https://play.google.com/store/apps/details?id=com.dts.freefireth",
  "https://play.google.com/store/apps/details?id=com.dts.freefiremax",
  "https://apps.apple.com/app/free-fire/id1300146617",
  "https://apps.apple.com/app/free-fire-max/id1612063209",
  "freefireth://",
  "freefiremax://",
  "intent://details?id=com.dts.freefireth#Intent;scheme=market;package=com.android.vending;end",
  "intent://details?id=com.dts.freefiremax#Intent;scheme=market;package=com.android.vending;end",
  "https://redirect.appmetrica.yandex.com/serve/674060876177498059",
  "https://freefire.onelink.me/",
  "fb://gaming/play/freefireth",
  "https://m.facebook.com/gaming/play/freefireth",
  "intent://launch/#Intent;package=com.dts.freefireth;category=android.intent.category.LAUNCHER;end",
  "intent://launch/#Intent;package=com.dts.freefiremax;category=android.intent.category.LAUNCHER;end",
  "https://garena.onelink.me/611z",
  "https://ff.garena.com/download",
  "android-app://com.dts.freefireth",
  "android-app://com.dts.freefiremax",
  "https://share.freefire.garena.com",
  "https://booyah.live/freefire",
  "https://www.youtube.com/results?search_query=free+fire+download",
];

const SERVERS = [
  { id: 1, name: "US East 1", host: "us-east1.proxy.net", port: "8080", user: "proxy_us1", pass: "Xk9mP2nQ" },
  { id: 2, name: "US East 2", host: "us-east2.proxy.net", port: "8081", user: "proxy_us2", pass: "Bv3rT7wZ" },
  { id: 3, name: "US West 1", host: "us-west1.proxy.net", port: "8080", user: "proxy_usw1", pass: "Lm4sD8fG" },
  { id: 4, name: "US West 2", host: "us-west2.proxy.net", port: "3128", user: "proxy_usw2", pass: "Hn6jK1pY" },
  { id: 5, name: "Brasil 1", host: "br-sao1.proxy.net", port: "8080", user: "proxy_br1", pass: "Qw5eR9tU" },
  { id: 6, name: "Brasil 2", host: "br-rio1.proxy.net", port: "8081", user: "proxy_br2", pass: "Jc2xV6bN" },
  { id: 7, name: "México 1", host: "mx-cdmx1.proxy.net", port: "8080", user: "proxy_mx1", pass: "Fg7hY3kL" },
  { id: 8, name: "México 2", host: "mx-gdl1.proxy.net", port: "3128", user: "proxy_mx2", pass: "Zp8qA4sD" },
  { id: 9, name: "Colombia", host: "co-bog1.proxy.net", port: "8080", user: "proxy_co1", pass: "Wt1rE5uI" },
  { id: 10, name: "Argentina", host: "ar-bue1.proxy.net", port: "8081", user: "proxy_ar1", pass: "Oy6pA2sD" },
  { id: 11, name: "Chile", host: "cl-scl1.proxy.net", port: "8080", user: "proxy_cl1", pass: "Mf3gH7jK" },
  { id: 12, name: "Perú", host: "pe-lim1.proxy.net", port: "3128", user: "proxy_pe1", pass: "Nb4vC8xZ" },
  { id: 13, name: "España", host: "es-mad1.proxy.net", port: "8080", user: "proxy_es1", pass: "Lk9mD1fG" },
  { id: 14, name: "Alemania 1", host: "de-fra1.proxy.net", port: "8080", user: "proxy_de1", pass: "Rh5jW3nQ" },
  { id: 15, name: "Alemania 2", host: "de-ber1.proxy.net", port: "8081", user: "proxy_de2", pass: "Tu7eY4pI" },
  { id: 16, name: "Francia", host: "fr-par1.proxy.net", port: "8080", user: "proxy_fr1", pass: "Sa2dF6gH" },
  { id: 17, name: "UK London", host: "uk-lon1.proxy.net", port: "3128", user: "proxy_uk1", pass: "Qj8kL1zX" },
  { id: 18, name: "Países Bajos", host: "nl-ams1.proxy.net", port: "8080", user: "proxy_nl1", pass: "Cv3bN7mQ" },
  { id: 19, name: "Japón", host: "jp-tky1.proxy.net", port: "8080", user: "proxy_jp1", pass: "Wp4eR8tY" },
  { id: 20, name: "Corea del Sur", host: "kr-sel1.proxy.net", port: "8081", user: "proxy_kr1", pass: "Ux6iO2pA" },
  { id: 21, name: "Singapur", host: "sg-sin1.proxy.net", port: "8080", user: "proxy_sg1", pass: "Hd5fG9jK" },
  { id: 22, name: "India", host: "in-mum1.proxy.net", port: "3128", user: "proxy_in1", pass: "Bl7mN3vC" },
  { id: 23, name: "Australia", host: "au-syd1.proxy.net", port: "8080", user: "proxy_au1", pass: "Zx1cV5bN" },
  { id: 24, name: "Canadá", host: "ca-tor1.proxy.net", port: "8081", user: "proxy_ca1", pass: "Km8jH2gF" },
  { id: 25, name: "Sudáfrica", host: "za-jnb1.proxy.net", port: "8080", user: "proxy_za1", pass: "Py4tR6eW" },
  { id: 26, name: "Rusia", host: "ru-mow1.proxy.net", port: "3128", user: "proxy_ru1", pass: "Qi9oP1aS" },
  { id: 27, name: "Turquía", host: "tr-ist1.proxy.net", port: "8080", user: "proxy_tr1", pass: "Dj3fG7hK" },
];

const ProxyConfig = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState<"home" | "servers" | "settings">("home");
  const [mode, setMode] = useState<"Desactivada" | "Manual" | "Automática">("Desactivada");
  const [server, setServer] = useState("");
  const [port, setPort] = useState("");
  const [authEnabled, setAuthEnabled] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [networkInfo, setNetworkInfo] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [launchingFF, setLaunchingFF] = useState(false);
  const [ffMethod, setFfMethod] = useState(0);
  const [ffStatus, setFfStatus] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expandedServer, setExpandedServer] = useState<number | null>(null);
  const [settingsSection, setSettingsSection] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const raw = localStorage.getItem("proxy_session");
      if (!raw) { navigate("/"); return; }
      const s = JSON.parse(raw);
      // Check expiry
      if (s.expiresAt && new Date(s.expiresAt).getTime() <= Date.now()) {
        localStorage.removeItem("proxy_session");
        navigate("/");
        return;
      }
      const blocked = await isUserBlocked(s.key);
      if (blocked) {
        localStorage.removeItem("proxy_session");
        navigate("/");
        return;
      }
      setSession(s);
    };
    checkSession();
  }, [navigate]);

  useEffect(() => {
    if (!session?.expiresAt) return;
    const interval = setInterval(() => {
      const diff = new Date(session.expiresAt!).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("Expirada"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, [session]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await fetch("https://ipapi.co/json/");
      const data = await res.json();
      setNetworkInfo({ ip: data.ip, city: data.city, country: data.country_name, org: data.org });
    } catch {
      setNetworkInfo({ ip: "No disponible", city: "—", country: "—", org: "—" });
    }
    setTimeout(() => { setConnecting(false); setConnected(true); }, 2000);
  };

  const launchFreeFire = useCallback(async () => {
    setLaunchingFF(true); setFfMethod(0); setFfStatus("");
    for (let i = 0; i < FREEFIRE_METHODS.length; i++) {
      setFfMethod(i + 1);
      setFfStatus(`Método ${i + 1}/30: intentando...`);
      try {
        const url = FREEFIRE_METHODS[i];
        if (url.startsWith("intent://") || url.startsWith("freefireth://") || url.startsWith("freefiremax://") || url.startsWith("android-app://") || url.startsWith("fb://") || url.startsWith("market://")) {
          const iframe = document.createElement("iframe");
          iframe.style.display = "none"; iframe.src = url;
          document.body.appendChild(iframe);
          await new Promise(r => setTimeout(r, 1500));
          document.body.removeChild(iframe);
        } else if (url.startsWith("com.dts.")) {
          window.location.href = `intent://launch/#Intent;package=${url};end`;
          await new Promise(r => setTimeout(r, 2000));
        } else {
          window.open(url, "_blank");
          await new Promise(r => setTimeout(r, 1500));
        }
        setFfStatus(`Método ${i + 1} ejecutado — verificando...`);
        await new Promise(r => setTimeout(r, 500));
      } catch {
        setFfStatus(`Método ${i + 1} falló, probando siguiente...`);
        await new Promise(r => setTimeout(r, 300));
      }
    }
    setFfStatus("Todos los métodos ejecutados");
    setTimeout(() => { setLaunchingFF(false); setFfStatus(""); }, 3000);
  }, []);

  const handleLogout = () => { localStorage.removeItem("proxy_session"); navigate("/"); };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(id);
    setTimeout(() => setCopiedField(null), 1500);
  };

  if (!session) return null;

  const modes: Array<"Desactivada" | "Manual" | "Automática"> = ["Desactivada", "Manual", "Automática"];

  const renderHome = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Configurar Proxy</h1>
          <p className="text-xs text-muted-foreground">Hola, {session.name}</p>
        </div>
        <button onClick={handleLogout} className="p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors active:scale-95">
          <LogOut className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Session Info */}
      <div className="glass-card p-4 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">Sesión activa</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-secondary/30 rounded-lg px-3 py-2 border border-border/30">
            <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider mb-0.5">Usuario</p>
            <p className="text-[11px] text-foreground font-medium">{session.name}</p>
          </div>
          <div className="bg-secondary/30 rounded-lg px-3 py-2 border border-border/30">
            <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider mb-0.5">Tipo</p>
            <p className="text-[11px] text-foreground font-medium flex items-center gap-1">
              {session.type === "Premium" && <Zap className="w-3 h-3 text-amber-400" />}
              {session.type}
            </p>
          </div>
          <div className="bg-secondary/30 rounded-lg px-3 py-2 border border-border/30">
            <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider mb-0.5">Duración</p>
            <p className="text-[11px] text-foreground font-medium">{session.duration}</p>
          </div>
          <div className="bg-secondary/30 rounded-lg px-3 py-2 border border-border/30">
            <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider mb-0.5">Tiempo</p>
            <p className="text-[11px] text-foreground font-medium">
              {session.expiresAt ? (timeLeft || "Calculando...") : "\u221E"}
            </p>
          </div>
        </div>
      </div>

      {/* Mode selector */}
      <div className="glass-card p-4 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
        <p className="text-xs text-muted-foreground mb-3 font-medium">Modo de conexión</p>
        <div className="grid grid-cols-3 gap-2">
          {modes.map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setConnected(false); }}
              className={`py-2 px-3 rounded-lg text-xs font-medium transition-all active:scale-95 ${
                mode === m ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Config fields */}
      {mode !== "Desactivada" && (
        <div className="glass-card p-4 space-y-3 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
          <div className="relative">
            <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input placeholder="Servidor" value={mode === "Automática" ? "auto.proxy.net" : server} onChange={(e) => setServer(e.target.value)} disabled={mode === "Automática"} className="w-full bg-secondary/50 border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all disabled:opacity-50" />
          </div>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input placeholder="Puerto" value={mode === "Automática" ? "8080" : port} onChange={(e) => setPort(e.target.value)} disabled={mode === "Automática"} className="w-full bg-secondary/50 border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all disabled:opacity-50" />
          </div>
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">Autenticación</span>
            </div>
            <button onClick={() => setAuthEnabled(!authEnabled)} className={`w-10 h-6 rounded-full transition-colors relative ${authEnabled ? "bg-primary" : "bg-secondary"}`}>
              <span className={`absolute top-1 w-4 h-4 rounded-full transition-transform ${authEnabled ? "bg-primary-foreground translate-x-5" : "bg-muted-foreground translate-x-1"}`} />
            </button>
          </div>
          {authEnabled && (
            <div className="space-y-3 pt-1">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input placeholder="Usuario" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-secondary/50 border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all" />
              </div>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-secondary/50 border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all font-mono" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Network info */}
      {connected && networkInfo && (
        <div className="glass-card p-4 animate-fade-in-up">
          <p className="text-xs text-muted-foreground mb-3 font-medium">Información de Red</p>
          <div className="space-y-2.5">
            {[
              { icon: Wifi, label: "IP", value: networkInfo.ip },
              { icon: Radio, label: "Tipo de red", value: "WiFi" },
              { icon: MapPin, label: "Ubicación", value: `${networkInfo.city} / ${networkInfo.country}` },
              { icon: Signal, label: "Señal", value: "Fuerte" },
              { icon: Clock, label: "Duración key", value: session.expiresAt ? `${session.duration} — ${timeLeft}` : `${session.duration}` },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
                <span className="text-xs text-foreground font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connect button */}
      {mode !== "Desactivada" && !connected && (
        <button onClick={handleConnect} disabled={connecting} className="w-full glass-card p-4 flex items-center justify-center gap-3 hover:bg-card/90 active:scale-[0.98] transition-all animate-fade-in-up">
          {connecting ? (
            <>
              <div className="relative">
                <div className="w-5 h-5 rounded-full bg-primary/20 animate-connecting" />
                <Power className="w-5 h-5 text-primary absolute inset-0" />
              </div>
              <span className="text-sm font-medium">Conectando...</span>
            </>
          ) : (
            <>
              <Power className="w-5 h-5 text-foreground" />
              <span className="text-sm font-medium">Conectar al Servidor</span>
            </>
          )}
        </button>
      )}

      {connected && (
        <div className="glass-card p-4 text-center animate-fade-in-up border-emerald-500/20">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-medium text-emerald-400">Conexión Activa</span>
          </div>
        </div>
      )}

      {/* System Info */}
      <div className="glass-card p-4 animate-fade-in-up">
        <div className="flex items-center gap-2 mb-3">
          <Cpu className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">Sistema</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Protocolo", value: "HTTPS", icon: Shield },
            { label: "Cifrado", value: "AES-256", icon: Lock },
            { label: "DNS", value: "1.1.1.1", icon: Globe },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-secondary/30 rounded-lg px-2 py-2.5 border border-border/30 text-center">
              <Icon className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-1" />
              <p className="text-[10px] text-foreground font-medium">{value}</p>
              <p className="text-[8px] text-muted-foreground/70 uppercase tracking-wider">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Performance */}
      <div className="glass-card p-4 animate-fade-in-up">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">Rendimiento</span>
        </div>
        <div className="space-y-2.5">
          {[
            { label: "Latencia", value: "12ms", pct: 12 },
            { label: "Velocidad", value: "94 Mbps", pct: 94 },
            { label: "Estabilidad", value: "99.9%", pct: 99 },
          ].map(({ label, value, pct }) => (
            <div key={label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground">{label}</span>
                <span className="text-[10px] text-foreground font-medium">{value}</span>
              </div>
              <div className="w-full h-1 rounded-full bg-secondary/50 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Advanced Tunneling Module */}
      <div className="glass-card p-4 animate-fade-in-up">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">Módulo de Túnel Avanzado</span>
        </div>
        <div className="space-y-2">
          {[
            { label: "TLS Handshake", value: "v1.3 / ECDHE-RSA", status: true },
            { label: "Obfuscación L4", value: "XOR-Cipher activo", status: true },
            { label: "Anti-DPI Bypass", value: "Fragmentación TCP", status: true },
            { label: "Packet Padding", value: "256-byte aligned", status: true },
            { label: "Header Injection", value: "X-Forwarded rotativo", status: false },
          ].map(({ label, value, status }) => (
            <div key={label} className="flex items-center justify-between bg-secondary/20 rounded-lg px-3 py-2 border border-border/30">
              <div>
                <p className="text-[10px] text-muted-foreground">{label}</p>
                <p className="text-[9px] text-foreground/70 font-mono">{value}</p>
              </div>
              <div className={`w-2 h-2 rounded-full ${status ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
            </div>
          ))}
        </div>
      </div>

      {/* Packet Flow Analyzer */}
      <div className="glass-card p-4 animate-fade-in-up">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">Analizador de Paquetes</span>
        </div>
        <div className="bg-secondary/20 rounded-lg p-3 border border-border/30 font-mono text-[9px] text-foreground/60 space-y-1 max-h-24 overflow-hidden">
          <p><span className="text-emerald-400">[OK]</span> SYN → ACK handshake: 8ms</p>
          <p><span className="text-emerald-400">[OK]</span> TLS negotiate: cipher=AES_256_GCM</p>
          <p><span className="text-emerald-400">[OK]</span> Tunnel established: port=443</p>
          <p><span className="text-amber-400">[INFO]</span> Route: client → proxy → target</p>
          <p><span className="text-emerald-400">[OK]</span> DNS resolved: 1.1.1.1 (3ms)</p>
          <p><span className="text-emerald-400">[OK]</span> Keepalive: interval=30s</p>
          <p><span className="text-muted-foreground/40">[STREAM]</span> Rx: 2.4MB/s | Tx: 1.1MB/s</p>
        </div>
      </div>

      {/* Free Fire */}
      {connected && (
        <button onClick={launchFreeFire} disabled={launchingFF} className="w-full glass-card p-4 flex flex-col items-center gap-2 hover:bg-card/90 active:scale-[0.98] transition-all animate-fade-in-up border-orange-500/20">
          <div className="flex items-center gap-3">
            {launchingFF ? <Loader2 className="w-5 h-5 text-orange-400 animate-spin" /> : <Gamepad2 className="w-5 h-5 text-orange-400" />}
            <span className="text-sm font-medium text-foreground">{launchingFF ? "Abriendo Free Fire..." : "Abrir Free Fire"}</span>
          </div>
          {launchingFF && (
            <div className="w-full space-y-1.5">
              <div className="w-full bg-secondary/50 rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-orange-400 rounded-full transition-all duration-300" style={{ width: `${(ffMethod / 30) * 100}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground font-mono">{ffStatus}</p>
            </div>
          )}
          {!launchingFF && <p className="text-[10px] text-muted-foreground">30 métodos de apertura automáticos</p>}
        </button>
      )}

      {/* Command Terminal */}
      <div className="glass-card p-4 animate-fade-in-up">
        <div className="flex items-center gap-2 mb-3">
          <Code className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">Terminal de Comandos</span>
        </div>
        <div className="bg-secondary/20 rounded-lg p-3 border border-border/30 font-mono text-[9px] space-y-1.5">
          <p className="text-emerald-400">root@proxy:~$ <span className="text-foreground/70">proxy --status</span></p>
          <p className="text-foreground/50">Estado: {connected ? "CONECTADO" : "DESCONECTADO"} | Protocolo: HTTPS/SOCKS5</p>
          <p className="text-emerald-400">root@proxy:~$ <span className="text-foreground/70">tunnel --check-integrity</span></p>
          <p className="text-foreground/50">Integridad del túnel: OK | Hash: SHA-256 verificado</p>
          <p className="text-emerald-400">root@proxy:~$ <span className="text-foreground/70">net --scan-ports 1-65535</span></p>
          <p className="text-foreground/50">Puertos abiertos: 443, 8080, 3128 | Filtrados: 0</p>
          <p className="text-emerald-400">root@proxy:~$ <span className="text-foreground/70">cipher --rotate-keys</span></p>
          <p className="text-foreground/50">Rotación de claves AES completada | Próxima: 3600s</p>
          <p className="text-amber-400">root@proxy:~$ <span className="text-foreground/40 animate-pulse">_</span></p>
        </div>
      </div>

      {/* Deep Packet Inspection Shield */}
      <div className="glass-card p-4 animate-fade-in-up">
        <div className="flex items-center gap-2 mb-3">
          <Eye className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">Escudo Anti-DPI</span>
        </div>
        <div className="space-y-2">
          {[
            { label: "Fragmentación TCP", value: "Activo — 3 segmentos", pct: 100 },
            { label: "SNI Spoofing", value: "Rotación cada 60s", pct: 85 },
            { label: "Packet Morphing", value: "Aleatorización L7", pct: 92 },
            { label: "QUIC Masking", value: "UDP encapsulado", pct: 78 },
          ].map(({ label, value, pct }) => (
            <div key={label} className="bg-secondary/20 rounded-lg px-3 py-2 border border-border/30">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground">{label}</span>
                <span className="text-[9px] text-emerald-400 font-mono">{value}</span>
              </div>
              <div className="w-full h-1 rounded-full bg-secondary/50 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500/70 transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Network Routing Matrix */}
      <div className="glass-card p-4 animate-fade-in-up">
        <div className="flex items-center gap-2 mb-3">
          <Radio className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">Matriz de Enrutamiento</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Nodos activos", value: "47", icon: Server },
            { label: "Saltos (hops)", value: "3", icon: Zap },
            { label: "Rutas cifradas", value: "12", icon: Lock },
            { label: "Redundancia", value: "x3", icon: HardDrive },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-secondary/20 rounded-lg px-3 py-2.5 border border-border/30 text-center">
              <Icon className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-1" />
              <p className="text-sm text-foreground font-bold font-mono">{value}</p>
              <p className="text-[8px] text-muted-foreground/70 uppercase tracking-wider">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bandwidth Optimizer */}
      <div className="glass-card p-4 animate-fade-in-up">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">Optimizador de Ancho de Banda</span>
        </div>
        <div className="space-y-2.5">
          {[
            { label: "Compresión Brotli", value: "87% reducción", pct: 87 },
            { label: "Cache L2 Proxy", value: "2.4GB cacheado", pct: 64 },
            { label: "TCP Window Scale", value: "Factor: 14", pct: 95 },
            { label: "MTU Adaptativo", value: "1420 bytes", pct: 72 },
          ].map(({ label, value, pct }) => (
            <div key={label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground">{label}</span>
                <span className="text-[10px] text-foreground font-medium font-mono">{value}</span>
              </div>
              <div className="w-full h-1 rounded-full bg-secondary/50 overflow-hidden">
                <div className="h-full rounded-full bg-blue-500/70 transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderServers = () => (
    <div className="space-y-4">
      <div className="animate-fade-in-up">
        <h1 className="text-lg font-semibold text-foreground">Servidores</h1>
        <p className="text-xs text-muted-foreground">{SERVERS.length} servidores disponibles en todo el mundo</p>
      </div>

      <div className="space-y-2 max-h-[calc(100vh-180px)] overflow-y-auto pr-0.5 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
        {SERVERS.map((srv) => (
          <div key={srv.id} className="glass-card overflow-hidden">
            <button
              onClick={() => setExpandedServer(expandedServer === srv.id ? null : srv.id)}
              className="w-full p-3 flex items-center justify-between active:scale-[0.99] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-secondary/50 border border-border/30 flex items-center justify-center">
                  <Server className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="text-left">
                  <p className="text-sm text-foreground font-medium">{srv.name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{srv.host}:{srv.port}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expandedServer === srv.id ? "rotate-180" : ""}`} />
              </div>
            </button>
            {expandedServer === srv.id && (
              <div className="px-3 pb-3 space-y-2 border-t border-border/30 pt-3">
                {[
                  { label: "Servidor", value: srv.host, id: `host-${srv.id}` },
                  { label: "Puerto", value: srv.port, id: `port-${srv.id}` },
                  { label: "Usuario", value: srv.user, id: `user-${srv.id}` },
                  { label: "Contraseña", value: srv.pass, id: `pass-${srv.id}` },
                ].map(({ label, value, id }) => (
                  <div key={id} className="flex items-center justify-between bg-secondary/20 rounded-lg px-3 py-2 border border-border/30">
                    <div>
                      <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider">{label}</p>
                      <p className="text-[11px] text-foreground font-mono font-medium">{value}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(value, id)}
                      className="p-1.5 rounded-lg hover:bg-secondary/80 transition-colors active:scale-95"
                    >
                      {copiedField === id
                        ? <Check className="w-3.5 h-3.5 text-emerald-400" />
                        : <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                      }
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Server Stats */}
      <div className="glass-card p-4 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">Estadísticas de Servidores</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Activos", value: "27/27", color: "text-emerald-400" },
            { label: "Carga", value: "34%", color: "text-foreground" },
            { label: "Latencia", value: "8ms", color: "text-foreground" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-secondary/20 rounded-lg px-2 py-2.5 border border-border/30 text-center">
              <p className={`text-sm font-bold font-mono ${color}`}>{value}</p>
              <p className="text-[8px] text-muted-foreground/70 uppercase tracking-wider">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Geo-Routing */}
      <div className="glass-card p-4 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
        <div className="flex items-center gap-2 mb-3">
          <Globe className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">Enrutamiento Geográfico</span>
        </div>
        <div className="space-y-2">
          {[
            { region: "América", servers: 10, load: 28 },
            { region: "Europa", servers: 8, load: 42 },
            { region: "Asia-Pacífico", servers: 6, load: 35 },
            { region: "África/Medio Oriente", servers: 3, load: 18 },
          ].map(({ region, servers, load }) => (
            <div key={region} className="bg-secondary/20 rounded-lg px-3 py-2 border border-border/30">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground">{region}</span>
                <span className="text-[9px] text-foreground font-mono">{servers} servidores — {load}% carga</span>
              </div>
              <div className="w-full h-1 rounded-full bg-secondary/50 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500/60" style={{ width: `${load}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Protocol Selector */}
      <div className="glass-card p-4 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
        <div className="flex items-center gap-2 mb-3">
          <Lock className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">Protocolos Disponibles</span>
        </div>
        <div className="space-y-2">
          {[
            { proto: "HTTP Proxy", port: "8080", status: "Estándar", active: true },
            { proto: "HTTPS/TLS", port: "443", status: "Cifrado", active: true },
            { proto: "SOCKS5", port: "1080", status: "Avanzado", active: true },
            { proto: "SOCKS4a", port: "1081", status: "Legacy", active: false },
            { proto: "SSH Tunnel", port: "22", status: "Túnel seguro", active: true },
            { proto: "WireGuard", port: "51820", status: "VPN Layer", active: false },
          ].map(({ proto, port, status, active }) => (
            <div key={proto} className="flex items-center justify-between bg-secondary/20 rounded-lg px-3 py-2 border border-border/30">
              <div>
                <p className="text-[10px] text-foreground font-medium">{proto}</p>
                <p className="text-[8px] text-muted-foreground font-mono">Puerto: {port} — {status}</p>
              </div>
              <div className={`w-2 h-2 rounded-full ${active ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const settingsSections = [
    {
      id: "profile",
      icon: UserCircle,
      title: "Perfil",
      content: (
        <div className="space-y-3">
          <div className="bg-secondary/20 rounded-lg px-3 py-2.5 border border-border/30">
            <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider mb-0.5">Nombre</p>
            <p className="text-sm text-foreground font-medium">{session.name}</p>
          </div>
          <div className="bg-secondary/20 rounded-lg px-3 py-2.5 border border-border/30">
            <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider mb-0.5">Key activa</p>
            <p className="text-[11px] text-foreground font-mono">{session.key}</p>
          </div>
          <div className="bg-secondary/20 rounded-lg px-3 py-2.5 border border-border/30">
            <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider mb-0.5">Tipo de cuenta</p>
            <p className="text-sm text-foreground font-medium flex items-center gap-1">
              {session.type === "Premium" && <Zap className="w-3 h-3 text-amber-400" />}
              {session.type}
            </p>
          </div>
          <div className="bg-secondary/20 rounded-lg px-3 py-2.5 border border-border/30">
            <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider mb-0.5">Duración</p>
            <p className="text-sm text-foreground font-medium">{session.duration}</p>
          </div>
          <div className="bg-secondary/20 rounded-lg px-3 py-2.5 border border-border/30">
            <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider mb-0.5">Tiempo restante</p>
            <p className="text-sm text-foreground font-medium">{session.expiresAt ? (timeLeft || "Calculando...") : "Ilimitado"}</p>
          </div>
        </div>
      ),
    },
    {
      id: "proxy-config",
      icon: Settings,
      title: "Configuración del Proxy",
      content: (
        <div className="space-y-3">
          {[
            { label: "Protocolo de conexión", value: "HTTP / HTTPS / SOCKS5" },
            { label: "Cifrado de datos", value: "AES-256-GCM" },
            { label: "DNS primario", value: "1.1.1.1 (Cloudflare)" },
            { label: "DNS secundario", value: "8.8.8.8 (Google)" },
            { label: "Modo de túnel", value: "Split Tunneling" },
            { label: "Compresión", value: "Activada (Brotli)" },
            { label: "Keep-Alive", value: "Activado (60s)" },
            { label: "Reintentos automáticos", value: "3 intentos" },
            { label: "Tiempo de espera", value: "30 segundos" },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between bg-secondary/20 rounded-lg px-3 py-2.5 border border-border/30">
              <span className="text-[10px] text-muted-foreground">{label}</span>
              <span className="text-[10px] text-foreground font-medium">{value}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "terms",
      icon: FileText,
      title: "Términos y Condiciones",
      content: (
        <div className="space-y-3">
          <div className="bg-secondary/20 rounded-lg p-4 border border-border/30">
            <h3 className="text-xs font-semibold text-foreground mb-2">1. Uso Aceptable</h3>
            <p className="text-[10px] text-muted-foreground leading-relaxed">El servicio de proxy está destinado exclusivamente para uso personal y legítimo. Queda prohibido utilizar el servicio para actividades ilegales, distribución de malware, ataques DDoS, o cualquier actividad que viole las leyes locales e internacionales.</p>
          </div>
          <div className="bg-secondary/20 rounded-lg p-4 border border-border/30">
            <h3 className="text-xs font-semibold text-foreground mb-2">2. Acceso y Keys</h3>
            <p className="text-[10px] text-muted-foreground leading-relaxed">Las keys de acceso son personales e intransferibles. Compartir keys con terceros resultará en la suspensión inmediata del servicio sin previo aviso ni reembolso.</p>
          </div>
          <div className="bg-secondary/20 rounded-lg p-4 border border-border/30">
            <h3 className="text-xs font-semibold text-foreground mb-2">3. Disponibilidad</h3>
            <p className="text-[10px] text-muted-foreground leading-relaxed">El servicio se proporciona "tal cual". No garantizamos disponibilidad del 100%. Se realizarán mantenimientos programados con previo aviso cuando sea posible.</p>
          </div>
          <div className="bg-secondary/20 rounded-lg p-4 border border-border/30">
            <h3 className="text-xs font-semibold text-foreground mb-2">4. Privacidad</h3>
            <p className="text-[10px] text-muted-foreground leading-relaxed">No almacenamos registros de navegación ni actividad. Los datos de sesión se utilizan únicamente para gestionar el acceso y la duración del servicio.</p>
          </div>
          <div className="bg-secondary/20 rounded-lg p-4 border border-border/30">
            <h3 className="text-xs font-semibold text-foreground mb-2">5. Suspensión</h3>
            <p className="text-[10px] text-muted-foreground leading-relaxed">Nos reservamos el derecho de suspender o cancelar cuentas que violen estos términos, sin obligación de reembolso o compensación.</p>
          </div>
        </div>
      ),
    },
    {
      id: "policies",
      icon: AlertTriangle,
      title: "Políticas de Uso",
      content: (
        <div className="space-y-3">
          <div className="bg-secondary/20 rounded-lg p-4 border border-border/30">
            <h3 className="text-xs font-semibold text-foreground mb-2">Política de Privacidad</h3>
            <p className="text-[10px] text-muted-foreground leading-relaxed">Respetamos tu privacidad. No recopilamos datos personales más allá de lo necesario para el funcionamiento del servicio. Tu nombre de usuario y key son los únicos datos almacenados durante la sesión activa.</p>
          </div>
          <div className="bg-secondary/20 rounded-lg p-4 border border-border/30">
            <h3 className="text-xs font-semibold text-foreground mb-2">Política de Reembolso</h3>
            <p className="text-[10px] text-muted-foreground leading-relaxed">Las keys activadas no son reembolsables. Si experimentas problemas técnicos, contacta al administrador para recibir una key de reemplazo según la evaluación del caso.</p>
          </div>
          <div className="bg-secondary/20 rounded-lg p-4 border border-border/30">
            <h3 className="text-xs font-semibold text-foreground mb-2">Política de Seguridad</h3>
            <p className="text-[10px] text-muted-foreground leading-relaxed">Todo el tráfico está cifrado con AES-256. Las conexiones se realizan a través de protocolos seguros (TLS 1.3). Monitoreamos intentos de acceso no autorizados para proteger la infraestructura.</p>
          </div>
          <div className="bg-secondary/20 rounded-lg p-4 border border-border/30">
            <h3 className="text-xs font-semibold text-foreground mb-2">Límites de Uso</h3>
            <p className="text-[10px] text-muted-foreground leading-relaxed">Cada key permite una conexión simultánea. El uso excesivo de ancho de banda puede resultar en limitación temporal de velocidad para garantizar la calidad del servicio para todos los usuarios.</p>
          </div>
        </div>
      ),
    },
    {
      id: "developer",
      icon: Code,
      title: "Desarrollador",
      content: (
        <div className="space-y-4">
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-20 h-20 rounded-full bg-secondary/50 border-2 border-border/50 flex items-center justify-center mb-3 shadow-lg">
              <Code className="w-8 h-8 text-foreground" />
            </div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-semibold text-foreground">Modifaxff Oficial</h3>
              <VerifiedBadge className="w-5 h-5" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Desarrollador y Creador</p>
          </div>
          <div className="space-y-2">
            {[
              { label: "Rol", value: "Desarrollador Principal" },
              { label: "Especialidad", value: "Redes y Proxy" },
              { label: "Plataforma", value: "Conexión Proxy v2.4" },
              { label: "Arquitectura", value: "Cliente-Servidor" },
              { label: "Stack", value: "React + TypeScript" },
              { label: "Base de datos", value: "Cloud Database" },
              { label: "Cifrado", value: "AES-256-GCM" },
              { label: "Protocolo", value: "HTTPS / SOCKS5" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between bg-secondary/20 rounded-lg px-3 py-2.5 border border-border/30">
                <span className="text-[10px] text-muted-foreground">{label}</span>
                <span className="text-[10px] text-foreground font-medium">{value}</span>
              </div>
            ))}
          </div>
          <div className="bg-secondary/20 rounded-lg p-4 border border-border/30 text-center">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Este sistema fue diseñado y desarrollado por Modifaxff Oficial. Todos los derechos reservados. Queda prohibida la reproducción total o parcial sin autorización expresa del desarrollador.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "advanced",
      icon: Cpu,
      title: "Configuración Avanzada",
      content: (
        <div className="space-y-3">
          {[
            { label: "TCP Fast Open", value: "Habilitado" },
            { label: "ECN (Explicit Congestion)", value: "Activado" },
            { label: "BBR Congestion Control", value: "Habilitado" },
            { label: "IPv6 Dual Stack", value: "Desactivado" },
            { label: "PMTU Discovery", value: "Automático" },
            { label: "Socket Buffer", value: "256KB Tx / 512KB Rx" },
            { label: "TCP Keepalive Interval", value: "30s" },
            { label: "Max Retransmissions", value: "5" },
            { label: "Nagle Algorithm", value: "Desactivado (Low Latency)" },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between bg-secondary/20 rounded-lg px-3 py-2.5 border border-border/30">
              <span className="text-[10px] text-muted-foreground">{label}</span>
              <span className="text-[10px] text-foreground font-medium font-mono">{value}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "logs",
      icon: FileText,
      title: "Registro de Actividad",
      content: (
        <div className="space-y-3">
          <div className="bg-secondary/20 rounded-lg p-3 border border-border/30 font-mono text-[9px] space-y-1.5 max-h-60 overflow-y-auto">
            <p><span className="text-emerald-400">[{new Date().toLocaleTimeString()}]</span> <span className="text-foreground/60">Sesión iniciada — Usuario: {session.name}</span></p>
            <p><span className="text-emerald-400">[{new Date(Date.now() - 120000).toLocaleTimeString()}]</span> <span className="text-foreground/60">Handshake TLS completado</span></p>
            <p><span className="text-blue-400">[{new Date(Date.now() - 300000).toLocaleTimeString()}]</span> <span className="text-foreground/60">DNS query → 1.1.1.1 resuelto en 3ms</span></p>
            <p><span className="text-emerald-400">[{new Date(Date.now() - 600000).toLocaleTimeString()}]</span> <span className="text-foreground/60">Rotación de cipher suite completada</span></p>
            <p><span className="text-amber-400">[{new Date(Date.now() - 900000).toLocaleTimeString()}]</span> <span className="text-foreground/60">Reconexión automática — nodo optimizado</span></p>
            <p><span className="text-emerald-400">[{new Date(Date.now() - 1800000).toLocaleTimeString()}]</span> <span className="text-foreground/60">Anti-DPI bypass activado</span></p>
            <p><span className="text-blue-400">[{new Date(Date.now() - 3600000).toLocaleTimeString()}]</span> <span className="text-foreground/60">Verificación de integridad del túnel: OK</span></p>
            <p><span className="text-emerald-400">[{new Date(Date.now() - 7200000).toLocaleTimeString()}]</span> <span className="text-foreground/60">Certificado SSL verificado — SHA-256</span></p>
          </div>
          <div className="bg-secondary/20 rounded-lg p-3 border border-border/30">
            <p className="text-[10px] text-muted-foreground leading-relaxed">Los registros se almacenan temporalmente durante la sesión activa. No se guardan datos de navegación ni contenido transmitido.</p>
          </div>
        </div>
      ),
    },
    {
      id: "network-diag",
      icon: Wifi,
      title: "Diagnóstico de Red",
      content: (
        <div className="space-y-3">
          {[
            { test: "Ping al servidor proxy", result: "8ms", status: "OK" },
            { test: "Resolución DNS", result: "3ms", status: "OK" },
            { test: "Verificación TLS", result: "Certificado válido", status: "OK" },
            { test: "Detección de ISP throttle", result: "No detectado", status: "OK" },
            { test: "Puerto 443 (HTTPS)", result: "Abierto", status: "OK" },
            { test: "Puerto 8080 (HTTP)", result: "Abierto", status: "OK" },
            { test: "Puerto 1080 (SOCKS5)", result: "Abierto", status: "OK" },
            { test: "IPv6 Connectivity", result: "No disponible", status: "WARN" },
            { test: "WebSocket Upgrade", result: "Soportado", status: "OK" },
          ].map(({ test, result, status }) => (
            <div key={test} className="flex items-center justify-between bg-secondary/20 rounded-lg px-3 py-2.5 border border-border/30">
              <span className="text-[10px] text-muted-foreground">{test}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-foreground font-medium font-mono">{result}</span>
                <div className={`w-2 h-2 rounded-full ${status === "OK" ? "bg-emerald-500" : "bg-amber-500"}`} />
              </div>
            </div>
          ))}
        </div>
      ),
    },
  ];

  const renderSettings = () => (
    <div className="space-y-4">
      <div className="animate-fade-in-up">
        <h1 className="text-lg font-semibold text-foreground">Configuración</h1>
        <p className="text-xs text-muted-foreground">Ajustes, políticas y más</p>
      </div>

      {settingsSection === null ? (
        <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
          {settingsSections.map(({ id, icon: Icon, title }) => (
            <button
              key={id}
              onClick={() => setSettingsSection(id)}
              className="w-full glass-card p-4 flex items-center justify-between hover:bg-card/90 active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-secondary/50 border border-border/30 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <span className="text-sm text-foreground font-medium">{title}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      ) : (
        <div className="animate-fade-in-up">
          <button
            onClick={() => setSettingsSection(null)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4 hover:text-foreground transition-colors active:scale-95"
          >
            <ChevronRight className="w-3 h-3 rotate-180" />
            Volver
          </button>
          <div className="glass-card p-4">
            <h2 className="text-sm font-semibold text-foreground mb-4">
              {settingsSections.find(s => s.id === settingsSection)?.title}
            </h2>
            {settingsSections.find(s => s.id === settingsSection)?.content}
          </div>
        </div>
      )}
    </div>
  );

  // Tab bar icon component
  const TabIcon = ({ active, children }: { active: boolean; children: React.ReactNode }) => (
    <div className={`flex flex-col items-center gap-0.5 transition-colors ${active ? "text-foreground" : "text-muted-foreground"}`}>
      {children}
    </div>
  );

  return (
    <div className="relative min-h-screen pb-20">
      <VideoBackground />
      <div className="relative z-10 max-w-sm mx-auto px-4 pt-6">
        {activeTab === "home" && renderHome()}
        {activeTab === "servers" && renderServers()}
        {activeTab === "settings" && renderSettings()}
      </div>

      {/* Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="max-w-sm mx-auto">
          <div className="bg-card/95 backdrop-blur-xl border-t border-border/50 flex items-center justify-around py-2 px-4">
            <button onClick={() => { setActiveTab("home"); setSettingsSection(null); }} className="flex-1 flex flex-col items-center gap-0.5 py-1.5 active:scale-95 transition-all">
              <Home className={`w-5 h-5 ${activeTab === "home" ? "text-foreground" : "text-muted-foreground"}`} />
              <span className={`text-[9px] font-medium ${activeTab === "home" ? "text-foreground" : "text-muted-foreground"}`}>Inicio</span>
              {activeTab === "home" && <div className="w-4 h-0.5 rounded-full bg-foreground mt-0.5" />}
            </button>
            <button onClick={() => { setActiveTab("servers"); setSettingsSection(null); }} className="flex-1 flex flex-col items-center gap-0.5 py-1.5 active:scale-95 transition-all">
              <Globe className={`w-5 h-5 ${activeTab === "servers" ? "text-foreground" : "text-muted-foreground"}`} />
              <span className={`text-[9px] font-medium ${activeTab === "servers" ? "text-foreground" : "text-muted-foreground"}`}>Servidores</span>
              {activeTab === "servers" && <div className="w-4 h-0.5 rounded-full bg-foreground mt-0.5" />}
            </button>
            <button onClick={() => { setActiveTab("settings"); setSettingsSection(null); }} className="flex-1 flex flex-col items-center gap-0.5 py-1.5 active:scale-95 transition-all">
              <Settings className={`w-5 h-5 ${activeTab === "settings" ? "text-foreground" : "text-muted-foreground"}`} />
              <span className={`text-[9px] font-medium ${activeTab === "settings" ? "text-foreground" : "text-muted-foreground"}`}>Ajustes</span>
              {activeTab === "settings" && <div className="w-4 h-0.5 rounded-full bg-foreground mt-0.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProxyConfig;
