import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import VideoBackground from "@/components/VideoBackground";
import { ArrowLeft, Check, Copy, ExternalLink, Loader2, Upload, AlertTriangle, RefreshCw } from "lucide-react";

const PLANS = [
  { id: "day1", label: "1 Día", amount: 4, desc: "Acceso 24 horas" },
  { id: "day7", label: "7 Días", amount: 7, desc: "Acceso semanal" },
  { id: "day30", label: "30 Días", amount: 15, desc: "Acceso mensual" },
];

const STORAGE_KEY = "hg_pay_token";

type Order = {
  payment_id: string;
  tracking_token: string;
  alias: string;
  duration: string;
  amount: number;
  status: "AWAITING_RECEIPT" | "PENDING" | "APPROVED" | "REJECTED";
  receipt_url?: string | null;
  assigned_key?: string | null;
  rejection_reason?: string | null;
  paypal_url?: string;
};

const Pay = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"select" | "form" | "pay" | "upload" | "status">("select");
  const [plan, setPlan] = useState<typeof PLANS[number] | null>(null);
  const [alias, setAlias] = useState("");
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<number | null>(null);

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEY);
    if (token) refreshStatus(token, true);
  }, []);

  // Polling when in status step and not finalized
  useEffect(() => {
    if (step !== "status" || !order) return;
    if (order.status === "APPROVED") return;
    pollRef.current = window.setInterval(() => refreshStatus(order.tracking_token), 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [step, order?.tracking_token, order?.status]);

  const refreshStatus = async (token: string, silent = false) => {
    const { data, error: err } = await supabase.functions.invoke("payment-status", {
      body: { tracking_token: token },
    });
    if (err || data?.error) {
      if (!silent) setError(data?.error || err?.message || "Error");
      return;
    }
    setOrder({ ...(order || {}), ...data });
    setStep("status");
  };

  const startOrder = async () => {
    setError("");
    if (!plan) return;
    if (!alias.trim() || alias.trim().length < 2) { setError("Ingresa tu nombre o alias"); return; }
    setLoading(true);
    const { data, error: err } = await supabase.functions.invoke("payment-create", {
      body: { plan: plan.id, alias, email },
    });
    setLoading(false);
    if (err || data?.error) { setError(data?.error || err?.message || "Error"); return; }
    localStorage.setItem(STORAGE_KEY, data.tracking_token);
    setOrder({ ...data, status: "AWAITING_RECEIPT", duration: data.duration });
    setStep("pay");
  };

  const onFileChange = async (file: File) => {
    if (!order) return;
    setError("");
    setUploading(true);
    try {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = "";
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      const b64 = btoa(bin);
      const { data, error: err } = await supabase.functions.invoke("payment-upload-receipt", {
        body: { tracking_token: order.tracking_token, image_base64: b64, mime: file.type || "image/jpeg" },
      });
      if (err || data?.error) throw new Error(data?.error || err?.message || "Error");
      await refreshStatus(order.tracking_token, true);
    } catch (e: any) {
      setError(e.message || "Error subiendo comprobante");
    } finally {
      setUploading(false);
    }
  };

  const copyKey = async () => {
    if (!order?.assigned_key) return;
    await navigator.clipboard.writeText(order.assigned_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const newOrder = () => {
    localStorage.removeItem(STORAGE_KEY);
    setOrder(null); setPlan(null); setAlias(""); setEmail("");
    setStep("select"); setError("");
  };

  const StatusBadge = ({ s }: { s: string }) => {
    const map: Record<string, string> = {
      AWAITING_RECEIPT: "bg-amber-500/20 border-amber-500/40 text-amber-300",
      PENDING: "bg-blue-500/20 border-blue-500/40 text-blue-300",
      APPROVED: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
      REJECTED: "bg-rose-500/20 border-rose-500/40 text-rose-300",
    };
    return <span className={`text-[10px] px-2 py-0.5 rounded-full border ${map[s]}`}>{s}</span>;
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <VideoBackground />
      <div className="relative z-10 w-full max-w-sm animate-fade-in-up">
        <button onClick={() => navigate("/")} className="flex items-center gap-1 text-xs text-muted-foreground mb-4 hover:text-foreground transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver al login
        </button>

        <div className="glass-card p-5 glow-border">
          <h1 className="text-base font-bold text-foreground mb-1">Comprar Key</h1>
          <p className="text-[10px] text-muted-foreground/70 tracking-wider uppercase mb-4">PayPal • Validación automática</p>

          {step === "select" && (
            <div className="space-y-2">
              {PLANS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setPlan(p); setStep("form"); }}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-secondary/40 border border-border/40 hover:bg-secondary/60 active:scale-[0.99] transition-all"
                >
                  <div className="text-left">
                    <div className="text-sm font-semibold text-foreground">{p.label}</div>
                    <div className="text-[10px] text-muted-foreground/70">{p.desc}</div>
                  </div>
                  <div className="text-sm font-bold text-foreground">${p.amount} USD</div>
                </button>
              ))}
            </div>
          )}

          {step === "form" && plan && (
            <div className="space-y-3">
              <div className="bg-secondary/40 border border-border/40 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">{plan.label}</div>
                  <div className="text-[10px] text-muted-foreground/70">{plan.desc}</div>
                </div>
                <div className="text-sm font-bold">${plan.amount}</div>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wider mb-1 block">Nombre o alias</label>
                <input value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="Tu nombre"
                  className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2.5 text-base text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wider mb-1 block">Email (opcional)</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="opcional"
                  className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2.5 text-base text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-200/90 leading-relaxed">
                  Debes tomar captura completa del pago realizado en PayPal. Si no envías un comprobante válido, el pedido será anulado y no recibirás tu key.
                </p>
              </div>
              {error && <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-2.5">{error}</p>}
              <div className="flex gap-2">
                <button onClick={() => setStep("select")} className="flex-1 bg-secondary/60 border border-border/40 text-foreground font-semibold py-2.5 rounded-lg text-sm">Atrás</button>
                <button onClick={startOrder} disabled={loading} className="flex-1 bg-foreground text-background font-semibold py-2.5 rounded-lg text-sm disabled:opacity-50">
                  {loading ? "Creando..." : "Continuar"}
                </button>
              </div>
            </div>
          )}

          {step === "pay" && order && (
            <div className="space-y-3">
              <div className="bg-secondary/40 border border-border/40 rounded-lg p-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Monto a pagar</div>
                <div className="text-2xl font-bold text-foreground">${order.amount} USD</div>
                <div className="text-[10px] text-muted-foreground/70 mt-1">a PayPal: ModifaxffLopez</div>
              </div>
              <a
                href={`https://www.paypal.me/ModifaxffLopez/${order.amount}`}
                target="_blank" rel="noopener noreferrer"
                className="w-full bg-[#0070ba] text-white font-semibold py-2.5 rounded-lg text-sm hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                Pagar con PayPal <ExternalLink className="w-4 h-4" />
              </a>
              <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-200/90 leading-relaxed">
                  Toma captura COMPLETA del pago. Sin comprobante válido, el pedido será anulado.
                </p>
              </div>
              <button onClick={() => setStep("upload")} className="w-full bg-foreground text-background font-semibold py-2.5 rounded-lg text-sm">
                Ya pagué, subir comprobante
              </button>
              <div className="text-[9px] text-muted-foreground/50 text-center font-mono">ID: {order.payment_id}</div>
            </div>
          )}

          {step === "upload" && order && (
            <div className="space-y-3">
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => e.target.files?.[0] && onFileChange(e.target.files[0])} />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full border-2 border-dashed border-border/60 rounded-lg p-6 hover:bg-secondary/30 transition-colors flex flex-col items-center gap-2 disabled:opacity-50"
              >
                {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                <div className="text-sm font-semibold">{uploading ? "Validando..." : "Subir comprobante"}</div>
                <div className="text-[10px] text-muted-foreground/70">JPG / PNG con la captura completa</div>
              </button>
              {error && <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-2.5">{error}</p>}
              <button onClick={() => setStep("pay")} className="w-full bg-secondary/60 border border-border/40 text-foreground font-semibold py-2.5 rounded-lg text-sm">Atrás</button>
            </div>
          )}

          {step === "status" && order && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-[10px] text-muted-foreground font-mono">{order.payment_id}</div>
                <StatusBadge s={order.status} />
              </div>
              <div className="bg-secondary/40 border border-border/40 rounded-lg p-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Plan</div>
                <div className="text-sm font-semibold">{order.duration} • ${order.amount}</div>
                <div className="text-[10px] text-muted-foreground/70 mt-1">Usuario: {order.alias}</div>
              </div>

              {order.status === "PENDING" && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 flex items-start gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-300 mt-0.5" />
                  <div className="text-[11px] text-blue-200/90 leading-relaxed">
                    Comprobante recibido. Esperando aprobación del administrador. Esta página se actualiza automáticamente.
                  </div>
                </div>
              )}

              {order.status === "AWAITING_RECEIPT" && (
                <button onClick={() => setStep("upload")} className="w-full bg-foreground text-background font-semibold py-2.5 rounded-lg text-sm">
                  Subir comprobante
                </button>
              )}

              {order.status === "APPROVED" && order.assigned_key && (
                <>
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-center">
                    <Check className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
                    <div className="text-sm font-semibold text-emerald-200">Pago aprobado</div>
                  </div>
                  <div className="bg-secondary/40 border border-border/40 rounded-lg p-3">
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Tu key</div>
                    <div className="font-mono text-sm text-foreground break-all">{order.assigned_key}</div>
                  </div>
                  <button onClick={copyKey} className="w-full bg-secondary/60 border border-border/40 text-foreground font-semibold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2">
                    {copied ? <><Check className="w-4 h-4" /> Copiada</> : <><Copy className="w-4 h-4" /> Copiar key</>}
                  </button>
                  <button onClick={() => navigate("/")} className="w-full bg-foreground text-background font-semibold py-2.5 rounded-lg text-sm">
                    Ir al login
                  </button>
                </>
              )}

              {order.status === "REJECTED" && (
                <>
                  <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3">
                    <div className="text-sm font-semibold text-rose-200 mb-1">Comprobante rechazado</div>
                    <div className="text-[11px] text-rose-200/80">{order.rejection_reason || "Comprobante inválido"}</div>
                  </div>
                  <button onClick={() => setStep("upload")} className="w-full bg-foreground text-background font-semibold py-2.5 rounded-lg text-sm">
                    Reenviar comprobante
                  </button>
                </>
              )}

              <div className="flex gap-2 pt-1">
                <button onClick={() => refreshStatus(order.tracking_token)} className="flex-1 text-[10px] text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 py-2">
                  <RefreshCw className="w-3 h-3" /> Actualizar
                </button>
                <button onClick={newOrder} className="flex-1 text-[10px] text-muted-foreground hover:text-foreground py-2">
                  Nuevo pedido
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Pay;
