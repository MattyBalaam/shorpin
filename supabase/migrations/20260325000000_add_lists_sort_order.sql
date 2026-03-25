-- Add stable manual ordering for home page lists
alter table if exists lists add column if not exists sort_order integer;

-- Backfill existing lists with a deterministic per-owner order
with ordered_lists as (
  select
    id,
    row_number() over (partition by user_id order by created_at desc) - 1 as next_sort_order
  from lists
)
update lists
set sort_order = ordered_lists.next_sort_order
from ordered_lists
where lists.id = ordered_lists.id
  and lists.sort_order is null;

update lists
set sort_order = 0
where sort_order is null;

alter table lists alter column sort_order set not null;

create index if not exists lists_user_sort_order_idx on lists(user_id, sort_order);
