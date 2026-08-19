# Changelog — izinga-onboarding

All notable changes to this project are documented here.

---

## [1.6.0] — 2026-08-19

**Release type:** Feature / Legal Compliance

**Summary:** Delivers Driver ICA v2 and Ambassador ICA v2 (both attorney-reviewed by Jason van der Merwe), Firebase Bearer token enforcement on store write calls (ADR-018 frontend piece), and a copy correction on the payout timing display.

### Changes

- [NEW] **Driver ICA v2** — Updated independent contractor agreement presented to drivers during onboarding. Reviewed and signed off by Jason van der Merwe (attorney sign-off received 19 Aug 2026). ICA gate blocks progression until acceptance is recorded. Regression guards TC-23 and TC-24 added.
- [NEW] **Ambassador ICA v2** — Updated independent contractor agreement for ambassador/referral partners with new clauses 1.5 and 6.8 (attorney-reviewed and signed off by Jason van der Merwe). Presented at the ambassador onboarding gate.
- [NEW] **ADR-018 Frontend — Store endpoint auth** (C-04 frontend piece) — Attaches Firebase JWT Bearer token to all store create/update API calls. `PhoneVerifiedGuard` now protects the `/business/info` route family. Additive change; no backend contract dependency in this frontend-only release.
- [FIX] **Payout copy — next business day** — Corrected payout timing display text across driver screens to accurately reflect "next business day" settlement. Copy-only fix, no logic change.

### Breaking changes

None.

### Test coverage

320/320 tests pass (full unscoped suite) on both `develop` and `release/1.6.0`.

### Deployment

- **Repo:** izinga-onboarding
- **Deploy type:** Firebase Hosting (site: `onboarding-izinga`, project: `ijudi-d19bd`) — instant
- **Sequence:** standalone (no backend release dependency for this set of changes)

### Rollback steps

1. Identify the previous Firebase Hosting release in the Firebase console under `onboarding-izinga` → Hosting → Release history.
2. Click "Rollback" on the `v1.5.0` release to revert hosting to the previous build instantly.
3. Alternatively: `git checkout v1.5.0 && npm run build -- --configuration production && firebase deploy --only hosting:onboarding-izinga`.
4. Notify Lindani that rollback is complete and confirm which ICA version drivers/ambassadors will see post-rollback.

### Smoke test plan

1. Driver registration flow — complete a new driver sign-up through to the ICA acceptance screen; confirm Driver ICA v2 text renders, acceptance is required to proceed, and the record is written correctly.
2. Ambassador onboarding — complete ambassador ICA acceptance; confirm Ambassador ICA v2 clauses 1.5 and 6.8 are visible and acceptance gates progression.
3. Store create call — initiate a new store registration as a merchant; confirm network tab shows `Authorization: Bearer <token>` on the POST to the store endpoint.
4. `/business/info` route guard — attempt to navigate to `/business/info` without a verified phone; confirm `PhoneVerifiedGuard` redirects correctly.
5. Driver payout screen — confirm payout timing copy reads "next business day" (not "same day" or any previous incorrect text).
6. Post-ICA training redirect — confirm that after ICA acceptance, users land on `/indivisuals/training-guide` (regression check for the v1.5.0 feature).

### Approved by

Lindani Masinga — direct go-ahead confirmed 2026-08-19 (chat)
Jason van der Merwe (attorney) — Driver ICA v2 and Ambassador ICA v2 sign-off 2026-08-19

---

## [1.5.0] — Prior release

Ambassador/referral partner payout reconciliation, post-ICA training guide redirect. See git log for details.
