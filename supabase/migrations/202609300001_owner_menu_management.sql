-- Round 3: owner-managed menu versions, structured menu data, and private uploads.
-- Explicit grants keep these public-schema tables available to the Data API
-- while RLS controls which rows each role can read or change.

create table if not exists public.menu_versions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  content jsonb not null default '{"sections": []}'::jsonb check (jsonb_typeof(content) = 'object' and jsonb_typeof(content -> 'sections') = 'array'),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'draft' and confirmed_at is null) or (status in ('published', 'archived') and confirmed_at is not null))
);

create unique index if not exists menu_versions_one_draft_per_restaurant_idx
  on public.menu_versions (restaurant_id) where status = 'draft';
create unique index if not exists menu_versions_one_published_per_restaurant_idx
  on public.menu_versions (restaurant_id) where status = 'published';
create index if not exists menu_versions_restaurant_status_idx
  on public.menu_versions (restaurant_id, status, created_at desc);

create table if not exists public.menu_assets (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.menu_versions (id) on delete cascade,
  storage_path text not null,
  original_name text not null check (char_length(original_name) between 1 and 180),
  content_type text not null check (content_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  size_bytes bigint not null check (size_bytes between 1 and 5242880),
  created_at timestamptz not null default now()
);

create index if not exists menu_assets_version_id_idx on public.menu_assets (version_id);
create index if not exists menu_assets_storage_path_idx on public.menu_assets (storage_path);
create unique index if not exists menu_assets_version_path_unique_idx on public.menu_assets (version_id, storage_path);
grant execute on function public.is_admin() to anon;

alter table public.menu_versions enable row level security;
alter table public.menu_assets enable row level security;
revoke all on public.menu_versions, public.menu_assets from public, anon, authenticated;
grant select on public.menu_versions, public.menu_assets to anon, authenticated;
grant insert, update, delete on public.menu_versions, public.menu_assets to authenticated;

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

drop policy if exists "Verified owners create menu drafts" on public.menu_versions;
create policy "Verified owners create menu drafts"
  on public.menu_versions for insert to authenticated
  with check (
    status = 'draft'
    and confirmed_at is null
    and exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id and r.owner_id = (select auth.uid()) and r.status = 'approved'
    )
    and (select public.is_verified_owner())
  );

drop policy if exists "Owners update their restaurant menu versions" on public.menu_versions;
create policy "Owners update their restaurant menu versions"
  on public.menu_versions for update to authenticated
  using (
    exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = (select auth.uid()))
  );

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

drop policy if exists "Owners attach files to their menu drafts" on public.menu_assets;
create policy "Owners attach files to their menu drafts"
  on public.menu_assets for insert to authenticated
  with check (
    exists (
      select 1 from public.menu_versions v
      join public.restaurants r on r.id = v.restaurant_id
      where v.id = version_id and v.status = 'draft' and r.owner_id = (select auth.uid()) and r.status = 'approved'
    )
  );

drop policy if exists "Owners remove files from their menu drafts" on public.menu_assets;
create policy "Owners remove files from their menu drafts"
  on public.menu_assets for delete to authenticated
  using (
    exists (
      select 1 from public.menu_versions v
      join public.restaurants r on r.id = v.restaurant_id
      where v.id = version_id and v.status = 'draft' and r.owner_id = (select auth.uid())
    )
  );

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

  raise exception 'Only a draft can be edited. Confirm a draft to change the public menu.';
end;
$$;

drop trigger if exists protect_menu_version_changes on public.menu_versions;
create trigger protect_menu_version_changes
  before insert or update on public.menu_versions
  for each row execute function public.protect_menu_version();
revoke all on function public.protect_menu_version() from public, anon, authenticated;

create or replace function public.publish_menu_version(p_version_id uuid, p_owner_confirmed boolean)
returns void
language plpgsql
set search_path = ''
as $$
declare
  target_restaurant_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to publish this menu.';
  end if;
  if p_owner_confirmed is distinct from true then
    raise exception 'Confirm that the menu is accurate before publishing.';
  end if;

  select v.restaurant_id into target_restaurant_id
  from public.menu_versions v
  join public.restaurants r on r.id = v.restaurant_id
  where v.id = p_version_id
    and v.status = 'draft'
    and r.owner_id = (select auth.uid())
    and r.status = 'approved'
    and (select public.is_verified_owner())
  for update of v;

  if target_restaurant_id is null then
    raise exception 'This draft is not available for publishing.';
  end if;

  if not exists (
    select 1
    from public.menu_versions v
    cross join lateral jsonb_array_elements(v.content -> 'sections') as s(section_data)
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(s.section_data -> 'items') = 'array' then s.section_data -> 'items' else '[]'::jsonb end
    ) as i(item_data)
    where v.id = p_version_id
  ) and not exists (select 1 from public.menu_assets a where a.version_id = p_version_id) then
    raise exception 'Add at least one menu item or uploaded menu file before publishing.';
  end if;

  perform pg_catalog.set_config('yene.publish_menu', 'on', true);
  update public.menu_versions
    set status = 'archived'
    where restaurant_id = target_restaurant_id and status = 'published';
  update public.menu_versions
    set status = 'published', confirmed_at = pg_catalog.now(), updated_at = pg_catalog.now()
    where id = p_version_id and status = 'draft';
end;
$$;
revoke all on function public.publish_menu_version(uuid, boolean) from public, anon;
grant execute on function public.publish_menu_version(uuid, boolean) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menu-files', 'menu-files', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Owners upload files to their menu drafts" on storage.objects;
create policy "Owners upload files to their menu drafts"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'menu-files'
    and exists (
      select 1 from public.menu_versions v
      join public.restaurants r on r.id = v.restaurant_id
      where v.id::text = (storage.foldername(name))[2]
        and r.id::text = (storage.foldername(name))[1]
        and v.status = 'draft'
        and r.owner_id = (select auth.uid())
        and r.status = 'approved'
    )
  );

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
    )
  );

drop policy if exists "Owners delete their restaurant menu files" on storage.objects;
create policy "Owners delete their restaurant menu files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'menu-files'
    and exists (
      select 1 from public.restaurants r
      where r.id::text = (storage.foldername(name))[1] and r.owner_id = (select auth.uid())
    )
  );
