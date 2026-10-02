# Yene Menu

Restaurant menu discovery for Addis Ababa.

## Local setup

1. Install the packages from the project folder with `npm install`.
2. Copy `.env.example` to `.env.local` and add your Supabase project URL and publishable key.
3. Set `NEXT_PUBLIC_SITE_URL` to `http://localhost:3000` for local development.
4. Apply the three SQL migrations in timestamp order using the workflow in [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md). For a fresh production database, use the Supabase CLI so migration history stays aligned with these files. If they were already run from the SQL Editor, inspect/reconcile migration history before switching to the CLI.
5. Turn on email confirmation in Supabase Auth. Add `http://localhost:3000/auth/confirm` to the allowed redirect URLs.
6. Use Node.js 20.9 or newer, start the app with `npm run dev`, and visit `http://localhost:3000`.

## Production launch

Use [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) for the Vercel deployment, production Auth callback/SMTP setup, admin promotion, migration rollout, and first restaurant onboarding steps. Keep production environment values in the Vercel project settings. `NEXT_PUBLIC_SITE_URL` must be the public site origin in production; changing a `NEXT_PUBLIC_` value requires a new deployment.

Menu uploads accept PDF, JPG, PNG, and WebP files up to 5 MB each. The app uses structured dish data, uploaded files, or both. An owner must save and confirm the menu before it appears publicly.

The administrator page is at `/admin`. After the initial administrator account is created and verified, promote it using the SQL below; sign out and back in so the account picks up the new role.

## Promote the first administrator

After that person creates an account and verifies their email, use the Supabase SQL Editor to change their role:

```sql
update public.profiles
set role = 'admin'
where id = '<auth user UUID>';
```

Never put a Supabase service-role key in a `NEXT_PUBLIC_` variable or in browser code. The home discovery page shows approved restaurants that have a confirmed public menu. Development and preview builds can show labelled sample listings; production shows real menus only and an empty launch state until the first one is published. A reported menu can be hidden by an administrator while it is reviewed, without suspending the restaurant listing.
