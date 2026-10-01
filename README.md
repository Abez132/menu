# Yene Menu

Restaurant menu discovery for Addis Ababa.

## Local setup

1. Install the packages from the project folder with `npm install`.
2. Copy `.env.example` to `.env.local` and add your Supabase project URL and publishable key.
3. Set `NEXT_PUBLIC_SITE_URL` to `http://localhost:3000` for local development.
4. In Supabase, run `supabase/migrations/202609250001_restaurant_onboarding.sql` and then `supabase/migrations/202609300001_owner_menu_management.sql` in the SQL Editor, in that order. The second migration creates the menu tables, access policies, and private `menu-files` Storage bucket.
5. Turn on email confirmation in Supabase Auth. Add `http://localhost:3000/auth/confirm` to the allowed redirect URLs.
6. Start the app with `npm run dev` and visit `http://localhost:3000`.

Menu uploads accept PDF, JPG, PNG, and WebP files up to 5 MB each. The app uses structured dish data, uploaded files, or both. An owner must save and confirm the menu before it appears publicly.

## Promote the first administrator

After that person creates an account and verifies their email, use the Supabase SQL Editor to change their role:

```sql
update public.profiles
set role = 'admin'
where id = '<auth user UUID>';
```

Never put a Supabase service-role key in a `NEXT_PUBLIC_` variable or in browser code. The home discovery page still uses clearly labelled sample data. Approved restaurant detail pages can show the menu confirmed by that restaurant.
