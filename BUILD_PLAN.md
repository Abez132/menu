# Yene Menu — Build Plan

## Part 1 — Public browsing foundation (implemented; dependency install blocked)

- Create the Next.js and TypeScript app structure.
- Build a mobile-friendly discovery page for Addis Ababa.
- Add restaurant search and food category filters.
- Add restaurant detail pages with sample menus, ETB prices, and menu confirmation dates.
- Use clearly identified preview data until real restaurants are onboarded.

Current files include the public home page, restaurant detail pages, a restaurant-owner information placeholder, and six sample restaurants with ETB menu prices. The package manifest is ready, but the package registry returned an access-denied error during dependency installation, so the app has not yet been launched locally.

## Part 2 — Restaurant onboarding (next)

- Add restaurant registration and owner sign-in with email verification.
- Collect restaurant details and send new listings to the administrator review queue.
- Keep owner account details private.

## Part 3 — Owner menu management

- Let verified owners enter structured sections and menu items.
- Support menu photo and PDF uploads alongside structured items.
- Save edits as drafts; require the owner to review and confirm before publishing.
- Keep the last confirmed menu public while a new version awaits confirmation.

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
