-- Add updated_by column to track which client made the last update
-- This is used for SSE filtering to prevent clients from reacting to their own updates
alter table list_items add column if not exists updated_by text;

-- Ensure Realtime sends full row data (including updated_by) in change events
alter table list_items replica identity full;
