import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLANS: Record<string, { duration: string; amount: number }> = {
  day1: { duration: "1 día", amount: 4 },
  day7: { duration: "7 días", amount: 7 },
  day30: { duration: "30 días", amount: 15 },
};

function rand(len: number) {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { plan, alias, email } = await req.json();
    const p = PLANS[plan];
    if (!p) throw new Error("Plan inválido");
    if (!alias || typeof alias !== "string" || alias.trim().length < 2) throw new Error("Alias requerido");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const payment_id = `HG-${rand(8)}`;
    const tracking_token = `${rand(6)}-${rand(6)}-${rand(6)}-${rand(6)}`;

    const { data, error } = await supabase.from("payment_orders").insert({
      payment_id,
      tracking_token,
      alias: alias.trim().slice(0, 60),
      email: email?.trim().slice(0, 120) || null,
      plan,
      duration: p.duration,
      amount: p.amount,
      status: "AWAITING_RECEIPT",
    }).select().single();

    if (error) throw error;

    return new Response(JSON.stringify({
      payment_id: data.payment_id,
      tracking_token: data.tracking_token,
      amount: data.amount,
      duration: data.duration,
      paypal_url: `https://www.paypal.me/ModifaxffLopez/${data.amount}`,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
