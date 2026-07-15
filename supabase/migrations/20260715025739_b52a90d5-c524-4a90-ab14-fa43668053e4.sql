
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  media_url text,
  media_type text,
  link_url text,
  link_label text,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO anon, authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read announcements" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "public insert announcements" ON public.announcements FOR INSERT WITH CHECK (true);
CREATE POLICY "public update announcements" ON public.announcements FOR UPDATE USING (true);
CREATE POLICY "public delete announcements" ON public.announcements FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.set_announcements_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER trg_announcements_updated_at BEFORE UPDATE ON public.announcements
FOR EACH ROW EXECUTE FUNCTION public.set_announcements_updated_at();

CREATE TABLE public.admin_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Reseend',
  description text DEFAULT 'Panel oficial Reseend',
  avatar_url text,
  verified boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_profile TO anon, authenticated;
GRANT ALL ON public.admin_profile TO service_role;
ALTER TABLE public.admin_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read admin_profile" ON public.admin_profile FOR SELECT USING (true);
CREATE POLICY "public insert admin_profile" ON public.admin_profile FOR INSERT WITH CHECK (true);
CREATE POLICY "public update admin_profile" ON public.admin_profile FOR UPDATE USING (true);
CREATE POLICY "public delete admin_profile" ON public.admin_profile FOR DELETE USING (true);

INSERT INTO public.admin_profile (name, description, verified) VALUES ('Reseend', 'Panel oficial Reseend', true);

CREATE POLICY "public read channel" ON storage.objects FOR SELECT USING (bucket_id = 'channel');
CREATE POLICY "public insert channel" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'channel');
CREATE POLICY "public update channel" ON storage.objects FOR UPDATE USING (bucket_id = 'channel');
CREATE POLICY "public delete channel" ON storage.objects FOR DELETE USING (bucket_id = 'channel');
