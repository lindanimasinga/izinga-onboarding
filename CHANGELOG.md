# Changelog

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
