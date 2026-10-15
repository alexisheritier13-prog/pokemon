-- Story 2.1 — all active stores of the launch departments, for the map and list (~350 rows, cached 24 h).
-- Story 2.5 replaces this function to add the current report status.

-- Launch departments from the private config (readable by anyone through this helper only).
create function private.launch_departments() returns text[]
language sql stable security definer set search_path = '' as $$
  select coalesce(
    array(select jsonb_array_elements_text(value) from private.app_config where key = 'launch_departments'),
    '{}'
  )
$$;

grant execute on function private.launch_departments() to anon, authenticated;

create function public.get_launch_stores()
returns table (
  id uuid,
  name text,
  brand_slug text,
  brand_name text,
  brand_kind text,
  category_color text,
  address text,
  city text,
  postcode text,
  lat double precision,
  lng double precision
)
language sql stable security invoker set search_path = '' as $$
  select s.id, s.name, b.slug, b.name, b.kind, b.category_color, s.address, s.city, s.postcode,
         extensions.st_y(s.location::extensions.geometry),
         extensions.st_x(s.location::extensions.geometry)
  from public.stores s
  left join public.brands b on b.id = s.brand_id
  where s.status = 'active'
    and s.department = any (private.launch_departments())
  order by s.name
$$;

grant execute on function public.get_launch_stores() to anon, authenticated;
