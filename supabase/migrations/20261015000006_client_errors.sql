-- Story 1.5 (needed by 1.3) — client error journal, in our own database (no third-party tracker).

create table private.client_errors (
  id         bigint generated always as identity primary key,
  user_id    uuid,
  message    text not null,
  stack      text,
  url        text,
  created_at timestamptz not null default now()
);

create index client_errors_created_idx on private.client_errors (created_at);

-- Rate limited: 20/hour per signed-in user, 200/hour for all anonymous visitors together.
create function public.log_client_error(p_message text, p_stack text default null, p_url text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid    uuid := auth.uid();
  v_recent int;
begin
  if p_message is null or btrim(p_message) = '' then
    return;
  end if;

  select count(*) into v_recent
  from private.client_errors
  where created_at > now() - interval '1 hour'
    and (user_id = v_uid or (v_uid is null and user_id is null));

  if v_recent >= (case when v_uid is null then 200 else 20 end) then
    return;
  end if;

  insert into private.client_errors (user_id, message, stack, url)
  values (
    v_uid,
    left(p_message, 500),
    left(p_stack, 4000),
    left(split_part(coalesce(p_url, ''), '?', 1), 300)
  );
end $$;

grant execute on function public.log_client_error(text, text, text) to anon, authenticated;

-- Service-only counter used by integration tests and, later, the admin health panel.
create function public.svc_client_error_count(p_since timestamptz) returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from private.client_errors where created_at >= p_since
$$;

revoke execute on function public.svc_client_error_count(timestamptz) from public, anon, authenticated;
grant execute on function public.svc_client_error_count(timestamptz) to service_role;
