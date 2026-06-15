CREATE TABLE public.telegram_admin_sessions (
  chat_id text PRIMARY KEY,
  authenticated_at timestamp with time zone NOT NULL DEFAULT now(),
  last_seen_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.telegram_admin_sessions TO service_role;

ALTER TABLE public.telegram_admin_sessions ENABLE ROW LEVEL SECURITY;