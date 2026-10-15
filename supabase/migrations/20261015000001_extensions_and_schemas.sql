-- Story 1.5 — extensions, private schema, base enums.
-- Reference: docs/architecture/database-schema.md (0001).

create extension if not exists postgis with schema extensions;
create extension if not exists citext with schema extensions;

-- Private objects are only reachable through security definer functions, except a few
-- read-only helpers explicitly granted below (used inside RLS policies). Not exposed by PostgREST.
create schema if not exists private;
grant usage on schema private to anon, authenticated, service_role;

-- Functions are not executable by default: every RPC gets an explicit grant.
alter default privileges in schema private revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from public, anon;

create type public.store_status as enum ('pending', 'active', 'rejected', 'disabled');
create type public.product_type as enum ('booster', 'blister', 'display', 'etb', 'coffret', 'tin', 'bundle', 'other');
create type public.app_role as enum ('user', 'admin');
create type public.push_trigger as enum ('created', 'first_confirm');
