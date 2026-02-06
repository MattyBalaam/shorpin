-- Create enum type for list item state
create type list_item_state as enum ('active', 'deleted');

-- Convert existing column to use enum
alter table list_items
  alter column state drop default,
  alter column state type list_item_state using state::list_item_state,
  alter column state set default 'active';
