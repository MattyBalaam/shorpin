-- Create lists table
create table if not exists lists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  deleted_at timestamptz,
  created_at timestamptz default now()
);

-- Create list_items table
create table if not exists list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid references lists(id) on delete cascade,
  value text not null,
  state text not null default 'active',
  updated_at bigint not null,
  created_at timestamptz default now()
);

-- Indexes for common queries
create index if not exists list_items_list_id_idx on list_items(list_id);
create index if not exists lists_slug_idx on lists(slug);
