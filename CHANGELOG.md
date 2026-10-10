# Changelog

## [1.21.0] — 2026-10-10

**Release type:** Feature (P2) — new ambassador dashboard capability + 4 bugfixes

**Summary:** Introduces tiered commission display on the ambassador dashboard (ADR-019: vehicle-type badge + per-vehicle-type commission amount on My Drivers and My Payouts), syncs Ambassador ICA clause 4 to the tiered rate table, and fixes EWALLET admin approval autofill, stale flat-rate dashboard copy, and the welcome-page premium tier pricing display.

### Changes

- [NEW] `feature/ambassador-tiered-commission-dashboard` (ADR-019) — My Drivers and My Payouts now show a vehicle-type badge and the per-driver commission amount (Bike R50 / Car R60 / Bakkie & Truck R70). Additive/null-safe — works regardless of backend deploy ordering.
- [FIX] `bugfix/ambassador-ica-tiered-commission-sync` — Ambassador ICA click-wrap text (clauses 4.1 and 4.5) now reflects the tiered commission table. `AMBASSADOR_ICA_VERSION` remains `v3` (correction to in-progress version; no ambassadors have accepted it yet).
- [FIX] `bugfix/ambassador-r70-dashboard-copy-sync` — removed stale "R70" flat-rate description from the main dashboard My Payouts card copy.
- [FIX] `bugfix/ewallet-pending-approval-autofill` — `selectUser()` now autofills `bank.accountId` and `bank.phone` from `mobileNumber` when empty and `bank.type === 'EWALLET'`, resolving admins being unable to approve pending EWALLET users (backend requires `bank.phone` non-blank).
- [FIX] `bugfix/welcome-tier-coming-soon` — unauthenticated welcome page Premium Tier 1/2 pricing (R800/R3,000) replaced with "Coming Soon" text. Pricing is not yet finalised. The functional tier-selection flow and legal T&Cs are intentionally unchanged.

### Breaking changes

None. All changes are frontend-only. No API contract, routing, data model, Firebase schema, or JWT changes.

### Deployment sequence

`izinga-onboarding` web deploy — standalone. The companion `ijudi-api` ambassador-tiered-commission backend release is deploying in parallel; frontend changes are additive/null-safe regardless of ordering.

### Rollback steps

1. Firebase Hosting: `firebase hosting:rollback --project izinga-onboarding-prod` (or select release v1.20.1 in Firebase Hosting console history).
2. Pure frontend deploy — no database migration, no API contract change. Rolling back to v1.20.1 is safe independently of the backend.

### Smoke test plan

1. Log in as an ambassador and open My Drivers — expected: each driver row shows a vehicle-type badge (Bike / Car / Bakkie / Truck) and the corresponding commission amount (R50/R60/R70).
2. Open My Payouts — expected: same vehicle-type badge and commission amount displayed per payout row.
3. Open the Ambassador ICA click-wrap screen — expected: clause 4.1 and 4.5 reference the tiered rates (Bike R50, Car R60, Bakkie/Truck R70).
4. Log in as an admin, open a pending user with EWALLET bank account, and click approve — expected: `bank.phone` and `bank.accountId` autofill from `mobileNumber`; approval proceeds without a validation error.
5. Navigate to the unauthenticated welcome page and scroll to Premium Tier pricing — expected: "Coming Soon" text displayed instead of R800/R3,000 figures.
6. Run the full `ng test --watch=false` suite — expected: 755/755 PASS.

### Post-deployment monitoring

- 15 min: Confirm My Drivers and My Payouts load with vehicle-type badges in production.
- 1 hour: No admin approval failures for EWALLET account types; no spike in driver support queries.
- 24 hours: Growth & Analytics to confirm ambassador dashboard engagement is unchanged or improved; EWALLET approval queue clears normally.

### Gate citations

- Lindani Masinga — direct authorization, 2026-10-10
- Code Review: PASS on all 5 branches
- QA Gate 1: PASS per branch (744/744, 721/721, 755/755 across branches)
- QA Gate 2: see regression run below

**Approved by:** Lindani Masinga — 2026-10-10

---

## [1.20.1] — 2026-10-09

**Release type:** Patch (P1) — content/asset correction, no new features

**Summary:** Corrects the Ambassador Training Pack download in the post-ICA training screen from v1 to v2. v2 fixes the referral link hostname, softens an unverified approval-timeframe claim, and updates the ambassador support contact to hello@curiousoft.dev.

### Changes

- [FIX] `PostIcaTrainingComponent` — `pdfPath` getter now serves `assets/docs/ambassador-training-pack-v2.pdf` instead of v1. The v1 pack contained an incorrect referral link hostname (`onboarding.izinga.co.za` instead of `driver.izinga.co.za`), an unverified same-day approval claim, and a stale support email address. v2 corrects all three. v1 asset is retained in `src/assets/docs/` for audit history.
- [TEST] `post-ica-training.component.spec.ts` — TRAIN-02 assertion updated to expect the v2 filename.

### Breaking changes

None. Frontend-only asset swap. No API contract, routing, data model, or Firebase schema changes.

### Deployment sequence

`izinga-onboarding` only — standalone deploy. No backend or other frontend releases required.

### Rollback steps

1. Firebase Hosting: `firebase hosting:rollback --project izinga-onboarding-prod` (or select release v1.20.0 in the Firebase console Hosting history).
2. Pure frontend deploy — no database migration, no API contract change. Rolling back to v1.20.0 is safe independently. Ambassadors who downloaded the v1 pack between v1.20.0 and this release will have the corrected information available on next app load.

### Smoke test plan

1. Log in as an ambassador-referred driver and complete the ICA acceptance flow — expected: Post-ICA Training screen loads and the "Download Training Pack" / PDF link resolves to `ambassador-training-pack-v2.pdf` (verify in browser network tab or by opening the PDF and confirming the referral hostname reads `driver.izinga.co.za`).
2. Open the downloaded PDF — expected: referral link hostname is `driver.izinga.co.za` (not `onboarding.izinga.co.za`), approval timeframe language is softened (no "same day" guarantee), and support contact shows `hello@curiousoft.dev`.
3. Confirm the v1 asset is still served if directly requested at `/assets/docs/ambassador-training-pack-v1.pdf` — expected: 200 response (retained for audit history).
4. Navigate through the full post-ICA training screen in both light and dark theme — expected: no regressions in layout, button visibility, or navigation from the previous 1.20.0 release.
5. Run `ng test --watch=false` locally — expected: 721/721 PASS (spec TRAIN-02 now asserts v2 filename).

### Post-deployment monitoring

- 15 min: Confirm the PDF download link resolves to v2 in production.
- 1 hour: No spike in ambassador support queries related to incorrect training pack information.
- 24 hours: Growth & Analytics to confirm ambassador onboarding completion rate is unchanged from v1.20.0 baseline.

### Gate citations

- Feature Brief: Lindani Masinga — direct authorization ("send for release") 2026-10-09
- Code Review: PASS (reviewed on `bugfix/ambassador-training-pack-v2` branch before merge to develop)
- QA Gate 1: PASS 721/721 (full unscoped suite, verified before merge to develop)
- Dev build: CLEAN
- QA Gate 2: PASS — see QA run results below

**Approved by:** Lindani Masinga — 2026-10-09

---

## [1.20.0] — 2026-10-09

**Release type:** Patch (P1) — UI bug fixes and legal text correction, no new features

**Summary:** Fixes three live-QA-reported UI bugs in the ambassador onboarding flow, replaces 25 saturated rainbow inline-hex card colors on the `/indivisuals` welcome page with the app's token-based surface system, and syncs the in-app Ambassador ICA legal text to v3 (aligning clause 4 commission trigger with actual backend behavior and the Ambassador Training Pack).

### Changes

- [FIX] `IcaComponent` / `TermsConditionsComponent` (all 4 agreement variants: driver ICA, ambassador ICA, driver T&Cs, store-owner T&Cs) — fixed-bottom Accept button was not opaque while disabled, causing legal text below to bleed visually through the button chrome. Applied a solid token-backed background to the sticky-footer container so the button is fully opaque in both disabled and enabled states.
- [FIX] Post-ICA training screen — "Continue to Dashboard" button was invisible in dark theme due to a dark-text-on-dark-surface contrast failure. Button text and background now use token values that are legible in both themes. Confirmed via live Chrome end-to-end: full driver signup through an ambassador referral link, single OTP confirm, ICA accept, training step, dashboard arrival — all working.
- [FIX] OTP `ConfirmComponent` — double-submit bug: tapping Confirm rapidly after a successful OTP login triggered a second verification request, which returned "Invalid or expired code" (the code was already consumed) and displayed that error to the user despite a successful login having already completed. Fixed by disabling the Confirm button immediately on first submit and re-enabling only if a genuine error (non-success response) is returned.
- [FIX] `/indivisuals` welcome page — replaced 25 saturated rainbow inline hex colors (hardcoded on individual welcome cards) with the app's existing `.iz-card` / `.iz-icon-chip` tinted-surface token classes, matching the visual language of the main Dashboard and Ambassador Dashboard. The inline colors bypassed the dark-theme token system; each card now responds correctly to the user's theme. Flagged directly by Lindani Masinga as a theme-consistency bug.
- [UPDATED] Ambassador ICA legal text — bumped `AMBASSADOR_ICA_VERSION` from `'v2'` to `'v3'` in the app. The signed ICA v2 stated commission was earned only after a referred driver completed their first delivery; the Ambassador Training Pack and the actual backend behavior both fire commission on driver approval alone (no delivery required). The discrepancy was identified during a live audit and confirmed by co-founder ruling: the code is correct, the agreement text is what needed updating. Clause 4 has been revised in `ambassador-ica-v3.md` (drafted in the `izinga-legal` repo). Bumping the version constant forces re-acceptance from any ambassador who previously accepted v2, ensuring everyone is bound by the corrected terms. **Note:** this change deploys ahead of formal written sign-off from attorney Jason van der Merwe, per explicit co-founder instruction (Lindani Masinga). Jason will review the live production text in the app directly rather than a document draft first. This sequencing decision is recorded here for audit purposes.

### Breaking changes

None. No API contract, routing, data model, or Firebase schema changes. The ICA version bump forces re-acceptance UI for existing v2 ambassadors; this is intentional and does not break any backend contract.

### Rollback steps

1. Firebase Hosting: `firebase hosting:rollback --project izinga-onboarding-prod` (or select release v1.19.0 in the Firebase console Hosting history).
2. Pure frontend deploy — no database migration, no API contract change. Rolling back to v1.19.0 is safe independently.
3. If the ICA version bump needs to be reversed specifically: the `AMBASSADOR_ICA_VERSION` constant reverts to `'v2'` on rollback; ambassadors who re-accepted under v3 would need no further action (their acceptance is stored; a backend rollback would be a separate decision and is not required by this frontend rollback).

### Smoke test plan (post-deploy — minimum checks within 15 minutes)

1. Open the ambassador referral signup flow end-to-end — log in with a test driver, proceed through OTP confirm with a single tap — expected: no "Invalid or expired code" error; user lands on ICA acceptance screen.
2. Scroll through the ICA acceptance screen with the Accept button disabled — expected: button footer is fully opaque; no legal text bleeds through the button chrome. Repeat for all 4 agreement variants if possible.
3. Accept ICA as a new ambassador-referred driver — expected: "Continue to Dashboard" button visible and correctly styled in both light and dark theme on the post-ICA training screen.
4. Navigate to the `/indivisuals` welcome page — expected: welcome cards display in tinted-surface token colors, not saturated rainbow hex colors; cards respond correctly when switching between light and dark theme.
5. Log in as an existing ambassador who previously accepted ICA v2 — expected: re-acceptance prompt is shown (ICA v3 is presented for sign-off); accepting completes normally.

### Post-deployment monitoring

- 15 min: Confirm ambassador referral signup flow completes without OTP double-submit errors in backend logs.
- 1 hour: Check that ICA v3 re-acceptance is being triggered for existing v2 ambassadors (no unexpected fallback to dashboard without re-acceptance).
- 24 hours: Growth & Analytics to watch ambassador onboarding completion rate and any spike in OTP-related error reports.

### Gate citations

- Feature Brief: Lindani Masinga — direct authorization 2026-10-09 (this conversation)
- Code Review Gate 1 (bugfix/ambassador-flow-ui-issues): PASS WITH MINOR NOTES — no blocking items
- Code Review Gate 1 (bugfix/welcome-card-theme-consistency): PASS WITH MINOR NOTES — no blocking items
- Code Review Gate 1 (bugfix/ambassador-ica-v3-sync): PASS — no blocking items
- QA Gate 1 (bugfix/ambassador-flow-ui-issues): PASS 718/718
- QA Gate 1 (bugfix/welcome-card-theme-consistency): PASS 718/718
- QA Gate 1 (bugfix/ambassador-ica-v3-sync): PASS 721/721
- QA Gate 2 (release/1.20.0 full regression): PASS 721/721 — 2026-10-09 (Release Manager)
- Dev build (Gate 2): CLEAN — no errors, pre-existing budget warnings only — 2026-10-09

**Approved by:** Lindani Masinga — 2026-10-09

---

## [1.19.0] — 2026-10-08

**Release type:** Patch (P1) — production-incident bugfix, no new features

**Summary:** Fixes a production incident where existing users with legacy blank `imageUrl` fields were permanently stuck on the ICA/Terms & Conditions acceptance screen with a `400 "imageUrl is required"` error, caused by a new backend validation in ijudi-api interacting with stale profile data being round-tripped through the PATCH request.

### Changes

- [FIX] `TermsConditionsComponent.acceptTerms()` — introduced `buildSafePayload()` helper that strips a blank `imageUrl` from the user profile object before every PATCH request. The backend's `UserProfileService` (ijudi-api commit `3340ec49`) rejects any PATCH that sends `imageUrl: ""` with a `400 "imageUrl is required"` error. For users whose profiles predate the imageUrl requirement the field was `""` in local storage, and every ICA/T&Cs PATCH was round-tripping that blank value, triggering the 400 unconditionally. Stripping `imageUrl` when blank is absent or null causes the backend to treat it as "not changing this field", which is the correct semantic for users who have never set a profile photo.
- [FIX] `TermsConditionsComponent` — new `profileIncompleteError` boolean flag and `handleAcceptError()` / `isRequiredFieldError()` helpers to distinguish a `400 "is required"` error (missing required profile field) from all other PATCH failures. When a genuine required-field 400 does occur despite the `buildSafePayload()` strip (e.g. a user who is truly missing name, surname, or address), the template surfaces an explanatory "Complete Profile" CTA and `navigateToProfileUpdate()` routes them to the correct profile-update screen (`/business/user` or `/indivisuals/user` depending on context). Previously all PATCH errors showed only a generic "try again" message with no recovery path.
- [FIX] `DashboardComponent` — new `isProfileCompleteForTerms()` method added as a proactive gate. When the dashboard's post-login routing logic would send a user to the ICA/T&Cs acceptance screen, it now first checks all six core profile fields required by the backend (`name`, `surname`, `emailAddress`, `address`, `mobileNumber`, `imageUrl`). If any field is blank, the user is redirected to profile completion (`/business/user` or `/indivisuals/user`) before ever reaching the agreement screen. This prevents users from landing on the agreement screen in a state that would cause the subsequent acceptance PATCH to fail.

### New tests

- `terms-conditions.component.spec.ts` — 6 new test cases covering `buildSafePayload()` (strips blank imageUrl, preserves non-blank), `isRequiredFieldError()` (400 with string body, 400 with JSON `message`, 400 with JSON `error`, non-400 error, no error), and `navigateToProfileUpdate()` (business URL context, individual URL context).
- `dashboard.component.spec.ts` — 12 new test cases covering `isProfileCompleteForTerms()` (all 6 required fields present, each of the 6 fields blank, each of the 6 fields null) and the proactive routing gate integration (user with blank imageUrl redirected to profile update instead of ICA screen).

**Total test count on release branch: 714 (Gate 2 regression — 714/714 PASS)**

### Root cause

The ijudi-api backend added strict `imageUrl` validation on `PUT/PATCH /customer/{id}` (committed `3340ec49`, deployed in ijudi-api v1.13.0). The `TermsConditionsComponent.acceptTerms()` method was constructing the PATCH payload by spreading the locally-cached `UserProfile` object directly — including whatever value `imageUrl` held in local storage. For users who registered before the imageUrl field was required, that value was `""`. Every PATCH in `acceptTerms()` sent `imageUrl: ""`, which the new backend validation rejected with `400 "imageUrl is required"`. The user had no way past this screen because the agreement acceptance was the only action on the page.

### Breaking changes

None. Pure frontend bugfix — no API contract, routing, or data model changes.

### Rollback steps

1. Firebase Hosting: `firebase hosting:rollback --project izinga-onboarding-prod` (or select the previous release — v1.18.0 — in the Firebase console Hosting history).
2. Pure frontend deploy. No database migration, no API contract change. Rolling back to v1.18.0 is safe independently.

### Smoke test plan (post-deploy — minimum checks within 15 minutes)

1. Log in as a user who previously had a blank `imageUrl` (or create a test account with no profile photo set) — expected: user is routed to profile completion screen before reaching ICA/T&Cs, not directly to the agreement screen.
2. Complete profile (add all 6 required fields including a photo) — expected: user is then routed to ICA/T&Cs acceptance screen without error.
3. Accept ICA/T&Cs as a driver — `acceptTerms()` PATCH — expected: agreement saved, user routed to training guide. No `400 "imageUrl is required"` error.
4. Accept T&Cs as a store owner — expected: agreement saved, user routed to dashboard. No `400` error.
5. Complete profile as a new user with genuinely missing fields (do not add imageUrl) — expected: profile-incomplete CTA visible in TermsConditionsComponent if somehow reached; clicking it navigates to profile-update screen.

### Post-deployment monitoring

- 15 min: No `400 "imageUrl is required"` errors visible in backend logs; ICA/T&Cs screen loads for fully-profiled users without error.
- 1 hour: Driver ICA acceptance funnel — completion rate should be normal. Any spike in profile-update page visits is expected (users being routed there proactively) and healthy.
- 24 hours: Growth & Analytics to watch for anomalies in driver and store-owner onboarding completion rate. Resolution of this incident should show as an improvement.

### Gate citations

- Feature Brief: Lindani Masinga — direct authorization 2026-10-08 (this conversation)
- Code Review Gate 1 (bugfix/terms-acceptance-stale-imageurl): PASS WITH MINOR NOTES — no blocking items
- Code Review Gate 1 (bugfix/dashboard-profile-completeness-check): PASS WITH MINOR NOTES — no blocking items
- QA Gate 1 (bugfix/terms-acceptance-stale-imageurl): PASS 702/702 — independently re-run by QA
- QA Gate 1 (bugfix/dashboard-profile-completeness-check): PASS 708/708 — independently re-run by QA
- QA Gate 2 (release/1.19.0 full regression): PASS 714/714 — 2026-10-08 (Release Manager)
- Dev build (Gate 2): CLEAN — no errors, pre-existing budget warnings only — 2026-10-08

**Approved by:** Lindani Masinga — 2026-10-08

---

## [1.18.0] — 2026-10-08

**Release type:** Feature (P2) — app-wide Bootstrap 5→4 compatibility shim, Material Icons migration, and full visual overhaul of Chat Sessions and Pending Approvals. The shim activates previously silent `fw-bold`, `me-*`, `ms-*`, `gap-*`, `visually-hidden`, and gutter utilities across 44 templates app-wide. No API contract changes.

**Summary:** Fixes six high/medium severity live-audit UI bugs on Chat Sessions and Pending Approvals, aligns both pages to the iZinga design language, resolves a root-cause Bootstrap 5/4 utility mismatch affecting the entire app, migrates Font Awesome icon references to Material Icons, and extracts a shared avatar utility module.

### Changes

- [NEW] `src/styles/bootstrap5-compat.css` — Bootstrap 5 utility compatibility shim registered in `angular.json` (before `styles.css`, for both build and test configs). The app loads Bootstrap 4.5.0 but templates use Bootstrap 5 utility names (`me-*`, `ms-*`, `fw-bold`, `visually-hidden`, `gap-*`, `g-0`/`g-md-3`, `btn-close`, `start-100`/`translate-middle`). Every BS5 utility was a silent no-op in BS4. The shim re-declares all observed BS5 names with exact BS4-equivalent semantics — 44 templates gain working spacing, bold typography, and layout utilities without any markup changes. File is self-documenting with a removal note for when the app upgrades to Bootstrap 5.
- [NEW] `src/app/util/avatar.util.ts` — shared `getInitials` and `getAvatarColor` helpers extracted from inline component code. Deterministic string hash, iZinga palette (6 colors), phone-number safe (strips leading `+27`/`0`). Both Chat Sessions and Pending Approvals delegate here.
- [NEW] `src/app/util/avatar.util.spec.ts` — 14 unit tests covering `getInitials` (single name, two-word, phone-number, empty string) and `getAvatarColor` (all 6 palette slots, boundary).
- [NEW] `styles.css` global `.iz-*` utility classes — `.iz-card` (+ teal/green/gold/coral/amber/muted surface variants), `.iz-badge` (6 color variants), `.iz-badge--onbrand` (rgba-white/white-text for badges on colored surfaces), `.iz-notice` (review/blocked/success alert banners), `.iz-section-label`, `.iz-icon-chip`, `.iz-avatar`, `.btn-outline-brand`, dark-theme `.btn-close` inversion, token-based table borders, `.iz-scroll` thin scrollbar helper, `input-group-text` token override (removes Bootstrap's hardcoded `#e9ecef`). New `--chat-bubble-incoming-bg` CSS token (light: `#e0dede`, dark: `#3D3D3D`). Material Icons sizing rules (`.btn .material-icons`, `.material-icons.md-18`).
- [FIX] Chat Sessions — list-item hover color reverted to dark-theme-safe tokens (`--bkg-card-color`, `--text-color`). Bootstrap's hardcoded `#f8f9fa`/`#495057` was overriding the token-based dark theme, causing list items to flash to near-white on hover. `trackBySessionId` and `trackByStoreId` added — eliminates DOM thrash on Firestore push that extended sticky-hover on mobile.
- [FIX] Chat Sessions — incoming customer message bubble was invisible in dark theme (background matched container). `--chat-bubble-incoming-bg` token applied to `.chat-bubble.customer-message`.
- [FIX] Chat Sessions — message composer input-group stacked on mobile at 375 px (Bootstrap 4/5 default `flex-wrap:wrap`). Fixed with `flex-wrap:nowrap` + `min-width:0` on the text input. Composer buttons given `min-width:44px` to meet minimum touch target size.
- [FIX] Chat Sessions — inset-shadow `box-shadow: inset 3px 0 0 <token>` replaces `border-left` on `.chat-interface-card`. Global `.card { border:none !important }` was overriding `border-left` component rules.
- [FIX] Chat Sessions + Pending Approvals — all `<i class="fa fa-*">` icons replaced with Material Icons ligatures (`<i class="material-icons">name</i>`). The app does not load Font Awesome; every Font Awesome icon rendered as a zero-width blank square (send, attach, gear, refresh, close buttons were invisible).
- [FIX] Chat Sessions — `data-bs-toggle` corrected to `data-toggle` on the settings dropdown (Bootstrap 4 JavaScript attribute).
- [FIX] Pending Approvals — avatar placeholder was near-white `bg-light` background (`#f8f9fa`) in dark theme. Replaced with `.iz-avatar` initials chip (deterministic color from `avatar.util`, white text).
- [FIX] Pending Approvals — nav-tabs overflow on mobile caused rows to overlap. Fixed with `overflow-x:auto` + `flex-wrap:nowrap` + `white-space:nowrap` at ≤768 px. Thin scrollbar via `.iz-scroll`.
- [FIX] Pending Approvals — tab strip border-bottom was Bootstrap's hardcoded `#dee2e6`. Overridden with `rgba(128,128,128,0.2)` on `.pending-tabs` (matches global hairline token).
- [FIX] Pending Approvals — `*ngIf="selectedUser.bank"` guard on `ng-container` wrapping Bank Information section. Label no longer renders when no bank data is present. Coordinates `*ngIf` also excludes the `(0,0)` placeholder case. Both desktop panel and mobile modal copies kept identical per deferred Issue 6.
- [FIX] Pending Approvals — inset-shadow accent on `.profile-review-card` only (not on `.modal-content`). Previous commit had added the shadow to both, producing a double teal line at 375 px.
- [FIX] Pending Approvals — `trackByUserId` now returns `string` always: `user.id ?? user.mobileNumber ?? index.toString()`. Eliminates undefined-return branch.
- [FIX] `quote-approval/pending-approvals.component.css` and `quote-approval/quote-approval.component.css` — hardcoded `border-color:#dee2e6` replaced with `rgba(128,128,128,0.2)` (matches global hairline token; cosmetic dark-theme fix).
- [IMPROVED] Chat Sessions and Pending Approvals HTML/CSS fully rewritten to `.iz-*` design language — matching the visual language established by the Dashboard and Welcome pages. Status chips (`.iz-badge`), empty states (`.iz-icon-chip`), alert banners (`.iz-notice`), section headings (`.iz-section-label`), card surfaces (`.iz-card`), secondary action buttons (`.btn-outline-brand`). No hardcoded hex greys remain in component CSS.

### Breaking changes

None. The Bootstrap 5→4 shim is purely additive CSS — it does not override any existing Bootstrap 4 class, only adds previously-missing BS5 names. All changes are confined to CSS and template markup; no API or data contract changes.

### Known issues (tracked separately)

- **FA-ICONS-REMAINING**: Eight templates still use Font Awesome `fa fa-*` icons that have never rendered (the app never loaded Font Awesome): `user-update`, `user-management`, `messanger-orders`, `restricted-regions`, `add-restricted-region`, `referral-partner-enrollment`, `user-config-management`, `post-ica-training`. These are unchanged by this release and tracked as a follow-up migration.

### Rollback steps

1. Firebase Hosting: `firebase hosting:rollback --project izinga-onboarding-prod` (or select the previous release — v1.17.0 — in the Firebase console Hosting history).
2. Pure frontend deploy. No database migration, no API contract change. Rolling back to v1.17.0 is safe independently.

### Smoke test plan (post-deploy — minimum checks within 15 minutes)

1. Dashboard page (any logged-in user) — expected: section headings and stat card labels are bold (`fw-bold` shim active), avatar gutters present (`me-3` shim active). In dark theme: headings remain dark-theme-safe color, not Bootstrap default near-black.
2. Store owner signup / `user-update` form — expected: form row gutters render correctly (Bootstrap `g-md-3` shim active; columns are spaced, not flush). `visually-hidden` screen-reader labels render with zero visible height.
3. Chat Sessions page — open in dark theme — expected: all list items remain dark-themed on hover (no near-white flash). Send and attachment buttons are visible (Material Icons). Composer input and buttons remain on one row at 375 px.
4. Chat Sessions — open a conversation — expected: customer message bubble is visually distinct from the card background in dark mode (visible, not invisible). Session count badge on the Active filter is readable on the teal surface.
5. Pending Approvals — view a pending user with no bank data — expected: "Bank Information" section label does not appear.
6. Pending Approvals — view a pending user on a 375 px viewport — expected: teal accent appears on the profile review card only (one line). Not a double line at the far-left modal edge.
7. Pending Approvals — view a pending user on desktop — expected: approve/reject buttons visible (Material Icons); avatar shows initials in iZinga palette color.

### Post-deployment monitoring

- 15 min: App loads cleanly; no console errors on chat or pending-approvals routes; dashboard headings visually bold on first load.
- 1 hour: No spike in JS errors; driver/store chat functional; pending approvals actionable (buttons visible and clickable).
- 24 hours: Growth & Analytics to watch for anomalies in admin session volume or driver approval rate (a broken UI would suppress completions).

### Gate citations

- Feature Brief: Lindani Masinga — direct authorization 2026-10-08
- Code Review Gate 1 (3 commits): PASS WITH MINOR NOTES — notes resolved in commit `131b2f3`
- Code Review incremental (`ecd6409`+`7f99075`): PASS WITH MINOR NOTES (no required fixes) — 2026-10-08
- QA Gate 1 (initial, 3 commits): PASS 696/696 — 2026-10-08
- QA Gate 1 (re-run, 5 commits): PASS 696/696 — 2026-10-08 (independently verified by Release Manager)
- Visual verification (mobile + desktop, light + dark): Lindani Masinga — 2026-10-08

**Approved by:** Lindani Masinga — 2026-10-08

---

## [1.17.0] — 2026-10-08

**Release type:** Feature (P2)

**Summary:** Adds PayFast subscription billing frontend (tier selection, checkout flow), store owner onboarding tier UX, and a batch of OTP/signup UX fixes found during furniture-delivery E2E testing. Complements ijudi-api v1.12.0 which ships the backend billing module.

### Changes

- [NEW] `TierSelectionComponent` — store owners pick a subscription tier (Free, Premium Tier 1, Premium Tier 2) after completing profile creation. PREMIUM_1 and PREMIUM_2 are disabled with "Coming Soon" state; only FREE tier is activatable in this release.
- [NEW] PayFast subscription checkout flow — `SubscriptionCheckoutComponent` shows billing disclosure before initiating payment via `POST /merchant/subscription/initiate`. `storeId` resolved from Firebase JWT claim server-side (IDOR-safe). Sandbox URL in `environment.ts`, production URL in `environment.prod.ts`.
- [NEW] `WelcomeBusinessComponent` dashboard redesign — personalized greeting, tinted-surface stat cards, legal document hierarchy (ICA, T&Cs) clearly surfaced.
- [FIX] OTP placeholder role=null handling — `role == null` is now the correct signal for a new signup in progress; `role == CUSTOMER` is no longer used as the placeholder sentinel (aligns with ijudi-api backend fix).
- [FIX] `UserUpdateComponent.createCustomer()` and `updateCustomer()` — required-field guards (roleDescription, name, surname, emailAddress, city, bank fields) correctly prevent API call when fields are blank. Template has `novalidate` and submit buttons are outside the `<form>` element, making these component-level guards the only validation layer.
- [FIX] `loadUserConfig()` — `isDriverFlow()` filter restored: drivers on the driver signup flow see only MESSENGER and MESSENGERADMIN role options; they are not shown irrelevant store or customer roles.
- [FIX] `BusinessUpdateComponent` — bank configs loaded via `getBankConfigs()` on init; previously missing call caused bank selection to show empty.
- [FIX] `TermsConditionsComponent` — fresh profile fetch via `getCustomerById` on init; role-based display (ICA, T&Cs sections) now reflects the latest profile state from the server, not only the locally cached version.
- [FIX] Continue button pinned to viewport bottom on TierSelectionComponent (fixed-bottom pattern).
- [FIX] Bootstrap 4 column gap compatibility — `g-3` replaced with `mb-3` on columns (Bootstrap 4 does not support gap utilities on `.row`).
- [FIX] Backend error messages surfaced to user on `createCustomer` and `updateCustomer` — previously swallowed, leaving user with no feedback on server-side validation failures.
- [FIX] Dashboard CUSTOMER+driver-userType gate — `/individuals/` route now correctly guarded for users who have `role == CUSTOMER` but `userType == driver`, routing them to profile setup instead of the customer dashboard.
- [IMPROVED] `src/assets/legal/driver-ica-v2.md` — minor textual correction (no clause changes).

### Breaking changes

None. All changes are additive UI fixes. No API contract changes.

### Dependency on ijudi-api v1.12.0

This release requires ijudi-api v1.12.0 (already live). The PayFast checkout flow calls `POST /merchant/subscription/initiate` (new endpoint in v1.12.0). Deploying this frontend before the backend was live would cause 404 errors on that endpoint — backend was deployed first per the correct deployment sequence.

### Known issues (tracked separately)

- **BILLING-PROD-GATE**: PayFast merchant 16791971 production rate confirmation and BackOffice setup must be completed before PREMIUM tiers are activated. Free tier activation is safe. PREMIUM_1 and PREMIUM_2 are disabled ("Coming Soon") — no user can select them.
- **MERCHANT-ICA-ATTORNEY**: MERCHANT_ICA code comment notes attorney review by Jason van der Merwe is pending. ICA acceptance gate is active for all new stores. Recommend obtaining written sign-off before PREMIUM tiers are activated.

### Rollback steps

1. Redeploy the previous build artifact (v1.16.0 — commit `8057e14` on `main`).
2. Firebase Hosting rollback: `firebase hosting:rollback --project izinga-onboarding-prod` (or equivalent via Firebase console — select previous release).
3. No database migration involved — this is a pure frontend deploy. Rolling back the frontend to v1.16.0 while keeping ijudi-api v1.12.0 is safe: the new backend endpoints simply won't be called.
4. Notify Lindani and Hloniphani of rollback trigger conditions (OTP signup failure spike, store creation 500 rate, PayFast checkout 404).

### Smoke test plan (post-deploy — minimum checks within 15 minutes)

1. New store owner registration via WhatsApp OTP — OTP completes with `role=null` placeholder, profile setup reaches TierSelectionComponent — expected: Free tier shown and selectable, PREMIUM tiers show "Coming Soon".
2. Complete Free tier selection — `POST /merchant/subscription/initiate` with tier=FREE — expected: checkout page reached (or direct activation if Free does not require PayFast), no 500.
3. Driver signup flow — role config dropdown — expected: only MESSENGER and MESSENGERADMIN roles shown, not store or customer roles.
4. Store owner dashboard after login — expected: personalized greeting, bank config loaded in BusinessUpdateComponent, ICA status correct.
5. TermsConditionsComponent for a STORE_ADMIN — expected: Merchant ICA section visible and correct, Driver ICA section not shown.

### Post-deployment monitoring

- 15 min: Angular app loads cleanly, no console errors on store onboarding flow; OTP signup funnel drop-off not elevated.
- 1 hour: Store creation success rate; TierSelectionComponent renders for new store owners; no 404 on `/merchant/subscription/initiate`.
- 24 hours: Growth & Analytics to watch for OTP funnel anomalies; confirm driver signup flow shows correct role options.

### Gate citations

- Feature Brief: Lindani Masinga — direct authorization 2026-10-08 (this conversation)
- Code Review: PASS — iZinga Code Reviewer, 3 rounds (2026-10-08)
  - Round 1: FAIL — 101 test failures; developer fixed
  - Round 2: FAIL — validation-gate regression + isDriverFlow() removal; developer fixed
  - Round 3: PASS — all issues resolved, no required fixes
- QA Gate 1: PASS — 652/652, 0 failures (2026-10-08)

**Approved by:** Lindani Masinga — 2026-10-08
