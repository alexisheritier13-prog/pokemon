-- Story 1.5 — catalog (games, brands, products), stores and favorites.
-- Reference: docs/architecture/database-schema.md (0004).

create table public.games (
  id        uuid primary key default gen_random_uuid(),
  slug      text not null unique,
  name      text not null,
  is_active boolean not null default true
);

create table public.brands (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  name           text not null,
  kind           text not null
                 check (kind in ('hypermarket', 'supermarket', 'culture', 'toys', 'video_games', 'tcg_shop', 'other')),
  category_color text not null default 'roche'
                 check (category_color in ('feu', 'eau', 'plante', 'electrik', 'psy', 'roche')),
  osm_match      text[] not null default '{}' -- normalized brand/name patterns used by the OSM import
);

create table public.products (
  id         uuid primary key default gen_random_uuid(),
  game_id    uuid not null references public.games (id),
  name       text not null check (char_length(name) between 2 and 80),
  type       public.product_type not null,
  set_name   text check (char_length(set_name) <= 80),
  image_path text,
  sort_order int not null default 100,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create index products_active_idx on public.products (is_active, sort_order);

create table public.stores (
  id            uuid primary key default gen_random_uuid(),
  osm_ref       text unique, -- 'node/123' | 'way/456' | 'relation/789'
  name          text not null check (char_length(name) between 2 and 120),
  brand_id      uuid references public.brands (id),
  address       text,
  city          text,
  postcode      text check (postcode ~ '^[0-9]{5}$'),
  department    text not null check (department ~ '^(2A|2B|[0-9]{2,3})$'),
  location      extensions.geography(Point, 4326) not null,
  opening_hours text,
  status        public.store_status not null default 'pending',
  created_by    uuid references public.profiles (id) on delete set null,
  reviewed_by   uuid references public.profiles (id) on delete set null,
  review_note   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index stores_location_gix on public.stores using gist (location);
create index stores_status_dept_idx on public.stores (status, department);
create index stores_brand_idx on public.stores (brand_id);

create trigger stores_touch
  before update on public.stores
  for each row execute function private.touch_updated_at();

create table public.store_favorites (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  store_id   uuid not null references public.stores (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, store_id)
);

create index store_favorites_store_idx on public.store_favorites (store_id);

-- Radius search: visible stores within p_radius_km of a point, nearest first (RLS applies).
create function public.get_stores_within(
  p_lat double precision,
  p_lng double precision,
  p_radius_km double precision default 15,
  p_limit int default 200
) returns table (
  id uuid, name text, brand_id uuid, city text,
  lat double precision, lng double precision, distance_m int
)
language sql stable security invoker set search_path = '' as $$
  with origin as (
    select extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography as g
  )
  select s.id, s.name, s.brand_id, s.city,
         extensions.st_y(s.location::extensions.geometry),
         extensions.st_x(s.location::extensions.geometry),
         round(extensions.st_distance(s.location, o.g))::int
  from public.stores s, origin o
  where s.status = 'active'
    and extensions.st_dwithin(s.location, o.g, least(p_radius_km, 50) * 1000)
  order by s.location operator(extensions.<->) o.g
  limit least(p_limit, 500)
$$;

grant execute on function public.get_stores_within(double precision, double precision, double precision, int)
  to anon, authenticated;
