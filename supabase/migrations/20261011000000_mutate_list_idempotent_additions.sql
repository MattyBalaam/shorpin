-- Reconnect sync (app/routes/list/list.tsx's performRebaseSync) only drops
-- its queued offline session once the resubmission's response arrives. If
-- the tab is reloaded or closed while that request is in flight, the server
-- has already applied it but the queue survives, so the next mount sends the
-- same `newItems` again — and each one used to mint a fresh row, duplicating
-- every offline addition.
--
-- Adds `newItemIds`, parallel to `newItems`: the client-generated id each
-- addition was given offline. That id becomes the row's id, so replaying an
-- already-applied addition is a no-op (ON CONFLICT DO NOTHING) rather than a
-- duplicate. It stays a no-op if the user deleted the item in between, since
-- a soft-deleted row still holds the id.
--
-- A separate array, not `{ id, value }` objects in `newItems`, so either side
-- can deploy first: the previous function ignores `newItemIds`, and a
-- missing or invalid id falls back to gen_random_uuid() as before.
DROP FUNCTION IF EXISTS public.mutate_list(text, jsonb, bigint);

CREATE FUNCTION public.mutate_list(
  p_list_slug text,
  p_payload jsonb,
  p_mutated_at bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_list_id uuid;
  v_has_item_mutation boolean := false;
  v_add_value text;
  v_new_item record;
  v_new_item_id uuid;
  v_theme_primary text;
  v_theme_secondary text;
  v_next_sort_order integer;
  v_item record;
  v_item_id uuid;
  v_item_value text;
  v_item_sort_order integer;
  v_submitted_ids uuid[] := '{}';
  v_items_result jsonb;
BEGIN
  SELECT id
  INTO v_list_id
  FROM public.lists
  WHERE slug = p_list_slug
    AND state = 'active'
    AND public.has_list_access(id)
  LIMIT 1;

  IF v_list_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  FOR v_item IN
    SELECT value, ordinality - 1 AS sort_order
    FROM jsonb_array_elements(COALESCE(p_payload -> 'items', '[]'::jsonb)) WITH ORDINALITY
  LOOP
    IF (v_item.value ->> 'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
      CONTINUE;
    END IF;

    v_item_id := (v_item.value ->> 'id')::uuid;
    v_item_value := v_item.value ->> 'value';
    v_item_sort_order := v_item.sort_order;

    v_submitted_ids := array_append(v_submitted_ids, v_item_id);

    UPDATE public.list_items AS li
    SET
      value = v_item_value,
      sort_order = v_item_sort_order,
      updated_at = p_mutated_at
    WHERE li.id = v_item_id
      AND li.list_id = v_list_id
      AND (
        li.value IS DISTINCT FROM v_item_value
        OR li.sort_order IS DISTINCT FROM v_item_sort_order
      );

    IF FOUND THEN
      v_has_item_mutation := true;
    END IF;
  END LOOP;

  -- Anything active in the DB but missing from the submitted array was
  -- removed client-side (see Item's delete button) — mark it deleted. This
  -- must run before the add-inserts below: newly-added rows obviously
  -- aren't in the submitted array either, and would otherwise look deleted
  -- in the very same request that created them.
  UPDATE public.list_items
  SET
    state = 'deleted',
    updated_at = p_mutated_at
  WHERE list_id = v_list_id
    AND state = 'active'
    AND NOT (id = ANY(v_submitted_ids));

  IF FOUND THEN
    v_has_item_mutation := true;

    DELETE FROM public.list_items
    WHERE id IN (
      SELECT id
      FROM (
        SELECT
          id,
          row_number() OVER (ORDER BY updated_at DESC) AS row_num
        FROM public.list_items
        WHERE list_id = v_list_id
          AND state = 'deleted'
      ) AS ranked
      WHERE row_num > 10
    );
  END IF;

  v_add_value := p_payload ->> 'new';

  IF COALESCE(v_add_value, '') <> '' THEN
    SELECT GREATEST(0, COALESCE(MAX(sort_order), 0)) + 1
    INTO v_next_sort_order
    FROM public.list_items
    WHERE list_id = v_list_id;

    INSERT INTO public.list_items (id, list_id, value, state, updated_at, sort_order)
    VALUES (gen_random_uuid(), v_list_id, v_add_value, 'active', p_mutated_at, v_next_sort_order);

    v_has_item_mutation := true;
  END IF;

  FOR v_new_item IN
    SELECT value, ordinality
    FROM jsonb_array_elements_text(COALESCE(p_payload -> 'newItems', '[]'::jsonb)) WITH ORDINALITY
  LOOP
    IF COALESCE(v_new_item.value, '') = '' THEN
      CONTINUE;
    END IF;

    v_new_item_id := CASE
      WHEN (p_payload -> 'newItemIds' ->> (v_new_item.ordinality - 1)::int)
        ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        THEN (p_payload -> 'newItemIds' ->> (v_new_item.ordinality - 1)::int)::uuid
      ELSE gen_random_uuid()
    END;

    SELECT GREATEST(0, COALESCE(MAX(sort_order), 0)) + 1
    INTO v_next_sort_order
    FROM public.list_items
    WHERE list_id = v_list_id;

    INSERT INTO public.list_items (id, list_id, value, state, updated_at, sort_order)
    VALUES (v_new_item_id, v_list_id, v_new_item.value, 'active', p_mutated_at, v_next_sort_order)
    ON CONFLICT (id) DO NOTHING;

    IF FOUND THEN
      v_has_item_mutation := true;
    END IF;
  END LOOP;

  v_theme_primary := p_payload ->> 'themePrimary';
  v_theme_secondary := p_payload ->> 'themeSecondary';

  IF COALESCE(v_theme_primary, '') <> '' AND COALESCE(v_theme_secondary, '') <> '' THEN
    UPDATE public.lists
    SET
      theme_primary = v_theme_primary,
      theme_secondary = v_theme_secondary
    WHERE id = v_list_id;
  END IF;

  IF v_has_item_mutation AND v_user_id IS NOT NULL THEN
    INSERT INTO public.list_views (list_id, user_id, viewed_at)
    VALUES (v_list_id, v_user_id, p_mutated_at)
    ON CONFLICT (list_id, user_id)
    DO UPDATE SET viewed_at = EXCLUDED.viewed_at;
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'value', value,
        'state', state,
        'updatedAt', updated_at,
        'sortOrder', sort_order
      )
      ORDER BY sort_order
    ),
    '[]'::jsonb
  )
  INTO v_items_result
  FROM public.list_items
  WHERE list_id = v_list_id;

  RETURN jsonb_build_object(
    'ok', true,
    'listId', v_list_id,
    'hasItemMutation', v_has_item_mutation,
    'items', v_items_result
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.mutate_list(text, jsonb, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mutate_list(text, jsonb, bigint) TO service_role;
REVOKE ALL ON FUNCTION public.mutate_list(text, jsonb, bigint) FROM anon;
