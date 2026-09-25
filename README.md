# Yene Menu

Restaurant menu discovery for Addis Ababa.

## Local setup

1. Install the packages from the project folder with `npm install`.
2. Copy `.env.example` to `.env.local` and add your Supabase project URL and publishable key.
3. Set `NEXT_PUBLIC_SITE_URL` to `http://localhost:3000` for local development.
4. In Supabase, run `supabase/migrations/202609250001_restaurant_onboarding.sql` in the SQL Editor.
5. Turn on email confirmation in Supabase Auth. Add `http://localhost:3000/auth/confirm` to the allowed redirect URLs.
6. Start the app with `npm run dev` and visit `http://localhost:3000`.

The Supabase packages were added to `package.json` after the existing dependency install, so run `npm install` once to update `package-lock.json` and install them.

## Promote the first administrator

After that person creates an account and verifies their email, use the Supabase SQL Editor to change their role:

```sql
update public.profiles
set role = 'admin'
where id = '<auth user UUID>';
```

Never put a Supabase service-role key in a `NEXT_PUBLIC_` variable or in browser code. The public browsing experience currently uses clearly labelled sample data; it does not yet read approved restaurants from Supabase.
