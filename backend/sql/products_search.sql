-- Task 3: Products table + search (run in Supabase SQL Editor)
-- User story: Search products

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text not null default 'Aesthetics Pro',
  category text not null,
  price numeric(10, 2) not null check (price >= 0),
  image_url text,
  stock integer not null default 0 check (stock >= 0),
  created_at timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category);
create index if not exists products_name_lower_idx on public.products (lower(name));

-- Parameterized search (used by FastAPI via supabase.rpc)
create or replace function public.search_products(
  search_term text default null,
  category_filter text default null
)
returns setof public.products
language sql
stable
as $$
  select *
  from public.products p
  where
    (
      coalesce(trim(search_term), '') = ''
      or p.name ilike trim(search_term) || '%'
      or p.category ilike trim(search_term) || '%'
      or p.brand ilike trim(search_term) || '%'
    )
    and (
      coalesce(trim(category_filter), '') = ''
      or p.category ilike trim(category_filter) || '%'
    )
  order by p.name asc;
$$;

-- Sample data (safe to re-run: skips if names already exist)
insert into public.products (name, brand, category, price, image_url, stock)
select v.name, v.brand, v.category, v.price, v.image_url, v.stock
from (values
  (
    'סרום חומצה היאלורונית',
    'Aesthetics Pro',
    'סרומים',
    280.00,
    'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=400',
    24
  ),
  (
    'קרם לחות עשיר',
    'Aesthetics Pro',
    'קרמים',
    220.00,
    'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&q=80&w=400',
    18
  ),
  (
    'סבון פנים עדין',
    'Aesthetics Pro',
    'ניקוי',
    120.00,
    'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&q=80&w=400',
    30
  ),
  (
    'מסכת זהב 24K',
    'Luxury Care',
    'מסכות',
    350.00,
    'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&q=80&w=400',
    12
  )
) as v(name, brand, category, price, image_url, stock)
where not exists (
  select 1 from public.products p where p.name = v.name
);

-- Allow read for API (adjust for production)
alter table public.products enable row level security;

drop policy if exists "products_read_anon" on public.products;
create policy "products_read_anon"
  on public.products for select
  using (true);

grant execute on function public.search_products(text, text) to anon, authenticated, service_role;
