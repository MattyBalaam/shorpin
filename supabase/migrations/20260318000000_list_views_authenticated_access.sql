-- Ensure PostgREST exposes list_views to authenticated users.
-- Without table grants, authenticated requests can fail with PGRST205.

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.list_views TO authenticated;
GRANT ALL ON TABLE public.list_views TO service_role;
REVOKE ALL ON TABLE public.list_views FROM anon;

DROP POLICY IF EXISTS "Users manage their own list views" ON public.list_views;

CREATE POLICY "Users manage their own list views"
  ON public.list_views FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
