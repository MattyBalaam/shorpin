-- Add sort_order column for manual sorting
alter table list_items add column if not exists sort_order integer;

-- Backfill existing items based on created_at order
with ordered_items as (
  select id, row_number() over (partition by list_id order by created_at) as rn
  from list_items
)
update list_items
set sort_order = ordered_items.rn
from ordered_items
where list_items.id = ordered_items.id;

-- Make sort_order not null after backfill
alter table list_items alter column sort_order set not null;

-- Add index for sorting queries
create index if not exists list_items_sort_order_idx on list_items(list_id, sort_order);
