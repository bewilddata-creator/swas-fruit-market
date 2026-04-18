-- Swas Fruit Market · initial schema (M1)
-- Apply via Supabase SQL editor or `supabase db push`.

create extension if not exists pgcrypto;

-- admin_users
create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  password_hash text not null,
  role text not null check (role in ('owner','admin')),
  session_version integer not null default 1,
  created_by uuid references admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  last_login_at timestamptz,
  deleted_at timestamptz
);
create unique index if not exists admin_users_one_owner
  on admin_users(role) where role = 'owner' and deleted_at is null;

-- fruits (catalogue)
create table if not exists fruits (
  id uuid primary key default gen_random_uuid(),
  name_th text not null,
  selling_unit text not null,
  stock_unit text not null,
  pricing_mode text not null check (pricing_mode in ('per_unit','per_weight')),
  description text,
  image_url text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- weeks
create table if not exists weeks (
  id uuid primary key default gen_random_uuid(),
  start_date date not null,
  is_active boolean not null default false,
  closed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists weeks_one_active
  on weeks(is_active) where is_active = true;

-- week_stock
create table if not exists week_stock (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references weeks(id) on delete cascade,
  fruit_id uuid not null references fruits(id),
  stock_qty numeric not null default 0,
  price_value numeric not null default 0,
  notes text,
  unique (week_id, fruit_id)
);

-- bookings
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references weeks(id),
  customer_name text not null,
  contact text not null,
  status text not null check (status in ('pending','shipped','cancelled')) default 'pending',
  created_by uuid references admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists booking_items (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  fruit_id uuid not null references fruits(id),
  qty numeric not null,
  unit_snapshot text not null,
  price_snapshot numeric not null,
  pricing_mode_snapshot text not null,
  name_snapshot text not null
);
create index if not exists booking_items_fruit on booking_items(fruit_id);
create index if not exists bookings_week_status on bookings(week_id, status);

-- receipts
create table if not exists receipts (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references weeks(id),
  booking_id uuid references bookings(id),
  customer_name text not null,
  items_json jsonb not null default '[]'::jsonb,
  total numeric not null default 0,
  deducted_stock boolean not null default true,
  status text not null check (status in ('active','void')) default 'active',
  created_by uuid references admin_users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists receipts_week_status on receipts(week_id, status);

-- settings (key/value)
create table if not exists settings (
  key text primary key,
  value text
);
insert into settings(key, value) values ('shop_name','สวนผลไม้') on conflict do nothing;
insert into settings(key, value) values ('line_chat_url','') on conflict do nothing;

-- RLS
alter table fruits enable row level security;
alter table weeks enable row level security;
alter table week_stock enable row level security;
alter table bookings enable row level security;
alter table booking_items enable row level security;
alter table receipts enable row level security;
alter table settings enable row level security;
alter table admin_users enable row level security;

-- Public read policies (anon)
drop policy if exists "public read fruits" on fruits;
create policy "public read fruits" on fruits for select to anon
  using (deleted_at is null);

drop policy if exists "public read active weeks" on weeks;
create policy "public read active weeks" on weeks for select to anon
  using (is_active = true);

drop policy if exists "public read week_stock active" on week_stock;
create policy "public read week_stock active" on week_stock for select to anon
  using (exists (select 1 from weeks w where w.id = week_stock.week_id and w.is_active));

drop policy if exists "public read bookings active" on bookings;
create policy "public read bookings active" on bookings for select to anon
  using (exists (select 1 from weeks w where w.id = bookings.week_id and w.is_active));

drop policy if exists "public read booking_items active" on booking_items;
create policy "public read booking_items active" on booking_items for select to anon
  using (exists (select 1 from bookings b join weeks w on w.id = b.week_id
                 where b.id = booking_items.booking_id and w.is_active));

drop policy if exists "public read receipts active week walk-in" on receipts;
create policy "public read receipts active week walk-in" on receipts for select to anon
  using (booking_id is null and deducted_stock = true and status = 'active'
         and exists (select 1 from weeks w where w.id = receipts.week_id and w.is_active));

drop policy if exists "public read settings" on settings;
create policy "public read settings" on settings for select to anon using (true);

-- admin_users: no anon access (service role bypasses RLS)

-- Seed owner. Password hash is bcrypt; regenerate with scripts/hash-password.mjs.
insert into admin_users (name, password_hash, role)
select 'Owner', '$2a$10$Tmt0ZUp7bjpypitx8tP.n.SCMKhtNRZscZiFheDFfqI55huAU69Rq', 'owner'
where not exists (select 1 from admin_users where role = 'owner');
