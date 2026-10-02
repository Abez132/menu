-- Round 4: administrator review, listing moderation, and private menu reports.

-- Admins can hide an inaccurate public menu without suspending the restaurant.
alter table public.menu_versions drop constraint if exists menu_versions_status_check;
alter table public.menu_versions add constraint menu_versions_status_check
  check (status in ('draft', 'published', 'hidden', 'archived'));
alter table public.menu_versions drop constraint if exists menu_versions_check;
alter table public.menu_versions add constraint menu_versions_confirmation_time_check
  check ((status = 'draft' and confirmed_at is null) or (status in ('published', 'hidden', 'archived') and confirmed_at is not null));

create or replace function public.protect_menu_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'draft' or new.confirmed_at is not null then
      raise exception 'New menu versions must start as drafts.';
    end if;
    return new;
  end if;

  if old.id is distinct from new.id or old.restaurant_id is distinct from new.restaurant_id then
    raise exception 'A menu version cannot be moved to another restaurant.';
  end if;

  if old.status = 'draft' and new.status = 'draft' then
    if new.confirmed_at is not null then
      raise exception 'Only the menu confirmation flow can confirm a menu.';
    end if;
    new.updated_at = now();
    return new;
  end if;

  if coalesce(pg_catalog.current_setting('yene.publish_menu', true), '') = 'on'
     and ((old.status = 'draft' and new.status = 'published')
       or (old.status = 'published' and new.status = 'archived')) then
    if new.status = 'published' and new.confirmed_at is null then
      raise exception 'A public menu must have an owner confirmation time.';
    end if;
    new.updated_at = now();
    return new;
  end if;

  if coalesce(pg_catalog.current_setting('yene.moderate_menu', true), '') = 'on'
     and (select public.is_admin())
     and ((old.status = 'published' and new.status in ('hidden', 'archived'))
       or (old.status = 'hidden' and new.status = 'published')) then
    if new.confirmed_at is distinct from old.confirmed_at then
      raise exception 'Moderation does not change the owner confirmation time.';
    end if;
    new.updated_at = now();
    return new;
  end if;

  raise exception 'Only a draft can be edited. Confirm a draft to change the public menu.';
end;
$$;

drop policy if exists "Public and owners read menu versions" on public.menu_versions;
create policy "Public and owners read menu versions"
  on public.menu_versions for select to anon, authenticated
  using (
    exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id
        and (
          (r.status = 'approved' and status = 'published')
          or r.owner_id = (select auth.uid())
          or (select public.is_admin())
        )
    )
  );

drop policy if exists "Admins moderate published menu versions" on public.menu_versions;
create policy "Admins moderate published menu versions"
  on public.menu_versions for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Owners and public readers read menu assets" on public.menu_assets;
create policy "Owners and public readers read menu assets"
  on public.menu_assets for select to anon, authenticated
  using (
    exists (
      select 1 from public.menu_versions v
      join public.restaurants r on r.id = v.restaurant_id
      where v.id = version_id and (
        (v.status = 'published' and r.status = 'approved')
        or r.owner_id = (select auth.uid())
        or (select public.is_admin())
      )
    )
  );

create or replace function public.set_menu_visibility(p_version_id uuid, p_visible boolean)
returns void
language plpgsql
set search_path = ''
as $$
declare
  target_restaurant_id uuid;
  target_status text;
begin
  if (select auth.uid()) is null or not (select public.is_admin()) then
    raise exception 'Only an administrator can change menu visibility.';
  end if;

  select v.restaurant_id, v.status into target_restaurant_id, target_status
  from public.menu_versions v
  where v.id = p_version_id and v.status in ('published', 'hidden')
  for update of v;
  if target_restaurant_id is null then
    raise exception 'This menu is no longer available for moderation.';
  end if;

  perform pg_catalog.set_config('yene.moderate_menu', 'on', true);
  if p_visible then
    update public.menu_versions set status = 'archived'
      where restaurant_id = target_restaurant_id and id <> p_version_id and status = 'published';
    update public.menu_versions set status = 'published'
      where id = p_version_id and status = 'hidden';
  else
    update public.menu_versions set status = 'hidden'
      where id = p_version_id and status = 'published';
  end if;
end;
$$;
revoke all on function public.set_menu_visibility(uuid, boolean) from public, anon;
grant execute on function public.set_menu_visibility(uuid, boolean) to authenticated;

drop policy if exists "Owners and published menus read menu files" on storage.objects;
create policy "Owners and published menus read menu files"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'menu-files'
    and (
      exists (
        select 1 from public.restaurants r
        where r.id::text = (storage.foldername(name))[1] and r.owner_id = (select auth.uid())
      )
      or exists (
        select 1 from public.menu_assets a
        join public.menu_versions v on v.id = a.version_id
        join public.restaurants r on r.id = v.restaurant_id
        where a.storage_path = name and v.status = 'published' and r.status = 'approved'
      )
      or (select public.is_admin())
    )
  );

create table if not exists public.menu_reports (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  menu_version_id uuid not null references public.menu_versions (id) on delete cascade,
  issue_type text not null check (issue_type in ('incorrect_price', 'incorrect_item', 'menu_out_of_date', 'file_problem', 'other')),
  message text not null check (char_length(btrim(message)) between 20 and 1000),
  reporter_contact text check (
    reporter_contact is null or (
      char_length(reporter_contact) <= 254
      and reporter_contact ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    )
  ),
  status text not null default 'open' check (status in ('open', 'investigating', 'resolved', 'dismissed')),
  admin_note text check (admin_note is null or char_length(admin_note) <= 1000),
  reviewed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists menu_reports_status_created_idx on public.menu_reports (status, created_at desc);
create index if not exists menu_reports_restaurant_created_idx on public.menu_reports (restaurant_id, created_at desc);

alter table public.menu_reports enable row level security;
revoke all on public.menu_reports from public, anon, authenticated;
grant insert on public.menu_reports to anon, authenticated;
grant select, update on public.menu_reports to authenticated;

drop policy if exists "Visitors report a current public menu" on public.menu_reports;
create policy "Visitors report a current public menu"
  on public.menu_reports for insert to anon, authenticated
  with check (
    status = 'open'
    and admin_note is null
    and reviewed_by is null
    and reviewed_at is null
    and exists (
      select 1 from public.menu_versions v
      join public.restaurants r on r.id = v.restaurant_id
      where v.id = menu_reports.menu_version_id
        and v.restaurant_id = menu_reports.restaurant_id
        and v.status = 'published'
        and r.status = 'approved'
    )
  );

drop policy if exists "Admins read menu reports" on public.menu_reports;
create policy "Admins read menu reports"
  on public.menu_reports for select to authenticated
  using ((select public.is_admin()));

drop policy if exists "Admins update menu reports" on public.menu_reports;
create policy "Admins update menu reports"
  on public.menu_reports for update to authenticated
  using ((select public.is_admin()))
  with check (
    (select public.is_admin())
    and (reviewed_by is null or reviewed_by = (select auth.uid()))
    and (status = 'open' or reviewed_at is not null)
  );

comment on table public.menu_reports is 'Private visitor reports about currently published restaurant menus. Only administrators can read or moderate reports.';
