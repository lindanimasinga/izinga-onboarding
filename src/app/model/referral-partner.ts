/**
 * RP-010: Referral Partner API response models.
 * These are the exact shapes returned by ijudi-api PR #117.
 */

export interface ReferralCounts {
  foodCustomers: number;
  furnitureCustomers: number;
  storePartners: number;
}

export interface ConversionCounts {
  foodCustomers: number;
  furnitureCustomers: number;
  storePartnersStage1: number;
  storePartnersStage2: number;
}

export interface ReferralPartnerSummary {
  partnerId: string;
  referralCode: string;
  referralCounts: ReferralCounts;
  conversionCounts: ConversionCounts;
}

export interface ReferralItem {
  customerId: string;
  name: string;
  referredAt: string;
  type: 'FOOD_CUSTOMER' | 'STORE_PARTNER' | 'FURNITURE_CUSTOMER';
  converted: boolean;
}

export interface ReferralPage {
  content: ReferralItem[];
  totalElements: number;
  page: number;
  size: number;
}

export interface CommissionTotals {
  PENDING: number;
  PAID: number;
}

export interface CommissionLineItem {
  commissionType: string;
  amount: number;
  status: 'PENDING' | 'PAID';
  triggerReferenceId: string;
  createdAt: string;
}

export interface ReferralPartnerCommissions {
  totals: CommissionTotals;
  lineItems: CommissionLineItem[];
}

export interface PayoutItem {
  id: string;
  amount: number;
  commissionType: string;
  status: 'PENDING' | 'PAID';
  triggerReferenceId: string;
  createdAt: string;
}

export interface PayoutPage {
  content: PayoutItem[];
  totalElements: number;
}
