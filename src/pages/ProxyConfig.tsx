import { useState, useEffect, useCallback, useRef, memo } from "react";
import { useNavigate } from "react-router-dom";
import VideoBackground from "@/components/VideoBackground";
import VerifiedBadge from "@/components/VerifiedBadge";
import { isUserBlocked } from "@/lib/keys";
import { RAVE_LOGO, RAVE_MODULES_BANNER, PROFILE_LOOP_VIDEO } from "@/lib/assets";
const defaultAvatar = { url: RAVE_LOGO };
const raveChannel = { url: RAVE_LOGO };
import {
  Wifi, Globe, Signal, Clock, MapPin, Radio, Server,
  Lock, User, KeyRound, Power, LogOut, Gamepad2, Loader2,
  Shield, Activity, Zap, Eye, ChevronRight, Cpu, HardDrive,
  Home, Settings, FileText, UserCircle, Code, AlertTriangle,
  Copy, Check, ChevronDown, Crosshair, Target, Gauge, Ghost,
  Bolt, Flame, Radar, ScanLine, Layers, BarChart3,
  Rocket, Timer, RefreshCw, Sparkles, Fingerprint, ShieldCheck,
  Database, Network, Bug, Unplug, Ratio, MonitorSmartphone,
  CircuitBoard, Binary, Webhook, Milestone, Scan, ShieldAlert,
  Orbit, Waypoints
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

const SECURITY_ITEMS = [
  "Anti-Cheat Nullifier", "Signature Randomizer", "Runtime Decryptor",
  "Stack Canary Spoof", "ASLR Bypass Engine", "Integrity Check Hook",
  "Heartbeat Emulator", "Binary Obfuscator", "Sandbox Escape",
  "Token Forge Engine", "Certificate Pinning", "Syscall Filter",
  "Entropy Randomizer", "Hook Detection Shield", "Debugger Trap Evasion",
  "Code Signing Spoof", "Rootkit Cloak", "Telemetry Blocker",
  "Memory Guard", "Zero-Day Vault",
];

const SECURITY_STATUS: Record<string, string> = {
  "Anti-Cheat Nullifier": "Activo",
  "Signature Randomizer": "Activo",
  "Runtime Decryptor": "v3.2",
  "Stack Canary Spoof": "Activo",
  "ASLR Bypass Engine": "Activo",
  "Integrity Check Hook": "Verificado",
  "Heartbeat Emulator": "Estable",
  "Binary Obfuscator": "AES-256",
  "Sandbox Escape": "Activo",
  "Token Forge Engine": "OAuth 2.1",
  "Certificate Pinning": "TLS 1.3",
  "Syscall Filter": "seccomp",
  "Entropy Randomizer": "/dev/urandom",
  "Hook Detection Shield": "Activo",
  "Debugger Trap Evasion": "Activo",
  "Code Signing Spoof": "SHA-512",
  "Rootkit Cloak": "Kernel Level",
  "Telemetry Blocker": "Activo",
  "Memory Guard": "Guardado",
  "Zero-Day Vault": "Actualizado",
};

const SecurityInfo = () => (
  <div className="space-y-2">
    {SECURITY_ITEMS.map((label) => (
      <div key={label} className="flex items-center justify-between bg-secondary/20 rounded-lg px-3 py-2.5 border border-border/30">
        <span className="text-[10px] text-muted-foreground">{label}</span>
        <span className="text-[10px] text-foreground font-mono font-medium">{SECURITY_STATUS[label]}</span>
      </div>
    ))}
  </div>
);

// ==================== FLUID SLIDERS ====================
// Extracted to module scope so parent re-renders don't remount them and
// break dragging. DOM background updates are done via ref (bypassing React)
// while parent state is committed via rAF-throttled onChange for 60+ FPS.

interface FluidSliderProps {
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  label: React.ReactNode;
}

const FluidSlider = memo(({ min, max, value, onChange, suffix = "", label }: FluidSliderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const displayRef = useRef<HTMLSpanElement>(null);
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<number>(value);

  // Keep uncontrolled input in sync when parent value changes externally.
  useEffect(() => {
    if (inputRef.current && Number(inputRef.current.value) !== value) {
      inputRef.current.value = String(value);
      paint(value);
    }
    if (displayRef.current) displayRef.current.textContent = `${value}${suffix}`;
  }, [value, suffix]);

  const paint = (v: number) => {
    const pct = ((v - min) / (max - min)) * 100;
    if (inputRef.current) {
      inputRef.current.style.background =
        `linear-gradient(to right, hsl(var(--primary)) ${pct}%, hsl(var(--secondary)) ${pct}%)`;
    }
  };

  const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
    const v = Number((e.target as HTMLInputElement).value);
    pendingRef.current = v;
    // instant visual feedback without React render
    if (displayRef.current) displayRef.current.textContent = `${v}${suffix}`;
    paint(v);
    // throttle state commit to next animation frame
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        onChange(pendingRef.current);
      });
    }
  };

  useEffect(() => {
    paint(value);
    return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="rounded-xl px-4 py-3 bg-secondary/20 border border-border/20">
      <div className="flex items-center justify-between mb-2.5">
        {label}
        <span ref={displayRef} className="text-xs text-foreground font-mono bg-secondary/50 px-2 py-0.5 rounded-md">
          {value}{suffix}
        </span>
      </div>
      <input
        ref={inputRef}
        type="range"
        min={min}
        max={max}
        defaultValue={value}
        onInput={handleInput}
        onChange={handleInput}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer slider-fluid"
        style={{ touchAction: "none", willChange: "background" }}
      />
    </div>
  );
});
FluidSlider.displayName = "FluidSlider";

const FovSliderStandalone = memo(({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
  <FluidSlider
    min={40} max={300} value={value} onChange={onChange} suffix="px"
    label={<span className="text-xs text-muted-foreground font-medium">Tamaño de FOV</span>}
  />
));
FovSliderStandalone.displayName = "FovSliderStandalone";

const PerfSliderStandalone = memo(({ label, icon, value, onChange, unit = "%" }: { label: string; icon: React.ReactNode; value: number; onChange: (v: number) => void; unit?: string }) => (
  <FluidSlider
    min={0} max={100} value={value} onChange={onChange} suffix={unit}
    label={
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
      </div>
    }
  />
));
PerfSliderStandalone.displayName = "PerfSliderStandalone";

// Server modules replaced with advanced exploit modules

const ProxyConfig = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState<"home" | "servers" | "settings">("home");
  const [timeLeft, setTimeLeft] = useState("");
  const [timeParts, setTimeParts] = useState<{ d: number; h: number; m: number; s: number }>({ d: 0, h: 0, m: 0, s: 0 });
  const [launchingFF, setLaunchingFF] = useState(false);
  const [ffMethod, setFfMethod] = useState(0);
  const [ffStatus, setFfStatus] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expandedServer, setExpandedServer] = useState<number | null>(null);
  const [settingsSection, setSettingsSection] = useState<string | null>(null);

  // Game toggles - persisted in localStorage
  const loadToggle = (key: string, def: boolean) => {
    const v = localStorage.getItem(`proxy_toggle_${key}`);
    return v !== null ? v === "true" : def;
  };
  const loadSlider = (key: string, def: number) => {
    const v = localStorage.getItem(`proxy_slider_${key}`);
    return v !== null ? Number(v) : def;
  };

  const [noRecoil, setNoRecoilRaw] = useState(() => loadToggle("noRecoil", false));
  const [autoAim, setAutoAimRaw] = useState(() => loadToggle("autoAim", false));
  const [fovEnabled, setFovEnabledRaw] = useState(() => loadToggle("fov", false));
  const [spinEnabled, setSpinEnabledRaw] = useState(() => loadToggle("360spin", false));
  const [fovSize, setFovSizeRaw] = useState(() => loadSlider("fovSize", 120));
  const [speedHack, setSpeedHackRaw] = useState(() => loadToggle("speedHack", false));
  const [wallHack, setWallHackRaw] = useState(() => loadToggle("wallHack", false));
  // Performance sliders
  const [aimSmooth, setAimSmoothRaw] = useState(() => loadSlider("aimSmooth", 50));
  const [fireRate, setFireRateRaw] = useState(() => loadSlider("fireRate", 30));
  const [sensitivity, setSensitivityRaw] = useState(() => loadSlider("sensitivity", 60));

  // Server tab modules - persisted
  const [memoryPatcher, setMemoryPatcherRaw] = useState(() => loadToggle("memoryPatcher", false));
  const [antiBan, setAntiBanRaw] = useState(() => loadToggle("antiBan", false));
  const [kernelBypass, setKernelBypassRaw] = useState(() => loadToggle("kernelBypass", false));
  const [rootCloak, setRootCloakRaw] = useState(() => loadToggle("rootCloak", false));
  const [packetSpoof, setPacketSpoofRaw] = useState(() => loadToggle("packetSpoof", false));
  const [dexInjector, setDexInjectorRaw] = useState(() => loadToggle("dexInjector", false));
  const [sslPinning, setSslPinningRaw] = useState(() => loadToggle("sslPinning", false));
  const [hwIdSpoof, setHwIdSpoofRaw] = useState(() => loadToggle("hwIdSpoof", false));
  const [procHider, setProcHiderRaw] = useState(() => loadToggle("procHider", false));
  // Server sliders - persisted
  const [heapAlloc, setHeapAllocRaw] = useState(() => loadSlider("heapAlloc", 40));
  const [threadPriority, setThreadPriorityRaw] = useState(() => loadSlider("threadPriority", 50));
  const [injectionDelay, setInjectionDelayRaw] = useState(() => loadSlider("injectionDelay", 20));

  // Wrapper setters that persist
  const persistToggle = (key: string, setter: (v: boolean) => void) => (v: boolean) => { localStorage.setItem(`proxy_toggle_${key}`, String(v)); setter(v); };
  const persistSlider = (key: string, setter: (v: number) => void) => (v: number) => { localStorage.setItem(`proxy_slider_${key}`, String(v)); setter(v); };

  const setNoRecoil = persistToggle("noRecoil", setNoRecoilRaw);
  const setAutoAim = persistToggle("autoAim", setAutoAimRaw);
  const setFovEnabled = persistToggle("fov", setFovEnabledRaw);
  const setFovSize = persistSlider("fovSize", setFovSizeRaw);
  const setSpinEnabled = persistToggle("360spin", setSpinEnabledRaw);
  const setSpeedHack = persistToggle("speedHack", setSpeedHackRaw);
  const setWallHack = persistToggle("wallHack", setWallHackRaw);
  const setAimSmooth = persistSlider("aimSmooth", setAimSmoothRaw);
  const setFireRate = persistSlider("fireRate", setFireRateRaw);
  const setSensitivity = persistSlider("sensitivity", setSensitivityRaw);
  const setMemoryPatcher = persistToggle("memoryPatcher", setMemoryPatcherRaw);
  const setAntiBan = persistToggle("antiBan", setAntiBanRaw);
  const setKernelBypass = persistToggle("kernelBypass", setKernelBypassRaw);
  const setRootCloak = persistToggle("rootCloak", setRootCloakRaw);
  const setPacketSpoof = persistToggle("packetSpoof", setPacketSpoofRaw);
  const setDexInjector = persistToggle("dexInjector", setDexInjectorRaw);
  const setSslPinning = persistToggle("sslPinning", setSslPinningRaw);
  const setHwIdSpoof = persistToggle("hwIdSpoof", setHwIdSpoofRaw);
  const setProcHider = persistToggle("procHider", setProcHiderRaw);
  const setHeapAlloc = persistSlider("heapAlloc", setHeapAllocRaw);
  const setThreadPriority = persistSlider("threadPriority", setThreadPriorityRaw);
  const setInjectionDelay = persistSlider("injectionDelay", setInjectionDelayRaw);

  useEffect(() => {
    const checkSession = async () => {
      const raw = localStorage.getItem("proxy_session");
      if (!raw) { navigate("/"); return; }
      const s = JSON.parse(raw);
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
    const tick = () => {
      const diff = new Date(session.expiresAt!).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("Expirada");
        setTimeParts({ d: 0, h: 0, m: 0, s: 0 });
        localStorage.removeItem("proxy_session");
        navigate("/", { replace: true });
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeParts({ d, h, m, s });
      setTimeLeft(d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${s}s`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [session, navigate]);

  const launchFreeFire = useCallback(() => {
    setLaunchingFF(true); setFfStatus("Abrindo Free Fire...");
    const ua = (navigator.userAgent || navigator.vendor || "").toLowerCase();
    const isAndroid = /android/.test(ua);
    const isIOS = /iphone|ipad|ipod/.test(ua);

    if (isAndroid) {
      // Direct app launch via Android intent — no store fallback
      // Try MAX first via hidden iframe, then standard package
      const tryOpen = (url: string) => {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url;
        document.body.appendChild(iframe);
        setTimeout(() => iframe.remove(), 1500);
      };
      tryOpen("intent://launch/#Intent;package=com.dts.freefireth;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;end");
      setTimeout(() => {
        tryOpen("intent://launch/#Intent;package=com.dts.freefiremax;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;end");
      }, 400);
      setTimeout(() => { window.location.href = "freefireth://"; }, 800);
    } else if (isIOS) {
      // iOS URL schemes — try each, no App Store fallback
      window.location.href = "freefireth://";
      setTimeout(() => { window.location.href = "garenaff://"; }, 500);
      setTimeout(() => { window.location.href = "freefire://"; }, 1000);
    } else {
      window.open("https://ff.garena.com/", "_blank");
    }
    setTimeout(() => { setLaunchingFF(false); setFfStatus(""); }, 2500);
  }, []);

  const handleLogout = () => { localStorage.removeItem("proxy_session"); navigate("/"); };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(id);
    setTimeout(() => setCopiedField(null), 1500);
  };

  if (!session) return null;

  // Animated Toggle component
  const AnimatedToggle = ({ label, icon, value, onChange }: { label: string; icon: React.ReactNode; value: boolean; onChange: (v: boolean) => void }) => (
    <div
      className={`flex items-center justify-between rounded-xl px-4 py-3.5 border ${
        value ? "bg-primary/5 border-primary/30" : "bg-secondary/30 border-border/20"
      }`}
      style={{ transition: "background 0.15s ease, border-color 0.15s ease" }}
    >
      <div className="flex items-center gap-3">
        <div className={`p-1.5 rounded-lg ${value ? "bg-primary/10 text-primary" : "bg-secondary/50 text-muted-foreground"}`} style={{ transition: "all 0.15s ease" }}>
          {icon}
        </div>
        <span className={`text-sm font-medium ${value ? "text-foreground" : "text-muted-foreground"}`} style={{ transition: "color 0.15s ease" }}>{label}</span>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-12 h-7 rounded-full flex-shrink-0 ${
          value ? "bg-primary" : "bg-secondary border border-border/40"
        }`}
        style={{ transition: "background 0.15s ease, border-color 0.15s ease" }}
      >
        <span
          className={`absolute top-[3px] left-[3px] w-[22px] h-[22px] rounded-full shadow-sm ${
            value ? "bg-primary-foreground" : "bg-muted-foreground/60"
          }`}
          style={{
            transform: value ? "translateX(20px)" : "translateX(0)",
            transition: "transform 0.15s cubic-bezier(0.4, 0, 0.2, 1), background 0.15s ease",
            willChange: "transform",
          }}
        />
      </button>
    </div>
  );

  // Fluid sliders are now module-level components (FovSliderStandalone / PerfSliderStandalone).
  const FovSlider = FovSliderStandalone;
  const PerfSlider = PerfSliderStandalone;


  const renderHome = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div
            className="p-[2px] rounded-full"
            style={{
              background: "conic-gradient(from 0deg, #00b8ff, #4ddcff, #0066ff, #00b8ff)",
              boxShadow: "0 0 14px rgba(0,184,255,0.5)",
            }}
          >
            <img src={defaultAvatar.url} alt="Avatar" className="w-10 h-10 rounded-full object-cover bg-black block" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{session.name}</p>
            <p className="text-[10px] text-muted-foreground">Sesión activa</p>
          </div>
        </div>
        <button onClick={handleLogout} className="p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors active:scale-95">
          <LogOut className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Free Fire button */}
      <button
        onClick={launchFreeFire}
        disabled={launchingFF}
        className="w-full glass-card p-3.5 flex items-center gap-3 hover:bg-card/90 active:scale-[0.98] transition-all animate-fade-in-up"
      >
        {launchingFF ? <Loader2 className="w-5 h-5 text-primary animate-spin" /> : <Gamepad2 className="w-5 h-5 text-primary" />}
        <div className="flex-1 text-left">
          <span className="text-sm font-medium text-foreground">Free Fire</span>
          {launchingFF && <p className="text-[9px] text-muted-foreground font-mono">{ffStatus}</p>}
        </div>
        {launchingFF && (
          <div className="w-16 h-1 rounded-full bg-secondary/50 overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(ffMethod / FREEFIRE_METHODS.length) * 100}%` }} />
          </div>
        )}
      </button>

      {/* Combat Modules */}
      <div className="glass-card p-4 animate-fade-in-up space-y-3" style={{ animationDelay: "0.05s" }}>
        <div className="flex items-center gap-2 pb-1 border-b border-border/20 mb-1">
          <Crosshair className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-semibold tracking-wide uppercase">Combat Modules</span>
        </div>
        <AnimatedToggle label="No Recoil" icon={<Shield className="w-4 h-4" />} value={noRecoil} onChange={setNoRecoil} />
        <AnimatedToggle label="Auto Apuntado" icon={<Target className="w-4 h-4" />} value={autoAim} onChange={setAutoAim} />
      </div>

      {/* FOV Section */}
      <div className="glass-card p-4 animate-fade-in-up space-y-3" style={{ animationDelay: "0.1s" }}>
        <div className="flex items-center gap-2 pb-1 border-b border-border/20 mb-1">
          <Eye className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-semibold tracking-wide uppercase">Field of View</span>
        </div>
        <AnimatedToggle label="FOV Overlay" icon={<Eye className="w-4 h-4" />} value={fovEnabled} onChange={setFovEnabled} />
        {fovEnabled && (
          <div className="animate-fade-in-up">
            <FovSlider value={fovSize} onChange={setFovSize} />
          </div>
        )}
      </div>

      {/* Performance Tuning */}
      <div className="glass-card p-4 animate-fade-in-up space-y-3" style={{ animationDelay: "0.15s" }}>
        <div className="flex items-center gap-2 pb-1 border-b border-border/20 mb-1">
          <Gauge className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-semibold tracking-wide uppercase">Performance Tuning</span>
        </div>
        <PerfSlider label="Aim Smoothness" icon={<ScanLine className="w-3.5 h-3.5" />} value={aimSmooth} onChange={setAimSmooth} />
        <PerfSlider label="Fire Rate Boost" icon={<Flame className="w-3.5 h-3.5" />} value={fireRate} onChange={setFireRate} />
        <PerfSlider label="Sensitivity" icon={<Radar className="w-3.5 h-3.5" />} value={sensitivity} onChange={setSensitivity} />
      </div>


      {/* FOV Circle Overlay */}
      {fovEnabled && (
        <div className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center">
          <div
            className="rounded-full border-2 border-primary/50"
            style={{
              width: fovSize,
              height: fovSize,
              boxShadow: "0 0 20px hsl(var(--primary) / 0.1)",
              transition: "width 0.3s ease-out, height 0.3s ease-out",
            }}
          />
        </div>
      )}
    </div>
  );

  const renderServers = () => (
    <div className="space-y-4">
      <div className="animate-fade-in-up">
        <h1 className="text-lg font-semibold text-foreground">Módulos Avanzados</h1>
        <p className="text-xs text-muted-foreground">Exploit Engine v3.8 — Runtime Patches</p>
      </div>

      {/* Banner */}
      <div
        className="relative rounded-2xl overflow-hidden animate-fade-in-up"
        style={{
          border: "2px solid #1d9bf0",
          boxShadow:
            "0 0 0 1px rgba(29,155,240,0.35) inset, 0 10px 28px -8px rgba(29,155,240,0.55), 0 0 24px rgba(29,155,240,0.25)",
          background: "#000",
        }}
      >
        <img
          src={RAVE_MODULES_BANNER}
          alt="Rave Modules"
          className="w-full h-auto block object-cover"
          loading="eager"
          decoding="async"
        />
      </div>

      {/* Injection Engine */}
      <div className="glass-card p-4 animate-fade-in-up space-y-3" style={{ animationDelay: "0.15s" }}>
        <div className="flex items-center gap-2 pb-1 border-b border-border/20 mb-1">
          <Code className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-semibold tracking-wide uppercase">Injection Engine</span>
        </div>
        <AnimatedToggle
          label="DEX Injector"
          icon={<Layers className="w-4 h-4" />}
          value={dexInjector}
          onChange={setDexInjector}
        />
        <div className={dexInjector ? "" : "dex-locked-group"}>
          <div className="space-y-3">
            <AnimatedToggle label="SSL Pinning Bypass" icon={<KeyRound className="w-4 h-4" />} value={sslPinning} onChange={setSslPinning} />
            <AnimatedToggle label="HWID Spoofer" icon={<Server className="w-4 h-4" />} value={hwIdSpoof} onChange={setHwIdSpoof} />
          </div>
          {!dexInjector && (
            <p className="mt-2 text-[10px] text-red-400/90 font-medium tracking-wide">
              Activa DEX Injector para desbloquear estos módulos.
            </p>
          )}
        </div>

        {dexInjector && (
          <div className="pt-3 space-y-2 animate-fade-in-up">
            <div className="flex items-center gap-2">
              <Bolt className="w-3.5 h-3.5 text-sky-300" />
              <span className="text-[11px] text-muted-foreground font-semibold tracking-wide uppercase">Tutorial DEX</span>
            </div>
            <div
              className="relative rounded-xl overflow-hidden bg-black"
              style={{
                border: "1.5px solid rgba(77,184,255,0.55)",
                boxShadow: "0 10px 30px -10px rgba(29,155,240,0.55)",
              }}
            >
              <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
                <iframe
                  src="https://www.youtube.com/embed/lIzxrp9NwHo?rel=0&modestbranding=1&playsinline=1&hd=1&vq=hd1080&iv_load_policy=3&fs=1&cc_load_policy=0&enablejsapi=1"
                  title="Tutorial DEX"
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; web-share"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
            </div>
            <button
              onClick={() => window.open("https://proxy.vin", "_blank", "noopener,noreferrer")}
              className="w-full py-3 rounded-xl text-sm font-bold tracking-wide text-white active:scale-[0.98] transition-all"
              style={{
                background: "linear-gradient(135deg, #0a2a55 0%, #0b6fd1 55%, #1d9bf0 100%)",
                border: "1px solid rgba(120,190,255,0.55)",
                boxShadow: "0 0 0 1px rgba(29,155,240,0.25) inset, 0 12px 28px -8px rgba(29,155,240,0.65)",
              }}
            >
              Proxy.vin
            </button>
          </div>
        )}

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
          <div className="flex justify-center">
            <div
              className="p-[3px] rounded-full"
              style={{
                background: "conic-gradient(from 0deg, #00b8ff, #4ddcff, #0066ff, #00b8ff, #1e90ff)",
                boxShadow: "0 0 24px rgba(0,184,255,0.55)",
              }}
            >
              <img src={defaultAvatar.url} alt="Avatar" className="w-20 h-20 rounded-full object-cover bg-black block" />
            </div>
          </div>
          {[
            { label: "Nombre", value: session.name },
            { label: "Key activa", value: session.key },
            { label: "Tipo", value: session.type },
            { label: "Duración", value: session.duration },
            { label: "Tiempo restante", value: session.expiresAt ? (timeLeft || "Calculando...") : "Ilimitado" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-secondary/20 rounded-lg px-3 py-2.5 border border-border/30">
              <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider mb-0.5">{label}</p>
              <p className="text-sm text-foreground font-medium">{value}</p>
            </div>
          ))}
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
            { label: "Protocolo", value: "HTTP / HTTPS / SOCKS5" },
            { label: "Cifrado", value: "AES-256-GCM" },
            { label: "DNS primario", value: "1.1.1.1 (Cloudflare)" },
            { label: "DNS secundario", value: "8.8.8.8 (Google)" },
            { label: "Modo de túnel", value: "Split Tunneling" },
            { label: "Compresión", value: "Brotli" },
            { label: "Keep-Alive", value: "60s" },
            { label: "Reintentos", value: "3" },
            { label: "Timeout", value: "30s" },
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
          {[
            { t: "1. Uso Aceptable", p: "El servicio está destinado para uso personal y legítimo. Queda prohibido cualquier uso ilegal." },
            { t: "2. Keys", p: "Las keys son personales e intransferibles. Compartirlas resulta en suspensión inmediata." },
            { t: "3. Disponibilidad", p: "Servicio proporcionado 'tal cual'. No garantizamos 100% de disponibilidad." },
            { t: "4. Privacidad", p: "No almacenamos registros de navegación. Solo datos de sesión para gestionar acceso." },
          ].map(({ t, p }) => (
            <div key={t} className="bg-secondary/20 rounded-lg p-3 border border-border/30">
              <h3 className="text-xs font-semibold text-foreground mb-1">{t}</h3>
              <p className="text-[10px] text-muted-foreground leading-relaxed">{p}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "developer",
      icon: Code,
      title: "Desarrollador",
      content: (
        <div className="space-y-3">
          <div className="flex flex-col items-center text-center py-3">
            <div className="w-16 h-16 rounded-full bg-secondary/50 border-2 border-border/50 flex items-center justify-center mb-2">
              <Code className="w-7 h-7 text-foreground" />
            </div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold text-foreground">Modifaxff Oficial</h3>
              <VerifiedBadge className="w-4 h-4" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Desarrollador y Creador</p>
          </div>
          {[
            { label: "Plataforma", value: "Conexión Proxy v2.4" },
            { label: "Stack", value: "React + TypeScript" },
            { label: "Cifrado", value: "AES-256-GCM" },
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
      id: "advanced",
      icon: Cpu,
      title: "Configuración Avanzada",
      content: (
        <div className="space-y-3">
          {[
            { label: "TCP Fast Open", value: "Habilitado" },
            { label: "BBR Congestion", value: "Habilitado" },
            { label: "IPv6 Dual Stack", value: "Desactivado" },
            { label: "Socket Buffer", value: "256KB / 512KB" },
            { label: "Nagle Algorithm", value: "Off (Low Latency)" },
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
        <div className="bg-secondary/20 rounded-lg p-3 border border-border/30 font-mono text-[9px] space-y-1.5 max-h-60 overflow-y-auto">
          <p><span className="text-emerald-400">[{new Date().toLocaleTimeString()}]</span> <span className="text-foreground/60">Sesión iniciada — {session.name}</span></p>
          <p><span className="text-emerald-400">[{new Date(Date.now() - 120000).toLocaleTimeString()}]</span> <span className="text-foreground/60">TLS handshake OK</span></p>
          <p><span className="text-blue-400">[{new Date(Date.now() - 300000).toLocaleTimeString()}]</span> <span className="text-foreground/60">DNS → 1.1.1.1 (3ms)</span></p>
          <p><span className="text-amber-400">[{new Date(Date.now() - 900000).toLocaleTimeString()}]</span> <span className="text-foreground/60">Auto-reconnect</span></p>
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
            { test: "Ping proxy", result: "8ms", ok: true },
            { test: "DNS resolution", result: "3ms", ok: true },
            { test: "TLS cert", result: "Valid", ok: true },
            { test: "Port 443", result: "Open", ok: true },
            { test: "Port 8080", result: "Open", ok: true },
            { test: "IPv6", result: "N/A", ok: false },
          ].map(({ test, result, ok }) => (
            <div key={test} className="flex items-center justify-between bg-secondary/20 rounded-lg px-3 py-2.5 border border-border/30">
              <span className="text-[10px] text-muted-foreground">{test}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-foreground font-mono">{result}</span>
                <div className={`w-2 h-2 rounded-full ${ok ? "bg-emerald-500" : "bg-amber-500"}`} />
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "speed-integrations",
      icon: Rocket,
      title: "Integraciones de Rapidez",
      content: (
        <div className="space-y-2">
          {[
            { label: "TCP Fast Relay", value: "Activo" },
            { label: "UDP Accelerator", value: "v2.1" },
            { label: "Packet Burst Mode", value: "Enabled" },
            { label: "Zero-Copy Socket", value: "Activo" },
            { label: "HTTP/3 QUIC", value: "Activo" },
            { label: "Connection Pooling", value: "128 conn" },
            { label: "Pre-fetch DNS", value: "Enabled" },
            { label: "Edge CDN Routing", value: "Auto" },
            { label: "Multi-Path TCP", value: "v0.95" },
            { label: "Kernel Bypass NIC", value: "DPDK" },
            { label: "Async I/O Engine", value: "io_uring" },
            { label: "TLS Session Resume", value: "Activo" },
            { label: "Nano-Latency Mode", value: "< 1ms" },
            { label: "Turbo Handshake", value: "0-RTT" },
            { label: "Smart Route Select", value: "AI" },
            { label: "Memory-Mapped I/O", value: "Enabled" },
            { label: "Parallel Streams", value: "x16" },
            { label: "GRO/GSO Offload", value: "Activo" },
            { label: "Priority Queue", value: "Real-time" },
            { label: "Hot-Path Optimizer", value: "JIT" },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between bg-secondary/20 rounded-lg px-3 py-2 border border-border/30">
              <span className="text-[10px] text-muted-foreground">{label}</span>
              <span className="text-[10px] text-foreground font-mono font-medium">{value}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "fluidity-integrations",
      icon: Sparkles,
      title: "Fluidez y Animaciones",
      content: (
        <div className="space-y-2">
          {[
            { label: "Frame Interpolation", value: "120fps" },
            { label: "GPU Render Pipeline", value: "Vulkan" },
            { label: "V-Sync Override", value: "Activo" },
            { label: "Motion Blur Filter", value: "Off" },
            { label: "Triple Buffering", value: "Enabled" },
            { label: "Shader Pre-Compile", value: "Activo" },
            { label: "LOD Bias Override", value: "-1.5" },
            { label: "Texture Streaming", value: "Async" },
            { label: "Draw Call Batcher", value: "v3.0" },
            { label: "Occlusion Culling", value: "GPU" },
            { label: "Frame Pacing", value: "Adaptive" },
            { label: "Render Thread Priority", value: "High" },
            { label: "Anti-Stutter Engine", value: "Activo" },
            { label: "VRAM Auto-Manage", value: "Smart" },
            { label: "Tessellation Control", value: "Dynamic" },
            { label: "Anisotropic Override", value: "x16" },
            { label: "Post-FX Pipeline", value: "Optimized" },
            { label: "Compute Dispatch", value: "Async" },
            { label: "Jitter Compensation", value: "< 0.5ms" },
            { label: "Adaptive Resolution", value: "Activo" },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between bg-secondary/20 rounded-lg px-3 py-2 border border-border/30">
              <span className="text-[10px] text-muted-foreground">{label}</span>
              <span className="text-[10px] text-foreground font-mono font-medium">{value}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "security-integrations",
      icon: ShieldCheck,
      title: "Seguridad Avanzada",
      content: <SecurityInfo />,
    },
  ];

  const renderSettings = () => {
    const uniqueId = session.key.replace(/[^A-Z0-9]/gi, "").slice(-10).toUpperCase() || "N/A";
    const expiryDate = session.expiresAt
      ? new Date(session.expiresAt).toLocaleString(undefined, {
          day: "2-digit", month: "short", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        })
      : "Ilimitado";

    const Cell = ({ n, l }: { n: number; l: string }) => (
      <div className="flex flex-col items-center flex-1">
        <div
          key={n}
          className="tick-digit text-2xl font-bold tabular-nums text-white leading-none"
          style={{ textShadow: "0 2px 12px rgba(0,120,255,0.55)" }}
        >
          {String(n).padStart(2, "0")}
        </div>
        <div className="text-[9px] uppercase tracking-[0.18em] text-white/60 mt-1.5">{l}</div>
      </div>
    );

    return (
      <div className="space-y-4">
        <div className="animate-fade-in-up">
          <h1 className="text-lg font-semibold text-foreground">Ajustes</h1>
          <p className="text-xs text-muted-foreground">Estado de tu sesión</p>
        </div>

        {/* Single elegant info card with looping video background */}
        <div
          className="relative rounded-2xl overflow-hidden animate-card-in"
          style={{
            border: "2px solid #000",
            boxShadow:
              "0 0 0 1px rgba(0,0,0,0.9), 0 20px 50px -12px rgba(0,0,0,0.75), 0 0 30px rgba(29,155,240,0.18)",
          }}
        >
          {/* Video background — loops forever, no controls */}
          <video
            src={PROFILE_LOOP_VIDEO}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            disablePictureInPicture
            controlsList="nodownload noplaybackrate nofullscreen"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
          />
          {/* Dark gradient overlay for legibility */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,10,25,0.55) 0%, rgba(0,10,25,0.75) 50%, rgba(0,10,25,0.9) 100%)",
            }}
          />

          <div className="relative p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="p-[2px] rounded-full animate-soft-float"
                style={{
                  background: "conic-gradient(from 0deg, #00b8ff, #4ddcff, #0066ff, #00b8ff)",
                  boxShadow: "0 0 18px rgba(0,184,255,0.6)",
                }}
              >
                <img src={RAVE_LOGO} alt="" className="w-12 h-12 rounded-full object-cover bg-black block" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-base font-semibold text-white truncate">{session.name}</p>
                  <VerifiedBadge className="w-3.5 h-3.5" />
                </div>
                <p className="text-[10px] text-white/60 font-mono truncate">ID · {uniqueId}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl px-3 py-2.5 bg-white/5 border border-white/10 backdrop-blur-sm">
                <p className="text-[9px] uppercase tracking-wider text-white/50 mb-0.5">Tipo REP</p>
                <p className="text-xs font-semibold text-white">{session.type}</p>
              </div>
              <div className="rounded-xl px-3 py-2.5 bg-white/5 border border-white/10 backdrop-blur-sm">
                <p className="text-[9px] uppercase tracking-wider text-white/50 mb-0.5">Duración</p>
                <p className="text-xs font-semibold text-white">{session.duration}</p>
              </div>
              <div className="col-span-2 rounded-xl px-3 py-2.5 bg-white/5 border border-white/10 backdrop-blur-sm">
                <p className="text-[9px] uppercase tracking-wider text-white/50 mb-0.5">Expira</p>
                <p className="text-xs font-semibold text-white font-mono">{expiryDate}</p>
              </div>
            </div>

            {/* Countdown */}
            <div
              className="rounded-2xl p-4 border border-white/15"
              style={{
                background:
                  "linear-gradient(135deg, rgba(29,155,240,0.18), rgba(0,50,120,0.28))",
                boxShadow: "inset 0 0 0 1px rgba(120,190,255,0.12)",
              }}
            >
              <p className="text-[9px] uppercase tracking-[0.22em] text-white/60 text-center mb-3">
                Tiempo restante
              </p>
              <div className="flex items-stretch gap-1">
                <Cell n={timeParts.d} l="Días" />
                <div className="text-white/30 text-xl font-light self-center">:</div>
                <Cell n={timeParts.h} l="Horas" />
                <div className="text-white/30 text-xl font-light self-center">:</div>
                <Cell n={timeParts.m} l="Min" />
                <div className="text-white/30 text-xl font-light self-center">:</div>
                <Cell n={timeParts.s} l="Seg" />
              </div>
            </div>
          </div>
        </div>

        {/* Creator card */}
        <div className="glass-card p-5 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
          <div className="flex flex-col items-center text-center">
            <div
              className="p-[3px] rounded-full mb-4"
              style={{
                background: "conic-gradient(from 0deg, #00b8ff, #4ddcff, #0066ff, #00b8ff, #1e90ff)",
                boxShadow: "0 0 24px rgba(0,184,255,0.55)",
              }}
            >
              <img
                src={raveChannel.url}
                alt="Canal del creador"
                className="w-24 h-24 rounded-full object-cover bg-black block"
              />
            </div>
            <div className="flex items-center gap-1.5 mb-1">
              <h2 className="text-base font-semibold text-foreground">Creador</h2>
              <VerifiedBadge className="w-4 h-4" />
            </div>
            <p className="text-[11px] text-muted-foreground mb-4">
              Canal oficial de WhatsApp del creador
            </p>
            <a
              href="https://whatsapp.com/channel/0029VbC678PIyPtc7iERCH2R"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-primary-foreground active:scale-[0.98] transition-transform"
              style={{
                background: "linear-gradient(135deg, #00b8ff, #0066ff)",
                boxShadow: "0 8px 22px -8px rgba(0,102,255,0.65)",
              }}
            >
              Seguir al creador
            </a>
          </div>
        </div>
      </div>
    );
  };


  return (
    <div className="relative min-h-screen pb-28">
      <VideoBackground />
      <div className="relative z-10 max-w-sm mx-auto px-4 pt-6">
        {activeTab === "home" && renderHome()}
        {activeTab === "servers" && renderServers()}
        {activeTab === "settings" && renderSettings()}
      </div>

      {/* Bottom Tab Bar */}
      {/* Bottom Tab Bar — floating glass pill, wider */}
      <div className="fixed bottom-4 left-0 right-0 z-50 px-3 pointer-events-none">
        <div className="mx-auto w-full max-w-[440px] pointer-events-auto">
          <div
            className="flex items-center justify-around px-3 py-2.5 rounded-[26px] border border-white/10 bg-black/55 backdrop-blur-2xl"
            style={{
              boxShadow:
                "0 12px 40px -12px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 0 22px rgba(29,155,240,0.08)",
            }}
          >
            <button onClick={() => { setActiveTab("home"); setSettingsSection(null); }} className="flex-1 flex flex-col items-center gap-0.5 py-1.5 active:scale-95 transition-transform duration-200">
              <Home className={`w-5 h-5 transition-colors ${activeTab === "home" ? "text-foreground" : "text-muted-foreground"}`} />
              <span className={`text-[9px] font-medium transition-colors ${activeTab === "home" ? "text-foreground" : "text-muted-foreground"}`}>Inicio</span>
              <div className={`h-0.5 rounded-full bg-foreground mt-0.5 transition-all duration-300 ${activeTab === "home" ? "w-4 opacity-100" : "w-0 opacity-0"}`} />
            </button>
            <button onClick={() => { setActiveTab("servers"); setSettingsSection(null); }} className="flex-1 flex flex-col items-center gap-0.5 py-1.5 active:scale-95 transition-transform duration-200">
              <Globe className={`w-5 h-5 transition-colors ${activeTab === "servers" ? "text-foreground" : "text-muted-foreground"}`} />
              <span className={`text-[9px] font-medium transition-colors ${activeTab === "servers" ? "text-foreground" : "text-muted-foreground"}`}>Módulos</span>
              <div className={`h-0.5 rounded-full bg-foreground mt-0.5 transition-all duration-300 ${activeTab === "servers" ? "w-4 opacity-100" : "w-0 opacity-0"}`} />
            </button>
            <button onClick={() => { setActiveTab("settings"); setSettingsSection(null); }} className="flex-1 flex flex-col items-center gap-0.5 py-1.5 active:scale-95 transition-transform duration-200">
              <Settings className={`w-5 h-5 transition-colors ${activeTab === "settings" ? "text-foreground" : "text-muted-foreground"}`} />
              <span className={`text-[9px] font-medium transition-colors ${activeTab === "settings" ? "text-foreground" : "text-muted-foreground"}`}>Ajustes</span>
              <div className={`h-0.5 rounded-full bg-foreground mt-0.5 transition-all duration-300 ${activeTab === "settings" ? "w-4 opacity-100" : "w-0 opacity-0"}`} />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default ProxyConfig;
