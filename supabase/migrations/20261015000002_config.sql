-- Story 1.5 — application configuration (thresholds editable without redeploy).
-- Reference: docs/architecture/database-schema.md (0002).

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

grant execute on function private.cfg_num(text), private.cfg_int(text)
  to anon, authenticated, service_role;

-- Non-secret thresholds for UI messages (distances, TTL, holo threshold…).
create function public.get_public_config() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) from private.app_config where is_public
$$;

grant execute on function public.get_public_config() to anon, authenticated;
