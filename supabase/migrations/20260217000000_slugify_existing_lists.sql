-- Convert existing slugs to URL-safe format:
-- lowercase, non-alphanumeric replaced with hyphens, no leading/trailing hyphens
UPDATE lists
SET slug = trim(both '-' from
  lower(
    regexp_replace(
      regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'),
      '-+', '-', 'g'
    )
  )
);
