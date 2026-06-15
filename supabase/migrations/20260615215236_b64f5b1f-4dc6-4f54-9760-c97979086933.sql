CREATE POLICY "No direct client access to Telegram admin sessions"
ON public.telegram_admin_sessions
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);