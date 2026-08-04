/**
 * Recon-scoped Payout models — #61.
 *
 * These types are intentionally isolated from the self-service Payout interface
 * used elsewhere in the app (src/app/payout/payout.component.ts). Do NOT
 * merge or rename those types — they serve different API contracts.
 *
 * Source of truth: ADR-018 / confirmed API contract (ijudi-api).
 */

import { Order } from '../order';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type PayoutType = 'SHOP' | 'MESSENGER' | 'AMBASSADOR' | 'REFERRAL_PARTNER';

export type PayoutStage = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'VOIDED';

/**
 * BankAccType — matches the backend's polymorphic enum/string.
 * The backend may send any of the named values OR an arbitrary string
 * (e.g. for newer account types), so we use a union with `string`.
 */
export type BankAccType = 'CHEQUE' | 'EWALLET' | 'SAVINGS' | 'TRANSMISSION' | 'wallet' | string;

// ---------------------------------------------------------------------------
// Tip
// ---------------------------------------------------------------------------

export interface Tip {
  date: Date;
  receiptId: string;
  amount: number;
  emailAddress: string;
}

// ---------------------------------------------------------------------------
// Payout (recon)
//
// NOTE: There is NO "type" field on a Payout. web-ui had this but it was
// wrong — Jackson polymorphic serialisation does not emit "type" on the
// Payout payload. Omit it here.
//
// "total" is computed server-side and read-only; never send it back.
// ---------------------------------------------------------------------------

export interface ReconPayout {
  id?: string;
  date?: Date;
  modifiedDate?: Date;
  tag: Record<string, string>;
  toId: string;
  bundleId?: string;
  toName: string;
  toType: BankAccType;
  toBankName: string;
  toAccountNumber: string;
  toBranchCode: string;
  fromReference: string;
  toReference: string;
  emailNotify?: string;
  emailAddress?: string;
  emailSubject?: string;
  orders: Order[];
  tips?: Tip[];
  payoutStage: PayoutStage;
  paid: boolean;
  /** Computed server-side; read-only. Never include in PATCH bodies. */
  total: number;
  emailSent: boolean;
  // Messenger-only
  isPermEmployed?: boolean;
  // Ambassador / Referral Partner
  commissionAmount?: number;
  // Ambassador-only
  triggerDriverId?: string;
  // Referral Partner-only
  commissionType?: string;
  triggerReferenceId?: string;
}

// ---------------------------------------------------------------------------
// PATCH request body types
// ---------------------------------------------------------------------------

export interface PayoutItemResults {
  toId: string;
  paid: boolean;
  message?: string;
  type: PayoutType;
}

export interface PayoutBundleResults {
  bundleId: string;
  payoutItemResults: PayoutItemResults[];
}
