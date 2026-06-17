# iZinga Persona Operations Guide

## Purpose

This document explains how iZinga works for each core persona across:

- registration and onboarding
- customer service and support handling
- communication channels
- orders and deliveries
- payouts and follow-up actions

It is intended as an internal operating guide for product, support, and onboarding teams.

## Platform Overview

iZinga supports multiple role-based journeys in one ecosystem:

- customers who place delivery orders
- drivers (messengers) who fulfill deliveries
- driver managers (messenger admins) who manage driver teams
- businesses/store owners who manage stores and store orders
- admins who approve profiles and run platform operations
- customer service agents who support users across these journeys

## Communication Channels

Primary channels used across personas:

- Driver portal: https://driver.izinga.co.za
- Customer booking portal: https://delivery.izinga.co.za
- WhatsApp notifications: assignment and delivery updates
- In-app dashboard pages: profile, orders, payouts, approvals
- Chat sessions (admin/store to applicant/customer where enabled)
- Escalation contacts:
  - WhatsApp: +27812815707
  - Email: hello@curiousoft.dev

## Shared Journey Stages

Most personas move through this pattern:

1. Account creation and OTP verification
2. Profile completion (role-specific requirements)
3. Document and field checks
4. Approval (where required)
5. Active operations (orders/deliveries/payouts)
6. Support and escalations when needed

---

## Persona 1: Customer (Delivery Buyer)

### Registration and Access

- Customer places orders through https://delivery.izinga.co.za.
- Quote is generated in-app from booking details (distance, load/item size, selected options).
- Date/time changes alone do not guarantee a quote change.

### Orders and Deliveries

- Customer submits order and completes payment flow.
- Order progresses through delivery stages until complete/cancelled.
- Customer receives status updates and can contact support for delays.

### Customer Service Scope

- Order tracking and status explanation
- Payment and refund guidance
- Complaint intake and escalation

### Communication

- Booking portal for order creation
- WhatsApp/support contact for escalations

---

## Persona 2: Driver / Messenger

### Registration

1. Sign up with mobile number at https://driver.izinga.co.za.
2. Verify OTP.
3. Complete profile details and service type.
4. Upload required documents.
5. Add payout details (bank/cellphone payout option).
6. Submit for review.

### Approval and Readiness

- Driver profile must pass required checks before full operation.
- Missing fields/documents delay approval.
- Driver should set availability to Online to receive assignments.

### Orders and Deliveries

- Driver receives assignment notifications via WhatsApp (and app flow where enabled).
- Driver reviews quote/order details and accepts when ready.
- Driver executes pickup and drop-off flow and progresses delivery stage.

### Payouts

- Daily payout model is supported.
- Cellphone payout has a daily cap of R3000; excess rolls to the next payout cycle.
- Driver tracks payout history/status in the driver portal.

### Customer Service Scope

- Registration and profile completion help
- Approval checks and missing document guidance
- Quote acceptance help
- Payout support
- Work area/address updates

### Communication

- Driver portal for self-service
- WhatsApp for assignment notifications
- Support channels for unresolved issues

---

## Persona 3: Driver Manager (Messenger Admin)

### Registration

1. Register and verify via OTP at https://driver.izinga.co.za.
2. Select Driver Manager / Messenger Admin role.
3. Complete required profile and document submission.
4. Submit for approval.

### Team Management

- Add drivers via My Drivers.
- Remove/unlink drivers from team without deleting their accounts.
- Track team-level operations in Team Deliveries and Team Payouts.

### Deliveries and Orders

- Manages teams rather than only individual jobs.
- Monitors assignment and completion visibility across linked drivers.

### Customer Service Scope

- Role setup and approval support
- Team add/remove guidance
- Team payout and team delivery questions

### Communication

- Driver portal (manager views)
- Support channels for escalation

---

## Persona 4: Business / Store Owner (Store Admin)

### Registration

1. Register and verify mobile number.
2. Complete owner profile.
3. Create business/store profile.
4. Configure store details and operations.

### Store Operations

- Manage one or multiple stores.
- Maintain stock/items.
- Track store-specific orders.
- View order history and item details.

### Orders and Deliveries

- Store receives customer orders.
- Store processes and fulfills preparation stages.
- Driver handoff and delivery continuation happen through platform stages.

### Payouts

- Store-level payout summaries and detail tracking are available.

### Customer Service Scope

- Store setup and profile updates
- Order list/detail queries
- Payout visibility issues

### Communication

- Business dashboard and store management pages
- Chat/escalation channels where enabled

---

## Persona 5: Platform Admin

### Responsibilities

- Review pending approvals
- Validate required profile fields/documents
- Approve user/store records when compliant
- Manage restricted regions
- Monitor operational and support flows

### Admin Operations

- Filter and inspect pending users
- Review criminal check flags where applicable
- Open support chat sessions with applicants/users
- Manage policy-linked platform controls

### Communication

- Admin dashboard modules
- Direct support channels for complex escalations

---

## Persona 6: Customer Service Agent

### Primary Function

Provide clear, role-specific support in short, practical responses without exposing internal technical implementation.

### Standard Support Coverage

- Driver: registration, approval, missing documents, payouts, quote help
- Customer: order status, payment guidance, refund/complaint routing
- Manager: team operations and payouts

### Operating Rules

- Confirm profile existence before saying profile is missing
- Verify missing fields before claiming documents are complete
- Keep continuity within a live conversation (do not restart menus mid-thread)
- Avoid repeating the same response without adding a new action or fact
- Use escalation channels for out-of-scope or manual-review cases

---

## Order Lifecycle (Customer-Friendly)

Order states can be communicated in plain language as:

1. Payment pending
2. Waiting for confirmation
3. Processing/preparing
4. Ready for pickup
5. Out for delivery
6. Arrived
7. Delivered/complete
8. Cancelled

Support should always explain what happens next, not only current status.

---

## Common Cross-Persona Scenarios

### Scenario A: Driver says "I am not receiving jobs"

1. Verify profile exists and approval state.
2. Check missing fields/documents.
3. Confirm Online availability and notifications.
4. Provide one clear next action and optional recheck window.
5. Explain that some areas may be quiet at certain times and assignments are sent automatically when available.

### Scenario B: User cannot reach escalation contact

1. Acknowledge frustration.
2. Continue with direct profile-level checks that support can perform.
3. Give specific findings and next required user action.

### Scenario C: Profile/document confusion

1. Confirm current missing list.
2. Request one missing item at a time where fallback submission is supported.
3. Re-check after each submission.

---

## Minimum Data and Compliance Expectations

- Correct mobile number and OTP verification
- Complete mandatory role fields
- Required documents uploaded and readable
- Accurate payout details
- Terms acceptance and role-appropriate compliance checks

Incomplete data is the main cause of onboarding or approval delays.

---

## Quick Reference by Persona

| Persona | Register | Operate From | Key Work | Main Support Need |
|---|---|---|---|---|
| Customer | Booking flow | https://delivery.izinga.co.za | Place and track orders | Order/payment/refund help |
| Driver | OTP + profile + docs | https://driver.izinga.co.za | Accept/complete deliveries | Approval, jobs, payouts |
| Driver Manager | OTP + manager role | https://driver.izinga.co.za | Manage team drivers | Team ops and payouts |
| Store Owner | OTP + store setup | Business dashboard | Manage stock/orders | Store ops and payouts |
| Admin | Internal role setup | Admin dashboard | Approvals and controls | Compliance and escalations |
| Support Agent | Internal onboarding | Support workflows | Resolve queries fast | Correct triage and escalation |

---

## Recommended Maintenance

Review and update this guide when:

- onboarding requirements change
- new support policies are introduced
- payout or communication flows change
- new personas or service types are launched
