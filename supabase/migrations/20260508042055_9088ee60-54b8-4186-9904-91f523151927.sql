
ALTER TABLE public.payment_orders
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'paypal',
  ADD COLUMN IF NOT EXISTS amount_display text;

CREATE TABLE IF NOT EXISTS public.payment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id text,
  event text NOT NULL,
  detail jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read payment_logs" ON public.payment_logs FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_payment_logs_payment_id ON public.payment_logs(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_created_at ON public.payment_logs(created_at DESC);
