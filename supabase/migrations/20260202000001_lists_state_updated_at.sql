-- Add state column to lists (reuse existing enum)
ALTER TABLE lists
ADD COLUMN state list_item_state NOT NULL DEFAULT 'active';

-- Add updated_at column to lists
ALTER TABLE lists
ADD COLUMN updated_at bigint NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint;

-- Migrate existing data: set state based on deleted_at
UPDATE lists
SET state = (CASE WHEN deleted_at IS NOT NULL THEN 'deleted' ELSE 'active' END)::list_item_state,
    updated_at = COALESCE(
      (EXTRACT(EPOCH FROM deleted_at) * 1000)::bigint,
      (EXTRACT(EPOCH FROM created_at) * 1000)::bigint
    );

-- Drop deleted_at column
ALTER TABLE lists DROP COLUMN deleted_at;

-- Add index for state queries
CREATE INDEX IF NOT EXISTS lists_state_idx ON lists(state);
