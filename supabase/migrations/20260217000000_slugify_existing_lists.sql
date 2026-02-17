-- Convert existing slugs to URL-safe format, appending -2, -3 etc. for duplicates
UPDATE lists
SET slug = sub.new_slug
FROM (
  SELECT
    id,
    CASE
      WHEN row_number() OVER (PARTITION BY base_slug ORDER BY created_at) = 1
        THEN base_slug
      ELSE base_slug || '-' || row_number() OVER (PARTITION BY base_slug ORDER BY created_at)
    END AS new_slug
  FROM (
    SELECT
      id,
      created_at,
      trim(both '-' from
        lower(
          regexp_replace(
            regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'),
            '-+', '-', 'g'
          )
        )
      ) AS base_slug
    FROM lists
  ) slugged
) sub
WHERE lists.id = sub.id;
