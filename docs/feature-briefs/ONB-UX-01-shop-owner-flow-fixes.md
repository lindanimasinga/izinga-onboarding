# Feature Brief: ONB-UX-01 — Shop-Owner Flow UX Fixes

**Status:** Approved for Implementation
**PO-APPROVED — authorised by Lindani Masinga 2026-09-16**

**Feature name:** Shop-Owner Flow UX Fixes (P0 + P1 + adjacent P2)

**Requested by:** Lindani Masinga

**Business objective:** The shop-owner onboarding flow (stock management, business profile, dashboard) has confirmed usability defects that prevent store owners from successfully adding/editing stock, receiving save feedback, and navigating a correct branded experience. These defects were verified against a live store (Ekasi Grillz) and block commercial onboarding at scale.

**Audience:** Store owners (STORE_ADMIN role)

**Products affected:** `izinga-onboarding` (sole repo)

**Out of scope:**
- P2-4 tag row layout, P2-5 button label wrapping, P2-6 desktop max-width, P2-7 global transitions, P2-8 business-hours shortcut, P2-9 deep-link guard, P2-10 Orders emoji/duplicate heading, P2-11 search-clear button variant, P2-12 gradient-pink dark-theme stripe, P2-13 payout "Already Paid" colour — these are deferred to backlog (see Deferred Backlog section).
- Order-detail screen (`/order/:orderId`) — not covered by this brief.
- Any backend API changes.
- Any changes to the driver registration or individual registration flows unless the fix is a shared component.

---

## Deferred Backlog (do not action in this sprint)

| ID | Finding | Files |
|----|---------|-------|
| P2-4 | Tag row layout dead space | `stock-update.component.html` |
| P2-5 | Fixed-bottom 3-button wrapping at 375px | `stock-update.component.html` |
| P2-6 | Desktop form stretches to 1265px — no max-width | `business-update.component.html`, `stock-update.component.html` |
| P2-7 | `transition: all` and `transform: scale` on `.digit`; footer hardcoded `#b7b4af` | `styles.css` |
| P2-8 | Business hours — 14 `type="time"` inputs, no "same every day" shortcut | `business-update.component.html` |
| P2-9 | Deep-link `/business/info/:id/stock` redirects to root | routing/guards — needs reproduction |
| P2-10 | Orders empty state emoji; duplicate "Orders" headings | orders templates |
| P2-11 | `btn-outline-secondary` on search-clear should be `btn-outline-dark` | businesses/list template |
| P2-12 | `.gradient-pink::after` fades to white — white stripe in dark theme | shared CSS |
| P2-13 | Payout "Already Paid" rendered in link-teal but is plain text | payout template |
| P1-11 | Image upload: no preview after selection | `stock-update.component.html` |
| P1-8 | Rate Calculation Preview constrained to half-width col | `business-update.component.html` |
| P1-14 | No visual distinction for out-of-stock (quantity 0) cards | `business-update.component.html` |
| P1-15 | Footer paints before store cards hydrate at 375px on `/business/list` | `businesses.component.html` |

---

## Requirements and Acceptance Criteria

All requirements are grouped by screen. Each requirement states the observable problem, the required behaviour, and testable acceptance criteria (AC). File references are the implementation targets.

---

### Screen: Stock Management (`/business/info/:id/stock`)

#### REQ-01 — P0-0: Stock accordion renders duplicate "Main" headers and loses items on toggle

**Problem:** The ungrouped bucket fallback in the `*ngFor` is labelled "Main" (L498 of `business-update.component.html`), while every newly saved item is also assigned `group: 'Main'` (`stock-update.component.ts` L108). This produces two "Main" accordion headers. Additionally, `id="accordionExample"` is placed inside the `*ngFor`, generating duplicate DOM IDs, so `data-parent` targets only the first instance and BS4 collapses the wrong panel. `aria-expanded="true"` is hardcoded on every header, causing all-or-nothing toggle failure.

**Required behaviour:**
1. The ungrouped/legacy bucket (items with no group value, or whose group name does not match any named group) must be labelled **"Uncategorised"** — never "Main". It must render **after** all named groups, not before.
2. New stock items must continue to default to `group: 'Main'` (`stock-update.component.ts` L108 is correct — do not change this default).
3. Each accordion group must receive a **unique DOM id** derived from its index or group name (e.g. `accordion-group-0`, `accordion-group-1`). The `data-parent` attribute on each `data-toggle="collapse"` button must reference its own group's id. This is a BS4 app — `data-toggle` attributes are correct and must not be changed to `data-bs-toggle`.
4. All groups must be **expanded by default** on page load (orchestrator override 2026-09-16: the audit's core complaint was that owners cannot see their stock at a glance; collapsing by default re-creates it). Bind `aria-expanded` to the panel's actual state (`[attr.aria-expanded]="isOpen(cat)"`) — never hardcode it — so Bootstrap 4 toggles in the correct direction.
5. The "Uncategorised" bucket is shown only when there are ungrouped items. If all items have a group, the bucket must not render.

**Files:** `business-update.component.html` L494–508

**Acceptance criteria:**
- AC-01-a: Given a store with items in group "Main" and at least one ungrouped item, when the stock page loads, then there is exactly one "Main" accordion header and one "Uncategorised" accordion header; "Uncategorised" appears below "Main".
- AC-01-b: Given a store with no ungrouped items, when the stock page loads, then no "Uncategorised" header is rendered.
- AC-01-c: Given any accordion group, when the user clicks its header, then only that group expands; all other groups remain collapsed; items within that group remain visible until the user collapses it again.
- AC-01-d: Given the rendered HTML, then no two accordion group wrappers share the same `id` value.
- AC-01-e: Given a new stock item is added with the default group, then after Save it appears under the "Main" group header, not the "Uncategorised" bucket.

---

#### REQ-02 — P0-1: Stock removal has no confirmation, no feedback, is always visible, and the button is misaligned on mobile

**Problem:** `removeStockItem()` splices the in-memory array only — the item is not deleted from the backend until the owner also presses Update, with no hint of this. The Remove button is always visible (even on a brand-new item with no `id`). It is full-width red on mobile and sits at `left: -15px` in the fixed bar, clipping off-viewport. Three real clicks failed to register in the live pass.

**Required behaviour:**
1. When the user taps "Remove Stock Item", the app must display a native `confirm()` dialog with the message: **"Remove [item name]? Press Update to save the change."** If the user cancels, nothing happens. If the user confirms, the item is spliced from the in-memory list and an inline notice replaces the item form area: **"Item removed. Press Update to save your changes, or navigate away to discard."** Use the same `*ngIf` + Bootstrap `alert alert-warning` pattern already used in the app (see `team-messengers.component.html` as the reference).
2. The Remove button must be **hidden** (use `*ngIf` or `[hidden]`) when the stock item has no `id` (i.e. it is a brand-new unsaved item). A brand-new item can simply be discarded by navigating away.
3. The Remove button must use class `btn-outline-danger` (not `btn-danger`) — this also satisfies P1-12.
4. On mobile (max-width 575px), the Remove button must sit on the **left** side inside the fixed action bar (not the thumb-side right edge) with at least `16px` horizontal margin from the viewport edge, and must never be clipped by a negative `left` offset.

**Files:** `stock-update.component.ts` L114, `stock-update.component.html` L89

**Acceptance criteria:**
- AC-02-a: Given a saved stock item (has an `id`), when the user taps "Remove Stock Item", then a confirm dialog appears with the prescribed message before any splice occurs.
- AC-02-b: Given the confirm dialog, when the user cancels, then the item list is unchanged and no alert is shown.
- AC-02-c: Given the confirm dialog, when the user confirms, then the item is removed from the displayed list and an `alert alert-warning` inline notice reads "Item removed. Press Update to save your changes, or navigate away to discard."
- AC-02-d: Given a brand-new stock item (no `id`), when the stock form is rendered, then no Remove button is visible.
- AC-02-e: At 375px viewport, the Remove button is fully visible, not clipped, and has at least 16px clearance from both the left and right viewport edges.
- AC-02-f: The Remove button carries only the class `btn-outline-danger` (no `btn-danger`).

---

#### REQ-03 — P0-2 + P1-9: Stock save has no success/error feedback and no loading state

**Problem:** On a successful save, the component calls `location.reload()` with no user-visible message. On failure, only `console.error()` is called. During any in-flight API request there is no loading indicator, making empty-during-load indistinguishable from "you have nothing".

**Required behaviour:**
1. Add component-level state variables `saveSuccess: boolean`, `saveError: string | null`, and `isSaving: boolean`.
2. While a PATCH/save is in flight (`isSaving = true`): the Update button must be **disabled** and its label must change to a spinner + "Saving…" using a Bootstrap spinner: `<span class="spinner-border spinner-border-sm mr-1"></span>Saving…`.
3. On success: set `saveSuccess = true`, display an `alert alert-success` banner at the top of the form with the message **"Stock saved successfully."** Do not call `location.reload()`. Dismiss the banner automatically after 4 seconds (use `setTimeout`).
4. On error: set `saveError` to a human-readable message, display an `alert alert-danger` banner with the message **"Could not save stock. Please try again."**
5. Apply the same loading state to the initial data fetch: show an `alert alert-info` with a spinner and the text **"Loading stock…"** while data is being fetched; hide it once data arrives. If the fetch fails, show `alert alert-danger` with **"Could not load stock. Please refresh the page."**

**Reuse pattern:** `team-messengers.component.html` — `*ngIf="successMessage"` + `alert alert-success`, `*ngIf="errorMessage"` + `alert alert-danger`.

**Files:** `stock-update.component.ts`, `stock-update.component.html`

**Acceptance criteria:**
- AC-03-a: Given a stock save is in flight, the Update button is disabled and shows a spinner with "Saving…" label.
- AC-03-b: Given a successful save, an `alert alert-success` banner reading "Stock saved successfully." appears at the top of the form and auto-dismisses after 4 seconds.
- AC-03-c: Given a save API error, an `alert alert-danger` banner reading "Could not save stock. Please try again." appears and remains until the user dismisses it or tries again.
- AC-03-d: Given the stock page is loading data, an `alert alert-info` with "Loading stock…" and a spinner is shown.
- AC-03-e: `location.reload()` is removed from the save success path.

---

#### REQ-04 — P2-1: `styleUrls` points at the HTML file instead of the CSS file

**Problem:** `stock-update.component.ts` L18 declares `styleUrls: ['./stock-update.component.html']`. This means the component's CSS file is silently ignored in production.

**Required behaviour:** Change the `styleUrls` array entry to `'./stock-update.component.css'`.

**Files:** `stock-update.component.ts` L18

**Acceptance criteria:**
- AC-04-a: `styleUrls` in `stock-update.component.ts` references `./stock-update.component.css`.
- AC-04-b: `ng build` (dev) and `ng build --configuration=production` both complete without error.

---

#### REQ-05 — P1-3: "Add tag" button uses forbidden `btn-outline-primary` (Bootstrap blue)

**Problem:** The "Add tag" button at `stock-update.component.html` L72 uses `btn-outline-primary`, which renders in Bootstrap blue — outside the iZinga design system.

**Required behaviour:** Replace `btn-outline-primary` with `btn-outline-dark` on the "Add tag" button.

**Files:** `stock-update.component.html` L72

**Acceptance criteria:**
- AC-05-a: The "Add tag" button carries class `btn-outline-dark` and renders with the dark border/text rather than Bootstrap blue.

---

#### REQ-06 — P1-7: Stock form is a `<div>`, not a `<form>` element

**Problem:** The stock item editing section is wrapped in a `<div>` instead of a `<form>`, so HTML5 `required` attributes never trigger native browser validation.

**Required behaviour:** Replace the outer `<div>` wrapper that contains the stock item fields with a `<form>` element. Add `(ngSubmit)="saveStock()"` or bind the existing save action to the form submit. Ensure any existing `<button type="button">` tags that should not submit (e.g. "Add tag") remain `type="button"`.

**Files:** `stock-update.component.html`

**Acceptance criteria:**
- AC-06-a: The stock item fields are inside a `<form>` element.
- AC-06-b: Submitting the form (pressing Enter in a field, or clicking the primary save button) triggers the save action.
- AC-06-c: Buttons that are not intended to submit (e.g. "Add tag", "Remove Stock Item") carry `type="button"`.

---

#### REQ-07 — P1-6 (partial): Duplicate `for="stockName"` labels

**Problem:** The `for="stockName"` attribute is reused across multiple labels, breaking screen-reader association. Labels also lack the `form-label` class.

**Required behaviour:**
1. Each label's `for` attribute must match the `id` of exactly one input. If the page renders multiple stock items in a loop, each input must have a unique `id` incorporating the loop index (e.g. `stockName-0`, `stockName-1`), and its label's `for` must match.
2. Add class `form-label` to all stock form labels.

**Files:** `stock-update.component.html`

**Acceptance criteria:**
- AC-07-a: No two `<label for="...">` share the same value within the rendered DOM (verified by inspecting a page with two or more stock items loaded).
- AC-07-b: All stock form labels carry the `form-label` CSS class.

---

#### REQ-08 — P2-3 (adjacent to stock form): Price field has no currency affordance

**Problem:** The price input has no `R` prefix or min/max constraint. This is P2 but is in the same file as the P0/P1 stock fixes (adjacent rule).

**Required behaviour:** Wrap the price input in a Bootstrap input group with a prepended `<span class="input-group-text">R</span>`. Add `min="0"` and `max="99999"` to the price `<input>`.

**Files:** `stock-update.component.html`

**Acceptance criteria:**
- AC-08-a: The price input is visually preceded by the label "R" via an input group prepend.
- AC-08-b: The input carries `min="0"` and `max="99999"` attributes.

---

#### REQ-09 — P2-2 (adjacent): "Stock Item:" heading shows empty name on add; uses wrong heading level

**Problem:** When adding a new item, the heading renders as "Stock Item: " with a blank name. The heading uses `h4` rather than the design-system heading block. This is P2 but is in the same file.

**Required behaviour:**
1. When adding a new item (no name yet), the heading must read **"New Stock Item"**.
2. When editing an existing item, the heading must read **"Stock Item: [name]"**.
3. Change the heading element from `h4` to `h2` with a `<p class="text-muted">` subtitle beneath it (the subtitle can read "Edit the details below and press Update to save.").

**Files:** `stock-update.component.html`, `stock-update.component.ts`

**Acceptance criteria:**
- AC-09-a: When the add-stock form is opened with no pre-populated name, the heading reads "New Stock Item".
- AC-09-b: When editing an existing item, the heading reads "Stock Item: [item name]".
- AC-09-c: The heading element is `h2`.

---

### Screen: Business Profile (`/business/info/:id`)

#### REQ-10 — P0-5: Wrong placeholder text on "Business Contact Details"

**Problem:** The input at `business-update.component.html` L31 has placeholder `"Enter your business name"` — a copy-paste error on the contact details field.

**Required behaviour:** Change the placeholder to `"Enter your business contact details"` or the appropriate contextual placeholder for that field.

**Files:** `business-update.component.html` L31

**Acceptance criteria:**
- AC-10-a: The Business Contact Details input does not contain the placeholder text "Enter your business name".
- AC-10-b: The placeholder text describes the contact details field in plain language.

---

#### REQ-11 — P1-1: `shadow-sm` on business profile action bar violates flat-design directive

**Problem:** The fixed-bottom Save/Update bar in `business-update.component.html` L528 carries `shadow-sm`. The CEO flat-design directive (iZinga design system) prohibits shadows on cards and bars.

**Required behaviour:** Remove the `shadow-sm` class from the fixed-bottom action bar in `business-update.component.html` L528.

**Files:** `business-update.component.html` L528

**Acceptance criteria:**
- AC-11-a: The fixed-bottom action bar in the business update page carries no `shadow-sm` or `shadow` class.

---

#### REQ-12 — P1-2: `business-update.component.css` adds rounded corners, focus shadow, and hover lift

**Problem:** The component stylesheet introduces:
- `border-radius` at L3 and L29 — rounded corners on flat-design surfaces
- `box-shadow` on focus at L36 — adds depth on interaction
- `translateY` + `box-shadow` on hover at L58–63 — lift effect on hover

All three contradict the iZinga flat-design directive.

**Required behaviour:**
1. Remove the `border-radius` declarations at L3 and L29 (or set them to `0`).
2. Remove the `box-shadow` on the focus rule at L36.
3. Remove the `translateY` and `box-shadow` from the hover rule at L58–63. The hover state may retain a background-colour change but no lift or shadow.

**Files:** `business-update.component.css` L3, L29, L36, L58–63

**Acceptance criteria:**
- AC-12-a: `business-update.component.css` contains no `border-radius` declarations that produce rounded surfaces.
- AC-12-b: Focus state on business update fields has no `box-shadow`.
- AC-12-c: Hover state has no `translateY` transform and no `box-shadow`.

---

#### REQ-13 — P1-4 (partial): Hardcoded hex values and Bootstrap utility colours

**Problem:** The business update template and stylesheet contain approximately 18 hardcoded hex values, including off-palette `#f39c12`, `#17a2b8`, `#4a5568`. Bootstrap utility classes `text-warning`, `text-info`, and `text-danger` on the rate preview section break in dark theme.

**Required behaviour:**
1. Replace `#f39c12` with `var(--izinga-gold)` (the shop-brand gold token defined in `styles.css`).
2. Replace `#17a2b8` with `var(--izinga-teal)` or remove if not required by the shop design.
3. Replace `#4a5568` with `var(--text-muted-color)` or Bootstrap's `text-muted` class.
4. On the rate preview cards, replace `text-warning`, `text-info`, and `text-danger` with semantic non-coloured alternatives or wrap them in a CSS variable so they respond to theme. For this pass, replacing those utility classes with `text-dark` (light mode) is acceptable if a full token pass is not yet in scope; the important requirement is that they do not render broken in dark mode.

**Files:** `business-update.component.css`, `business-update.component.html`, `dashboard.component.html`

**Acceptance criteria:**
- AC-13-a: No hardcoded `#f39c12` appears in the business update template or stylesheet; `var(--izinga-gold)` is used instead.
- AC-13-b: No hardcoded `#17a2b8` or `#4a5568` appear in the business update template or stylesheet.
- AC-13-c: Rate preview cards do not use `text-warning`, `text-info`, or `text-danger` Bootstrap classes.

---

#### REQ-14 — P1-5: Fixed-bottom action bar covers page content and the footer

**Problem:** Fixed-bottom bars on the business update and stock update pages cover the bottom of the page content, making the Privacy Policy footer link unreachable. There is no `padding-bottom` on the page container, and no `env(safe-area-inset-bottom)` for iOS notch/home-indicator.

**Required behaviour:**
1. Add a `padding-bottom` to the main page container of each affected page sufficient to clear the fixed bar (at minimum `72px`; exact value should match the bar's rendered height + a comfortable 8px buffer).
2. The padding-bottom value must use `calc(72px + env(safe-area-inset-bottom, 0px))` to handle iOS safe area.
3. Apply to all pages that have a fixed-bottom bar: business update, stock update. Verify the footer Privacy Policy link is reachable by scrolling.

**Files:** `business-update.component.html`, `stock-update.component.html`, and/or their CSS files

**Acceptance criteria:**
- AC-14-a: At 375px viewport, the Privacy Policy footer link is reachable by scrolling — it is not covered by the fixed action bar.
- AC-14-b: The page container has a `padding-bottom` of at least `calc(72px + env(safe-area-inset-bottom, 0px))`.

---

#### REQ-15 — P1-6 (partial): Duplicate `for="businessName"` on 4 labels

**Problem:** Four labels share `for="businessName"` in `business-update.component.html`. Labels also lack the `form-label` class.

**Required behaviour:**
1. Each label's `for` attribute must match exactly one input's `id` on the page. Assign unique `id` values to each input and update the corresponding label's `for`.
2. Add class `form-label` to all business update form labels.

**Files:** `business-update.component.html`

**Acceptance criteria:**
- AC-15-a: No two `<label for="...">` in `business-update.component.html` share the same value.
- AC-15-b: All form labels carry the `form-label` CSS class.

---

### Screen: Dashboard (`/dashboard`)

#### REQ-16 — P0-3 + P1-9 + P1-10: Empty states are blank; dashboard redirects new users without context; driver-only toggle leaks into shop role

**Problem (empty states):** `/business/list` with no shops renders a blank page. "Manage Your Stock" with no items shows nothing. The stock section is also hidden behind `*ngIf="shop.id"` with no explanation when a shop is unsaved.

**Problem (onboarding redirect):** New shop users are redirected straight to `/business/user` with no progress indicator or context.

**Problem (driver toggle):** The driver availability toggle (only relevant to drivers) is visible on the dashboard for non-driver roles.

**Required behaviour:**

*Empty state — business list:*
When the owner has no shops and the data fetch is complete, show:
```
[Icon: a shop outline or Bootstrap icon bi-shop — inline SVG acceptable]
You haven't added a shop yet.
[Button: "Add Your Shop" → navigates to the add-business route, class `btn btn-dark` (orchestrator override: `btn-warning` renders Bootstrap yellow and violates the CEO flat-design directive — filled buttons are #212121)]
```

*Empty state — stock list:*
When the shop has no stock items, show:
```
Your menu is empty.
Add your first item to start taking orders.
[Button: "Add Stock Item" → triggers the add-item action, class `btn btn-dark` (same override as above — no `btn-warning` anywhere in this brief)]
```

*Hidden stock section for unsaved shop:*
Replace the bare `*ngIf="shop.id"` hide with an explanatory notice:
```
[alert alert-info] Save your shop details first to manage your stock.
```
The button to reach stock management must remain hidden until `shop.id` exists.

*Onboarding redirect context:*
When a new shop user is redirected to `/business/user`, prepend the page with an `alert alert-info` progress indicator: **"Step 1 of 3 — Complete your profile to start receiving orders."**

*Driver toggle:*
The availability toggle and any driver-specific UI elements must be wrapped in a role guard: show only when the current user's role includes `DRIVER` or `MESSENGER`. Use the existing role-check pattern in the codebase.

**Files:** `businesses.component.html`, `business-update.component.html`, `dashboard.component.html`, `dashboard.component.ts`

**Acceptance criteria:**
- AC-16-a: Given a STORE_ADMIN with no shops, when `/business/list` loads, then the empty state message and "Add Your Shop" button are displayed.
- AC-16-b: Given a shop with no stock items, when the stock section loads, then the empty state message and "Add Stock Item" button are displayed.
- AC-16-c: Given a new shop (no `shop.id`), when the stock section is reached, then an `alert alert-info` message reading "Save your shop details first to manage your stock." is shown; no blank section is rendered.
- AC-16-d: Given a new STORE_ADMIN user on first login, when redirected to `/business/user`, then a progress banner "Step 1 of 3 — Complete your profile to start receiving orders." is visible at the top of the page.
- AC-16-e: Given a STORE_ADMIN (non-driver) session, when the dashboard loads, then the driver availability toggle is not visible.

---

#### REQ-17 — P1-1: 28× `shadow-sm` on dashboard cards violates flat-design directive

**Problem:** The dashboard template contains 28 occurrences of `shadow-sm` on cards. The iZinga CEO flat-design directive prohibits shadows across all card surfaces.

**Required behaviour:** Remove all `shadow-sm` (and `shadow`) class occurrences from `dashboard.component.html`. Do not replace them with another shadow variant.

**Files:** `dashboard.component.html`

**Acceptance criteria:**
- AC-17-a: `grep -c "shadow-sm\|shadow-md\|shadow-lg\|shadow " dashboard.component.html` returns 0.
- AC-17-b: Dashboard cards render without visible drop-shadow at 375px and 1280px.

---

#### REQ-18 — P1-10 + P1-1: `shadow-sm` on stock update fixed bar

**Problem:** `stock-update.component.html` L91 carries `shadow-sm` on the fixed-bottom action bar.

**Required behaviour:** Remove `shadow-sm` from the fixed-bottom bar in `stock-update.component.html` L91.

**Files:** `stock-update.component.html` L91

**Acceptance criteria:**
- AC-18-a: The fixed-bottom bar in stock update carries no `shadow-sm` class.

---

### Screen: User Profile (`/business/user`)

#### REQ-19 — P0-4: Cellphone Number field renders the literal string "undefined"

**Problem:** `user-update.component.html` L164 binds `[value]="phoneNumber"`. When `phoneNumber` is unset on the component, Angular evaluates it as `undefined` and the input displays the string "undefined".

**Required behaviour:** Change the binding to `[value]="phoneNumber || ''"`. This ensures an unset phone number renders as a blank field, never the string "undefined".

**Files:** `user-update.component.html` L164

**Acceptance criteria:**
- AC-19-a: Given a user record with no phone number set, when the profile page loads, the Cellphone Number field is blank.
- AC-19-b: The string "undefined" never appears in the Cellphone Number field under any data condition.

---

#### REQ-20 — P1-13: Tip Card toggle label runs question and value together

**Problem:** The "I have a iZinga Tip Card | YES" label on `user-update.component.html` runs the question and current value together without visual separation.

**Required behaviour:** Separate the question and value with a line break or a `<small>` sub-label. The label must read:
```
I have an iZinga Tip Card
[toggle switch]
```
The current value (YES/NO) may be shown as a small badge or text adjacent to the toggle. Also fix the grammar: "a iZinga" → "an iZinga".

**Files:** `user-update.component.html`

**Acceptance criteria:**
- AC-20-a: The label reads "I have an iZinga Tip Card" (corrected grammar).
- AC-20-b: The question text and the YES/NO indicator are visually distinct — not run together in a single label string.

---

### Environment / Dev Experience

#### REQ-21 — P0-6: Dev environment defaults to `driver` user type, breaking shop-owner local design review

**Problem:** `environment.ts` sets `defaultUserType: 'driver'`. Every local design review of shop-owner screens renders in driver-teal rather than shop-gold branding.

**Required behaviour:**
1. Change `defaultUserType` in `environment.ts` (development environment only) from `'driver'` to `'shop'`.
2. To allow developer testing of the driver flow locally without changing `environment.ts`, support a query-parameter override: if `?userType=driver` is present in the URL on app initialisation, `app.component.ts` must override the theme to driver. This override is development-only and must be guarded by `!environment.production`.
3. `environment.prod.ts` must not be changed — production derives the user type from the authenticated session.

**Files:** `environment.ts`, `app.component.ts` L135

**Acceptance criteria:**
- AC-21-a: Running `ng serve` (dev) and navigating to `/dashboard` without any query param renders shop-gold branding.
- AC-21-b: Running `ng serve` and navigating to `/dashboard?userType=driver` renders driver-teal branding.
- AC-21-c: `environment.prod.ts` is unchanged.

---

## Dependencies

- No backend API changes required.
- No shared model or enum changes required — no Solution Architect consult needed for this brief.
- The BS4 CDN (Bootstrap 4.5.0) is already present. No version upgrade or new CDN dependency is introduced.
- The existing `team-messengers.component.html` alert pattern is the implementation reference for feedback banners (REQ-03).

## Risks

- REQ-01 (accordion) touches live data rendering. Test against the real store (Ekasi Grillz) with the ZZ-UX-AUDIT-TEST-DELETE-ME item only.
- REQ-16 (role guard for driver toggle) requires reading the current role-check pattern — confirm the mechanism before implementing to avoid hiding UI for valid driver-shop dual-role accounts.
- REQ-21 (environment default) only changes `environment.ts` (dev). Confirm `app.component.ts` does not write the user type to storage in a way that persists across sessions.

## Agent Task Breakdown

| # | Task | Agent | Depends on |
|---|------|-------|-----------|
| T-01 | Implement REQ-04 (`styleUrls` fix) | iZinga Onboarding UI/UX Developer | none |
| T-02 | Implement REQ-01 (accordion fix — unique ids, ungrouped label, collapse default) | iZinga Onboarding UI/UX Developer | T-01 |
| T-03 | Implement REQ-02 (Remove stock: confirm dialog, inline feedback, hide on new item, btn-outline-danger, mobile alignment) | iZinga Onboarding UI/UX Developer | T-01 |
| T-04 | Implement REQ-03 (save/load feedback: isSaving spinner, success/error banners, loading state) | iZinga Onboarding UI/UX Developer | T-01 |
| T-05 | Implement REQ-05 (btn-outline-dark for Add tag) | iZinga Onboarding UI/UX Developer | T-01 |
| T-06 | Implement REQ-06 (stock div → form element) | iZinga Onboarding UI/UX Developer | T-01 |
| T-07 | Implement REQ-07 (unique for/id pairs + form-label on stock form) | iZinga Onboarding UI/UX Developer | T-06 |
| T-08 | Implement REQ-08 (price field R prefix + min/max) | iZinga Onboarding UI/UX Developer | T-01 |
| T-09 | Implement REQ-09 (stock heading: New vs Edit, h2 + subtitle) | iZinga Onboarding UI/UX Developer | T-01 |
| T-10 | Implement REQ-18 (remove shadow-sm from stock update fixed bar) | iZinga Onboarding UI/UX Developer | none |
| T-11 | Implement REQ-14 (padding-bottom + safe-area on business update + stock update) | iZinga Onboarding UI/UX Developer | none |
| T-12 | Implement REQ-10 (placeholder copy fix) | iZinga Onboarding UI/UX Developer | none |
| T-13 | Implement REQ-11 (remove shadow-sm from business update fixed bar) | iZinga Onboarding UI/UX Developer | none |
| T-14 | Implement REQ-12 (business-update.css flat-design: border-radius, box-shadow, translateY) | iZinga Onboarding UI/UX Developer | none |
| T-15 | Implement REQ-13 (hex → token replacements, rate preview utility classes) | iZinga Onboarding UI/UX Developer | none |
| T-16 | Implement REQ-15 (unique for/id pairs + form-label on business update form) | iZinga Onboarding UI/UX Developer | none |
| T-17 | Implement REQ-17 (remove all shadow-sm from dashboard) | iZinga Onboarding UI/UX Developer | none |
| T-18 | Implement REQ-16 (empty states: business list + stock list + unsaved shop notice + onboarding progress banner + driver toggle role guard) | iZinga Onboarding UI/UX Developer | none |
| T-19 | Implement REQ-19 (phoneNumber || '' binding fix) | iZinga Onboarding UI/UX Developer | none |
| T-20 | Implement REQ-20 (Tip Card label grammar + visual separation) | iZinga Onboarding UI/UX Developer | none |
| T-21 | Implement REQ-21 (defaultUserType → 'shop' in dev env + query-param override) | iZinga Onboarding UI/UX Developer | none |
| T-22 | Extend existing spec files to cover REQ-01 through REQ-21; run full unscoped `ng test` suite to green | iZinga QA & Test Automation | T-01 to T-21 |
| T-23 | Code review — verify `ng build` (dev) and `ng build --configuration=production` both clean; review all changes against brief | iZinga Code Reviewer | T-22 |

---

## Testing Requirements

### Spec files to extend

- `stock-update.component.spec.ts` — add tests for: accordion unique IDs (REQ-01), Remove confirm dialog (REQ-02), save success/error/loading state (REQ-03), styleUrls (REQ-04), form element (REQ-06), price min/max (REQ-08).
- `business-update.component.spec.ts` — add tests for: placeholder text (REQ-10), shadow-sm absence (REQ-11/13), label uniqueness (REQ-15), padding-bottom (REQ-14).
- `dashboard.component.spec.ts` — add tests for: shadow-sm absence (REQ-17), empty state rendering (REQ-16), driver toggle role guard (REQ-16).
- `user-update.component.spec.ts` — add tests for: phoneNumber binding (REQ-19), tip card label text (REQ-20).

### Build gate (mandatory — Code Reviewer will run both)

Both commands must complete clean (exit code 0, zero errors) on the final branch before the Code Reviewer issues a PASS:
```
ng build
ng build --configuration=production
```

### Test gate (mandatory)

The full unscoped `ng test` suite must pass. Scoped-run results (e.g. `--include` flags or `fdescribe`/`fit`) must not be reported as green. The Code Reviewer will run `ng test --watch=false` with no scope flags.

---

## How to Verify (per screen, per breakpoint)

Use the real STORE_ADMIN session: phone **+27734396642**, store **Ekasi Grillz** (`bd5a8bcf-850a-4225-bffb-2f703ff14da8`).

**Non-destructive rule:** Only create, edit, or remove a stock item named **`ZZ-UX-AUDIT-TEST-DELETE-ME`**. Do not modify any real stock item, the shop profile, or the user profile. Do not press Save on the business profile page. Leave the backend in the state it was found.

### Dashboard — `/dashboard`
| Check | 375px | 1280px |
|-------|-------|--------|
| No shadow on any card | Confirm no visible drop-shadow | Confirm no visible drop-shadow |
| Driver toggle hidden for STORE_ADMIN | Not visible | Not visible |
| Empty state (if shop list is empty) | Message + "Add Your Shop" button visible | Same |

### Business List — `/business/list`
| Check | 375px | 1280px |
|-------|-------|--------|
| If no shops: empty state copy and button | Visible | Visible |
| If shops load: no footer-first flash | Cards appear before footer | Cards appear before footer |

### Business Profile — `/business/info/:id`
| Check | 375px | 1280px |
|-------|-------|--------|
| Placeholder on contact details field | Does not read "Enter your business name" | Same |
| No shadow on fixed bottom bar | No drop shadow visible | No drop shadow visible |
| No rounded corners, no hover lift | Flat surfaces | Flat surfaces |
| Footer Privacy Policy reachable | Scrollable below fixed bar | Scrollable below fixed bar |
| All label/input pairs unique | Inspect DOM: no duplicate `for` values | Same |

### Stock Management — `/business/info/:id/stock`
| Check | 375px | 1280px |
|-------|-------|--------|
| Accordion: one "Main" header, "Uncategorised" below if needed | Click Main: only Main expands | Same |
| Accordion: no duplicate IDs | Inspect DOM | Inspect DOM |
| ZZ-UX-AUDIT-TEST-DELETE-ME: Remove shows confirm, then inline notice | Native confirm appears | Same |
| Remove hidden on new unsaved item | Not visible on fresh add-item form | Not visible |
| Save triggers spinner on Update button | Spinner + "Saving…" visible | Same |
| Save success: alert-success banner, no reload | Banner visible, page does not reload | Same |
| Loading state: alert-info while fetching | Visible on first load | Same |
| No shadow on fixed bottom bar | Flat | Flat |
| Footer reachable by scroll | Yes | Yes |
| Price field shows "R" prefix | R prefix visible | Same |
| Add tag button is dark-bordered, not blue | Dark border | Dark border |
| styleUrls fix: component CSS applies | Visual styles from CSS file are active | Same |

### User Profile — `/business/user`
| Check | 375px | 1280px |
|-------|-------|--------|
| Cellphone field blank (not "undefined") when no phone on record | Blank | Blank |
| Tip Card label reads "I have an iZinga Tip Card" | Correct | Correct |

### Dev Environment
| Check | Result |
|-------|--------|
| `ng serve` → `/dashboard` | Shop-gold branding |
| `ng serve` → `/dashboard?userType=driver` | Driver-teal branding |

---

## Marketing Trigger

No — this is an internal UX quality fix. No marketing campaign required.

---

## Definition of Done

This feature is complete when ALL of the following are true:

1. All 21 requirements (REQ-01 through REQ-21) have been implemented and the corresponding acceptance criteria pass.
2. `ng build` (dev) completes with zero errors.
3. `ng build --configuration=production` completes with zero errors.
4. `ng test --watch=false` (full unscoped suite) passes with zero failures.
5. The iZinga Code Reviewer has issued a PASS verdict.
6. Manual verification has been completed against the Ekasi Grillz STORE_ADMIN session at 375px and 1280px without modifying any data other than the `ZZ-UX-AUDIT-TEST-DELETE-ME` test item.
7. The feature branch has been merged to `develop` via a pull request with the Code Reviewer PASS attached.

---

*Brief authored by iZinga Product Owner · PO-APPROVED — authorised by Lindani Masinga 2026-09-16*

---

## REQ-22 — Delivery Rates & Pricing visible to ADMIN only (added 2026-09-16, authorised by Lindani Masinga)

**Problem:** The "Delivery Rates & Pricing" section on `/business/info/:businessId` (heading at `business-update.component.html` ~L93, through the per-vehicle rate inputs and the Rate Calculation Preview) is platform pricing configuration. Store owners must not see or edit it.

**Required behaviour:** The entire section — heading, intro copy, base/labour/floor rates, all `ratePerKm*` vehicle inputs, and the Rate Calculation Preview — renders only when the logged-in user's role is `ADMIN` (`UserProfile.role === 'ADMIN'`, sourced from `storageService.userProfile`). For `STORE_ADMIN` (and any other role) the section is absent from the DOM — not hidden with CSS.

**Acceptance criteria:**
- Given a `STORE_ADMIN` session, when the business profile loads, then no element of the rates section exists in the DOM and the form flows directly from Business Hours to the next section with no gap or orphan heading.
- Given an `ADMIN` session, the section renders exactly as today.
- Saving as `STORE_ADMIN` must not clear or overwrite `shop.rates` — the existing rates object must round-trip untouched (verify the PATCH payload still carries the original `rates`).
- Spec: `business-update.component.spec.ts` gets two tests (ADMIN sees section; STORE_ADMIN does not) plus one asserting `shop.rates` survives a STORE_ADMIN save.

**Files:** `business-update.component.html`, `business-update.component.ts` (add an `isAdmin` getter reading `storageService.userProfile?.role`), `business-update.component.spec.ts`.
