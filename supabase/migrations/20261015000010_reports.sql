-- Story 2.5 — reports, server-side rules (distance, rate limits, idempotency), expiry job, slot stats.
-- Reference: docs/architecture/database-schema.md (0005, 0008, 0009, 0013). Votes, reputation events and
-- push outbox arrive with epics 3 and 4.

create extension if not exists pg_cron;

create type public.report_status as enum ('in_stock', 'low_stock', 'out_of_stock', 'restock_incoming');
create type public.report_state  as enum ('active', 'sold_out', 'disputed', 'expired', 'hidden');

create table public.reports (
  id                  uuid primary key default gen_random_uuid(),
  client_id           uuid not null unique,
  store_id            uuid not null references public.stores (id),
  user_id             uuid references public.profiles (id) on delete set null,
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
  reported_at         timestamptz not null,               -- observation time (captured on device)
  created_at          timestamptz not null default now(), -- insert time (rate limits)
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
  report_id    uuid not null references public.reports (id) on delete cascade,
  product_id   uuid not null references public.products (id),
  qty_estimate smallint check (qty_estimate between 1 and 999),
  primary key (report_id, product_id)
);

create index report_products_product_idx on public.report_products (product_id);

create table public.store_slot_stats (
  store_id   uuid not null references public.stores (id) on delete cascade,
  dow        smallint not null check (dow between 0 and 6),   -- 0 = lundi
  slot       smallint not null check (slot between 0 and 11), -- 2-hour slots, Europe/Paris
  n_90d      int not null default 0,
  n_all      int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (store_id, dow, slot)
);

alter publication supabase_realtime add table public.reports;

-- RLS: public read (except hidden), no direct writes — everything goes through create_report.
alter table public.reports          enable row level security;
alter table public.report_products  enable row level security;
alter table public.store_slot_stats enable row level security;

revoke insert, update, delete on public.reports, public.report_products, public.store_slot_stats
  from anon, authenticated;

create policy reports_read on public.reports
  for select to anon, authenticated
  using (state <> 'hidden' or user_id = (select auth.uid()) or private.is_admin());

create policy report_products_read on public.report_products
  for select to anon, authenticated
  using (exists (select 1 from public.reports r where r.id = report_id));

create policy slot_stats_read on public.store_slot_stats
  for select to anon, authenticated using (true);

-- Errors with a stable code and a JSON detail (mapped to French messages by the client).
create function private.raise_app(p_code text, p_detail jsonb default '{}'::jsonb) returns void
language plpgsql set search_path = '' as $$
begin
  raise exception using errcode = 'P0001', message = p_code, detail = p_detail::text;
end $$;

-- Trust score 0..100 (architecture, "Trust score"): author reputation, photo, votes, freshness.
create function private.recompute_trust(p_report uuid) returns void
language sql security definer set search_path = '' as $$
  update public.reports r set trust_score = least(100, greatest(0, round(
      ( 20
      + 25 * least(coalesce((select p.reputation_score from public.profiles p where p.id = r.user_id), 0), 150) / 150.0
      + case when r.photo_path is not null and not r.photo_hidden then 15 else 0 end
      + 12 * least(r.confirm_count, 4)
      - 15 * r.deny_count )
      * case when r.state in ('sold_out', 'disputed') then 0.5 else 1 end
      * greatest(0.6, 1 - 0.4 * least(1, extract(epoch from (now() - r.reported_at))
                                        / nullif(extract(epoch from (r.expires_at - r.reported_at)), 0)))
  )))
  where r.id = p_report
$$;

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
  v_uid     uuid := auth.uid();
  v_profile public.profiles;
  v_store   public.stores;
  v_report  public.reports;
  v_dist    int;
  v_remote  boolean := false;
  v_count   int;
  v_oldest  timestamptz;
begin
  if v_uid is null then perform private.raise_app('auth_required'); end if;

  -- Idempotency: the offline queue may resend the same report.
  select * into v_report from public.reports where client_id = p_client_id;
  if found then
    if v_report.user_id = v_uid then return v_report; end if;
    perform private.raise_app('client_id_conflict');
  end if;

  -- Serializes one user's concurrent submissions so rate limits cannot be raced.
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));

  select * into v_profile from public.profiles where id = v_uid;
  if v_profile.banned_at is not null then perform private.raise_app('banned'); end if;

  select * into v_store from public.stores where id = p_store_id and status = 'active';
  if not found then perform private.raise_app('store_not_found'); end if;

  if p_captured_at > now() + interval '5 minutes'
     or p_captured_at < now() - make_interval(mins => private.cfg_int('offline_max_delay_min')) then
    perform private.raise_app('capture_too_old');
  end if;

  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    perform private.raise_app('invalid_position');
  end if;

  if jsonb_typeof(p_products) is distinct from 'array' or jsonb_array_length(p_products) not between 1 and 12 then
    perform private.raise_app('invalid_products');
  end if;

  if p_comment is not null and char_length(btrim(p_comment)) > 140 then
    perform private.raise_app('comment_too_long');
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

  -- Rate limit: N reports per rolling hour.
  select count(*), min(created_at) into v_count, v_oldest
  from (select created_at from public.reports
        where user_id = v_uid and created_at > now() - interval '1 hour'
        order by created_at desc limit private.cfg_int('rate_reports_per_hour')) t;
  if v_count >= private.cfg_int('rate_reports_per_hour') then
    perform private.raise_app('rate_limited_user', jsonb_build_object(
      'retry_in_min', greatest(1, ceil(extract(epoch from (v_oldest + interval '1 hour' - now())) / 60))));
  end if;

  -- Rate limit: one report per store per cooldown.
  select max(created_at) into v_oldest from public.reports
  where user_id = v_uid and store_id = p_store_id
    and created_at > now() - make_interval(mins => private.cfg_int('rate_store_cooldown_min'));
  if v_oldest is not null then
    perform private.raise_app('rate_limited_store', jsonb_build_object(
      'retry_in_min', greatest(1, ceil(extract(epoch from (
        v_oldest + make_interval(mins => private.cfg_int('rate_store_cooldown_min')) - now())) / 60))));
  end if;

  insert into public.reports (client_id, store_id, user_id, status, price_cents, comment,
                              reporter_distance_m, is_remote, is_first_of_day, reported_at, expires_at)
  values (
    p_client_id, p_store_id, v_uid, p_status, p_price_cents, nullif(btrim(p_comment), ''),
    v_dist, v_remote,
    p_status in ('in_stock', 'low_stock') and not exists (
      select 1 from public.reports r
      where r.store_id = p_store_id and r.status in ('in_stock', 'low_stock') and r.state <> 'hidden'
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

grant execute on function public.create_report(uuid, uuid, double precision, double precision,
  public.report_status, jsonb, int, text, timestamptz) to authenticated;

-- Expiry: active → expired once past expires_at (reputation settlement arrives with story 3.6).
create function private.finalize_reports() returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.reports
     set state = case when state = 'active' then 'expired'::public.report_state else state end,
         finalized_at = now()
   where finalized_at is null and expires_at < now();
end $$;

-- Day × 2-hour slot counts of positive reports (heatmap now, prediction in V2).
create function private.refresh_store_slot_stats(p_full boolean default false) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_full then delete from public.store_slot_stats where true; end if; -- pg-safeupdate needs a WHERE
  insert into public.store_slot_stats (store_id, dow, slot, n_90d, n_all, updated_at)
  select r.store_id,
         (extract(isodow from r.reported_at at time zone 'Europe/Paris')::int - 1)::smallint,
         (extract(hour from r.reported_at at time zone 'Europe/Paris')::int / 2)::smallint,
         count(*) filter (where r.reported_at > now() - interval '90 days'),
         count(*),
         now()
  from public.reports r
  where r.status in ('in_stock', 'low_stock') and r.state not in ('disputed', 'hidden')
    and (p_full or r.store_id in (
      select store_id from public.reports where created_at > now() - interval '20 minutes'))
  group by 1, 2, 3
  on conflict (store_id, dow, slot) do update
    set n_90d = excluded.n_90d, n_all = excluded.n_all, updated_at = now();
end $$;

select cron.schedule('finalize-and-stats', '*/15 * * * *',
  $$ select private.finalize_reports(); select private.refresh_store_slot_stats(false); $$);
select cron.schedule('nightly-stats', '30 3 * * *',
  $$ select private.refresh_store_slot_stats(true); $$);

-- Service-only trigger for the jobs (integration tests, admin health panel later).
create function public.svc_run_jobs() returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.finalize_reports();
  perform private.refresh_store_slot_stats(true);
end $$;

revoke execute on function public.svc_run_jobs() from public, anon, authenticated;
grant execute on function public.svc_run_jobs() to service_role;

-- Map and store page now carry the latest valid report (active or confirmed sold out).
drop function public.get_launch_stores();

create function public.get_launch_stores()
returns table (
  id uuid, name text, brand_slug text, brand_name text, brand_kind text, category_color text,
  address text, city text, postcode text, lat double precision, lng double precision,
  current_report_id uuid, status public.report_status, current_state public.report_state,
  current_reported_at timestamptz, current_trust smallint
)
language sql stable security invoker set search_path = '' as $$
  select s.id, s.name, b.slug, b.name, b.kind, b.category_color, s.address, s.city, s.postcode,
         extensions.st_y(s.location::extensions.geometry),
         extensions.st_x(s.location::extensions.geometry),
         lr.id,
         case when lr.state = 'sold_out' then 'out_of_stock'::public.report_status else lr.status end,
         lr.state, lr.reported_at, lr.trust_score
  from public.stores s
  left join public.brands b on b.id = s.brand_id
  left join lateral (
    select r.id, r.status, r.state, r.reported_at, r.trust_score from public.reports r
    where r.store_id = s.id and r.expires_at > now() and r.state in ('active', 'sold_out')
    order by r.reported_at desc limit 1
  ) lr on true
  where s.status = 'active' and s.department = any (private.launch_departments())
  order by s.name
$$;

grant execute on function public.get_launch_stores() to anon, authenticated;

drop function public.get_store(uuid);

create function public.get_store(p_store_id uuid)
returns table (
  id uuid, name text, status public.store_status, brand_slug text, brand_name text, brand_kind text,
  category_color text, address text, city text, postcode text, department text, opening_hours text,
  lat double precision, lng double precision,
  current_report_id uuid, current_status public.report_status, current_state public.report_state,
  current_reported_at timestamptz, current_trust smallint, current_confirm_count int
)
language sql stable security invoker set search_path = '' as $$
  select s.id, s.name, s.status, b.slug, b.name, b.kind, b.category_color,
         s.address, s.city, s.postcode, s.department, s.opening_hours,
         extensions.st_y(s.location::extensions.geometry),
         extensions.st_x(s.location::extensions.geometry),
         lr.id,
         case when lr.state = 'sold_out' then 'out_of_stock'::public.report_status else lr.status end,
         lr.state, lr.reported_at, lr.trust_score, lr.confirm_count
  from public.stores s
  left join public.brands b on b.id = s.brand_id
  left join lateral (
    select r.id, r.status, r.state, r.reported_at, r.trust_score, r.confirm_count from public.reports r
    where r.store_id = s.id and r.expires_at > now() and r.state in ('active', 'sold_out')
    order by r.reported_at desc limit 1
  ) lr on true
  where s.id = p_store_id
$$;

grant execute on function public.get_store(uuid) to anon, authenticated;
