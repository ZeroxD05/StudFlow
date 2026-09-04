create table if not exists public.studflow_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.studflow_state enable row level security;

revoke all on table public.studflow_state from anon, authenticated;
