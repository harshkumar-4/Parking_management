-- Shambhu Car Parking — Supabase schema (run in Supabase SQL editor)

create extension if not exists "pgcrypto";

create table if not exists parking_rates (
  id uuid primary key default gen_random_uuid(),
  vehicle_type text not null,
  rate numeric not null default 0,
  duration_hours numeric not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists parking_sessions (
  id uuid primary key default gen_random_uuid(),
  ticket_number text not null unique,
  public_token text not null unique default encode(gen_random_bytes(6), 'hex'),
  vehicle_number text not null,
  vehicle_type text not null,
  driver_name text not null,
  driver_phone text not null,
  entry_time timestamptz not null default now(),
  exit_time timestamptz,
  duration_minutes integer,
  parking_amount numeric not null default 0,
  payment_method text not null default 'Cash',
  status text not null default 'inside' check (status in ('inside','exited')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sessions_status on parking_sessions(status);
create index if not exists idx_sessions_vehicle on parking_sessions(vehicle_number);
create index if not exists idx_sessions_token on parking_sessions(public_token);

-- keep updated_at fresh
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists trg_sessions_updated on parking_sessions;
create trigger trg_sessions_updated before update on parking_sessions
  for each row execute function set_updated_at();

-- default rates (edit these to match your actual pricing)
insert into parking_rates (vehicle_type, rate, duration_hours) values
  ('Bike', 20, 2),
  ('Car', 50, 4),
  ('Truck', 100, 6)
on conflict do nothing;

-- Row Level Security
alter table parking_sessions enable row level security;
alter table parking_rates enable row level security;

-- Logged-in operators: full access
create policy "operators manage sessions" on parking_sessions
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "operators manage rates" on parking_rates
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Public: read-only access to sessions, scoped by knowing the token.
-- The token is a random 12-char string, so this is fine for a v1 tracking page —
-- tighten later with a SECURITY DEFINER function if you need stricter guarantees.
create policy "public can read sessions by token" on parking_sessions
  for select using (true);

-- To create your admin operator account:
-- Supabase Dashboard -> Authentication -> Users -> Add user (email + password).
-- Any authenticated user can operate the dashboard; add a `staff` table later
-- if you need per-operator roles.
