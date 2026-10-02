-- Let verified owners send edits to approved or rejected listings back for review.
-- The listing becomes private while pending_review; admins alone can approve it again.
create or replace function public.keep_restaurant_moderation_admin_only()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  restaurant_details_changed boolean;
begin
  if not public.is_admin() then
    if new.owner_id is distinct from old.owner_id then
      raise exception 'Only an administrator can change restaurant ownership.';
    end if;

    restaurant_details_changed :=
      new.name is distinct from old.name
      or new.slug is distinct from old.slug
      or new.category is distinct from old.category
      or new.neighborhood is distinct from old.neighborhood
      or new.street_address is distinct from old.street_address
      or new.description is distinct from old.description
      or new.public_phone is distinct from old.public_phone
      or new.website_url is distinct from old.website_url
      or new.cover_image_path is distinct from old.cover_image_path;

    if old.status in ('approved', 'rejected')
       and restaurant_details_changed
       and new.status <> 'pending_review' then
      raise exception 'Restaurant edits must be sent for administrator review.';
    end if;

    if new.status is distinct from old.status then
      if old.status in ('approved', 'rejected')
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

comment on column public.restaurants.status is
  'Admins control listing approval; verified owners can move approved or rejected listings to pending_review by submitting edits.';
