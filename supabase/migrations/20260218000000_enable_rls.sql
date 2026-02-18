-- Add user ownership to lists
ALTER TABLE public.lists
  ADD COLUMN user_id uuid REFERENCES auth.users ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_items ENABLE ROW LEVEL SECURITY;

-- lists: users manage only their own lists
CREATE POLICY "users can select own lists"
  ON public.lists FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users can insert own lists"
  ON public.lists FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can update own lists"
  ON public.lists FOR UPDATE USING (auth.uid() = user_id);

-- list_items: access via parent list ownership
CREATE POLICY "users can select own list_items"
  ON public.list_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.lists
    WHERE lists.id = list_items.list_id AND lists.user_id = auth.uid()
  ));

CREATE POLICY "users can insert own list_items"
  ON public.list_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.lists
    WHERE lists.id = list_items.list_id AND lists.user_id = auth.uid()
  ));

CREATE POLICY "users can update own list_items"
  ON public.list_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.lists
    WHERE lists.id = list_items.list_id AND lists.user_id = auth.uid()
  ));

CREATE POLICY "users can delete own list_items"
  ON public.list_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.lists
    WHERE lists.id = list_items.list_id AND lists.user_id = auth.uid()
  ));
