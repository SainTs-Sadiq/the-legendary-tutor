create extension if not exists pgcrypto;

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('requestTutor','becomeTutor','contact')),
  status text not null default 'new' check (status in ('new','reviewing','matched','approved','rejected','closed')),
  full_name text not null,
  email text not null,
  phone text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists submissions_type_idx on submissions(type);
create index if not exists submissions_status_idx on submissions(status);
create index if not exists submissions_created_idx on submissions(created_at desc);

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists submissions_updated_at on submissions;
create trigger submissions_updated_at before update on submissions for each row execute function set_updated_at();

alter table submissions enable row level security;

-- No public policies: browser clients cannot read/write submissions directly.
-- The server API uses SUPABASE_SERVICE_ROLE_KEY.
