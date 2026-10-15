-- Story 2.4 — one store for its page (/m/:id). RLS applies (pending stores only for their author/admins).

create function public.get_store(p_store_id uuid)
returns table (
  id uuid,
  name text,
  status public.store_status,
  brand_slug text,
  brand_name text,
  brand_kind text,
  category_color text,
  address text,
  city text,
  postcode text,
  department text,
  opening_hours text,
  lat double precision,
  lng double precision
)
language sql stable security invoker set search_path = '' as $$
  select s.id, s.name, s.status, b.slug, b.name, b.kind, b.category_color,
         s.address, s.city, s.postcode, s.department, s.opening_hours,
         extensions.st_y(s.location::extensions.geometry),
         extensions.st_x(s.location::extensions.geometry)
  from public.stores s
  left join public.brands b on b.id = s.brand_id
  where s.id = p_store_id
$$;

grant execute on function public.get_store(uuid) to anon, authenticated;
