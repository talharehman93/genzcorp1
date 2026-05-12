-- ============================================================
-- Genzcorp Payment SaaS — Supabase Schema
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ============================================================
-- TABLES
-- ============================================================

-- ── vendors ─────────────────────────────────────────────────
-- One row per sub-vendor. The link_slug is the public-facing
-- identifier used in /pay/[link_slug].
create table if not exists public.vendors (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null unique,
  link_slug   text not null unique,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ── profiles ────────────────────────────────────────────────
-- Extends auth.users. Inserted automatically on signup via trigger.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null default 'vendor'
                check (role in ('super_admin', 'vendor')),
  vendor_id   uuid references public.vendors(id) on delete set null,
  full_name   text,
  created_at  timestamptz not null default now()
);

-- ── transactions ─────────────────────────────────────────────
create table if not exists public.transactions (
  id                  uuid primary key default gen_random_uuid(),
  vendor_id           uuid not null references public.vendors(id) on delete restrict,
  customer_email      text not null,
  amount              numeric(10,2) not null check (amount > 0),
  payment_method      text not null
                        check (payment_method in ('cashapp','googlepay','applepay')),
  status              text not null default 'pending'
                        check (status in ('pending','processing','completed','expired','failed')),
  merchant_reference  text not null unique,
  taptap_token        text,
  taptap_order_id     text,
  product_id          integer,
  custom_label        text,
  is_verified         boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_transactions_vendor_id  on public.transactions(vendor_id);
create index if not exists idx_transactions_status     on public.transactions(status);
create index if not exists idx_transactions_created_at on public.transactions(created_at desc);
create index if not exists idx_transactions_email      on public.transactions(customer_email);
create index if not exists idx_profiles_vendor_id      on public.profiles(vendor_id);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Returns true when the calling user is a super_admin.
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'super_admin'
  );
$$;

-- Returns the vendor_id linked to the calling user (null for super_admin).
create or replace function public.my_vendor_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select vendor_id from public.profiles where id = auth.uid();
$$;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at on transactions.
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_transactions_updated_at on public.transactions;
create trigger trg_transactions_updated_at
  before update on public.transactions
  for each row execute function public.handle_updated_at();

-- Auto-create profiles row when a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'vendor')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.vendors      enable row level security;
alter table public.profiles     enable row level security;
alter table public.transactions enable row level security;

-- ── profiles policies ───────────────────────────────────────
-- Users can only read and update their own profile.
create policy "profiles: own read"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: own update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Super admin can read all profiles.
create policy "profiles: admin read all"
  on public.profiles for select
  using (public.is_super_admin());

-- ── vendors policies ────────────────────────────────────────
-- Super admin: full access.
create policy "vendors: admin full"
  on public.vendors for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Vendor: read their own vendor row only.
create policy "vendors: vendor read own"
  on public.vendors for select
  using (id = public.my_vendor_id());

-- ── transactions policies ───────────────────────────────────
-- Super admin: full access.
create policy "transactions: admin full"
  on public.transactions for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Vendor: select/update only rows belonging to their vendor_id.
create policy "transactions: vendor select own"
  on public.transactions for select
  using (vendor_id = public.my_vendor_id());

create policy "transactions: vendor update own"
  on public.transactions for update
  using (vendor_id = public.my_vendor_id())
  with check (vendor_id = public.my_vendor_id());

-- Service-role API routes handle INSERT for new transactions
-- (bypass RLS via service role key — no public INSERT policy needed).

-- ============================================================
-- USEFUL VIEWS
-- ============================================================

-- Aggregated customer stats per vendor (used on /customers page).
create or replace view public.customer_stats as
select
  vendor_id,
  customer_email,
  count(*)                                            as total_transactions,
  sum(amount)                                         as lifetime_value,
  count(*) filter (where status = 'completed')        as success_count,
  count(*) filter (where status = 'failed')           as failed_count,
  count(*) filter (where status = 'pending'
                       or status = 'processing')      as pending_count,
  max(created_at)                                     as last_transaction_at
from public.transactions
group by vendor_id, customer_email;

-- Settlement summary per vendor (used on /admin/sub-vendors Pay Vendors tab).
create or replace view public.vendor_settlements as
select
  v.id                                               as vendor_id,
  v.name                                             as vendor_name,
  v.email                                            as vendor_email,
  count(t.id)                                        as total_transactions,
  count(*) filter (where t.status = 'completed')     as success_count,
  count(*) filter (where t.status = 'failed')        as failed_count,
  count(*) filter (where t.status = 'pending'
                       or t.status = 'processing')   as pending_count,
  coalesce(sum(t.amount) filter (where t.status = 'completed'), 0) as total_received
from public.vendors v
left join public.transactions t on t.vendor_id = v.id
group by v.id, v.name, v.email;
