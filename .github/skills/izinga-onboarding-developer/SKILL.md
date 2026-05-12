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
