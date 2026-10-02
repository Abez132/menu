-- Correctly qualify the menu status in the anonymous menu read policy.
-- Without this qualifier, PostgreSQL resolves `status` to restaurants.status
-- inside the subquery, which prevents anonymous readers from seeing menus.
grant select on public.restaurants, public.menu_versions, public.menu_assets to anon;

drop policy if exists "Public and owners read menu versions" on public.menu_versions;
create policy "Public and owners read menu versions"
  on public.menu_versions for select to anon, authenticated
  using (
    exists (
      select 1
      from public.restaurants r
      where r.id = menu_versions.restaurant_id
        and (
          (r.status = 'approved' and menu_versions.status = 'published')
          or r.owner_id = (select auth.uid())
          or (select public.is_admin())
        )
    )
  );
