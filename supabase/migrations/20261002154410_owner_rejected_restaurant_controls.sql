-- Let verified owners correct a rejected listing and request another review.
-- Owners may delete only their own rejected requests.

create or replace function public.keep_restaurant_moderation_admin_only()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    if new.owner_id is distinct from old.owner_id then
      raise exception 'Only an administrator can change restaurant ownership.';
    end if;
    if new.status is distinct from old.status then
      if old.status = 'rejected'
         and new.status = 'pending_review'
         and old.owner_id = (select auth.uid())
         and (select public.is_verified_owner()) then
        null;
      else
        raise exception 'Only an administrator can change restaurant publication status.';
      end if;
    end if;
  end if;
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.keep_restaurant_moderation_admin_only() from public, anon, authenticated;

grant delete on public.restaurants to authenticated;

drop policy if exists "Owners delete their rejected restaurant requests" on public.restaurants;
create policy "Owners delete their rejected restaurant requests"
  on public.restaurants for delete to authenticated
  using (
    owner_id = (select auth.uid())
    and status = 'rejected'
    and (select public.is_verified_owner())
  );

-- Let owners prepare private menu drafts while listings are pending or rejected.
-- Existing menu publication RPCs still require an approved restaurant.
drop policy if exists "Verified owners create menu drafts" on public.menu_versions;
create policy "Verified owners create menu drafts"
  on public.menu_versions for insert to authenticated
  with check (
    status = 'draft'
    and confirmed_at is null
    and exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id
        and r.owner_id = (select auth.uid())
        and r.status in ('pending_review', 'rejected', 'approved')
    )
    and (select public.is_verified_owner())
  );

drop policy if exists "Owners attach files to their menu drafts" on public.menu_assets;
create policy "Owners attach files to their menu drafts"
  on public.menu_assets for insert to authenticated
  with check (
    exists (
      select 1 from public.menu_versions v
      join public.restaurants r on r.id = v.restaurant_id
      where v.id = version_id
        and v.status = 'draft'
        and r.owner_id = (select auth.uid())
        and r.status in ('pending_review', 'rejected', 'approved')
        and (select public.is_verified_owner())
    )
  );

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
        and r.status in ('pending_review', 'rejected', 'approved')
        and (select public.is_verified_owner())
    )
  );

-- Optional restaurant cover photos stay private until the restaurant is approved.
alter table public.restaurants add column if not exists cover_image_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('restaurant-images', 'restaurant-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Owners upload restaurant cover photos" on storage.objects;
create policy "Owners upload restaurant cover photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'restaurant-images'
    and exists (
      select 1 from public.restaurants r
      where r.id::text = (storage.foldername(name))[1]
        and r.owner_id = (select auth.uid())
        and r.status in ('pending_review', 'rejected', 'approved')
        and (select public.is_verified_owner())
    )
  );

drop policy if exists "Owners and diners read restaurant cover photos" on storage.objects;
create policy "Owners and diners read restaurant cover photos"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'restaurant-images'
    and exists (
      select 1 from public.restaurants r
      where r.cover_image_path = name
        and (
          r.status = 'approved'
          or r.owner_id = (select auth.uid())
          or (select public.is_admin())
        )
    )
  );

drop policy if exists "Owners and admins delete restaurant cover photos" on storage.objects;
create policy "Owners and admins delete restaurant cover photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'restaurant-images'
    and exists (
      select 1 from public.restaurants r
      where r.cover_image_path = name
        and (r.owner_id = (select auth.uid()) or (select public.is_admin()))
    )
  );
