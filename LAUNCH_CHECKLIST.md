# Yene Menu — Round 5 launch checklist

This is the handoff checklist for connecting the app to production services, deploying it, and onboarding the first Addis Ababa restaurants. Check off each item in the relevant Supabase or Vercel account. No production account or domain has been changed from this workspace.

## 1. Prepare Supabase

- [ ] Choose or create the Supabase project that will hold production data. Keep development/test data in a separate project if possible.
- [ ] Apply the three SQL migration files, in timestamp order:
  1. `supabase/migrations/202609250001_restaurant_onboarding.sql`
  2. `supabase/migrations/202609300001_owner_menu_management.sql`
  3. `supabase/migrations/202610020001_admin_review_and_reports.sql`
- [ ] For a fresh production database, use the tracked Supabase CLI workflow from this project folder:

  ```powershell
  npm install --save-dev supabase
  npx supabase init
  npx supabase login
  npx supabase link --project-ref <your-project-ref>
  npx supabase migration list
  npx supabase db push --dry-run
  npx supabase db push
  ```

  Check the dry-run output before applying. `supabase init` creates the project config alongside the existing migration files. Keep those migration files as the source of truth for later schema changes.
- [ ] If the SQL files were already run from the Dashboard SQL Editor, do not immediately run `supabase db push`. Dashboard changes do not automatically register in the CLI migration history. Inspect the remote schema and migration history first, then reconcile the history before switching workflows.
- [ ] If you use the SQL Editor for a one-time setup instead, run each complete migration file separately in timestamp order and keep a record. Do not then run `db push` until migration history has been reconciled.
- [ ] Confirm the `menu-files` Storage bucket is private and allows only PDF, JPG, PNG, and WebP files up to 5 MB.
- [ ] In Supabase Database Security Advisor, review any warnings for the public schema, grants, and row-level security policies.
- [ ] Set Auth Site URL to the canonical production origin, for example `https://your-domain.example`.
- [ ] Add the exact production callback URL `https://your-domain.example/auth/confirm` to Auth's allowed redirect URLs. Add `http://localhost:3000/auth/confirm` for local work. Add a narrowly scoped Vercel preview pattern only if preview sign-up needs to be tested.
- [ ] Keep email confirmation enabled. Configure a custom SMTP provider before accepting real restaurant owners; Supabase's default mail service is for testing and restricts delivery.
- [ ] Review the email confirmation template and verify it leads to `/auth/confirm` on the correct environment.

## 2. Deploy the website

- [ ] Push the project to a Git provider and import that repository into Vercel. Select the folder containing this `package.json` as the project root.
- [ ] Add these environment variables in the Vercel project before the first deployment:

  | Variable | Value |
  | --- | --- |
  | `NEXT_PUBLIC_SUPABASE_URL` | Production Supabase project URL |
  | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Production Supabase publishable key |
  | `NEXT_PUBLIC_SITE_URL` | Canonical production origin, e.g. `https://your-domain.example` |

- [ ] Scope production values to Production. Use a separate non-production Supabase project for Preview if previews will be used to test sign-up or menu changes.
- [ ] Set the custom domain in Vercel and wait for its HTTPS certificate to become active.
- [ ] Set `NEXT_PUBLIC_SITE_URL` to the final domain and redeploy after any change. `NEXT_PUBLIC_` values are bundled at build time.
- [ ] Open the production home page and confirm it does not show sample restaurants. With no published menus it should show the “menus are on their way” state.
- [ ] Check the Vercel deployment logs for build or runtime errors.
- [ ] Use Node.js 20.9 or newer for local and hosted builds.

Never add a Supabase service-role key to this app's environment variables. Browser-facing values use the `NEXT_PUBLIC_` prefix; server authorization relies on the signed-in user's role and database policies.

## 3. Create the first administrator

- [ ] Sign up with the administrator's own email through the restaurant owner flow.
- [ ] Confirm the email and verify that the account can sign in.
- [ ] In the Supabase SQL Editor, promote that verified account by setting its `public.profiles.role` to `admin` using its Auth user UUID. The SQL is in the README.
- [ ] Sign out and back in so the new role is reflected in the session.
- [ ] Open `/admin`; check that the account can access review queues and that an ordinary owner account cannot.

## 4. Manually walk through the launch flows

- [ ] As a visitor, open a published restaurant and view its structured menu, photo/PDF files, prices, and last-confirmed date.
- [ ] Submit a menu report and confirm it appears only in the admin report queue.
- [ ] As an owner, register with a separate email, confirm it, and submit a restaurant listing.
- [ ] As an admin, review and approve the listing. Correct any details that need editing.
- [ ] As the owner, add structured menu items, upload a menu file, or use both. Save a draft and check that it stays private until the owner confirms it.
- [ ] Confirm the menu and check that it appears on the public home page and restaurant page.
- [ ] Edit a published menu and confirm the previous version remains public until the new draft is confirmed.
- [ ] As an admin, inspect a reported menu, add a private note, hide the menu, and confirm the restaurant itself remains listed. Restore it and confirm the owner-facing status is correct.
- [ ] Repeat the key visitor and owner flows at phone width and on a second browser.

## 5. Onboard real restaurants

- [ ] Ask a small number of Addis Ababa restaurants to participate and get permission to publish their details and menu files.
- [ ] Ask each owner to check the spelling, prices, and menu version before they confirm it.
- [ ] Review each listing and first menu before sharing the public URL.
- [ ] Give owners a contact address for correction requests and menu/report follow-up.
- [ ] Keep a simple process for reviewing new reports and hiding a menu if its accuracy is uncertain.

## Launch decision

The app is ready for a small pilot after the production migration, auth email delivery, admin access, deployment, and manual flow checks above are complete. Actual deployment, custom domain setup, SMTP credentials, administrator promotion, and restaurant onboarding need access to the relevant accounts and decisions from the project owner.

## Official setup references

- [Supabase database migrations and deployment](https://supabase.com/docs/guides/deployment/database-migrations)
- [Supabase CLI installation and setup](https://supabase.com/docs/guides/local-development/cli/getting-started)
- [Supabase Auth redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Supabase production checklist](https://supabase.com/docs/guides/deployment/going-into-prod)
- [Vercel environment variables](https://vercel.com/docs/environment-variables)
- [Vercel Next.js deployment](https://vercel.com/docs/frameworks/full-stack/nextjs)
- [Next.js installation requirements](https://nextjs.org/docs/app/getting-started/installation)
