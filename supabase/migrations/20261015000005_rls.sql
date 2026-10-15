-- Story 1.5 — row level security for every table created so far.
-- Reference: docs/architecture/database-schema.md (0007). Writes on sensitive data go through RPCs.

alter table public.profiles          enable row level security;
alter table public.user_settings     enable row level security;
alter table public.alert_preferences enable row level security;
alter table public.games             enable row level security;
alter table public.brands            enable row level security;
alter table public.products          enable row level security;
alter table public.stores            enable row level security;
alter table public.store_favorites   enable row level security;

-- profiles: banned_at is never exposed; users may only edit pseudo and avatar.
revoke all on public.profiles from anon, authenticated;
grant select (id, pseudo, avatar_key, role, reputation_score, reports_count,
              reports_disputed_count, scout_count, created_at)
  on public.profiles to anon, authenticated;
grant update (pseudo, avatar_key) on public.profiles to authenticated;

create policy profiles_read on public.profiles
  for select to anon, authenticated using (true);
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) and banned_at is null)
  with check (id = (select auth.uid()));

-- user_settings / alert_preferences: owner only, rows created by the signup trigger.
revoke insert, delete on public.user_settings, public.alert_preferences from anon, authenticated;
revoke all on public.user_settings, public.alert_preferences from anon;

create policy settings_owner_read on public.user_settings
  for select to authenticated using (user_id = (select auth.uid()));
create policy settings_owner_update on public.user_settings
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy alerts_owner_read on public.alert_preferences
  for select to authenticated using (user_id = (select auth.uid()));
create policy alerts_owner_update on public.alert_preferences
  for update to authenticated
  using (user_id = (select auth.uid()) and private.is_active_user())
  with check (user_id = (select auth.uid()));

-- catalog: public read of active rows, admin writes.
create policy games_read on public.games
  for select to anon, authenticated using (is_active or private.is_admin());
create policy games_admin_insert on public.games
  for insert to authenticated with check (private.is_admin());
create policy games_admin_update on public.games
  for update to authenticated using (private.is_admin()) with check (private.is_admin());
create policy games_admin_delete on public.games
  for delete to authenticated using (private.is_admin());

create policy brands_read on public.brands
  for select to anon, authenticated using (true);
create policy brands_admin_insert on public.brands
  for insert to authenticated with check (private.is_admin());
create policy brands_admin_update on public.brands
  for update to authenticated using (private.is_admin()) with check (private.is_admin());
create policy brands_admin_delete on public.brands
  for delete to authenticated using (private.is_admin());

create policy products_read on public.products
  for select to anon, authenticated using (is_active or private.is_admin());
create policy products_admin_insert on public.products
  for insert to authenticated with check (private.is_admin());
create policy products_admin_update on public.products
  for update to authenticated using (private.is_admin()) with check (private.is_admin());
create policy products_admin_delete on public.products
  for delete to authenticated using (private.is_admin());

-- stores: active public; pending visible to its author; users propose through an RPC (story 2.8).
create policy stores_read on public.stores
  for select to anon, authenticated
  using (status = 'active' or created_by = (select auth.uid()) or private.is_admin());
create policy stores_admin_update on public.stores
  for update to authenticated using (private.is_admin()) with check (private.is_admin());

-- favorites: owner only.
revoke all on public.store_favorites from anon;
create policy fav_owner_read on public.store_favorites
  for select to authenticated using (user_id = (select auth.uid()));
create policy fav_owner_insert on public.store_favorites
  for insert to authenticated
  with check (user_id = (select auth.uid()) and private.is_active_user());
create policy fav_owner_delete on public.store_favorites
  for delete to authenticated using (user_id = (select auth.uid()));
