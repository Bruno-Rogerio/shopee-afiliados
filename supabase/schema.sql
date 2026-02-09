-- Core schema for Catálogo de Afiliados (Supabase / Postgres)

create extension if not exists "pgcrypto";

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  external_id text unique,
  title text not null,
  description_short text,
  price_text text,
  image_url text,
  image_urls text[] not null default '{}',
  origin_url text not null,
  affiliate_url text,
  tags text[] not null default '{}',
  store_name text,
  category text,
  is_featured boolean not null default false,
  is_exclusive boolean not null default false,
  is_trending boolean not null default false,
  is_hot boolean not null default false,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_is_active_idx on public.products (is_active);
create index if not exists products_tags_idx on public.products using gin (tags);

alter table public.products
add column if not exists image_urls text[] not null default '{}';

alter table public.products
add column if not exists is_featured boolean not null default false;

alter table public.products
add column if not exists is_exclusive boolean not null default false;

alter table public.products
add column if not exists is_trending boolean not null default false;

alter table public.products
add column if not exists is_hot boolean not null default false;

create table if not exists public.product_copies (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  variant text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists product_copies_product_id_idx on public.product_copies (product_id);

create table if not exists public.outbound_clicks (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  src text,
  camp text,
  ua text,
  created_at timestamptz not null default now()
);

create index if not exists outbound_clicks_product_id_idx on public.outbound_clicks (product_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

alter table public.products enable row level security;
alter table public.product_copies enable row level security;
alter table public.outbound_clicks enable row level security;

create policy "Public read active products"
on public.products for select
using (is_active = true);

create policy "Authenticated read products"
on public.products for select
using (auth.role() = 'authenticated');

create policy "Authenticated insert products"
on public.products for insert
with check (auth.role() = 'authenticated');

create policy "Authenticated update products"
on public.products for update
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "Authenticated delete products"
on public.products for delete
using (auth.role() = 'authenticated');

create policy "Authenticated read copies"
on public.product_copies for select
using (auth.role() = 'authenticated');

create policy "Authenticated insert copies"
on public.product_copies for insert
with check (auth.role() = 'authenticated');

create policy "Authenticated delete copies"
on public.product_copies for delete
using (auth.role() = 'authenticated');

create policy "Public insert clicks"
on public.outbound_clicks for insert
with check (true);

create policy "Authenticated read clicks"
on public.outbound_clicks for select
using (auth.role() = 'authenticated');
