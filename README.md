# Yene Menu

Restaurant menu discovery for Addis Ababa.

## Local setup

1. Install the packages from the project folder with `npm install`.
2. Copy `.env.example` to `.env.local` and add your Supabase project URL and publishable key.
3. Set `NEXT_PUBLIC_SITE_URL` to `http://localhost:3000` for local development.
4. In Supabase, run `supabase/migrations/202609250001_restaurant_onboarding.sql`, then `supabase/migrations/202609300001_owner_menu_management.sql`, then `supabase/migrations/202610020001_admin_review_and_reports.sql` in the SQL Editor, in that order. These migrations create the listing review controls, menu tables, private reports table, access policies, and private `menu-files` Storage bucket.
5. Turn on email confirmation in Supabase Auth. Add `http://localhost:3000/auth/confirm` to the allowed redirect URLs.
6. Start the app with `npm run dev` and visit `http://localhost:3000`.

Menu uploads accept PDF, JPG, PNG, and WebP files up to 5 MB each. The app uses structured dish data, uploaded files, or both. An owner must save and confirm the menu before it appears publicly.

The administrator page is at `/admin`. After the initial administrator account is created and verified, promote it using the SQL below; sign out and back in so the account picks up the new role.

## Promote the first administrator

After that person creates an account and verifies their email, use the Supabase SQL Editor to change their role:

```sql
update public.profiles
set role = 'admin'
where id = '<auth user UUID>';
```

Never put a Supabase service-role key in a `NEXT_PUBLIC_` variable or in browser code. The home discovery page shows approved restaurants that have a confirmed public menu. Until the first menu is published, it shows clearly labelled sample listings. A reported menu can be hidden by an administrator while it is reviewed, without suspending the restaurant listing.
