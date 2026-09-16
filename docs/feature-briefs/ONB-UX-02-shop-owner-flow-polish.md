# Feature Brief: ONB-UX-02 — Shop-Owner Flow Polish

**Status:** Approved for Implementation
**PO-APPROVED — authorised by Lindani Masinga 2026-09-16**

**Feature name:** Shop-Owner Flow Polish (Deferred P1 + P2 from ONB-UX-01)

**Requested by:** Lindani Masinga

**Business objective:** ONB-UX-01 shipped as v1.9.0 and resolved all P0 and the immediately blocking P1 issues. This brief addresses the remaining deferred items — desktop layout constraints, out-of-stock visibility, image preview UX, loading states, tag/button layout, business hours shortcuts, icon and colour token cleanup, and a targeted audit of the order-detail screen. Together these items move the shop-owner experience from "functionally correct" to "commercially presentable", reducing friction for store owners managing stock and hours on larger screens and on mobile.

**Audience:** Store owners (STORE_ADMIN role)

**Products affected:** `izinga-onboarding` (sole repo)

**Out of scope:**
- Any backend API changes.
- Any changes to driver registration or individual registration flows unless a fix touches a shared component.
- New colours, new border-radius values, or new box-shadow values not already defined as tokens in `styles.css`.
- P1-8 (rate preview half-width) — resolved in ONB-UX-01; do not revisit.
- Any screen not explicitly named in this brief.
- The order-detail screen beyond the 15-minute visual pass defined in REQ-17 (scope of REQ-17 is the audit itself, not open-ended fixes).

---

## Requirements and Acceptance Criteria

All requirements state the observable problem (as it exists post-ONB-UX-01 on the current `develop` branch), the required behaviour, testable acceptance criteria, and the implementation target files.

---

### Screen: Business Profile (`/business/info/:id`) and Stock Management (`/business/info/:id/stock`)

#### REQ-01 — P2-6: Forms stretch to full viewport width on desktop — no max-width

**Problem:** On viewports wider than ~960px the business-profile form (`business-update.component.html`) and the stock-update form (`stock-update.component.html`) expand to fill the full viewport width (observed at 1265px during the ONB-UX-01 audit). Long lines reduce readability and the forms look unfinished on larger screens.

**Required behaviour:**
1. Wrap the form content area in both `business-update.component.html` and `stock-update.component.html` in a container that applies `max-width: 960px` and `margin-left: auto; margin-right: auto` (centred). Use a CSS class `izinga-form-container` defined in `styles.css` rather than inline styles.
2. The dashboard grid (`dashboard.component.html`) is explicitly excluded — it may span the full viewport to make use of available card columns.
3. The fixed-bottom action bars in both screens must remain full-width (they are `position: fixed; bottom: 0; left: 0; right: 0`) — do not constrain the bar itself, only the scrollable form content above it.

**Files:** `business-update.component.html`, `stock-update.component.html`, `styles.css`

**Acceptance criteria:**
- AC-01-a: At 1280px viewport, the business-update form content area is visually centred and no wider than 960px.
- AC-01-b: At 1280px viewport, the stock-update form content area is visually centred and no wider than 960px.
- AC-01-c: At 375px viewport, both forms span the full available width (no horizontal margin reduces usable width below the viewport width minus the standard 16px side gutter).
- AC-01-d: The fixed-bottom action bars in both screens remain full-width at all viewport sizes.
- AC-01-e: `styles.css` contains the `.izinga-form-container` class with `max-width: 960px`, `margin-left: auto`, and `margin-right: auto`; no inline `max-width` styles are added to the templates.

---

#### REQ-02 — P1-14: Out-of-stock stock items are visually indistinguishable from in-stock items

**Problem:** Stock cards with `quantity === 0` render identically to in-stock cards. Store owners cannot see at a glance which items need restocking, and customers ordering via the front-end may encounter unavailable items.

**Required behaviour:**
1. When a stock item's `quantity` is `0`, apply CSS class `izinga-out-of-stock` to the stock card wrapper element. Define this class in `styles.css` as `opacity: 0.6` — no new colours, no border-radius, no box-shadow.
2. Render a Bootstrap badge `<span class="badge badge-secondary">Out of stock</span>` adjacent to the item name inside the card header. Position it inline with the name (not a separate row). Use only `badge-secondary` — no custom colour.
3. When `quantity` is restored above 0 (either by editing and saving), the class and badge must disappear. Bind via `[ngClass]` on the card wrapper.

**Files:** `business-update.component.html` (or `stock-update.component.html` depending on where stock cards render), `styles.css`

**Acceptance criteria:**
- AC-02-a: Given a stock item with `quantity === 0`, when the stock page loads, then the item card has the `izinga-out-of-stock` class applied and renders visibly muted relative to in-stock cards.
- AC-02-b: Given a stock item with `quantity === 0`, when the stock page loads, then a `badge badge-secondary` reading "Out of stock" is visible adjacent to the item name.
- AC-02-c: Given a stock item with `quantity > 0`, when the stock page loads, then no `izinga-out-of-stock` class and no "Out of stock" badge is present for that item.
- AC-02-d: `styles.css` defines `.izinga-out-of-stock { opacity: 0.6; }` with no colour, border-radius, or box-shadow properties.

---

#### REQ-03 — P1-11: No image preview after file selection in stock-update form

**Problem:** When the user selects an image file for a stock item, there is no thumbnail preview — the selected filename alone gives no confidence that the right image was chosen before pressing Update.

**Required behaviour:**
1. When the user selects an image via the file input, use the `FileReader` API to read the file as a data URL and bind it to a component property `imagePreviewUrl: string | null`.
2. Display an `<img>` element below the file input, bound via `[src]="imagePreviewUrl"`, with `[hidden]="!imagePreviewUrl"`, `style="max-width: 120px; max-height: 120px; object-fit: cover;"`, and `alt="Stock item preview"`. The image must render within the form, not in a modal or overlay.
3. If the item already has a saved image URL (the existing backend value), display that URL as the initial preview so the owner can see what is currently saved.
4. No change to upload behaviour — the file is still sent to the backend only when the user presses Update. The preview is purely a local render via `FileReader` (or the existing saved URL).

**Files:** `stock-update.component.ts`, `stock-update.component.html`

**Acceptance criteria:**
- AC-03-a: Given no existing image, when the user selects a valid image file, then a thumbnail no larger than 120×120px appears below the file input before the user presses Update.
- AC-03-b: Given an existing saved image URL on the item, when the stock-update form loads, then that image is shown as the initial preview.
- AC-03-c: The preview renders using `FileReader` data URL for newly selected files; no HTTP request is made to upload the image until Update is pressed.
- AC-03-d: The `<img>` element is hidden (not merely empty) when `imagePreviewUrl` is null.

---

### Screen: Business List (`/business/list`)

#### REQ-04 — P1-15: Footer paints before store cards hydrate at 375px

**Problem:** On slow connections or first load at 375px viewport, the page footer (Privacy Policy link) is visible above an empty card grid while the store data is still loading. This gives the impression the list is empty and the layout looks broken.

**Required behaviour:**
1. Add a component-level boolean `isLoadingShops: boolean = true`. Set it to `false` once the stores API call resolves (success or error).
2. While `isLoadingShops` is `true`, render a loading placeholder in the card grid area: a single Bootstrap `alert alert-info` with a `spinner-border spinner-border-sm` and the text "Loading your shops…". The footer must not appear above this placeholder.
3. The footer element must be rendered after the card grid container in DOM order and must not use `position: fixed` or `position: absolute` — it must flow naturally below the grid. If the current footer uses a fixed or sticky position, remove it (for this screen only) so it remains below the grid content.
4. Once `isLoadingShops` is `false`, hide the loading placeholder and show the cards (or the existing empty state from ONB-UX-01 REQ-16 if there are no shops).

**Files:** `businesses.component.html`, `businesses.component.ts`

**Acceptance criteria:**
- AC-04-a: At 375px viewport, while the shops API call is in flight, the card grid area shows a spinner and "Loading your shops…" text; the footer is not visible above the grid area.
- AC-04-b: Once the API call resolves, the loading placeholder is hidden and either the shop cards or the empty state is shown.
- AC-04-c: The footer element appears below the card grid in DOM order at all viewport sizes.
- AC-04-d: The loading placeholder uses `alert alert-info` with `spinner-border spinner-border-sm` consistent with the loading state pattern established in ONB-UX-01.

---

### Screen: Stock Management (`/business/info/:id/stock`)

#### REQ-05 — P2-4: Tag row has dead space — tag chips do not wrap cleanly

**Problem:** The tag row in `stock-update.component.html` has horizontal dead space between tag chips, and on mobile the row does not wrap cleanly — chips can overflow or leave a large gap at the end of the row.

**Required behaviour:**
1. Ensure the tag chip container uses `display: flex; flex-wrap: wrap; gap: 8px;`. Remove any `margin-right` from individual tag chips (the `gap` handles spacing).
2. Each tag chip must use the existing Bootstrap `badge badge-dark` class plus a small `×` dismiss button (`<button type="button" class="btn-close btn-close-white btn-sm ml-1">`) — or, if `btn-close` is not in BS4, use a plain `<span role="button">×</span>` styled with `cursor: pointer; margin-left: 4px;`. No new colours.
3. The "Add tag" button (already `btn-outline-dark` from ONB-UX-01 REQ-05) must sit on the same flex row as the chips and wrap to the next row when there is no room.

**Files:** `stock-update.component.html`, `stock-update.component.css` (or inline styles removed in favour of the rules above)

**Acceptance criteria:**
- AC-05-a: At 375px viewport with 5 or more tags, all tag chips wrap onto multiple lines with consistent 8px spacing; no chip overflows the viewport.
- AC-05-b: At 1280px, the tag row has no large dead space between chips.
- AC-05-c: The tag chip container has `display: flex` and `flex-wrap: wrap` in its computed styles.

---

#### REQ-06 — P2-5: Fixed-bottom 3-button bar wraps at 375px

**Problem:** The fixed-bottom action bar in `stock-update.component.html` contains 3 buttons whose labels are long enough to wrap to a second line at 375px, making the bar taller and obscuring more page content.

**Required behaviour:**
1. Shorten button labels to fit on one line at 375px:
   - Primary save action: **"Update"** (already short — keep as-is if it fits; shorten to "Save" only if "Update" wraps)
   - Secondary: **"Preview"** (keep if present; otherwise this slot is N/A)
   - Danger/remove: **"Remove"** (replace any longer label such as "Remove Stock Item" with "Remove" in the fixed bar only — the confirm dialog wording from ONB-UX-01 REQ-02 is unchanged)
2. Apply `white-space: nowrap; overflow: hidden; text-overflow: ellipsis;` to each button in the fixed bar so labels never wrap.
3. The 3 buttons must share the row equally: apply `flex: 1` to each button inside a `d-flex w-100` container. Do not stack them vertically.

**Files:** `stock-update.component.html`

**Acceptance criteria:**
- AC-06-a: At 375px viewport, all 3 buttons in the fixed-bottom bar fit on a single row with no wrapping.
- AC-06-b: No button label wraps to a second line at any viewport width from 320px to 1280px.
- AC-06-c: The fixed-bottom bar height does not exceed 56px at 375px.

---

### Screen: Business Profile (`/business/info/:id`)

#### REQ-07 — P2-8: Business hours section has 14 time inputs with no shortcut

**Problem:** The business hours section in `business-update.component.html` renders 14 `type="time"` inputs (open/close for each of 7 days). Setting the same hours for every trading day — the common case — requires 14 manual inputs. There is no "same every day" shortcut and no "Closed" toggle per day.

**Required behaviour:**
1. Add a single "Apply Monday hours to all days" button (`btn btn-outline-dark btn-sm`) placed immediately after the Monday row. When clicked, it copies Monday's open and close time values to all other days' inputs. No animation, no confirmation dialog — one click, immediate update of the bound values.
2. Add a "Closed" checkbox (`form-check-input`) to each day row labelled "Closed". When checked, that day's open and close inputs are disabled (`[disabled]="day.closed"`) and their bound values are cleared to empty string. When unchecked, the inputs are re-enabled; the previously cleared values are not restored (the owner must re-enter them). Bind the checkbox to a per-day `closed` boolean on the component's hours model.
3. The "Closed" checkbox and the "Apply Monday hours to all days" button must use existing Bootstrap classes only — no new CSS classes, no new colours, no icons other than standard text.
4. The existing 14 inputs and their labels are not removed or restructured — this is an additive change only.

**Files:** `business-update.component.html`, `business-update.component.ts` (add `closed` boolean per day to the hours model and the `applyMondayToAll()` method)

**Acceptance criteria:**
- AC-07-a: Given the business hours section is open, a button labelled "Apply Monday hours to all days" is visible immediately below the Monday row.
- AC-07-b: When "Apply Monday hours to all days" is clicked, all seven days' open-time and close-time inputs reflect Monday's values.
- AC-07-c: Each day row has a "Closed" checkbox; when checked, that day's time inputs are disabled and their values are cleared.
- AC-07-d: When "Closed" is unchecked, that day's time inputs are re-enabled (values are blank; the owner must re-enter them).
- AC-07-e: The save/PATCH payload must include the `closed` flag per day so the backend can persist the closed state; if the backend model does not yet have a `closed` field, the developer must set the open and close times to empty string for closed days in the outgoing payload rather than adding a new field. No backend change is in scope.

---

### Screen: Orders (`/business/info/:id/orders` or equivalent)

#### REQ-08 — P2-10: Orders empty state uses emoji; "Orders" heading is duplicated

**Problem:** The orders empty state or header uses an emoji (e.g. 📦 or similar) rather than a Material icon consistent with the rest of the app. An "Orders" heading appears twice on the screen — once in the route heading and once in the empty/list section.

**Required behaviour:**
1. Replace the emoji with the Material icon `<i class="material-icons">shopping_bag</i>` (or `receipt_long` if `shopping_bag` is not in the app's current Material Icons version — use whichever is already loaded in `index.html`). The icon must inherit the current text colour; no inline colour style.
2. Remove the duplicate "Orders" heading. Keep the heading that is part of the page's main `<h2>` or equivalent structural heading. Remove the second occurrence. If both are `h2`, keep the first and remove the second.

**Files:** orders template file (identify by searching for the emoji or duplicate heading in the `src/app` directory)

**Acceptance criteria:**
- AC-08-a: No emoji character appears in the orders screen template.
- AC-08-b: A Material icon (`shopping_bag` or `receipt_long`) appears where the emoji was.
- AC-08-c: The word "Orders" appears as a heading element at most once on the rendered screen.

---

### Global / Shared Styles

#### REQ-09 — P2-11: `btn-outline-secondary` on search-clear button in `/business/list`

**Problem:** The search-clear (or filter-clear) button in `businesses.component.html` (the `/business/list` screen) uses `btn-outline-secondary`, which renders in Bootstrap grey — outside the iZinga design system. All outline buttons must use `btn-outline-dark`.

**Required behaviour:** Replace `btn-outline-secondary` with `btn-outline-dark` on the search-clear button in `businesses.component.html`.

**Files:** `businesses.component.html`

**Acceptance criteria:**
- AC-09-a: No `btn-outline-secondary` class appears in `businesses.component.html`.
- AC-09-b: The search-clear button renders with a dark border and dark text.

---

#### REQ-10 — P2-12: `.gradient-pink::after` fades to white — produces white stripe in dark theme

**Problem:** The `.gradient-pink::after` rule in shared CSS uses a white fade (`to white` or `rgba(255,255,255,…)`) as its gradient end-stop. In dark theme this produces a visible white stripe at the bottom of the gradient element.

**Required behaviour:**
1. Replace the hardcoded white end-stop with `var(--izinga-surface, #ffffff)` so the fade targets the current surface colour token. In light theme this is still white; in dark theme the token resolves to the dark surface colour and the stripe disappears.
2. If `--izinga-surface` is not yet defined in `styles.css`, define it: in the `:root` block, `--izinga-surface: #ffffff;`. Add a dark-theme override in the existing dark-theme selector (or `@media (prefers-color-scheme: dark)`) if one exists: `--izinga-surface: #1a1a1a;` (or the nearest existing dark background token — do not introduce a new hex value if a dark background token already exists).

**Files:** `styles.css`

**Acceptance criteria:**
- AC-10-a: In light theme, `.gradient-pink::after` fades to white (no visible change from current behaviour).
- AC-10-b: In dark theme, the white stripe produced by `.gradient-pink::after` is no longer visible.
- AC-10-c: The gradient end-stop uses `var(--izinga-surface)`, not a hardcoded hex or `rgba` white value.

---

#### REQ-11 — P2-13: Payout "Already Paid" renders in link-teal colour but is plain text

**Problem:** The "Already Paid" status label in the payout template renders using a link or teal colour class (e.g. `text-primary`, a hardcoded `#17a2b8`, or `text-info`) even though it is plain informational text, not a link or action.

**Required behaviour:** Replace the colour class or hardcoded hex on the "Already Paid" label with `text-muted`. The label must render in muted grey, not teal or blue.

**Files:** payout template (search for "Already Paid" in `src/app`)

**Acceptance criteria:**
- AC-11-a: The "Already Paid" label renders in muted grey (`text-muted` colour), not teal or blue.
- AC-11-b: No `text-primary`, `text-info`, hardcoded `#17a2b8`, or any teal/blue class or value is applied to the "Already Paid" label.

---

#### REQ-12 — P2-7: `transition: all` on global styles; `transform: scale` on `.digit`; footer hardcoded `#b7b4af`

**Problem:**
- `styles.css` contains a `transition: all` rule (likely on a broad selector such as `*` or `.card`) that causes every CSS property — including layout and paint-triggering properties — to animate on state change. This is a performance and correctness issue.
- `.digit` carries `transform: scale(…)` defined with a magic value rather than a token or a meaningful animation.
- The footer element has a hardcoded colour `#b7b4af` that does not respond to dark theme.

**Required behaviour:**
1. Replace `transition: all` with a specific transition targeting only non-layout properties: `transition: color 0.2s ease, background-color 0.2s ease, border-color 0.2s ease, opacity 0.2s ease`. If this rule is on a wildcard selector (`*`), scope it to the smallest selector that achieves the intent.
2. Remove `transform: scale` from `.digit` entirely. If a pulse or highlight effect is needed on `.digit`, use a `transition: opacity 0.15s ease` instead — no scale transform.
3. Replace `#b7b4af` in the footer rule with `var(--text-muted-color)`. If `--text-muted-color` is not yet defined in `styles.css`, add it to the `:root` block as `--text-muted-color: #b7b4af;` and add a dark-theme override if a dark muted text token already exists.

**Files:** `styles.css`

**Acceptance criteria:**
- AC-12-a: `grep "transition: all" styles.css` returns 0 matches.
- AC-12-b: `.digit` has no `transform: scale` declaration in `styles.css`.
- AC-12-c: No hardcoded `#b7b4af` appears in `styles.css`; `var(--text-muted-color)` is used instead.
- AC-12-d: The footer text colour responds correctly in both light and dark theme.

---

### Investigation: Deep-Link Guard

#### REQ-13 — P2-9: Deep-link `/business/info/:id/stock` may redirect to root

**Problem:** During the ONB-UX-01 audit, a redirect from `/business/info/:id/stock` to the app root was observed but could not be reproduced consistently with a real authenticated session. The cause — whether a route guard, an auth timing issue, or something else — was not confirmed.

**Required behaviour (reproduce-first scope):**
1. The developer must attempt to reproduce the issue using the real ADMIN session (phone +27734396642, store Ekasi Grillz `bd5a8bcf-850a-4225-bffb-2f703ff14da8`) by navigating directly to `/business/info/bd5a8bcf-850a-4225-bffb-2f703ff14da8/stock` from a cold URL (paste into address bar while already authenticated, and also while not authenticated to observe the guard behaviour).
2. **If the redirect is reproducible:** identify the responsible route guard or resolver, fix it so that an authenticated STORE_ADMIN can deep-link directly to the stock screen without being redirected, and document the root cause in a code comment.
3. **If the redirect cannot be reproduced in two separate attempts:** document the finding in a code comment in the relevant guard file (or in this brief's companion GitHub issue) and close the item. Do not make speculative code changes.
4. The developer must record the outcome (reproduced or not reproduced) in their implementation notes for QA to verify.

**Files:** routing module, relevant auth/role guards (search `src/app` for `canActivate` implementations)

**Acceptance criteria:**
- AC-13-a: If reproduced — an authenticated STORE_ADMIN can navigate directly to `/business/info/:id/stock` without being redirected to root.
- AC-13-b: If not reproduced — a comment in the guard file or GitHub issue records the two reproduction attempts, the session details used, and the conclusion that the issue was not reproduced.
- AC-13-c: No speculative guard changes are made if the issue cannot be reproduced.

---

### Screen: Order Detail (`/business/info/:id/order/:orderId`)

#### REQ-14 — Order Detail Screen: Visual audit (screen was not covered by ONB-UX-01)

**Problem:** The order-detail screen (`/business/info/:id/order/:orderId`) was not audited during ONB-UX-01. It may contain the same class of flat-design violations (shadow, rounded corners, hover lift, hardcoded hex, forbidden btn variants) found across other screens.

**Required behaviour:**
1. The developer must conduct a 15-minute focused visual pass on the order-detail screen using a real order on the Ekasi Grillz session. The pass must check:
   - `shadow-sm` or `shadow` on any card or bar (remove per the flat-design directive).
   - `border-radius` values greater than 0 on surfaces (remove per the flat-design directive).
   - `box-shadow` on any element (remove per the flat-design directive).
   - `btn-warning` anywhere (forbidden — replace with `btn-dark`).
   - `btn-outline-secondary` anywhere (replace with `btn-outline-dark`).
   - Hardcoded hex colours not using CSS variable tokens (replace with the nearest token).
   - Duplicate headings or emoji used in place of icons.
   - Spacing violations at 375px (content clipped, overlapping fixed bars, footer unreachable).
2. Fix only issues in the above list that can be addressed as a one-line or two-line change (a class swap or a hex-to-token replacement). Fix these inline.
3. Any issue that requires structural template changes, logic changes, or more than 5 lines of template or CSS change must be listed in the implementation notes as a follow-up, not fixed in this brief.
4. The non-destructive rule applies: do not press Save or modify any real order data. Observe only.

**Files:** order-detail component template and stylesheet (identify by route in the routing module)

**Acceptance criteria:**
- AC-14-a: After the audit pass, `shadow-sm`, `shadow`, `btn-warning`, and `btn-outline-secondary` do not appear in the order-detail template.
- AC-14-b: The developer's implementation notes record the findings of the 15-minute pass, distinguishing between items fixed inline and items deferred as follow-up.
- AC-14-c: No real order data was modified during the audit (verified by QA checking the Ekasi Grillz order list for any unexpected status changes).

---

## Orchestrator Rules Carried Over from ONB-UX-01

These rules apply to all work under this brief without exception:

1. **Accordion groups expanded by default** — any accordion introduced or modified in this brief must have all groups expanded on page load. The `aria-expanded` attribute must be bound dynamically, never hardcoded.
2. **No `btn-warning` anywhere** — `btn-warning` renders Bootstrap yellow and violates the iZinga CEO flat-design directive. Any occurrence found during implementation of this brief must be replaced with `btn-dark`. This applies to the order-detail audit (REQ-14) and to any other code touched during this sprint.

---

## Dependencies

- ONB-UX-01 (v1.9.0) must be live on `develop` before any work on this brief begins. All 22 requirements from ONB-UX-01 are prerequisites.
- No backend API changes required.
- No shared model or enum changes required — no Solution Architect consult needed for this brief.
- Bootstrap 4.5.0 via CDN is already present. Keep `data-toggle` attributes; do not introduce `data-bs-toggle`.
- The existing `team-messengers.component.html` alert/spinner pattern is the reference for any new loading state (REQ-04).

---

## Risks

- REQ-07 (business hours "Closed" state): if the backend does not accept a `closed` field, the developer must send empty strings for closed-day times. Verify the PATCH payload shape against the existing business-update API call before implementing to avoid accidentally clearing real hours data. Test with `ZZ-UX-AUDIT-TEST-DELETE-ME` item only — do not modify the real Ekasi Grillz business hours.
- REQ-13 (deep-link guard): reproduction-first scope means no code change is required if the issue cannot be confirmed. QA must verify the outcome of the reproduction attempts.
- REQ-12 (global `transition: all`): replacing a wildcard transition with a scoped one may reveal previously hidden animation gaps on interactive elements. QA should do a quick visual regression pass on all interactive buttons and inputs after this change.

---

## Agent Task Breakdown

| # | Task | Agent | Depends on |
|---|------|-------|------------|
| T-01 | Implement REQ-01 (`.izinga-form-container` max-width 960px centred on business and stock forms) | iZinga Onboarding UI/UX Developer | none |
| T-02 | Implement REQ-02 (out-of-stock muted card + badge-secondary chip) | iZinga Onboarding UI/UX Developer | none |
| T-03 | Implement REQ-03 (image upload thumbnail preview via FileReader + existing URL) | iZinga Onboarding UI/UX Developer | none |
| T-04 | Implement REQ-04 (business list loading state; footer below cards) | iZinga Onboarding UI/UX Developer | none |
| T-05 | Implement REQ-05 (tag row flex-wrap + gap; remove individual chip margins) | iZinga Onboarding UI/UX Developer | none |
| T-06 | Implement REQ-06 (fixed-bottom 3-button bar: shorter labels, flex: 1, nowrap) | iZinga Onboarding UI/UX Developer | none |
| T-07 | Implement REQ-07 ("Apply Monday hours to all days" button + per-day "Closed" checkbox) | iZinga Onboarding UI/UX Developer | none |
| T-08 | Implement REQ-08 (Orders screen: emoji → Material icon, remove duplicate heading) | iZinga Onboarding UI/UX Developer | none |
| T-09 | Implement REQ-09 (search-clear btn-outline-secondary → btn-outline-dark in businesses.component.html) | iZinga Onboarding UI/UX Developer | none |
| T-10 | Implement REQ-10 (.gradient-pink::after white end-stop → var(--izinga-surface)) | iZinga Onboarding UI/UX Developer | none |
| T-11 | Implement REQ-11 (payout "Already Paid" colour → text-muted) | iZinga Onboarding UI/UX Developer | none |
| T-12 | Implement REQ-12 (transition: all → specific; remove transform: scale on .digit; footer #b7b4af → token) | iZinga Onboarding UI/UX Developer | none |
| T-13 | Implement REQ-13 (deep-link guard reproduction: attempt twice, fix if confirmed, document if not) | iZinga Onboarding UI/UX Developer | none |
| T-14 | Implement REQ-14 (order-detail 15-minute visual audit pass: inline fixes + deferred list) | iZinga Onboarding UI/UX Developer | none |
| T-15 | Extend spec files for all REQ-01 through REQ-14; run full unscoped `ng test` to green | iZinga QA & Test Automation | T-01 to T-14 |
| T-16 | Code review — verify `ng build` (dev) and `ng build --configuration=production` both clean; review all changes against brief | iZinga Code Reviewer | T-15 |

---

## Testing Requirements

### Spec files to extend

- `businesses.component.spec.ts` — add tests for: loading state while fetching (REQ-04); search-clear button class (REQ-09).
- `business-update.component.spec.ts` — add tests for: form max-width container class present (REQ-01); business hours "Apply Monday to all" copies values (REQ-07); "Closed" checkbox disables inputs and clears values (REQ-07).
- `stock-update.component.spec.ts` — add tests for: out-of-stock class and badge on zero-quantity items (REQ-02); image preview `imagePreviewUrl` set on file selection (REQ-03); fixed-bottom buttons do not wrap (REQ-06 — test by checking `white-space: nowrap` class or style is present).

### Build gate (mandatory — Code Reviewer will run both)

Both commands must complete clean (exit code 0, zero errors) on the final branch before the Code Reviewer issues a PASS:
```
ng build
ng build --configuration=production
```

### Test gate (mandatory)

The full unscoped `ng test` suite must pass at a minimum of the ONB-UX-01 baseline of 370 tests, plus all new tests added in this brief. Scoped-run results (e.g. `--include` flags, `fdescribe`, `fit`) must not be reported as green. The Code Reviewer will run `ng test --watch=false` with no scope flags.

---

## How to Verify (per screen, per breakpoint)

Use the real STORE_ADMIN session: phone **+27734396642**, store **Ekasi Grillz** (`bd5a8bcf-850a-4225-bffb-2f703ff14da8`).

**Non-destructive rule:** Only create, edit, or remove a stock item named **`ZZ-UX-AUDIT-TEST-DELETE-ME`**. Do not modify any real stock item, the shop profile, the user profile, or any real order. Do not press Save on the business profile page. Leave the backend in the state it was found.

### Business List — `/business/list`
| Check | 375px | 1280px |
|-------|-------|--------|
| Loading spinner visible before cards appear | Spinner + "Loading your shops…" visible | Same |
| Footer appears below cards, not above grid | Yes | Yes |
| Search-clear button is dark-bordered | Dark border | Dark border |

### Business Profile — `/business/info/:id`
| Check | 375px | 1280px |
|-------|-------|--------|
| Form content does not exceed viewport width | Full-width minus 16px gutter | Centred, max 960px |
| Fixed-bottom action bar full-width | Yes | Yes |
| "Apply Monday hours to all days" button visible | Yes | Yes |
| "Closed" checkbox on each day row | Yes | Yes |

### Stock Management — `/business/info/:id/stock`
| Check | 375px | 1280px |
|-------|-------|--------|
| Form content max-width | Full-width minus gutter | Centred, max 960px |
| Out-of-stock item (quantity=0): muted + "Out of stock" badge | Muted card, badge visible | Same |
| In-stock item: no muted class, no badge | No badge | No badge |
| Image preview thumbnail on file select | Thumbnail ≤120×120px visible | Same |
| Tag row wraps cleanly with 8px gap | No overflow, clean wraps | No dead space |
| Fixed-bottom 3 buttons on single row | All 3 fit, no wrapping | All 3 fit |

### Orders screen
| Check | 375px | 1280px |
|-------|-------|--------|
| No emoji in orders empty state or header | No emoji | No emoji |
| Material icon visible in place of emoji | Icon visible | Icon visible |
| "Orders" heading appears exactly once | Once | Once |

### Payout screen
| Check | 375px | 1280px |
|-------|-------|--------|
| "Already Paid" label in muted grey | Muted grey | Muted grey |

### Dark theme (if testable in dev)
| Check | Result |
|-------|--------|
| `.gradient-pink::after` white stripe absent in dark theme | No white stripe |
| Footer text colour reads correctly in dark theme | Muted, not hardcoded grey |

---

## Marketing Trigger

No — this is an internal UX quality and polish pass. No marketing campaign required.

---

## Definition of Done

This feature is complete when ALL of the following are true:

1. All 14 requirements (REQ-01 through REQ-14) have been implemented and their acceptance criteria pass, or (for REQ-13) the reproduction outcome has been documented.
2. `ng build` (dev) completes with zero errors.
3. `ng build --configuration=production` completes with zero errors.
4. `ng test --watch=false` (full unscoped suite) passes with zero failures and at minimum 370 tests running.
5. The iZinga Code Reviewer has issued a PASS verdict.
6. Manual verification has been completed against the Ekasi Grillz STORE_ADMIN session at 375px and 1280px without modifying any data other than the `ZZ-UX-AUDIT-TEST-DELETE-ME` test item.
7. The feature branch has been merged to `develop` via a pull request with the Code Reviewer PASS attached.
8. The order-detail audit findings (REQ-14) have been recorded in the implementation notes, distinguishing inline fixes from deferred items.

---

*Brief authored by iZinga Product Owner · PO-APPROVED — authorised by Lindani Masinga 2026-09-16*

---

## Orchestrator amendments (2026-09-16) — authoritative over anything above

### REQ-PP — Privacy Policy notice lives ONLY in the footer (added by Lindani: "all pages. it must be on the footer")

**Problem:** Four page templates embed their own privacy notice block above the fixed action bar, while `app.component.html` L11-18 already renders a global `<footer>` with the Privacy Policy link and "Operated by Curiousoft (Pty) Ltd". The result is a duplicated, inconsistently placed notice that is also partly covered by fixed-bottom bars.

**Required behaviour:**
1. Remove the inline privacy notice blocks from: `phone-verification.component.html` (~L52-55 `.privacy-notice`), `user-update.component.html` (~L292-293), `stock-update.component.html` (~L118-121 `.privacy-notice`), `business-update.component.html` (~L566-569 `.privacy-notice`). Remove any now-orphaned `<hr>`/wrapper divs and any `.privacy-notice` CSS that becomes unused.
2. The global footer in `app.component.html` is the single Privacy Policy location. Keep the existing link and Curiousoft line; add the one-line reassurance copy currently duplicated on the pages ("Your information will be securely stored." + the link) so nothing is lost — once, in the footer.
3. The footer must be visible and reachable on every page, including pages with a fixed-bottom action bar: the page container must reserve bottom padding equal to the tallest fixed bar (+ `env(safe-area-inset-bottom)`), so the footer is never hidden behind it. (ONB-UX-01 REQ-14 added safe-area padding on two pages — generalise it at the app-container level rather than per page.)
4. The dashboard "Privacy Policy" navigation card (`dashboard.component.html` ~L230) is a nav tile, not a notice — leave it unless Lindani says otherwise; note it in the report.
5. Footer background: replace hardcoded `#b7b4af` with `var(--bkg-card-color)` (exists) — NOT `--footer-bkg-color` (gold) and NOT a new token.

**Acceptance criteria:**
- Given any of the four pages, when it renders, then no `.privacy-notice` element exists in the page template, and exactly one Privacy Policy link exists on the page — inside `<footer>`.
- Given a page with a fixed-bottom bar at 375px, when scrolled to the end, then the full footer (link + Curiousoft line) is visible and the link is tappable, not under the bar.
- Spec: `app.component.spec.ts` asserts the footer contains the Privacy Policy `routerLink`; the four component specs assert no privacy notice in their template.

### Token corrections to the PO decisions above
- `--text-muted-color` and `--izinga-surface` do NOT exist in `styles.css`. Do not introduce new tokens for this batch. Use existing ones: gradient end-stop (P2-12) → `var(--bkg-card-color)` (already themed light/dark in `body` / `body.dark-theme`); footer background (P2-7) → `var(--bkg-card-color)` per REQ-PP item 5.
- Out-of-stock chip (P1-14): Bootstrap 4 `.badge` has `border-radius: .25rem` — the chip must set `border-radius: 0` explicitly. Prefer a plain `<span class="izinga-chip">` styled with `var(--btn-muted-color)` background over `badge badge-secondary` (Bootstrap grey is not a token).
- Standing rules unchanged: groups expanded by default; no `btn-warning`; filled buttons `btn-dark`.

### Orchestrator correction to REQ-07 / AC-07-e (2026-09-16, after Code Review FIX-02)
The backend contract is `data class BusinessHours(var day: DayOfWeek, var open: Date, var close: Date)` (`ijudi-api/izinga-commons/.../BusinessHours.kt`) — `open`/`close` are NON-NULLABLE `Date`. Therefore:
- Sending `""` (AC-07-e as originally written) → Jackson cannot parse an empty string into `Date` → **400, save fails**. AC-07-e is withdrawn.
- Sending `undefined`/omitting the fields (the developer's implementation) → missing non-null Kotlin parameter → **400, save fails**.
- There is no "closed" field in the contract, and backend changes are out of scope for this brief.

**Corrected requirement:** a day marked "Closed" is **omitted from the `businessHours` array** in the PATCH payload. On load, any `DayOfWeek` absent from `shop.businessHours` renders as Closed (checkbox checked, inputs disabled). Unchecking "Closed" re-adds the day with sensible default times (copy Monday's, else 09:00–17:00). The in-memory `shop.businessHours` must be rebuilt from the UI state immediately before `updateStore` is called — never mutate `open`/`close` to `undefined`/`''`.
**Acceptance criteria (replaces AC-07-e):** Given a day marked Closed, when the profile is saved, then the PATCH body's `businessHours` contains no entry for that day, every remaining entry has both `open` and `close` as valid dates, and the save succeeds (assert via a captured `updateStore` payload in the spec).

### REQ-PP2 — ONE footer, not two (orchestrator, 2026-09-16, from live verification of REQ-PP)
**Problem:** Every page renders two `<footer>` elements: the Angular footer in `app.component.html` (L11, now carrying the privacy notice) AND a static, non-Angular footer in `src/index.html` (L51-77) with plain `href` links (no SPA routing, `target="_blank"` on internal-ish links, stale "© 2024 Izinga"). Result: two footers stacked, "Privacy Policy" twice, "Terms and Conditions" via a full page reload. This is the duplication Lindani flagged.
**Required behaviour:** delete the static footer from `src/index.html` entirely (keep `<noscript>`). Fold its content into the single Angular footer in `app.component.html`:
- Line 1 (existing): "Your information will be securely stored." + `routerLink="/privacy-policy"` "Privacy Policy".
- Links row (new, same footer): "Our Offices" → `routerLink="/contact"`; "Terms and Conditions" → `routerLink="/indivisuals/legal-info"`; external "Izinga Mobile App" (https://izinga.co.za), "Izinga Tip Jar" (https://tips.izinga.co.za) with `target="_blank" rel="noopener"`. Drop "Izinga Vendor Sign Up" (it links to this very app) and "Yoco Payment Provider" (not a user-facing service).
- Line 3 (existing): "Operated by Curiousoft (Pty) Ltd" + "© {{ currentYear }} iZinga" (bind the year — no hardcoded 2024).
- Styling stays the flat Angular footer style (`var(--bkg-card-color)` background, `text-muted`, no `text-light`/dark band, no shadow/radius). Keep it compact: one links row that wraps at 375px.
**Acceptance criteria:** `document.querySelectorAll('footer').length === 1` on every route; exactly one Privacy Policy link on the page and it is a `routerLink` (no full reload); `index.html` contains no `<footer>`; `app.component.spec.ts` asserts the five links and the dynamic year.

### REQ-07 guard completion (orchestrator, from live verification)
`toggleDayClosed` refuses the 7th close (L188-189) but the Closed checkbox (L70-73) has no `[disabled]` and no helper text, so the box visually ticks while the model refuses. Required: when only one day is open, that day's Closed checkbox is `[disabled]` and a `<small class="form-text text-muted">At least one day must be open.</small>` shows beneath it; add `isLastOpenDay(day)` (or similar) to the component and spec it.
