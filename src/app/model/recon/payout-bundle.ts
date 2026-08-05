/**
 * Recon-scoped PayoutBundle model — #61.
 *
 * Isolated from any self-service payout types. See payout.ts for context.
 *
 * NOTE: There is NO "executed" field. web-ui had this but it was wrong.
 * Omit it here.
 */

import { ReconPayout, PayoutType } from './payout';

export interface PayoutBundle {
  id?: string;
  /** ISO-8601 string from JSON; deserialised to Date by Angular's HttpClient. */
  date: Date;
  modifiedDate?: Date;
  tag: Record<string, string>;
  type: PayoutType;
  payouts: ReconPayout[];
  createdBy: string;
  payoutTotalAmount: number;
  numberOfPayouts: number;
}
