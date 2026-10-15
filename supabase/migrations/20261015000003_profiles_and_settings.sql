-- Story 1.5 — profiles (public), user settings and alert preferences (owner only).
-- Reference: docs/architecture/database-schema.md (0003). A position, even rounded, is never public.

create table public.profiles (
  id                     uuid primary key references auth.users (id) on delete cascade,
  pseudo                 extensions.citext not null unique
                         check (pseudo operator(pg_catalog.~) '^[A-Za-z0-9_À-ÿ-]{3,20}$'),
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
  user_id      uuid primary key references public.profiles (id) on delete cascade,
  home_area    extensions.geography(Point, 4326), -- snapped to a ~1 km grid by trigger
  home_label   text check (char_length(home_label) <= 120),
  onboarded_at timestamptz,
  updated_at   timestamptz not null default now()
);

create table public.alert_preferences (
  user_id        uuid primary key references public.profiles (id) on delete cascade,
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

-- Helpers used by RLS policies.
create function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin' and banned_at is null
  )
$$;

create function private.is_active_user() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and banned_at is null)
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

-- Computed field exposed by PostgREST: select=*,badges
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

create trigger user_settings_snap
  before insert or update on public.user_settings
  for each row execute function private.snap_home_area();

create function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger alert_preferences_touch
  before update on public.alert_preferences
  for each row execute function private.touch_updated_at();

-- New account → public profile with a generated pseudo, settings and default alert preferences.
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_pseudo text;
  v_try    int := 0;
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Caller's full profile, settings (rounded position as lat/lng) and preferences.
create function public.get_me() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'profile', to_jsonb(p) - 'banned_at' || jsonb_build_object(
      'banned', p.banned_at is not null,
      'badges', to_jsonb(public.badges(p))),
    'settings', jsonb_build_object(
      'home_lat',     extensions.st_y(s.home_area::extensions.geometry),
      'home_lng',     extensions.st_x(s.home_area::extensions.geometry),
      'home_label',   s.home_label,
      'onboarded_at', s.onboarded_at),
    'alerts', to_jsonb(a) - 'user_id')
  from public.profiles p
  join public.user_settings s on s.user_id = p.id
  join public.alert_preferences a on a.user_id = p.id
  where p.id = (select auth.uid())
$$;

grant execute on function public.get_me() to authenticated;
