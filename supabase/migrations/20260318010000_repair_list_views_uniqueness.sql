WITH ranked AS (
  SELECT
    ctid,
    row_number() OVER (
      PARTITION BY list_id, user_id
      ORDER BY viewed_at DESC, ctid DESC
    ) AS row_num
  FROM public.list_views
)
DELETE FROM public.list_views AS lv
USING ranked
WHERE lv.ctid = ranked.ctid
  AND ranked.row_num > 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.list_views'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE public.list_views
      ADD CONSTRAINT list_views_pkey PRIMARY KEY (list_id, user_id);
  END IF;
END
$$;
