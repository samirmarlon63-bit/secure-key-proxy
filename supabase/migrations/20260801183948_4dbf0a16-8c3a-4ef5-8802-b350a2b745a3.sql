CREATE TABLE public.app_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.app_settings TO anon;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read app_settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "public insert app_settings" ON public.app_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "public update app_settings" ON public.app_settings FOR UPDATE USING (true);
INSERT INTO public.app_settings (data) VALUES ('{}'::jsonb);