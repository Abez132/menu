# Restaurant Menu Browser — V1 Requirements

**Product name:** Yene Menu  
**Status:** Draft for review  
**Purpose:** Define the first version before implementation.

## 1. Product summary

A mobile-friendly website for finding restaurants in Addis Ababa, Ethiopia, and browsing their menus and prices. Restaurant owners can submit their details and manage menu updates. A menu or menu update is made public only after the restaurant reviews and confirms it.

## 2. Users

- **Visitor:** Browses restaurants and menus without creating an account.
- **Restaurant owner/manager:** Submits a restaurant, uploads or enters its menu, and confirms menu content before it is published.
- **Administrator:** Reviews new restaurant listings, manages published listings, and handles reports or unsuitable content.

## 3. V1 goals

- Help a visitor answer: “What can I eat here, and how much does it cost?”
- Make restaurant menus easy to find and read on a phone.
- Give restaurants a straightforward way to submit and maintain their information.
- Launch in Addis Ababa and learn whether diners and restaurants find the service useful.

## 4. Functional requirements

### 4.1 Public browsing

- Show published restaurants in Addis Ababa.
- Search restaurants by name.
- Browse or filter by food type/category.
- Open a restaurant page showing its name, description, area/address, and public contact or website links when provided. Opening hours may be included when provided.
- Show menus as readable sections and items with names, descriptions, and prices when structured menu data is available.
- Also display restaurant-uploaded menu photos or PDFs.
- Use Ethiopian birr (ETB) for menu prices.
- Show when a menu was last confirmed by the restaurant.
- Work well on common mobile and desktop screen sizes.

### 4.2 Restaurant submissions and menu management

- Let an owner submit restaurant details and contact information.
- Require owner email verification before the owner can manage the restaurant listing.
- Let a verified owner add, edit, and remove menu sections and items without administrator approval for each change.
- Menu items support a name, optional description, price in ETB, and optional dietary labels.
- Let an owner upload menu photos and PDF files, enter structured menu items, or provide both formats. Neither format is the only allowed submission method.
- Keep newly submitted or changed menu content unpublished until the owner reviews it and explicitly confirms it is current and ready to publish.
- After confirmation, publish the confirmed menu/update and record the confirmation date.
- Let an owner revise a published menu; the revised version requires confirmation before replacing the currently published version.
- Do not display unconfirmed changes to diners. Preserve the last confirmed public menu while a later edit is awaiting confirmation, if practical.

### 4.3 Administration

- Require administrator review and approval before a new restaurant listing is published. Let an administrator reject, edit, or unpublish listings as needed.
- Let an administrator correct or hide inaccurate, reported, or unsuitable restaurant content.
- Show only approved/published restaurant listings to public visitors.
- Owners do not need administrator approval for each menu edit, but restaurant listings require approval before first publication.

## 5. Basic quality and trust requirements

- Clearly associate prices with the correct menu item and show ETB.
- Identify menu information as provided by the restaurant.
- Provide a way to report an incorrect menu.
- Validate required form fields and show understandable errors.
- Use accessible labels, readable contrast, and keyboard-friendly controls.
- Collect only owner information needed to manage a listing. Keep private account/contact information private unless the owner chooses to publish it.

## 6. Out of scope for V1

- Food ordering, delivery, or payment processing.
- Reservations or table bookings.
- Customer reviews, ratings, or social features.
- Loyalty schemes, restaurant advertising, or paid placement.
- Native iOS/Android apps.
- Live inventory or guaranteed real-time availability.

## 7. Suggested initial technology

- **Next.js + TypeScript** for the responsive website and server-side features.
- **Supabase** for database, owner authentication, and menu photo/PDF storage.
- **Vercel** for deployment.

This is a proposed stack, not a locked requirement.

## 8. Initial data to store

- Restaurant: name, slug, description, Addis Ababa area/address, food categories, public links/contact, optional hours, publication status, owner account.
- Menu section: restaurant, title, display order.
- Menu item: section, name, description, price, currency (ETB), dietary labels, display order.
- Menu file: restaurant, file type, storage location, upload date, confirmation/publication status.
- Menu confirmation/publication timestamp and submission status.
- Administrative review status for new restaurant listings.

## 9. V1 acceptance criteria

- A visitor can find a published Addis Ababa restaurant and browse its menu without signing in.
- Menu items and ETB prices are readable on mobile and desktop; uploaded photos/PDFs can also be viewed. Owners can submit structured items, files, or both.
- A verified owner can submit a menu and make edits without per-edit administrator approval.
- A new or revised menu stays unpublished until the owner reviews and confirms it.
- An administrator can approve or decline a restaurant listing and control whether the listing is public.
- A restaurant page shows when its menu was last confirmed.
- Ordering, payments, reviews, and bookings are not required to complete the release.

## 10. Product name options

Selected name: **Yene Menu** (option 4).

1. **Menu Addis** — direct and location-specific.
2. **Addis Menu** — short and easy to understand.
3. **Enku Menu** — friendly, with a local feel.
4. **Yene Menu** — warm and personal.
5. **MenU Addis** — compact, with a more app-like look.
6. **Taste Addis** — broader and more brand-like.
7. **Buna & Bites** — playful and food-focused.
8. **Addis Eats** — broad enough to grow beyond menus later.

These are brainstorming options; name and domain/trademark availability have not been checked.

## 11. Confirmed decisions

- Product name: **Yene Menu**.
- Menu submission: owners may enter structured items, upload photos/PDFs, or do both.
- Restaurant listings require administrator review and approval before publication.

