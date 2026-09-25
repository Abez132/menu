-- Part 2: restaurant owner profiles and administrator-approved listings.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role text not null default 'owner' check (role in ('owner', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete restrict,
  name text not null check (char_length(name) between 2 and 100),
  slug text not null unique,
  category text not null,
  neighborhood text not null,
  street_address text not null,
  description text not null default '',
  public_phone text,
  website_url text,
  status text not null default 'pending_review'
    check (status in ('pending_review', 'approved', 'rejected', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists restaurants_owner_id_idx on public.restaurants (owner_id);
create index if not exists restaurants_public_listing_idx on public.restaurants (status, neighborhood, category);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), 'owner')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user();
revoke all on function public.handle_new_user() from public, anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;

create or replace function public.is_verified_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    join public.profiles p on p.id = u.id
    where u.id = (select auth.uid())
      and u.email_confirmed_at is not null
      and p.role = 'owner'
  );
$$;

revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_verified_owner() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_verified_owner() to authenticated;

create or replace function public.keep_restaurant_moderation_admin_only()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() and (
    new.owner_id is distinct from old.owner_id
    or new.status is distinct from old.status
  ) then
    raise exception 'Only an administrator can change restaurant ownership or publication status.';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists protect_restaurant_moderation_fields on public.restaurants;
create trigger protect_restaurant_moderation_fields
  before update on public.restaurants
  for each row execute function public.keep_restaurant_moderation_admin_only();
revoke all on function public.keep_restaurant_moderation_admin_only() from public, anon, authenticated;

alter table public.profiles enable row level security;
alter table public.restaurants enable row level security;

revoke all on public.profiles from public, anon, authenticated;
revoke all on public.restaurants from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update on public.restaurants to authenticated;
grant select on public.restaurants to anon;

drop policy if exists "Owners and admins read profiles" on public.profiles;
create policy "Owners and admins read profiles"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "Public can read approved restaurants" on public.restaurants;
create policy "Public can read approved restaurants"
  on public.restaurants for select to anon, authenticated
  using (status = 'approved');

drop policy if exists "Owners read their restaurants" on public.restaurants;
create policy "Owners read their restaurants"
  on public.restaurants for select to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists "Verified owners submit pending restaurants" on public.restaurants;
create policy "Verified owners submit pending restaurants"
  on public.restaurants for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and status = 'pending_review'
    and (select public.is_verified_owner())
  );

drop policy if exists "Owners edit their restaurant details" on public.restaurants;
create policy "Owners edit their restaurant details"
  on public.restaurants for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "Admins manage restaurant listings" on public.restaurants;
create policy "Admins manage restaurant listings"
  on public.restaurants for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

comment on table public.restaurants is 'Restaurant listings remain private until an administrator approves them.';
comment on column public.restaurants.status is 'Only an administrator may change publication status.';

-- After a verified owner account exists, an operator can grant admin access with:
-- update public.profiles set role = 'admin' where id = '<auth user UUID>';
