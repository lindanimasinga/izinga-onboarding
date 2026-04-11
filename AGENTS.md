# AGENTS.md — iZinga Onboarding Dashboard Developer Guide

## 1) Project purpose

This Angular application is the **iZinga onboarding and operations dashboard** for:

- **Individuals / drivers / messengers** via routes under `/indivisuals/*`
- **Businesses / store owners / admins** via routes under `/business/*`

It is a combined onboarding, profile management, payout, order, compliance, and admin-review app.

At runtime the app integrates with:

- **Izinga API** for user, store, order, payout, restricted-region, and user-config data
- **Firebase Auth** for OTP phone verification
- **Firebase Messaging** for push notifications
- **Firestore** for real-time chat sessions
- **Google Maps / Places** for address lookup, autocomplete, and map views

> Note: the route segment is intentionally spelled `indivisuals` in the codebase and routes.

---

## 2) High-level architecture

### Core app pattern

The app is a standard Angular SPA with:

- `FormsModule` for template-driven forms
- `HttpClientModule` for Izinga API integration
- `ServiceWorkerModule` for PWA support
- `angularx-qrcode` for card / wallet QR presentation

### Main role-based flows

#### A. Individual / driver flow
1. `/` → choose role
2. `/indivisuals/verify` → verify mobile number via OTP
3. `/indivisuals/user` → complete personal profile and dynamic service fields
4. `/indivisuals/signup-welcome/:id` → onboarding confirmation
5. `/indivisuals/terms/:id` → accept terms
6. `/indivisuals/dashboard` → access profile, payouts, orders, card, etc.

#### B. Business / store flow
1. `/` → choose business signup
2. `/business/verify` → verify mobile number
3. `/business/user` → complete owner profile
4. `/business/info` or `/business/info/:id` → create / update business details
5. `/business/list` → manage stores
6. `/business/dashboard` → access payouts, orders, store tools, chat, admin tools

---

## 3) Key services and backend integration

## `IzingaOrderManagementService`
File: `src/app/service/izinga-order-management.service.ts`

This is the main backend gateway. It uses `environment.izingaUrl` and sends the app version in headers.

### Main API groups

#### User APIs
- `registerCustomer(userProfile)` → `POST /user`
- `updateCustomer(userProfile)` → `PATCH /user/:id`
- `getCustomerByPhoneNumber(mobileNumber)` → `GET /user/:mobileNumber`
- `getCustomerById(customerId)` → `GET /user/:customerId`
- `getPendingApprovals()` → `GET /user/pending-approvals`
- `getUserConfig()` → `GET /user-config`

#### Store APIs
- `getAllStores(userId)` → `GET /store?ownerId=...`
- `getAllStoresSummary(userId)` → `GET /store/names?ownerId=...`
- `getStoreById(id)` → `GET /store/:id`
- `createStore(storeProfile)` → `POST /store`
- `updateStore(storeProfile)` → `PATCH /store/:id`

#### Order / quote APIs
- `getAllStoreOrders(storeId)` → `GET /order?storeId=...`
- `getAllMessengerOrders(messengerId)` → `GET /order?messengerId=...`
- `getOrderById(orderId)` → `GET /order/:id`
- `acceptQuote(orderId, quoteApproval)` → `PATCH /order/:id/quote`
- `updateStage(orderId)` → `GET /order/:id/nextstage`
- `cancelOrder(orderId)` → `DELETE /order/:id`

#### Payout APIs
- `getPayouts(userId, fromDate, toDate, payoutType)` → `GET /recon/payout?...`

#### Device / notification APIs
- `registerDeviceToUser(device)` → `POST /device`
- `updateDeviceToUser(device, id)` → `PATCH /device/:id`

#### Restricted region APIs
- `getRestrictedRegions()`
- `getRestrictedRegion(regionId)`
- `createRestrictedRegion(regionData)`
- `updateRestrictedRegion(regionId, regionData)`
- `updateRestrictedRegionStatus(regionId, isActive)`
- `deleteRestrictedRegion(regionId)`

#### File upload API
- `uploadFile(file, metadata, docType?, docMeta?)` → `POST /document?...`
- Used for profile image uploads and dynamic service-document uploads

---

## `StorageService`
File: `src/app/service/storage-service.service.ts`

Local state is kept in `localStorage` for:

- `userProfile`
- `phoneNumber`
- `device`
- `payouts`
- `shopToPayout`
- `userType`

This service is the app’s lightweight session cache. It is used throughout the dashboard to preserve onboarding state and navigation context.

---

## `FirebaseService`
File: `src/app/service/firebase.service.ts`

Handles:

- Firebase app initialization
- OTP verification via `signInWithPhoneNumber`
- Recaptcha setup via `createCapture()`
- push token capture with `getToken()`
- foreground message listening with `onMessage()`

This is the authentication entry point for the mobile-number onboarding flow.

---

## `ChatService`
File: `src/app/service/chat.service.ts`

Uses Firestore to manage:

- `chatSessions`
- session message subcollections
- real-time subscriptions for session lists and chat messages
- sending messages and updating last message metadata

It supports admin/store follow-up chats with applicants and customers.

---

## `AnalyticsService`
Used across major screens to log:

- screen views
- onboarding progress
- profile updates
- dashboard visits

---

## 4) Shared supporting components

These components are reused inside routed pages:

- `PlaceAutocompleteComponent` — Google Places address picker for service area and location capture
- `StoreCardComponent` — compact business/store summary card
- `StockItemComponent` — stock item display/edit helper
- `OrderCardComponent` — order summary card
- `PayoutCardComponent` — payout summary card

These are presentation helpers and typically render data fetched via `IzingaOrderManagementService`.

---

## 5) Route and page inventory

## Entry and onboarding pages

### `/`
**Component:** `WelcomeSelectionComponent`

**What it shows**
- The main landing page for the app
- role-specific marketing copy from `environment.userTypeConfig`
- signup choices for shop, individual, or driver

**Actions available**
- choose a signup path
- route to `./business` or `./indivisuals`
- auto-redirect already logged-in users to the appropriate dashboard based on role

---

### `/indivisuals`
**Component:** `WelcomeIndivisualsComponent`

**What it shows**
- the onboarding introduction for individual users and drivers
- explanation of the individual flow

**Actions available**
- continue to phone verification

---

### `/business`
**Component:** `WelcomeBusinessComponent`

**What it shows**
- the onboarding introduction for business/store signup
- business-oriented call to action

**Actions available**
- continue to phone verification

---

### `/[role]/verify`
**Component:** `PhoneVerificationComponent`

**What it shows**
- phone number input
- OTP/code verification UI
- recaptcha container for Firebase auth

**Actions available**
- request OTP via `FirebaseService.requestVerification()`
- confirm OTP via `FirebaseService.confirmCode()`
- store verified phone number in `StorageService`
- move into dashboard / profile registration flow

**Backend / platform integration**
- Firebase Auth handles the OTP flow
- the verified number becomes the lookup key for Izinga user retrieval

---

## Profile and identity pages

### `/[role]/user`
**Component:** `UserUpdateComponent`

**What it shows**
- profile picture upload / selfie capture
- first name, date of birth, email
- service type dropdown (`roleDescription`)
- dynamic fields based on `UserConfig`
- town / township / village address picker
- payout setup (eWallet or bank)
- optional iZinga Tip Card link section

**Actions available**
- upload profile photo
- capture a selfie using device camera
- choose a service type
- fill dynamic fields loaded from `getUserConfig()`
- upload supporting documents via `uploadFile()`
- register as a new user with `registerCustomer()`
- update an existing user with `updateCustomer()`
- link a tip card code via `linkCard()`
- logout

**Key implementation detail**
- `user.description` stores the selected service label
- `user.tag` stores dynamic field values and uploaded document URLs
- mandatory and optional service fields come from `UserConfig`

---

### `/[role]/card` and `/indivisuals/info`
**Component:** `UserInfoComponent`

**What it shows**
- the user’s iZinga card / payment identity view
- QR code and profile/card information

**Actions available**
- view or share card details
- generate / display a scannable identity/payment reference
- navigate back into the dashboard flow

---

### `/[role]/signup-welcome/:id`
**Component:** `SignupWelcomeComponent`

**What it shows**
- a successful registration confirmation page
- personalized greeting and next-step message

**Actions available**
- continue to terms and conditions
- proceed deeper into the onboarding journey

---

### `/[role]/terms/:id`
**Component:** `TermsConditionsComponent`

**What it shows**
- terms and conditions, platform responsibilities, legal constraints, safety notes

**Actions available**
- accept terms
- submit consent which updates `user.termsAccepted`

**Behavior**
- `DashboardComponent` redirects users here if `termsAccepted` is false

---

### `/[role]/privacy-policy`
**Component:** `PrivacyPolicyComponent`

**What it shows**
- static privacy/POPIA content

**Actions available**
- informational only

---

### `/[role]/legal-info`
**Component:** `LegalInfoComponent`

**What it shows**
- legal and dispute-resolution content
- compliance and platform policy information

**Actions available**
- informational only

---

## Dashboard and account operations

### `/[role]/dashboard`
**Component:** `DashboardComponent`

**What it shows**
- a role-aware dashboard menu
- pending review warning if profile is not yet approved
- missing document warning for messenger users
- availability toggle for non-store-admin roles
- navigation cards to profile, payouts, orders, legal docs, admin tools, and more

**Actions available**
- switch availability status to `ONLINE`, `AWAY`, or `OFFLINE`
- navigate to profile, orders, payouts, chat, card, privacy, legal, etc.
- logout

**Role-based behavior**
- `ADMIN` users see:
  - Pending Approvals
  - Manage Users
  - Chat Sessions
  - Restricted Regions
- `STORE_ADMIN` users see shop-management tools
- `MESSENGER` / `CUSTOMER` users see order and payout paths

**Backend integration**
- loads current user with `getCustomerByPhoneNumber()`
- registers or updates device token with Izinga via device APIs
- checks mandatory documents using `getUserConfig()` + `user.tag`

---

## Business/store management pages

### `/business/list`
**Component:** `BusinessesComponent`

**What it shows**
- all stores owned by the logged-in business user
- summary cards for each business

**Actions available**
- view a store summary
- navigate into business detail / update page
- access stock or order pages for a store

**Backend integration**
- `getAllStoresSummary(userId)`
- `getAllStores(userId)` where fuller store context is needed

---

### `/business/info` and `/business/info/:id`
**Component:** `BusinessUpdateComponent`

**What it shows**
- business/store profile details
- availability / operating data
- contact information and service configuration
- business hours and operational metadata

**Actions available**
- create or update a store
- edit store profile fields
- manage store hours
- navigate to stock and order management

**Backend integration**
- `createStore()` for new businesses
- `getStoreById()` when editing an existing one
- `updateStore()` for saved changes

---

### `/business/info/:businessId/stock` and `/business/info/:businessId/stock/:stockId`
**Component:** `StockUpdateComponent`

**What it shows**
- stock/furniture item form for a business
- product image, price, quantity, descriptions, and logistics-related item data

**Actions available**
- create a new item
- edit an existing item
- upload item images/documents
- define price, weight, dimensions, quantity, and product details

**Backend integration**
- store loaded via `getStoreById()`
- updates generally saved through `updateStore()` after stock changes are applied to the store profile

---

### `/business/info/:businessId/order`
**Component:** `OrdersComponent`

**What it shows**
- store-specific order list
- order history and current order state

**Actions available**
- inspect store orders
- navigate into a specific order detail view

**Backend integration**
- `getAllStoreOrders(storeId)`

---

### `/business/info/:businessId/order/:orderId`
**Component:** `OrderItemHistoryComponent`

**What it shows**
- detailed order information
- items, addresses, shipping fee context, total values, and current stage

**Actions available**
- review the lifecycle and detail of a single order

**Backend integration**
- `getOrderById(orderId)`

---

## Orders, quotes, and delivery pages

### `/[role]/orders`
**Component:** `MessangerOrdersComponent`

**What it shows**
- orders assigned to the logged-in messenger/driver
- loading, refresh, and error states
- status badges and order summaries

**Actions available**
- refresh the order list
- inspect a specific order
- route to quote approval / order detail flow

**Backend integration**
- `getAllMessengerOrders(messengerId)`
- periodic refresh keeps the delivery inbox current

---

### `/[role]/quote-approval/:orderId`
**Component:** `MessangerOrderComponent` (`quote-approval.component`)

**What it shows**
- quote details for an assigned order
- pickup and drop-off context
- pricing / delivery summary
- messenger approval decision screen

**Actions available**
- accept quote
- reject or leave the quote unaccepted
- review service fee / route / delivery details before acceptance

**Backend integration**
- `getOrderById(orderId)` to load the order
- `acceptQuote(orderId, quoteApproval)` to submit acceptance/rejection
- `updateStage(orderId)` when the order moves to the next phase

---

## Payout pages

### `/[role]/payout`
**Component:** `PayoutComponent`

**What it shows**
- payout summary cards
- pending vs completed payout grouping
- role-based payout context for either stores or messengers

**Actions available**
- switch payout context or stage view
- inspect a selected payout source/store
- open payout details

**Backend integration**
- `getPayouts()` with date range, user/store target, and `PayoutType`
- cached in `StorageService.payouts`

---

### `/[role]/payout-details`
**Component:** `PayoutDetailsComponent`

**What it shows**
- detailed payout entries for the selected shop or user context
- payout stage filters and totals

**Actions available**
- review payout details
- navigate into included orders

**Data source**
- uses `StorageService.shopToPayout` and `StorageService.payouts`

---

### `/[role]/payout-orders`
**Component:** `PayoutOdersComponent`

**What it shows**
- the orders associated with the selected payout record

**Actions available**
- review which deliveries/orders contributed to the payout value

---

## Admin and compliance pages

### `/[role]/pending-approvals`
**Component:** `PendingApprovalsComponent`

**What it shows**
- list of user profiles awaiting approval
- filter by service type (`UserConfig.label`)
- tabs for:
  - pending list
  - map view
  - pending criminal checks
- detailed profile review card for the selected applicant
- bank info, uploaded tag/document info, and missing required field summary

**Actions available**
- refresh pending approvals
- select a user for review
- approve a user profile
- open applicant chat session
- inspect service documents and profile details
- review missing required fields by comparing `user.description` to `UserConfig.mandatoryFields` and checking `user.tag`

**Backend integration**
- `getPendingApprovals()` for approval queue
- `getUserConfig()` for service config matching
- `updateCustomer()` to approve and persist data changes
- Firestore `ChatService` to start or resume chat
- Google Maps geocoding for map/coordinate resolution

---

### `/[role]/user-management`
**Component:** `UserManagementComponent`

**What it shows**
- admin-focused user search and control page

**Actions available**
- search for users
- review terms acceptance and account state
- perform admin-level user maintenance

**Backend integration**
- uses `IzingaOrderManagementService` user lookup/update operations

---

### `/[role]/restricted-regions`
**Component:** `RestrictedRegionsComponent`

**What it shows**
- delivery restriction zones / geofences
- enabled/disabled status and regional summaries

**Actions available**
- review all restricted regions
- enable or disable a region
- edit a region
- delete a region
- add a new region

**Backend integration**
- `getRestrictedRegions()`
- `updateRestrictedRegionStatus()`
- `deleteRestrictedRegion()`

---

### `/[role]/add-restricted-region` and `/[role]/add-restricted-region/:id`
**Component:** `AddRestrictedRegionComponent`

**What it shows**
- region form and map-based setup UI
- center point, radius, and status inputs

**Actions available**
- create a new restricted delivery region
- edit an existing restricted region
- save location and radius settings

**Backend integration**
- `createRestrictedRegion()`
- `getRestrictedRegion(regionId)`
- `updateRestrictedRegion(regionId, regionData)`

---

## Chat page

### `/[role]/chat-sessions`
**Component:** `ChatSessionsComponent`

**What it shows**
- chat session list
- message history for a selected session
- near-real-time updates from Firestore

**Actions available**
- open an active or recent conversation
- send a text message
- review unread conversations
- monitor customer/application chats from the dashboard

**Backend / platform integration**
- Firestore for live messages
- `ChatService` for subscriptions and sending
- optional backend notification trigger for new messages

---

## 6) Important data models and conventions

### `UserProfile`
Key fields used across the app:

- `id`, `mobileNumber`, `emailAddress`
- `name`, `surname`, `dateOfBirth`, `imageUrl`
- `description` → selected service type label
- `tag` → dynamic field payload for service-specific inputs/documents
- `termsAccepted`, `profileApproved`, `availabilityStatus`
- `bank` → payout details
- `crminalCheckData` → criminal-check review flags (note spelling in current model)

### `UserConfig`
Defines dynamic service onboarding requirements:

- `label` identifies the service type shown in the UI
- `mandatoryFields` drive required onboarding inputs
- `optionalFields` drive additional profile enrichment

This object is central to both:
- the user registration form
- admin completeness checks in dashboard / pending approvals

---

## 7) How pages connect to the Izinga API in practice

### Registration path
- `PhoneVerificationComponent` verifies identity with Firebase
- `UserUpdateComponent` sends the final user profile to Izinga via `registerCustomer()` or `updateCustomer()`
- `DashboardComponent` reloads the user from Izinga and enforces terms acceptance

### Business path
- owner profile comes from `registerCustomer()` / `updateCustomer()`
- business/store records are created and updated with store APIs
- inventory and orders are scoped to a business/store record

### Admin path
- pending users come from `GET /user/pending-approvals`
- approval actions persist through `PATCH /user/:id`
- user requirements are validated against `GET /user-config`

### Delivery path
- messenger order list comes from `GET /order?messengerId=...`
- quote acceptance is submitted to `PATCH /order/:id/quote`
- order progress changes use `/order/:id/nextstage`

### Payout path
- payout summaries are fetched from `/recon/payout`
- the UI groups them by stage and role (`SHOP` vs `MESSENGER`)

---

## 8) Developer notes and gotchas

- The app uses **template-driven forms**, not reactive forms.
- Dynamic onboarding fields are stored in `user.tag`, not as first-class top-level fields.
- Service-type behavior is driven by `UserConfig.label === user.description`.
- The route prefix is spelled **`indivisuals`** in the code; do not “fix” this casually without coordinated routing changes.
- `crminalCheckData` is also currently spelled without the second “i” in the model; keep that in mind when referencing criminal-check flags.
- Much of the business/admin UX depends on `StorageService` cache continuity between routes.
- Firebase/Firestore integrations assume browser support and may behave differently on Safari/iOS.

---

## 9) Verified local commands

From the current repository state:

```bash
npm run build
npm start
```

The project builds successfully with `npm run build`.

---

## 10) Best mental model for future maintainers or agents

If you are changing this app, think of it as **five apps in one**:

1. **OTP onboarding app**
2. **dynamic profile/document collection app**
3. **store admin dashboard**
4. **driver/messenger operations app**
5. **admin review and compliance console**

Most behavior is role-driven and depends on these three pieces of state:

- `StorageService.userProfile`
- `user.description` (service type)
- `user.tag` (dynamic answers and uploaded evidence)

When debugging, always confirm:

- the current route (`/business/*` vs `/indivisuals/*`)
- the loaded role (`ADMIN`, `STORE_ADMIN`, `MESSENGER`, `CUSTOMER`)
- whether the relevant data is coming from Izinga API, local storage, or Firestore
