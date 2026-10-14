# Database Schema

Ci-dessous, le **schéma complet** (migrations `supabase/migrations/*.sql`). Conventions : tables en `snake_case` au pluriel, `uuid` par défaut, `timestamptz` partout, toutes les fonctions avec `search_path` fixé. Le schéma `private` n'est **pas** exposé par PostgREST.

## 0001_extensions_and_schemas.sql
```sql
create extension if not exists postgis  with schema extensions;
create extension if not exists citext   with schema extensions;
create extension if not exists pg_net   with schema extensions;
create extension if not exists pg_cron;

create schema if not exists private;
-- private objects are reachable only through security definer functions,
-- except a few read-only helpers explicitly granted below (used inside RLS policies).
grant usage on schema private to anon, authenticated, service_role;
alter default privileges in schema private revoke execute on functions from public;
alter default privileges in schema public  revoke execute on functions from public, anon;

create type public.report_status as enum ('in_stock','low_stock','out_of_stock','restock_incoming');
create type public.report_state  as enum ('active','sold_out','disputed','expired','hidden');
create type public.vote_kind     as enum ('confirm','deny','sold_out_now');
create type public.store_status  as enum ('pending','active','rejected','disabled');
create type public.product_type  as enum ('booster','blister','display','etb','coffret','tin','bundle','other');
create type public.app_role      as enum ('user','admin');
create type public.flag_reason   as enum ('fake','inappropriate_photo','spam','other');
create type public.flag_status   as enum ('open','actioned','dismissed');
create type public.push_trigger  as enum ('created','first_confirm');
```

## 0002_config.sql
```sql
create table private.app_config (
  key        text primary key,
  value      jsonb not null,
  is_public  boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into private.app_config (key, value, is_public) values
  ('report_max_distance_m',     '300',  true),
  ('vote_max_distance_m',       '300',  true),
  ('report_ttl_hours',          '6',    true),
  ('rate_reports_per_hour',     '10',   true),
  ('rate_store_cooldown_min',   '30',   true),
  ('offline_max_delay_min',     '120',  true),
  ('remote_min_reputation',     '150',  true),
  ('remote_min_reliability',    '0.9',  true),
  ('reliable_min_reputation',   '30',   true),
  ('reliable_min_reliability',  '0.8',  true),
  ('scout_min_count',           '10',   true),
  ('veteran_min_reputation',    '150',  true),
  ('newbie_max_reputation',     '10',   true),
  ('heatmap_min_reports_90d',   '8',    true),
  ('holo_min_trust',            '80',   true),
  ('push_dedupe_hours',         '2',    false),
  ('photo_retention_days',      '60',   true),
  ('launch_departments',        '["84","13"]', true);

create function private.cfg_num(p_key text) returns numeric
language sql stable security definer set search_path = '' as $$
  select (value #>> '{}')::numeric from private.app_config where key = p_key
$$;
create function private.cfg_int(p_key text) returns int
language sql stable security definer set search_path = '' as $$
  select (value #>> '{}')::numeric::int from private.app_config where key = p_key
$$;
grant execute on function private.cfg_num(text), private.cfg_int(text) to anon, authenticated, service_role;

create table private.reputation_rules (kind text primary key, points int not null);
insert into private.reputation_rules values
  ('report_first_confirm', 3), ('report_extra_confirm', 1), ('report_confirm_cap', 6),
  ('photo_kept', 1), ('vote_coherent', 1), ('report_disputed', -4), ('moderated', -10);
```

## 0003_profiles_and_settings.sql
```sql
create table public.profiles (
  id                     uuid primary key references auth.users(id) on delete cascade,
  pseudo                 extensions.citext not null unique
                         check (pseudo ~ '^[A-Za-z0-9_À-ÿ-]{3,20}$'),
  avatar_key             text not null default 'lamp-1',
  role                   public.app_role not null default 'user',
  reputation_score       int not null default 0 check (reputation_score >= 0),
  reports_count          int not null default 0,
  reports_disputed_count int not null default 0,
  scout_count            int not null default 0,
  banned_at              timestamptz,
  created_at             timestamptz not null default now()
);

create table public.user_settings (
  user_id      uuid primary key references public.profiles(id) on delete cascade,
  home_area    extensions.geography(Point, 4326),   -- snapped to a ~1 km grid by trigger
  home_label   text,
  onboarded_at timestamptz,
  updated_at   timestamptz not null default now()
);

create table public.alert_preferences (
  user_id        uuid primary key references public.profiles(id) on delete cascade,
  enabled        boolean not null default true,
  radius_km      smallint not null default 15 check (radius_km between 1 and 50),
  trigger        public.push_trigger not null default 'first_confirm',
  product_ids    uuid[] not null default '{}',
  product_types  public.product_type[] not null default '{}',
  brand_ids      uuid[] not null default '{}',
  favorites_only boolean not null default false,
  quiet_start    time,
  quiet_end      time,
  updated_at     timestamptz not null default now(),
  check ((quiet_start is null) = (quiet_end is null))
);

-- helpers used by RLS policies
create function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles
                 where id = auth.uid() and role = 'admin' and banned_at is null)
$$;
create function private.is_active_user() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and banned_at is null)
$$;
grant execute on function private.is_admin(), private.is_active_user() to anon, authenticated;

create function private.reliability(p public.profiles) returns numeric
language sql immutable set search_path = '' as $$
  select case when p.reports_count = 0 then 1
              else 1 - p.reports_disputed_count::numeric / p.reports_count end
$$;
create function private.is_reliable(p public.profiles) returns boolean
language sql stable set search_path = '' as $$
  select p.reputation_score >= private.cfg_int('reliable_min_reputation')
     and private.reliability(p) >= private.cfg_num('reliable_min_reliability')
$$;
create function private.can_report_remotely(p public.profiles) returns boolean
language sql stable set search_path = '' as $$
  select p.reputation_score >= private.cfg_int('remote_min_reputation')
     and private.reliability(p) >= private.cfg_num('remote_min_reliability')
$$;
grant execute on function private.reliability(public.profiles), private.is_reliable(public.profiles)
  to anon, authenticated;

-- computed field exposed by PostgREST: select=*,badges
create function public.badges(p public.profiles) returns text[]
language sql stable set search_path = '' as $$
  select array_remove(array[
    case when p.reputation_score <  private.cfg_int('newbie_max_reputation')  then 'nouveau'   end,
    case when private.is_reliable(p)                                          then 'fiable'    end,
    case when p.scout_count      >= private.cfg_int('scout_min_count')        then 'eclaireur' end,
    case when p.reputation_score >= private.cfg_int('veteran_min_reputation') then 'veteran'   end
  ], null)
$$;
grant execute on function public.badges(public.profiles) to anon, authenticated;

create function private.snap_home_area() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.home_area is not null then
    new.home_area := extensions.st_snaptogrid(new.home_area::extensions.geometry, 0.01)::extensions.geography;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger user_settings_snap before insert or update of home_area on public.user_settings
  for each row execute function private.snap_home_area();

create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_pseudo text; v_try int := 0;
begin
  loop
    v_pseudo := 'Chasseur' || lpad(floor(random() * 10000)::int::text, 4, '0');
    begin
      insert into public.profiles (id, pseudo) values (new.id, v_pseudo);
      exit;
    exception when unique_violation then
      v_try := v_try + 1;
      if v_try >= 8 then
        insert into public.profiles (id, pseudo)
        values (new.id, 'Chasseur' || substr(replace(new.id::text, '-', ''), 1, 10));
        exit;
      end if;
    end;
  end loop;
  insert into public.user_settings (user_id) values (new.id);
  insert into public.alert_preferences (user_id) values (new.id);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();
```

## 0004_catalog_and_stores.sql
```sql
create table public.games (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  is_active boolean not null default true
);

create table public.brands (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  name           text not null,
  kind           text not null check (kind in ('hypermarket','supermarket','culture','toys','video_games','tcg_shop','other')),
  category_color text not null default 'roche'
                 check (category_color in ('feu','eau','plante','electrik','psy','roche')),
  osm_match      text[] not null default '{}'   -- normalized brand/name patterns used by the OSM import
);

create table public.products (
  id         uuid primary key default gen_random_uuid(),
  game_id    uuid not null references public.games(id),
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
  osm_ref       text unique,
  name          text not null check (char_length(name) between 2 and 120),
  brand_id      uuid references public.brands(id),
  address       text,
  city          text,
  postcode      text check (postcode ~ '^[0-9]{5}$'),
  department    text not null check (department ~ '^(2A|2B|[0-9]{2,3})$'),
  location      extensions.geography(Point, 4326) not null,
  opening_hours text,
  status        public.store_status not null default 'pending',
  created_by    uuid references public.profiles(id) on delete set null,
  reviewed_by   uuid references public.profiles(id) on delete set null,
  review_note   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index stores_location_gix on public.stores using gist (location);
create index stores_status_dept_idx on public.stores (status, department);

create table public.store_favorites (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  store_id   uuid not null references public.stores(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, store_id)
);
```

## 0005_reports_and_votes.sql
```sql
create table public.reports (
  id                  uuid primary key default gen_random_uuid(),
  client_id           uuid not null unique,
  store_id            uuid not null references public.stores(id),
  user_id             uuid references public.profiles(id) on delete set null,
  status              public.report_status not null,
  state               public.report_state not null default 'active',
  price_cents         int check (price_cents between 0 and 100000),
  comment             varchar(140),
  photo_path          text,
  thumb_path          text,
  photo_hidden        boolean not null default false,
  reporter_distance_m int not null check (reporter_distance_m >= 0),
  is_remote           boolean not null default false,
  is_first_of_day     boolean not null default false,
  reported_at         timestamptz not null,               -- observation time
  created_at          timestamptz not null default now(), -- insert time
  expires_at          timestamptz not null,
  confirm_count       int not null default 0,
  deny_count          int not null default 0,
  sold_out_count      int not null default 0,
  first_confirmed_at  timestamptz,
  trust_score         smallint not null default 0 check (trust_score between 0 and 100),
  finalized_at        timestamptz
);
create index reports_store_recent_idx on public.reports (store_id, reported_at desc);
create index reports_live_idx on public.reports (reported_at desc) where finalized_at is null;
create index reports_user_created_idx on public.reports (user_id, created_at desc);
create index reports_to_finalize_idx on public.reports (expires_at) where finalized_at is null;

create table public.report_products (
  report_id    uuid not null references public.reports(id) on delete cascade,
  product_id   uuid not null references public.products(id),
  qty_estimate smallint check (qty_estimate between 1 and 999),
  primary key (report_id, product_id)
);

create table public.report_votes (
  report_id  uuid not null references public.reports(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  vote       public.vote_kind not null,
  distance_m int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (report_id, user_id)
);

alter publication supabase_realtime add table public.reports;

create table private.reputation_events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  kind       text not null references private.reputation_rules(kind),
  points     int not null,
  report_id  uuid references public.reports(id) on delete set null,
  dedupe_key text not null unique,
  created_at timestamptz not null default now()
);

create table public.store_slot_stats (
  store_id   uuid not null references public.stores(id) on delete cascade,
  dow        smallint not null check (dow between 0 and 6),    -- 0 = lundi
  slot       smallint not null check (slot between 0 and 11),  -- 2-hour slots, Europe/Paris
  n_90d      int not null default 0,
  n_all      int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (store_id, dow, slot)
);
```

## 0006_push_and_moderation.sql
```sql
create table public.push_subscriptions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  endpoint        text not null unique,
  p256dh          text not null,
  auth            text not null,
  user_agent      text,
  created_at      timestamptz not null default now(),
  last_success_at timestamptz,
  failure_count   int not null default 0
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

create table private.push_jobs (
  id         bigint generated always as identity primary key,
  report_id  uuid not null references public.reports(id) on delete cascade,
  trigger    public.push_trigger not null,
  status     text not null default 'pending' check (status in ('pending','sending','done','failed')),
  attempts   int not null default 0,
  sent       int not null default 0,
  gone       int not null default 0,
  failed     int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (report_id, trigger)
);

create table private.push_dedupe (
  user_id      uuid not null references public.profiles(id) on delete cascade,
  store_id     uuid not null references public.stores(id) on delete cascade,
  last_sent_at timestamptz not null,
  primary key (user_id, store_id)
);

create table public.moderation_flags (
  id          uuid primary key default gen_random_uuid(),
  report_id   uuid not null references public.reports(id) on delete cascade,
  target      text not null check (target in ('report','photo')),
  reporter_id uuid references public.profiles(id) on delete set null,
  reason      public.flag_reason not null,
  note        varchar(280),
  status      public.flag_status not null default 'open',
  handled_by  uuid references public.profiles(id) on delete set null,
  handled_at  timestamptz,
  created_at  timestamptz not null default now(),
  unique (report_id, target, reporter_id)
);

create table private.moderation_log (
  id          bigint generated always as identity primary key,
  admin_id    uuid,
  action      text not null,
  target_type text not null,
  target_id   uuid,
  payload     jsonb,
  created_at  timestamptz not null default now()
);

create table private.client_errors (
  id         bigint generated always as identity primary key,
  user_id    uuid,
  message    text not null,
  stack      text,
  url        text,
  created_at timestamptz not null default now()
);
```

## 0007_rls.sql
```sql
alter table public.profiles           enable row level security;
alter table public.user_settings      enable row level security;
alter table public.alert_preferences  enable row level security;
alter table public.games              enable row level security;
alter table public.brands             enable row level security;
alter table public.products           enable row level security;
alter table public.stores             enable row level security;
alter table public.store_favorites    enable row level security;
alter table public.reports            enable row level security;
alter table public.report_products    enable row level security;
alter table public.report_votes       enable row level security;
alter table public.store_slot_stats   enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.moderation_flags   enable row level security;

-- Column-level privileges: never expose banned_at; users may only edit pseudo/avatar.
revoke all on public.profiles from anon, authenticated;
grant select (id, pseudo, avatar_key, role, reputation_score, reports_count,
              reports_disputed_count, scout_count, created_at)
  on public.profiles to anon, authenticated;
grant update (pseudo, avatar_key) on public.profiles to authenticated;

-- profiles
create policy profiles_read   on public.profiles for select to anon, authenticated using (true);
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() and banned_at is null) with check (id = auth.uid());

-- user_settings / alert_preferences: owner only (rows created by trigger)
create policy settings_owner_read   on public.user_settings for select to authenticated using (user_id = auth.uid());
create policy settings_owner_update on public.user_settings for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy alerts_owner_read   on public.alert_preferences for select to authenticated using (user_id = auth.uid());
create policy alerts_owner_update on public.alert_preferences for update to authenticated
  using (user_id = auth.uid() and private.is_active_user()) with check (user_id = auth.uid());

-- catalog: public read of active rows, admin writes
create policy games_read    on public.games    for select to anon, authenticated using (is_active or private.is_admin());
create policy games_admin   on public.games    for all    to authenticated using (private.is_admin()) with check (private.is_admin());
create policy brands_read   on public.brands   for select to anon, authenticated using (true);
create policy brands_admin  on public.brands   for all    to authenticated using (private.is_admin()) with check (private.is_admin());
create policy products_read  on public.products for select to anon, authenticated using (is_active or private.is_admin());
create policy products_admin on public.products for all    to authenticated using (private.is_admin()) with check (private.is_admin());

-- stores: active public; pending visible to its author; writes via RPC (users) or admin
create policy stores_read  on public.stores for select to anon, authenticated
  using (status = 'active' or created_by = auth.uid() or private.is_admin());
create policy stores_admin on public.stores for update to authenticated
  using (private.is_admin()) with check (private.is_admin());

-- favorites
create policy fav_owner_read   on public.store_favorites for select to authenticated using (user_id = auth.uid());
create policy fav_owner_insert on public.store_favorites for insert to authenticated
  with check (user_id = auth.uid() and private.is_active_user());
create policy fav_owner_delete on public.store_favorites for delete to authenticated using (user_id = auth.uid());

-- reports: public read except hidden; no direct writes (RPC only)
create policy reports_read on public.reports for select to anon, authenticated
  using (state <> 'hidden' or user_id = auth.uid() or private.is_admin());
create policy report_products_read on public.report_products for select to anon, authenticated
  using (exists (select 1 from public.reports r where r.id = report_id));

-- votes: each user sees their own vote (counters live on reports); admin sees all
create policy votes_owner_read on public.report_votes for select to authenticated
  using (user_id = auth.uid() or private.is_admin());

-- stats: public
create policy slot_stats_read on public.store_slot_stats for select to anon, authenticated using (true);

-- push subscriptions: owner only
create policy push_owner_all on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and private.is_active_user());

-- moderation flags: insert via RPC; admin read/update
create policy flags_admin on public.moderation_flags for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

-- Storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('report-photos',  'report-photos',  true, 1572864, array['image/webp','image/jpeg']),
  ('product-images', 'product-images', true, 524288,  array['image/webp','image/jpeg','image/png']);

-- report-photos: written by the Edge Function (service_role bypasses RLS); admin may delete (moderation)
create policy report_photos_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'report-photos' and private.is_admin());
-- product-images: admin manages
create policy product_images_admin on storage.objects for all to authenticated
  using (bucket_id = 'product-images' and private.is_admin())
  with check (bucket_id = 'product-images' and private.is_admin());
```
*Note :* les buckets publics servent les fichiers en lecture via leur URL publique, sans policy `select`. Les chemins contiennent l'`uuid` du signalement.

## 0008_core_functions.sql
```sql
-- reputation (idempotent through dedupe_key)
create function private.award(p_user uuid, p_kind text, p_report uuid, p_key text, p_points int default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_points int;
begin
  if p_user is null then return; end if;
  v_points := coalesce(p_points, (select points from private.reputation_rules where kind = p_kind));
  insert into private.reputation_events (user_id, kind, points, report_id, dedupe_key)
  values (p_user, p_kind, v_points, p_report, p_key)
  on conflict (dedupe_key) do nothing;
  if found then
    update public.profiles set reputation_score = greatest(0, reputation_score + v_points) where id = p_user;
  end if;
end $$;

-- trust score 0..100 (constants documented in "Trust score")
create function private.recompute_trust(p_report uuid) returns void
language sql security definer set search_path = '' as $$
  update public.reports r set trust_score = least(100, greatest(0, round(
      ( 20
      + 25 * least(coalesce((select p.reputation_score from public.profiles p where p.id = r.user_id), 0), 150) / 150.0
      + case when r.photo_path is not null and not r.photo_hidden then 15 else 0 end
      + 12 * least(r.confirm_count, 4)
      - 15 * r.deny_count )
      * case when r.state in ('sold_out','disputed') then 0.5 else 1 end
      * greatest(0.6, 1 - 0.4 * least(1, extract(epoch from (now() - r.reported_at))
                                        / nullif(extract(epoch from (r.expires_at - r.reported_at)), 0)))
  )))
  where r.id = p_report
$$;

create function private.raise_app(p_code text, p_detail jsonb default '{}'::jsonb) returns void
language plpgsql set search_path = '' as $$
begin
  raise exception using errcode = 'P0001', message = p_code, detail = p_detail::text;
end $$;
```

## 0009_rpc_reports.sql
```sql
create function public.create_report(
  p_client_id   uuid,
  p_store_id    uuid,
  p_lat         double precision,
  p_lng         double precision,
  p_status      public.report_status,
  p_products    jsonb,                 -- [{ "product_id": uuid, "qty": int|null }]
  p_price_cents int default null,
  p_comment     text default null,
  p_captured_at timestamptz default now()
) returns public.reports
language plpgsql security definer set search_path = '' as $$
declare
  v_uid      uuid := auth.uid();
  v_profile  public.profiles;
  v_store    public.stores;
  v_report   public.reports;
  v_dist     int;
  v_remote   boolean := false;
  v_count    int;
  v_oldest   timestamptz;
begin
  if v_uid is null then perform private.raise_app('auth_required'); end if;

  -- idempotency (offline retries)
  select * into v_report from public.reports where client_id = p_client_id;
  if found then
    if v_report.user_id = v_uid then return v_report; end if;
    perform private.raise_app('client_id_conflict');
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));

  select * into v_profile from public.profiles where id = v_uid;
  if v_profile.banned_at is not null then perform private.raise_app('banned'); end if;

  select * into v_store from public.stores where id = p_store_id and status = 'active';
  if not found then perform private.raise_app('store_not_found'); end if;

  if p_captured_at > now() + interval '5 minutes'
     or p_captured_at < now() - make_interval(mins => private.cfg_int('offline_max_delay_min')) then
    perform private.raise_app('capture_too_old');
  end if;

  if p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    perform private.raise_app('invalid_position');
  end if;

  if jsonb_typeof(p_products) <> 'array' or jsonb_array_length(p_products) not between 1 and 12 then
    perform private.raise_app('invalid_products');
  end if;

  v_dist := round(extensions.st_distance(
              v_store.location,
              extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography));
  if v_dist > private.cfg_int('report_max_distance_m') then
    if private.can_report_remotely(v_profile) then
      v_remote := true;
    else
      perform private.raise_app('too_far', jsonb_build_object('distance_m', v_dist));
    end if;
  end if;

  -- rate limit: N reports per rolling hour
  select count(*), min(created_at) into v_count, v_oldest
  from (select created_at from public.reports
        where user_id = v_uid and created_at > now() - interval '1 hour'
        order by created_at desc limit private.cfg_int('rate_reports_per_hour')) t;
  if v_count >= private.cfg_int('rate_reports_per_hour') then
    perform private.raise_app('rate_limited_user', jsonb_build_object(
      'retry_in_min', ceil(extract(epoch from (v_oldest + interval '1 hour' - now())) / 60)));
  end if;

  -- rate limit: one report per store per cooldown
  select max(created_at) into v_oldest from public.reports
  where user_id = v_uid and store_id = p_store_id
    and created_at > now() - make_interval(mins => private.cfg_int('rate_store_cooldown_min'));
  if v_oldest is not null then
    perform private.raise_app('rate_limited_store', jsonb_build_object(
      'retry_in_min', ceil(extract(epoch from (v_oldest + make_interval(mins => private.cfg_int('rate_store_cooldown_min')) - now())) / 60)));
  end if;

  insert into public.reports (client_id, store_id, user_id, status, price_cents, comment,
                              reporter_distance_m, is_remote, is_first_of_day, reported_at, expires_at)
  values (
    p_client_id, p_store_id, v_uid, p_status, p_price_cents, nullif(btrim(p_comment), ''),
    v_dist, v_remote,
    p_status in ('in_stock','low_stock') and not exists (
      select 1 from public.reports r
      where r.store_id = p_store_id and r.status in ('in_stock','low_stock') and r.state <> 'hidden'
        and (r.reported_at at time zone 'Europe/Paris')::date = (p_captured_at at time zone 'Europe/Paris')::date),
    p_captured_at,
    p_captured_at + make_interval(hours => private.cfg_int('report_ttl_hours'))
  ) returning * into v_report;

  insert into public.report_products (report_id, product_id, qty_estimate)
  select v_report.id, p.id, nullif(e->>'qty', '')::smallint
  from jsonb_array_elements(p_products) e
  join public.products p on p.id = (e->>'product_id')::uuid and p.is_active
  on conflict do nothing;
  get diagnostics v_count = row_count;
  if v_count = 0 then perform private.raise_app('invalid_products'); end if;

  update public.profiles set reports_count = reports_count + 1 where id = v_uid;
  perform private.recompute_trust(v_report.id);

  select * into v_report from public.reports where id = v_report.id;
  return v_report;
end $$;

-- push outbox: enqueue on positive reports
create function private.on_report_inserted() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status in ('in_stock','low_stock','restock_incoming') and new.state = 'active' then
    insert into private.push_jobs (report_id, trigger) values (new.id, 'created') on conflict do nothing;
  end if;
  return null;
end $$;
create trigger reports_after_insert after insert on public.reports
  for each row execute function private.on_report_inserted();

create function public.cast_vote(
  p_report_id uuid, p_vote public.vote_kind, p_lat double precision, p_lng double precision
) returns public.reports
language plpgsql security definer set search_path = '' as $$
declare
  v_uid     uuid := auth.uid();
  v_profile public.profiles;
  v_report  public.reports;
  v_dist    int;
  v_prev    public.vote_kind;
  v_earned  int;
begin
  if v_uid is null then perform private.raise_app('auth_required'); end if;
  select * into v_profile from public.profiles where id = v_uid;
  if v_profile.banned_at is not null then perform private.raise_app('banned'); end if;

  select * into v_report from public.reports where id = p_report_id for update;
  if not found or v_report.state = 'hidden' then perform private.raise_app('report_not_found'); end if;
  if v_report.user_id = v_uid then perform private.raise_app('own_report'); end if;
  if v_report.expires_at < now() or v_report.state = 'expired' then perform private.raise_app('report_expired'); end if;

  select round(extensions.st_distance(s.location,
           extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography))
  into v_dist from public.stores s where s.id = v_report.store_id;
  if v_dist > private.cfg_int('vote_max_distance_m') then
    perform private.raise_app('too_far', jsonb_build_object('distance_m', v_dist));
  end if;

  select vote into v_prev from public.report_votes where report_id = p_report_id and user_id = v_uid;

  insert into public.report_votes (report_id, user_id, vote, distance_m)
  values (p_report_id, v_uid, p_vote, v_dist)
  on conflict (report_id, user_id) do update
    set vote = excluded.vote, distance_m = excluded.distance_m, updated_at = now();

  update public.reports r set
    confirm_count  = c.cf, deny_count = c.dn, sold_out_count = c.so
  from (select count(*) filter (where vote = 'confirm')      as cf,
               count(*) filter (where vote = 'deny')         as dn,
               count(*) filter (where vote = 'sold_out_now') as so
        from public.report_votes where report_id = p_report_id) c
  where r.id = p_report_id
  returning r.* into v_report;

  -- first confirmation: reputation, scout count, push (first_confirm mode)
  if v_report.confirm_count >= 1 and v_report.first_confirmed_at is null then
    update public.reports set first_confirmed_at = now() where id = p_report_id returning * into v_report;
    perform private.award(v_report.user_id, 'report_first_confirm', p_report_id, 'fc:' || p_report_id);
    if v_report.is_first_of_day then
      update public.profiles set scout_count = scout_count + 1 where id = v_report.user_id;
    end if;
    if v_report.state = 'active' and v_report.status in ('in_stock','low_stock','restock_incoming') then
      insert into private.push_jobs (report_id, trigger) values (p_report_id, 'first_confirm') on conflict do nothing;
    end if;
  elsif p_vote = 'confirm' and v_prev is distinct from 'confirm' then
    select coalesce(sum(points), 0) into v_earned from private.reputation_events
    where report_id = p_report_id and kind in ('report_first_confirm','report_extra_confirm');
    if v_earned < (select points from private.reputation_rules where kind = 'report_confirm_cap') then
      perform private.award(v_report.user_id, 'report_extra_confirm', p_report_id,
                            'xc:' || p_report_id || ':' || v_uid);
    end if;
  end if;

  -- "Plus rien": 1 vote from a reliable voter, or 2 distinct votes
  if v_report.state = 'active' and p_vote = 'sold_out_now'
     and (private.is_reliable(v_profile) or v_report.sold_out_count >= 2) then
    update public.reports set state = 'sold_out' where id = p_report_id returning * into v_report;
    update private.push_jobs set status = 'done', updated_at = now()
      where report_id = p_report_id and status = 'pending';
  end if;

  -- disputed: denies > confirms and at least 2 denies
  if v_report.state = 'active' and v_report.deny_count >= 2 and v_report.deny_count > v_report.confirm_count then
    update public.reports set state = 'disputed' where id = p_report_id returning * into v_report;
    update public.profiles set reports_disputed_count = reports_disputed_count + 1 where id = v_report.user_id;
    perform private.award(v_report.user_id, 'report_disputed', p_report_id, 'dp:' || p_report_id);
    update private.push_jobs set status = 'done', updated_at = now()
      where report_id = p_report_id and status = 'pending';
  end if;

  perform private.recompute_trust(p_report_id);
  select * into v_report from public.reports where id = p_report_id;
  return v_report;
end $$;
```
*Règles terminales assumées :* `sold_out` et `disputed` sont des états finaux pour le signalement. Un vote ultérieur est enregistré (il compte pour la cohérence des votes) mais ne change plus l'état. Pour corriger, il suffit d'un nouveau signalement.

## 0010_rpc_read.sql
```sql
create view public.feed_reports with (security_invoker = true) as
select r.id, r.store_id, s.name as store_name, s.city, s.brand_id,
       extensions.st_x(s.location::extensions.geometry) as store_lng,
       extensions.st_y(s.location::extensions.geometry) as store_lat,
       r.user_id, p.pseudo as author_pseudo, p.reputation_score as author_reputation,
       r.status, r.state, r.price_cents, r.comment,
       case when r.photo_hidden then null else r.photo_path end as photo_path,
       case when r.photo_hidden then null else r.thumb_path end as thumb_path,
       r.is_remote, r.reported_at, r.expires_at, r.confirm_count, r.deny_count,
       r.sold_out_count, r.trust_score,
       coalesce((select jsonb_agg(jsonb_build_object('id', pr.id, 'name', pr.name, 'type', pr.type,
                                                     'qty', rp.qty_estimate) order by pr.sort_order)
                 from public.report_products rp join public.products pr on pr.id = rp.product_id
                 where rp.report_id = r.id), '[]'::jsonb) as products
from public.reports r
join public.stores s on s.id = r.store_id
left join public.profiles p on p.id = r.user_id;
grant select on public.feed_reports to anon, authenticated;

create function public.get_feed(
  p_lat double precision, p_lng double precision, p_radius_km int default 15,
  p_product_ids uuid[] default null, p_brand_ids uuid[] default null,
  p_max_age_min int default 360, p_before timestamptz default null, p_limit int default 20
) returns setof public.feed_reports
language sql stable security invoker set search_path = '' as $$
  select f.* from public.feed_reports f
  join public.stores s on s.id = f.store_id
  where f.expires_at > now()
    and f.state in ('active','sold_out','disputed')
    and f.reported_at > now() - make_interval(mins => least(p_max_age_min, 360))
    and (p_before is null or f.reported_at < p_before)
    and extensions.st_dwithin(s.location,
          extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography,
          least(p_radius_km, 50) * 1000)
    and (p_brand_ids is null or f.brand_id = any(p_brand_ids))
    and (p_product_ids is null or exists (
          select 1 from public.report_products rp
          where rp.report_id = f.id and rp.product_id = any(p_product_ids)))
  order by f.reported_at desc
  limit least(p_limit, 50)
$$;

create function public.get_launch_stores()
returns table (id uuid, name text, brand_id uuid, city text, lng double precision, lat double precision,
               current_report_id uuid, current_status public.report_status, current_state public.report_state,
               current_reported_at timestamptz, current_trust smallint)
language sql stable security invoker set search_path = '' as $$
  select s.id, s.name, s.brand_id, s.city,
         extensions.st_x(s.location::extensions.geometry), extensions.st_y(s.location::extensions.geometry),
         lr.id, lr.status, lr.state, lr.reported_at, lr.trust_score
  from public.stores s
  left join lateral (
    select r.id, r.status, r.state, r.reported_at, r.trust_score from public.reports r
    where r.store_id = s.id and r.expires_at > now() and r.state in ('active','sold_out')
    order by r.reported_at desc limit 1
  ) lr on true
  where s.status = 'active'
    and s.department in (select jsonb_array_elements_text(value) from private.app_config where key = 'launch_departments')
$$;
-- get_stores_in_bbox: same projection, filtered with location && st_makeenvelope(...)

create function public.get_store_heatmap(p_store_id uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'total_90d', coalesce(sum(n_90d), 0),
    'enough',    coalesce(sum(n_90d), 0) >= private.cfg_int('heatmap_min_reports_90d'),
    'cells',     coalesce(jsonb_agg(jsonb_build_object('dow', dow, 'slot', slot, 'n', n_90d)), '[]'::jsonb))
  from public.store_slot_stats where store_id = p_store_id
$$;

create function public.get_public_config() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_object_agg(key, value) from private.app_config where is_public
$$;

grant execute on function public.get_feed(double precision, double precision, int, uuid[], uuid[], int, timestamptz, int),
                          public.get_launch_stores(), public.get_store_heatmap(uuid), public.get_public_config()
  to anon, authenticated;
grant execute on function public.create_report(uuid, uuid, double precision, double precision, public.report_status, jsonb, int, text, timestamptz),
                          public.cast_vote(uuid, public.vote_kind, double precision, double precision)
  to authenticated;
```

## 0011_rpc_misc_admin.sql (signatures et règles)
Ces fonctions suivent le même gabarit (`security definer`, `search_path = ''`, codes d'erreur stables, `grant execute` explicite). Le corps sera écrit dans les stories concernées.
- `get_me()` → `jsonb` : profil, `banned`, `user_settings` (`home_area` renvoyé en lat/lng arrondis) et `alert_preferences`.
- `propose_store(...)` → `stores` : utilisateur actif, `status = 'pending'`, `created_by = auth.uid()`, au plus 5 propositions en attente par utilisateur, département déduit du code postal.
- `find_store_duplicates(lat, lng, brand_id)` → `setof stores` (`st_dwithin` 100 m, même enseigne ou nom proche).
- `flag_content(report_id, target, reason, note)` → `void` : utilisateur actif, insertion avec `reporter_id = auth.uid()`, unique par élément.
- `get_my_export()` → `jsonb` : profil, réglages, préférences, favoris, signalements, votes, abonnements push (endpoints tronqués, sans clés), signalements d'abus envoyés.
- `log_client_error(message, stack, url)` → `void` : longueurs tronquées, 20 par heure et par utilisateur ou IP.
- `admin_review_store(store_id, decision, note, patch jsonb)` : `private.is_admin()`, mise à jour du statut, journal dans `moderation_log`.
- `admin_moderate(report_id, action, flag_ids)` :
  - `hide_report` : `state = 'hidden'`, `award(-10, 'mod:'||id)`, push annulés ;
  - `unhide_report` : état précédent ;
  - `hide_photo` : `photo_hidden = true`, `award(-10, 'modp:'||id)`, puis l'interface admin supprime l'objet Storage (policy admin delete). La suppression de photo est **irréversible**.
  - Les flags passent en `actioned` ou `dismissed`, avec une ligne dans le journal.
- `admin_set_ban(user_id, banned)` : `banned_at`, signalements actifs passés en `hidden`, journal.
- `admin_health()` → `jsonb` :
  - les 20 derniers `cron.job_run_details` ;
  - les compteurs `push_jobs` sur 24 h ;
  - les KPIs (signalements par jour, ratio confirmés / contestés, délai médian de 1re confirmation, actifs à 30 jours).
- `svc_*` : `grant execute ... to service_role` uniquement, avec un garde-fou interne `if auth.role() <> 'service_role' then raise`.

## 0012_push_targeting.sql
```sql
create function public.svc_claim_push_targets(p_job_id bigint)
returns table (subscription_id uuid, endpoint text, p256dh text, auth text, user_id uuid, report_id uuid)
language plpgsql security definer set search_path = '' as $$
declare
  v_job   private.push_jobs;
  v_rep   public.reports;
  v_store public.stores;
  v_pids  uuid[];
  v_types public.product_type[];
  v_now_t time := (now() at time zone 'Europe/Paris')::time;
begin
  if auth.role() <> 'service_role' then perform private.raise_app('forbidden'); end if;

  update private.push_jobs set status = 'sending', attempts = attempts + 1, updated_at = now()
  where id = p_job_id and status in ('pending','failed') and attempts < 3
  returning * into v_job;
  if not found then return; end if;

  select * into v_rep from public.reports where id = v_job.report_id;
  if v_rep.state <> 'active' or v_rep.expires_at < now()
     or v_rep.status not in ('in_stock','low_stock','restock_incoming') then
    update private.push_jobs set status = 'done', updated_at = now() where id = p_job_id;
    return;
  end if;
  select * into v_store from public.stores where id = v_rep.store_id;
  select array_agg(rp.product_id), array_agg(distinct p.type) into v_pids, v_types
  from public.report_products rp join public.products p on p.id = rp.product_id
  where rp.report_id = v_rep.id;

  return query
  with eligible as (
    select ap.user_id
    from public.alert_preferences ap
    join public.user_settings us on us.user_id = ap.user_id
    join public.profiles pr      on pr.id = ap.user_id and pr.banned_at is null
    where ap.enabled
      and ap.trigger = v_job.trigger
      and ap.user_id is distinct from v_rep.user_id
      and (
        (ap.favorites_only and exists (select 1 from public.store_favorites f
                                       where f.user_id = ap.user_id and f.store_id = v_store.id))
        or (not ap.favorites_only and us.home_area is not null
            and extensions.st_dwithin(us.home_area, v_store.location, ap.radius_km * 1000))
      )
      and ((cardinality(ap.product_ids) = 0 and cardinality(ap.product_types) = 0)
           or ap.product_ids && v_pids or ap.product_types && v_types)
      and (cardinality(ap.brand_ids) = 0 or v_store.brand_id = any(ap.brand_ids))
      and (ap.quiet_start is null or case
             when ap.quiet_start < ap.quiet_end then not (v_now_t >= ap.quiet_start and v_now_t < ap.quiet_end)
             else not (v_now_t >= ap.quiet_start or v_now_t < ap.quiet_end) end)
  ),
  claimed as (
    insert into private.push_dedupe (user_id, store_id, last_sent_at)
    select e.user_id, v_store.id, now() from eligible e
    on conflict (user_id, store_id) do update set last_sent_at = excluded.last_sent_at
      where private.push_dedupe.last_sent_at < now() - make_interval(hours => private.cfg_int('push_dedupe_hours'))
    returning private.push_dedupe.user_id
  )
  select s.id, s.endpoint, s.p256dh, s.auth, s.user_id, v_rep.id
  from public.push_subscriptions s join claimed c on c.user_id = s.user_id;
end $$;
revoke execute on function public.svc_claim_push_targets(bigint) from public, anon, authenticated;
grant  execute on function public.svc_claim_push_targets(bigint) to service_role;

-- dispatch: push_jobs insert -> pg_net -> Edge send-push (after commit)
create function private.dispatch_push_job() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'edge_send_push_url'),
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-push-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'push_webhook_secret')),
    body    := jsonb_build_object('job_id', new.id));
  return null;
end $$;
create trigger push_jobs_dispatch after insert on private.push_jobs
  for each row execute function private.dispatch_push_job();
```

## 0013_jobs.sql
```sql
create function private.finalize_reports() returns void
language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  for r in
    update public.reports
       set state = case when state = 'active' then 'expired'::public.report_state else state end,
           finalized_at = now()
     where finalized_at is null and expires_at < now()
    returning *
  loop
    if r.photo_path is not null and not r.photo_hidden and r.state not in ('disputed','hidden') then
      perform private.award(r.user_id, 'photo_kept', r.id, 'ph:' || r.id);
    end if;
    perform private.award(v.user_id, 'vote_coherent', r.id, 'vc:' || r.id || ':' || v.user_id)
    from public.report_votes v
    where v.report_id = r.id and r.state <> 'hidden'
      and ((r.state = 'disputed' and v.vote = 'deny')
        or (r.state <> 'disputed' and v.vote in ('confirm','sold_out_now')));
  end loop;
end $$;

create function private.refresh_store_slot_stats(p_full boolean default false) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_full then delete from public.store_slot_stats; end if;
  insert into public.store_slot_stats (store_id, dow, slot, n_90d, n_all, updated_at)
  select r.store_id,
         (extract(isodow from r.reported_at at time zone 'Europe/Paris')::int - 1)::smallint,
         (extract(hour   from r.reported_at at time zone 'Europe/Paris')::int / 2)::smallint,
         count(*) filter (where r.reported_at > now() - interval '90 days'),
         count(*), now()
  from public.reports r
  where r.status in ('in_stock','low_stock') and r.state not in ('disputed','hidden')
    and (p_full or r.store_id in (select store_id from public.reports where created_at > now() - interval '20 minutes'))
  group by 1, 2, 3
  on conflict (store_id, dow, slot) do update
    set n_90d = excluded.n_90d, n_all = excluded.n_all, updated_at = now();
end $$;

create function private.retry_push_jobs() returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'edge_send_push_url'),
    headers := jsonb_build_object('Content-Type','application/json',
                 'x-push-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'push_webhook_secret')),
    body    := jsonb_build_object('job_id', j.id))
  from private.push_jobs j
  where (j.status = 'pending' and j.created_at < now() - interval '1 minute')
     or (j.status in ('failed','sending') and j.updated_at < now() - interval '3 minutes' and j.attempts < 3);
end $$;

select cron.schedule('finalize-and-stats', '*/15 * * * *',
  $$ select private.finalize_reports(); select private.refresh_store_slot_stats(false); $$);
select cron.schedule('retry-push', '* * * * *', $$ select private.retry_push_jobs(); $$);
select cron.schedule('nightly', '30 3 * * *', $$
  select private.refresh_store_slot_stats(true);
  delete from private.push_dedupe where last_sent_at < now() - interval '1 day';
  delete from private.push_jobs   where created_at   < now() - interval '30 days';
  delete from private.client_errors where created_at < now() - interval '30 days';
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'edge_maintenance_url'),
    headers := jsonb_build_object('Content-Type','application/json',
               'x-push-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'push_webhook_secret')),
    body := '{"task":"purge_photos"}'::jsonb);
$$);
```

## Trust score (formule initiale)
`trust = clamp₀¹⁰⁰( (20 + 25·min(rep,150)/150 + 15·photo + 12·min(confirm,4) − 15·deny) × état × fraîcheur )`. L'état vaut 0,5 si `sold_out` ou `disputed`. La fraîcheur décroît linéairement de 1 à 0,6 sur la durée de vie. Rareté affichée : 1 étincelle sous 40, 2 de 40 à 79, 3 à partir de 80 (holo). Exemples :
- nouvel auteur sans photo ni vote : 20 ;
- auteur Fiable (30 pts) avec photo et 2 confirmations : 64 ;
- auteur Vétéran avec photo et 4 confirmations, frais : 100 (holo).

Les constantes seront déplacées dans `app_config` si un ajustement est nécessaire.

## Préparation V2 (prédiction)
`store_slot_stats` est alimentée dès la V1. La V2 ajoutera une fonction `get_store_forecast(store_id)` (fréquence par créneau sur 90 jours, intervalle de Wilson pour la confiance, libellé « probable mardi matin »), puis un cron du soir qui enfile des `push_jobs` de type `forecast` pour les favoris. Il suffira d'ajouter une valeur à l'enum `push_trigger`.
