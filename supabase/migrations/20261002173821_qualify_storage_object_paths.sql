-- Avoid ambiguous references to `name` inside policy subqueries. Without the
-- table qualifier PostgreSQL resolves name to restaurants.name, not the object key.

drop policy if exists "Owners upload files to their menu drafts" on storage.objects;
create policy "Owners upload files to their menu drafts"
  on storage.objects for insert to authenticated
  with check (
    storage.objects.bucket_id = 'menu-files'
    and exists (
      select 1 from public.menu_versions v
      join public.restaurants r on r.id = v.restaurant_id
      where v.id::text = (storage.foldername(storage.objects.name))[2]
        and r.id::text = (storage.foldername(storage.objects.name))[1]
        and v.status = 'draft'
        and r.owner_id = (select auth.uid())
        and r.status in ('pending_review', 'rejected', 'approved')
        and (select public.is_verified_owner())
    )
  );

drop policy if exists "Owners and published menus read menu files" on storage.objects;
create policy "Owners and published menus read menu files"
  on storage.objects for select to anon, authenticated
  using (
    storage.objects.bucket_id = 'menu-files'
    and (
      exists (
        select 1 from public.restaurants r
        where r.id::text = (storage.foldername(storage.objects.name))[1]
          and r.owner_id = (select auth.uid())
      )
      or exists (
        select 1 from public.menu_assets a
        join public.menu_versions v on v.id = a.version_id
        join public.restaurants r on r.id = v.restaurant_id
        where a.storage_path = storage.objects.name
          and v.status = 'published'
          and r.status = 'approved'
      )
      or (select public.is_admin())
    )
  );

drop policy if exists "Owners delete their restaurant menu files" on storage.objects;
create policy "Owners delete their restaurant menu files"
  on storage.objects for delete to authenticated
  using (
    storage.objects.bucket_id = 'menu-files'
    and exists (
      select 1 from public.restaurants r
      where r.id::text = (storage.foldername(storage.objects.name))[1]
        and r.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Owners upload restaurant cover photos" on storage.objects;
create policy "Owners upload restaurant cover photos"
  on storage.objects for insert to authenticated
  with check (
    storage.objects.bucket_id = 'restaurant-images'
    and exists (
      select 1 from public.restaurants r
      where r.id::text = (storage.foldername(storage.objects.name))[1]
        and r.owner_id = (select auth.uid())
        and r.status in ('pending_review', 'rejected', 'approved')
        and (select public.is_verified_owner())
    )
  );

drop policy if exists "Owners and diners read restaurant cover photos" on storage.objects;
create policy "Owners and diners read restaurant cover photos"
  on storage.objects for select to anon, authenticated
  using (
    storage.objects.bucket_id = 'restaurant-images'
    and exists (
      select 1 from public.restaurants r
      where r.cover_image_path = storage.objects.name
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
    storage.objects.bucket_id = 'restaurant-images'
    and exists (
      select 1 from public.restaurants r
      where r.cover_image_path = storage.objects.name
        and (r.owner_id = (select auth.uid()) or (select public.is_admin()))
    )
  );
