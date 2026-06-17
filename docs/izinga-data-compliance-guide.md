# iZinga Data and Compliance Guide

## Purpose

This document defines, at an operational level:

- what data iZinga collects
- how data is collected
- where data is stored
- who can access data
- key compliance controls and responsibilities

This guide is based on current platform behavior reflected in the onboarding/dashboard codebase and in-app privacy policy.

## Scope

Systems covered in this guide:

- iZinga onboarding and operations dashboard
- iZinga API integrations used by the dashboard
- Firebase services used by the dashboard (Auth, Firestore chat, Messaging)
- browser local storage used by the web app

Personas covered:

- customer
- driver (messenger)
- driver manager (messenger admin)
- business/store owner
- admin
- customer service/support

---

## 1. Data Categories Collected

## 1.1 Identity and Contact Data

- full name and surname
- mobile number
- email address
- ID/passport number (where required)
- date of birth
- profile image/selfie image

Primary use:

- user account creation and identity verification
- onboarding and approval checks
- account support and communication

## 1.2 Account and Role Data

- role (customer, messenger, messenger admin, store admin, admin)
- service type/description
- profile approval status and dates
- terms acceptance status and date
- availability status (Online/Away/Offline)
- onboarding dynamic fields in profile tags

Primary use:

- role-based access and workflow routing
- approval/compliance review
- matching operations and service behavior

## 1.3 Financial and Payout Data

- bank details and payout method details
- payout records and status
- linked card/link-code metadata (where applicable)

Primary use:

- earnings payout processing
- reconciliation and payout reporting

## 1.4 Delivery, Location, and Order Data

- pickup/drop-off addresses
- latitude/longitude data
- order details, basket/items, stage, fees, totals
- assigned customer/store/messenger IDs

Primary use:

- delivery execution
- order lifecycle management
- map and routing context

## 1.5 Device and Notification Data

- push notification token (FCM token)
- associated user ID and device record metadata

Primary use:

- delivery/account notification delivery
- device-to-user registration for messaging

## 1.6 Chat and Support Data

- chat session metadata (customer/store IDs, names, status)
- message content and timestamps
- message attachments metadata (image/document/audio URLs when used)

Primary use:

- support interactions
- admin/store-to-user communication history

## 1.7 Compliance and Verification Data

- document uploads and document URLs
- criminal check status metadata (where applicable)
- missing field/document indicators

Primary use:

- onboarding compliance and approval decisions
- policy/legal readiness checks

---

## 2. How Data Is Collected

## 2.1 Direct User Input

Collected through web forms during onboarding and profile updates:

- phone verification and OTP flow
- profile forms (personal, role, service-specific)
- business/store forms
- payout details forms
- order and quote interaction forms

## 2.2 File and Document Upload

- users upload profile and compliance documents through platform upload endpoints
- files are submitted as multipart form data with document metadata

## 2.3 Automated Collection During App Use

- push token retrieval through Firebase Messaging
- session and state caching in browser local storage
- location coordinates captured from map/address interactions
- chat messages and session metadata via Firestore

## 2.4 Support-Assisted Collection

- support/admin may collect or verify missing details during support conversations
- support checks profile and compliance completeness before providing status outcomes

---

## 3. Where Data Is Stored

## 3.1 Browser Local Storage (Client Side)

The web app stores selected session data in browser local storage, including:

- cached user profile
- phone number
- device object
- payout snapshots
- selected payout context (shop to payout)
- user type
- FCM token

Notes:

- this storage is user-device specific
- logout clears local cache
- local storage should be treated as sensitive and non-authoritative

## 3.2 iZinga Backend/API Storage (Server Side)

Core persistent operational data is sent to iZinga API endpoints, including:

- user profiles
- store profiles
- orders and stages
- payout and reconciliation data
- device registrations
- user config and approval data
- uploaded document references

## 3.3 Firebase Services

- Firebase Auth: OTP authentication and phone verification flow
- Firestore (izinga DB): chat sessions and messages
- Firebase Messaging: notification token and foreground message handling

## 3.4 Third-Party Processing Context

Within this app architecture, external platform services (for example Firebase services) process specific operational data required for authentication, messaging, and chat.

## 3.5 AI-Assisted Support Processing (WhatsApp, OpenAI, AWS)

For customer and driver support conversations that use AI assistance:

- user messages may pass through WhatsApp infrastructure when support is conducted on WhatsApp
- support message content may be processed by OpenAI to generate assistance responses
- support workloads, integrations, and related processing/storage layers may run on AWS

Operational note:

- users may share personal data in support messages; this data should be treated as personal information and governed by POPIA controls
- privacy notice language should explicitly disclose this support-processing path

---

## 4. Who Has Access to Data

## 4.1 End-User Visibility Rules (Business Access)

- Customers: their own account/order information and relevant delivery status
- Drivers: their own profile, assignments, and payout data
- Driver Managers: team-linked operational views (team deliveries/payout summaries)
- Store Owners/Admins: store-linked profiles, stock, orders, and payouts
- Platform Admins: approval/compliance and operations management views

## 4.2 Operational Access (Internal)

- Customer support and admin roles can access account and compliance details needed to resolve support, approval, and operational issues.
- Access should follow least-privilege principles and role-based permissions.

## 4.3 System/Service Access

- iZinga backend services process stored operational data.
- Firebase services process the subset of data required for auth, chat, and messaging.

## 4.4 Minimum-Information Principle in Delivery

For delivery completion, only the minimum required data should be available to the assigned delivery flow (for example: destination and contact context needed to fulfill the job).

---

## 5. Compliance Position and Principles

The in-app policy references POPIA compliance and user consent. Operationally, the platform should maintain:

- lawfulness and transparency of data processing
- purpose limitation (collect for specific platform operations)
- data minimization (only required data fields)
- access limitation by role
- secure storage and transmission controls
- user rights handling (access, correction, deletion requests subject to legal retention)

AI-assisted support governance expectations:

- transparency: clearly inform users that support chats may be AI-assisted
- processor disclosure: identify relevant service providers/channels (including WhatsApp, OpenAI, AWS)
- minimization: avoid requesting unnecessary sensitive data in chat
- safeguards: restrict who can view/export support transcripts and related data

---

## 6. Data Lifecycle

1. Collection during signup/profile/order/support interactions
2. Validation and approval/compliance checks
3. Active use for operations (orders, deliveries, payouts, support)
4. Retention according to business/legal requirements
5. Correction/deletion handling through support/legal processes

---

## 7. Security and Control Expectations

Minimum expected controls:

- encrypted transport (HTTPS) for API and platform calls
- authenticated access to role-specific dashboards
- controlled admin/support access
- secure handling of uploaded documents
- logging/traceability for sensitive admin actions
- periodic review of access permissions

AI/chat-specific controls:

- publish clear "do not share" guidance for high-risk secrets in chat (for example passwords, OTP codes, PINs, full card data)
- define retention and deletion rules for support transcripts across integrated providers
- maintain processor agreements and documented data-flow records for third-party AI/chat services

Client-side control reminders:

- avoid storing unnecessary sensitive data in local storage
- clear local cache on logout
- avoid exposing secrets in client configuration

---

## 8. Data Inventory Matrix

| Data Type | Collected Via | Stored In | Accessed By |
|---|---|---|---|
| Identity/contact | Onboarding/profile forms | iZinga backend, local cache | User, support/admin (role-based) |
| OTP auth data | Phone verification flow | Firebase Auth | Auth process, authorized app flows |
| Profile compliance docs | Upload endpoint | iZinga backend/doc storage refs | User, approvers/admin/support |
| Order/delivery data | Order creation and progression | iZinga backend | Customer, driver, store, admin (scoped) |
| Location/address | Address/map flows | iZinga backend, local session use | Assigned operations and admins (scoped) |
| Device token | Firebase messaging + device registration | local storage, iZinga device records, Firebase messaging context | Notification services, app operations |
| Chat sessions/messages | Chat UI and Firestore writes | Firebase Firestore | Participants, authorized support/admin/store views |
| AI-assisted support chat content | WhatsApp/support conversations with AI assistance | WhatsApp transport, OpenAI processing context, AWS-hosted integration layers (as applicable) | Authorized support operations and approved systems/services |
| Payout data | Payout/recon APIs | iZinga backend | Driver/store/admin/support (scoped) |

---

## 9. Open Compliance Decisions to Confirm

The following policy details should be explicitly documented by legal/compliance owners if not already covered in separate policy artifacts:

- definitive retention periods by data class
- formal deletion SLA and verification process
- cross-border data transfer position (if any)
- AI processor and sub-processor register (including WhatsApp, OpenAI, AWS service mapping)
- detailed access review cadence and audit controls
- incident/breach notification procedure and timelines

---

## 10. Operational Ownership (Recommended)

- Product/Operations: data-purpose ownership by feature
- Engineering: implementation of technical controls and access boundaries
- Support/Admin: approved-use handling for account and compliance workflows
- Legal/Compliance: POPIA governance, user rights, retention, and policy updates

---

## 11. Quick Summary

iZinga collects identity, role, compliance, delivery, payout, and support communication data to operate onboarding, deliveries, payouts, and support services. Data is collected from user input, uploads, OTP/auth flows, messaging, and operational events; stored across iZinga backend systems, Firebase services, and limited browser local cache; and accessed according to role and operational need.
