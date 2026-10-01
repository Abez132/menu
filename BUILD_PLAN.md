# Yene Menu — Build Plan

## Part 1 — Public browsing foundation (implemented; live database listings are a later step)

- Create the Next.js and TypeScript app structure.
- Build a mobile-friendly discovery page for Addis Ababa.
- Add restaurant search and food category filters.
- Add restaurant detail pages with sample menus, ETB prices, and menu confirmation dates.
- Use clearly identified preview data until real restaurants are onboarded.

Current files include the public home page, restaurant detail pages, restaurant-owner information, and six sample restaurants with ETB menu prices. The home page continues to use preview data while real approved listings are connected in a later build part.

## Part 2 — Restaurant onboarding (implementation drafted; Supabase connection pending)

- Add restaurant registration and owner sign-in with email verification.
- Collect restaurant details and send new listings to the administrator review queue.
- Keep owner account details private.

The sign-up, sign-in, confirmation callback, and owner listing status pages are implemented. The SQL migration enforces email verification and administrator-only publication. To activate the flow, configure `.env.local` and apply the migration using the setup notes in `README.md`.

## Part 3 — Owner menu management (implemented; apply the new migration)

- Let verified owners enter structured sections and menu items.
- Support menu photo and PDF uploads alongside structured items.
- Save edits as drafts; require the owner to review and confirm before publishing.
- Keep the last confirmed menu public while a new version awaits confirmation.

The owner dashboard now links approved restaurants to a menu studio with editable sections and items, dietary tags, birr prices, private photo/PDF uploads, a preview, and an explicit owner confirmation step. The database stores menu versions and file metadata; a transaction-backed database function publishes the selected draft and archives the prior public version together. The public restaurant detail route reads approved, confirmed database menus while retaining the sample menus as preview data. Apply `supabase/migrations/202609300001_owner_menu_management.sql` to enable these flows; the migration creates the private Storage bucket and access policies.

## Part 4 — Administrator review

- Add an administrator view for approving or declining new restaurant listings.
- Support unpublishing listings and handling reports.
- Ensure only approved restaurants and confirmed menus are public.

## Part 5 — Launch preparation

- Connect Supabase for data, authentication, and file storage.
- Configure production settings and deployment.
- Onboard initial Addis Ababa restaurants and review the complete experience.

## Decisions already recorded

- Product name: Yene Menu.
- Launch area: Addis Ababa, Ethiopia.
- Menu currency: Ethiopian birr (ETB).
- Owners can use structured menu entries, photo/PDF uploads, or both.
- Owners can edit without per-edit administrator approval; the owner must confirm each menu version before it is public.
- Administrators approve new restaurant listings before publication.
