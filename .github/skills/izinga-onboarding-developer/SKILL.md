---
name: izinga-onboarding-developer
description: "Use when working on the iZinga onboarding web application and you need to understand or modify the full app flow across Angular, HTML, CSS, Firebase, and the iZinga backend integrations."
---

# iZinga Onboarding Developer

Use this skill when the task involves understanding, extending, debugging, or redesigning the iZinga onboarding application as a complete product, not just a single component.

## Goal

Understand the whole app flow first, then make changes that fit the existing Angular architecture, the iZinga backend contracts, and the Firebase integrations used by the product.

## Project Atlas

### Route and page families

- Entry and role selection: `/`
- Individuals and drivers: `/indivisuals/*`
- Businesses and stores: `/business/*`
- Shared payout and legal pages: `/[role]/payout`, `/[role]/payout-details`, `/[role]/payout-orders`, `/[role]/privacy-policy`, `/[role]/legal-info`
- Admin and compliance pages: `/[role]/pending-approvals`, `/[role]/user-management`, `/[role]/restricted-regions`, `/[role]/add-restricted-region`, `/[role]/chat-sessions`

### Core page flow

- Welcome selection
- Phone verification
- User profile setup
- Signup welcome
- Terms acceptance
- Dashboard

### Individual and messenger flow

- `WelcomeIndivisualsComponent`
- `PhoneVerificationComponent`
- `UserUpdateComponent`
- `SignupWelcomeComponent`
- `TermsConditionsComponent`
- `DashboardComponent`
- `MessangerOrdersComponent`
- `MessangerOrderComponent`
- `MessengerPayoutComponent`
- `UserInfoComponent`

### Business flow

- `WelcomeBusinessComponent`
- `PhoneVerificationComponent`
- `UserUpdateComponent`
- `BusinessUpdateComponent`
- `BusinessesComponent`
- `StockUpdateComponent`
- `OrdersComponent`
- `OrderItemHistoryComponent`
- `PayoutComponent`

### Admin and compliance flow

- `PendingApprovalsComponent`
- `UserManagementComponent`
- `RestrictedRegionsComponent`
- `AddRestrictedRegionComponent`
- `ChatSessionsComponent`

### Shared support pages

- `PrivacyPolicyComponent`
- `LegalInfoComponent`
- `PayoutDetailsComponent`
- `PayoutOdersComponent`
- `StoreCardComponent`
- `StockItemComponent`
- `OrderCardComponent`
- `PayoutCardComponent`
- `PlaceAutocompleteComponent`

## What To Inspect First

1. Identify the user journey.
   - Determine whether the flow is for individuals, drivers, or businesses.
   - Confirm the route prefix and the page sequence involved.
   - Find the entry screen, supporting screens, and the destination dashboard or detail page.

2. Trace the Angular implementation.
   - Find the routed page component.
   - Check the template, styles, and any shared child components.
   - Review the module declarations, routing configuration, and any guards or redirects.

3. Trace the data flow.
   - Identify the services used by the page.
   - Follow calls into the iZinga backend service layer.
   - Inspect local storage state, shared models, and reactive patterns used by the app.

4. Check external integrations.
   - Review Firebase Auth for OTP flows.
   - Review Firebase Messaging for device and notification behavior.
   - Review any Firestore or realtime chat usage.
   - Review Google Maps or Places integrations where location data is involved.

5. Match the page to its role.
   - Confirm whether the route belongs to individual, driver, store, admin, or shared legal/payout paths.
   - Check whether the page is role-gated, terms-gated, or approval-gated.

## Implementation Workflow

1. Start with the page that owns the behavior.
   - Prefer the routed component over helper files.
   - Read nearby templates, CSS, and service calls before editing.

2. Preserve the app's existing patterns.
   - Keep template-driven forms when the app already uses them.
   - Use the existing local storage conventions.
   - Keep the current role-based flow, naming, and route structure unless the task explicitly asks for a wider change.

3. Match the backend contract.
   - Use the existing iZinga service methods where possible.
   - Keep payload shapes aligned with the current models.
   - Handle errors with the same patterns already used in the app.

4. Keep UI changes consistent.
   - Reuse the existing iZinga brand system.
   - Match the established colors, fonts, cards, buttons, tables, and dark theme behavior.
   - Keep responsive behavior aligned across desktop and mobile screens.

5. Validate the change locally.
   - Check the touched TypeScript, HTML, and CSS for type or template errors.
   - Confirm the route still works end to end.
   - Make sure any state saved in storage still loads on the next screen.

## Services And Data Contracts

- `IzingaOrderManagementService`
   - Main backend gateway for users, stores, orders, payouts, cards, uploads, restricted regions, and config data.
   - Keep request shapes aligned with the current models and headers.
- `StorageService`
   - Local storage cache for user profile, phone number, payouts, device, user type, and store context.
   - Treat it as the app's session bridge between routes.
- `FirebaseService`
   - OTP verification, push registration, and foreground messaging.
   - Check it before changing any phone-number or notification flow.
- `ChatService`
   - Firestore-backed chat sessions and messages.
   - Use it for admin, store, or applicant conversations.
- `AnalyticsService`
   - Screen view and event logging.
   - Update it when adding or renaming major screens.

## Canonical Order Stage Sequence

When sorting or rendering order progress in onboarding flows, use the exact `Order.StageEnum` sequence from `src/app/model/order.ts`:

1. `STAGE_0_CUSTOMER_NOT_PAID`
2. `STAGE_1_WAITING_STORE_CONFIRM`
3. `STAGE_2_STORE_PROCESSING`
4. `STAGE_3_READY_FOR_COLLECTION`
5. `STAGE_4_ON_THE_ROAD`
6. `STAGE_5_ARRIVED`
7. `STAGE_6_WITH_CUSTOMER`
8. `STAGE_7_ALL_PAID`
9. `CANCELLED`

Use `Order.stageEnumText` and `Order.stageEnumColor` as the default UI label and color sources instead of ad hoc mappings.

## Component Groups

### Shared presentation components

- `PlaceAutocompleteComponent` for South Africa address lookup
- `StoreCardComponent` for store summaries
- `StockItemComponent` for stock editing or display
- `OrderCardComponent` for order summaries
- `PayoutCardComponent` for payout summaries

### Feature pages that own business logic

- `DashboardComponent` for role-aware landing and redirects
- `UserUpdateComponent` for profile capture and dynamic fields
- `BusinessUpdateComponent` for store creation and editing
- `StockUpdateComponent` for inventory editing and tag management
- `PendingApprovalsComponent` for compliance review
- `MessangerOrdersComponent` and `MessangerOrderComponent` for delivery order handling
- `PayoutComponent` and `MessengerPayoutComponent` for payout summaries
- `RestrictedRegionsComponent` and `AddRestrictedRegionComponent` for geofences
- `ChatSessionsComponent` for Firestore chat

## Decision Rules

- If the task affects onboarding, check whether it touches verification, profile setup, terms acceptance, or approval flows.
- If the task affects payouts or orders, check whether it is for individual, messenger, admin, or store roles.
- If the task affects a screen layout, check whether the style should follow the shared iZinga tokens or an existing component pattern.
- If the task affects data submission, check whether the app expects a model update, a service call, or a storage update.
- If the task affects authentication or notifications, check Firebase first before changing the UI.

## Flow Rules

- If a page starts with phone verification, assume Firebase OTP is the gate before Izinga profile lookup.
- If a page shows onboarding fields, check `UserConfig` and `user.tag` before changing the template.
- If a page is payout-related, confirm whether it is messenger payout or store payout before wiring services or routes.
- If a page is admin-facing, check approval state, document completeness, and role permissions.

## Angular Form Conventions (App-Wide Standard)

All pages in the app use template-driven forms. When building or editing any form page, follow these rules exactly:

### Input and select elements
- Use `class="form-control"` for **all** inputs AND selects. Never use `form-select` or `form-select-sm`.
- Never use `form-control-sm` or `form-select-sm`. Always use full-size `form-control`.

### Labels
- Use `<label class="form-label">` or a plain `<label for="...">` — never add `fw-bold` to labels.
- Exception: small helper labels inside inline field rows may use `class="form-label small mb-1"`.

### Buttons
- Primary action: `btn btn-dark`
- Secondary/cancel action: `btn btn-outline-dark`
- Destructive action: `btn btn-outline-danger` or `btn btn-danger`
- Never override `.btn-primary` in component CSS — let global styles handle button theming.

### Page title pattern
```html
<div class="text-center mb-4">
  <h2 class="fw-bold">Page Title</h2>
  <p class="text-muted">Supporting subtitle or description</p>
</div>
```

### Layout wrapper
- Use a plain `<div>` or `<div class="mt-3">` as the page wrapper — not `container-fluid` with offset columns.
- Other admin pages (user-management, add-restricted-region) confirm this pattern.

### Form section grouping
- Do not wrap form sub-sections in `card bg-light` or `card-body`. Use a flat `div` with `border-top` or `mt-3 pt-3` spacing.
- For editable repeating field rows, use a `field-row` CSS class (see `user-config-management.component.css`) with `border-left` accent.
- For add-new-field panels under a repeating list, use `add-field-section` class (top-border separator, no card nesting).

### Alert styling
- Never hardcode alert text colors (`#721c24`, `#155724`). Use `color: var(--text-color)` with a `border-left` accent instead.
- This keeps alerts compatible with the dark theme.

### Dashboard card colors
- Only use CSS variables from `styles.css` for dashboard card background colors:
  - `var(--btn-bg-color)` — role-based primary color (gold/teal/coral)
  - `var(--btn-pill-color)` — utility/admin blue (#1083A5)
  - `var(--btn-red-color)` — destructive red
  - `var(--btn-green-color)` — success green
- Never hardcode hex values like `#6f42c1` or raw rgba on dashboard cards.

### Component CSS rules
- Do not add `.btn-primary`, `.btn-primary:hover`, `.btn-outline-primary`, or `.btn-outline-primary:hover` overrides in component CSS.
- Do not reference `--btn-bg-hover-color` — this token does not exist in `styles.css`. Use `filter: brightness(0.9)` or `opacity` for hover effects if needed.
- Keep component CSS minimal. Most styling should come from global Bootstrap classes and `styles.css` tokens.

## UserConfig Management

Admin route: `/[role]/user-config-management`
- Component: `UserConfigManagementComponent`
- Gated by: `isAdmin` check in `DashboardComponent`
- Purpose: CRUD for `UserConfig` service type definitions (mandatory/optional onboarding fields)
- Service methods: `getUserConfig()`, `createUserConfig()`, `updateUserConfig()`, `deleteUserConfig()` in `IzingaOrderManagementService`
- Key models: `UserConfig`, `FieldDefinition`, `DataType` (from `src/app/model/`)
- Field arrays (`mandatoryFields`, `optionalFields`) are inline-editable using `ngFor` with `[(ngModel)]` bound directly to each field object.
- This page is the canonical reference implementation for the form conventions listed above.
- If a page depends on location, keep Google Places and South African restrictions intact.

## Completion Checks

- The route, component, and service layer all agree with each other.
- The data shape still matches the current iZinga backend contract.
- The UI matches the existing app branding and dark theme behavior.
- The user can continue the flow without breaking stored state or navigation.
- The change is small, focused, and consistent with the rest of the app.

## Working Mental Model

Think of this app as a connected system made of:

- onboarding and verification
- profile and document capture
- business and store management
- messenger and delivery order flows
- payout and reconciliation flows
- admin and compliance tools
- Firebase and realtime communication

When in doubt, trace from the user-facing page back to the service and then forward to the next screen in the flow.
