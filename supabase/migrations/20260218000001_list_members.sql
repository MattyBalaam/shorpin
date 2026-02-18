-- ============================================================
-- 1. profiles table — mirrors auth.users for email lookup
-- ============================================================
CREATE TABLE public.profiles (
  id    uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated users can read profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================================
-- 2. Trigger: auto-populate profiles on new auth.users row
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Back-fill existing users
INSERT INTO public.profiles (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. list_members table
-- ============================================================
CREATE TABLE public.list_members (
  list_id    uuid NOT NULL REFERENCES public.lists (id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (list_id, user_id)
);

ALTER TABLE public.list_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner can manage list members"
  ON public.list_members FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.lists
    WHERE lists.id = list_members.list_id
      AND lists.user_id = auth.uid()
  ));

CREATE POLICY "members can read own membership"
  ON public.list_members FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================
-- 4. Helper: has_list_access(p_list_id uuid)
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_list_access(p_list_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.lists
    WHERE id = p_list_id AND user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.list_members
    WHERE list_id = p_list_id AND user_id = auth.uid()
  );
$$;

-- ============================================================
-- 5. Update RLS on lists
-- ============================================================
DROP POLICY "users can select own lists" ON public.lists;
DROP POLICY "users can update own lists" ON public.lists;

CREATE POLICY "members can select accessible lists"
  ON public.lists FOR SELECT
  USING (public.has_list_access(id));

CREATE POLICY "members can update accessible lists"
  ON public.lists FOR UPDATE
  USING (public.has_list_access(id));

-- ============================================================
-- 6. Update RLS on list_items
-- ============================================================
DROP POLICY "users can select own list_items" ON public.list_items;
DROP POLICY "users can insert own list_items" ON public.list_items;
DROP POLICY "users can update own list_items" ON public.list_items;
DROP POLICY "users can delete own list_items" ON public.list_items;

CREATE POLICY "members can select list_items"
  ON public.list_items FOR SELECT
  USING (public.has_list_access(list_id));

CREATE POLICY "members can insert list_items"
  ON public.list_items FOR INSERT
  WITH CHECK (public.has_list_access(list_id));

CREATE POLICY "members can update list_items"
  ON public.list_items FOR UPDATE
  USING (public.has_list_access(list_id));

CREATE POLICY "members can delete list_items"
  ON public.list_items FOR DELETE
  USING (public.has_list_access(list_id));
