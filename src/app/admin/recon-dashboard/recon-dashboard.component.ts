/**
 * ReconDashboardComponent — #64.
 *
 * Route: /admin/recon (the main recon entry point).
 *
 * Displays historical shop and messenger payouts grouped by stage for a
 * configurable look-back period. Provides CSV download (DESTRUCTIVE — advances
 * current bundle to PROCESSING) and mark-all-paid / submit results actions.
 *
 * Ported from web-ui src/app/recon-dashboard/recon-dashboard.component.ts.
 * Adapted to use ReconPayoutService and the corrected recon models.
 */

import { Component, OnInit } from '@angular/core';
import { ReconPayoutService } from '../../service/recon-payout.service';
import { ReconPayout, PayoutType } from '../../model/recon/payout';
import { PayoutBundle } from '../../model/recon/payout-bundle';

@Component({
  selector: 'app-recon-dashboard',
  templateUrl: './recon-dashboard.component.html',
  styleUrls: ['./recon-dashboard.component.css']
})
export class ReconDashboardComponent implements OnInit {

  days = 31;
  shopGroupedPayouts: { [stage: string]: ReconPayout[] } = {};
  userGroupedPayouts: { [stage: string]: ReconPayout[] } = {};
  ambassadorGroupedPayouts: { [stage: string]: ReconPayout[] } = {};
  referralGroupedPayouts: { [stage: string]: ReconPayout[] } = {};

  shopSectionCollapsed = false;
  userSectionCollapsed = false;
  ambassadorSectionCollapsed = false;
  referralSectionCollapsed = false;

  /** Held so the messenger CSV filename can include bundle.date. */
  messengerBundleDate?: Date;

  isLoadingShop = false;
  isLoadingUser = false;
  isLoadingAmbassador = false;
  isLoadingReferral = false;
  shopError = '';
  userError = '';
  ambassadorError = '';
  referralError = '';

  /** Tracks whether a CSV download/PATCH is in progress to prevent double-clicks. */
  shopCsvInProgress = false;
  messengerCsvInProgress = false;
  ambassadorCsvInProgress = false;
  referralCsvInProgress = false;
  shopSubmitInProgress = false;
  messengerSubmitInProgress = false;
  ambassadorSubmitInProgress = false;
  referralSubmitInProgress = false;

  /** Pending CSV confirmation dialog state. */
  pendingCsvType: 'shop' | 'messenger' | 'ambassador' | 'referral' | null = null;

  constructor(private reconService: ReconPayoutService) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loadShopPayouts();
    this.loadMessengerPayouts();
    this.loadAmbassadorPayouts();
    this.loadReferralPayouts();
  }

  loadShopPayouts(): void {
    this.isLoadingShop = true;
    this.shopError = '';
    const { fromDate, toDate } = this.dateRange();
    this.reconService.getPayoutBundles('SHOP', fromDate, toDate).subscribe({
      next: payouts => {
        this.shopGroupedPayouts = this.groupByStage(payouts);
        this.isLoadingShop = false;
      },
      error: err => {
        this.shopError = 'Failed to load shop payouts. Please try again.';
        this.isLoadingShop = false;
        console.error('Shop payout load error:', err);
      }
    });
  }

  loadMessengerPayouts(): void {
    this.isLoadingUser = true;
    this.userError = '';
    const { fromDate, toDate } = this.dateRange();
    this.reconService.getPayoutBundles('MESSENGER', fromDate, toDate).subscribe({
      next: payouts => {
        this.userGroupedPayouts = this.groupByStage(payouts);
        this.isLoadingUser = false;
        if (payouts.length > 0 && payouts[0].date) {
          this.messengerBundleDate = new Date(payouts[0].date);
        }
      },
      error: err => {
        this.userError = 'Failed to load messenger payouts. Please try again.';
        this.isLoadingUser = false;
        console.error('Messenger payout load error:', err);
      }
    });
  }

  loadAmbassadorPayouts(): void {
    this.isLoadingAmbassador = true;
    this.ambassadorError = '';
    this.reconService.getAmbassadorPayoutBundle().subscribe({
      next: bundle => {
        this.ambassadorGroupedPayouts = this.groupByStage(bundle.payouts ?? []);
        this.isLoadingAmbassador = false;
      },
      error: err => {
        this.ambassadorError = 'Failed to load ambassador payouts. Please try again.';
        this.isLoadingAmbassador = false;
        console.error('Ambassador payout load error:', err);
      }
    });
  }

  loadReferralPayouts(): void {
    this.isLoadingReferral = true;
    this.referralError = '';
    this.reconService.getReferralPartnerPayoutBundle().subscribe({
      next: bundle => {
        this.referralGroupedPayouts = this.groupByStage(bundle.payouts ?? []);
        this.isLoadingReferral = false;
      },
      error: err => {
        this.referralError = 'Failed to load referral partner payouts. Please try again.';
        this.isLoadingReferral = false;
        console.error('Referral Partner payout load error:', err);
      }
    });
  }

  onDayChange(): void {
    this.loadData();
  }

  toggleShopSection(): void {
    this.shopSectionCollapsed = !this.shopSectionCollapsed;
  }

  toggleUserSection(): void {
    this.userSectionCollapsed = !this.userSectionCollapsed;
  }

  toggleAmbassadorSection(): void {
    this.ambassadorSectionCollapsed = !this.ambassadorSectionCollapsed;
  }

  toggleReferralSection(): void {
    this.referralSectionCollapsed = !this.referralSectionCollapsed;
  }

  markAllPayments(payouts: ReconPayout[]): void {
    payouts.forEach(p => p.paid = !p.paid);
  }

  // ---------------------------------------------------------------------------
  // CSV download — DESTRUCTIVE: confirm before calling
  // ---------------------------------------------------------------------------

  requestCsvDownload(type: 'shop' | 'messenger' | 'ambassador' | 'referral'): void {
    this.pendingCsvType = type;
  }

  cancelCsvDownload(): void {
    this.pendingCsvType = null;
  }

  confirmCsvDownload(): void {
    if (this.pendingCsvType === 'shop') {
      this.downloadShopCsv();
    } else if (this.pendingCsvType === 'messenger') {
      this.downloadMessengerCsv();
    } else if (this.pendingCsvType === 'ambassador') {
      this.downloadAmbassadorCsv();
    } else if (this.pendingCsvType === 'referral') {
      this.downloadReferralCsv();
    }
    this.pendingCsvType = null;
  }

  private downloadShopCsv(): void {
    if (this.shopCsvInProgress) { return; }
    this.shopCsvInProgress = true;
    this.reconService.triggerShopCsvDownload().subscribe({
      next: () => {
        this.shopCsvInProgress = false;
        // Reload to reflect PROCESSING stage advancement
        this.loadShopPayouts();
      },
      error: err => {
        this.shopCsvInProgress = false;
        alert('CSV download failed. Please try again.');
        console.error('Shop CSV error:', err);
      }
    });
  }

  private downloadMessengerCsv(): void {
    if (this.messengerCsvInProgress) { return; }
    this.messengerCsvInProgress = true;
    const bundleDate = this.messengerBundleDate ?? new Date();
    this.reconService.triggerMessengerCsvDownload(bundleDate).subscribe({
      next: () => {
        this.messengerCsvInProgress = false;
        this.loadMessengerPayouts();
      },
      error: err => {
        this.messengerCsvInProgress = false;
        alert('CSV download failed. Please try again.');
        console.error('Messenger CSV error:', err);
      }
    });
  }

  private downloadAmbassadorCsv(): void {
    if (this.ambassadorCsvInProgress) { return; }
    this.ambassadorCsvInProgress = true;
    this.reconService.triggerAmbassadorCsvDownload().subscribe({
      next: () => {
        this.ambassadorCsvInProgress = false;
        this.loadAmbassadorPayouts();
      },
      error: err => {
        this.ambassadorCsvInProgress = false;
        alert('CSV download failed. Please try again.');
        console.error('Ambassador CSV error:', err);
      }
    });
  }

  private downloadReferralCsv(): void {
    if (this.referralCsvInProgress) { return; }
    this.referralCsvInProgress = true;
    this.reconService.triggerReferralPartnerCsvDownload().subscribe({
      next: () => {
        this.referralCsvInProgress = false;
        this.loadReferralPayouts();
      },
      error: err => {
        this.referralCsvInProgress = false;
        alert('CSV download failed. Please try again.');
        console.error('Referral CSV error:', err);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // PATCH submit results
  // ---------------------------------------------------------------------------

  updateShopPayouts(payouts: ReconPayout[]): void {
    if (this.shopSubmitInProgress) { return; }
    this.shopSubmitInProgress = true;

    // bundleId: use the first payout's bundleId — all payouts in a group share one bundle
    const bundleId = payouts[0]?.bundleId ?? '';
    const results = {
      bundleId,
      payoutItemResults: payouts.map(p => ({
        toId: p.toId,
        paid: p.paid,
        type: 'SHOP' as PayoutType
      }))
    };
    this.reconService.patchShopPayoutBundle(results).subscribe({
      next: () => {
        this.shopSubmitInProgress = false;
        this.loadShopPayouts();
      },
      error: err => {
        this.shopSubmitInProgress = false;
        alert('Failed to submit shop payout results. Please try again.');
        console.error('Shop payout PATCH error:', err);
      }
    });
  }

  updateMessengerPayouts(payouts: ReconPayout[]): void {
    if (this.messengerSubmitInProgress) { return; }
    this.messengerSubmitInProgress = true;

    const bundleId = payouts[0]?.bundleId ?? '';
    const results = {
      bundleId,
      payoutItemResults: payouts.map(p => ({
        toId: p.toId,
        paid: p.paid,
        type: 'MESSENGER' as PayoutType
      }))
    };
    this.reconService.patchMessengerPayoutBundle(results).subscribe({
      next: () => {
        this.messengerSubmitInProgress = false;
        this.loadMessengerPayouts();
      },
      error: err => {
        this.messengerSubmitInProgress = false;
        alert('Failed to submit messenger payout results. Please try again.');
        console.error('Messenger payout PATCH error:', err);
      }
    });
  }

  updateAmbassadorPayouts(payouts: ReconPayout[]): void {
    if (this.ambassadorSubmitInProgress) { return; }
    this.ambassadorSubmitInProgress = true;

    const bundleId = payouts[0]?.bundleId ?? '';
    const results = {
      bundleId,
      payoutItemResults: payouts.map(p => ({
        toId: p.toId,
        paid: p.paid,
        type: 'AMBASSADOR' as PayoutType
      }))
    };
    this.reconService.patchAmbassadorPayoutBundle(results).subscribe({
      next: () => {
        this.ambassadorSubmitInProgress = false;
        this.loadAmbassadorPayouts();
      },
      error: err => {
        this.ambassadorSubmitInProgress = false;
        alert('Failed to submit ambassador payout results. Please try again.');
        console.error('Ambassador payout PATCH error:', err);
      }
    });
  }

  updateReferralPayouts(payouts: ReconPayout[]): void {
    if (this.referralSubmitInProgress) { return; }
    this.referralSubmitInProgress = true;

    const bundleId = payouts[0]?.bundleId ?? '';
    const results = {
      bundleId,
      payoutItemResults: payouts.map(p => ({
        toId: p.toId,
        paid: p.paid,
        type: 'REFERRAL_PARTNER' as PayoutType
      }))
    };
    this.reconService.patchReferralPartnerPayoutBundle(results).subscribe({
      next: () => {
        this.referralSubmitInProgress = false;
        this.loadReferralPayouts();
      },
      error: err => {
        this.referralSubmitInProgress = false;
        alert('Failed to submit referral partner payout results. Please try again.');
        console.error('Referral Partner payout PATCH error:', err);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private groupByStage(payouts: ReconPayout[]): { [stage: string]: ReconPayout[] } {
    return payouts.reduce((acc, payout) => {
      const stage = payout.payoutStage ?? 'UNKNOWN';
      if (!acc[stage]) { acc[stage] = []; }
      acc[stage].push(payout);
      return acc;
    }, {} as { [stage: string]: ReconPayout[] });
  }

  private dateRange(): { fromDate: Date; toDate: Date } {
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setHours(fromDate.getHours() - this.days * 24);
    return { fromDate, toDate };
  }

  payoutTotal(payouts: ReconPayout[]): number {
    return payouts.reduce((sum, p) => sum + (p.total ?? 0), 0);
  }

  /** For Ambassador / Referral Partner sections — sum commissionAmount. */
  commissionTotal(payouts: ReconPayout[]): number {
    return payouts.reduce((sum, p) => sum + (p.commissionAmount ?? 0), 0);
  }

  getTotalCommission(grouped: { [stage: string]: ReconPayout[] }): number {
    return Object.values(grouped).flat().reduce((sum, p) => sum + (p.commissionAmount ?? 0), 0);
  }

  getTotalAmount(grouped: { [stage: string]: ReconPayout[] }): number {
    return Object.values(grouped).flat().reduce((sum, p) => sum + (p.total ?? 0), 0);
  }

  getTotalPayouts(grouped: { [stage: string]: ReconPayout[] }): number {
    return Object.values(grouped).flat().length;
  }

  getPendingAmount(grouped: { [stage: string]: ReconPayout[] }): number {
    return (grouped['PENDING'] ?? []).reduce((sum, p) => sum + (p.total ?? 0), 0);
  }

  getStatusBadgeClass(stage: string): string {
    const map: Record<string, string> = {
      PENDING: 'badge badge-status-pending',
      PROCESSING: 'badge badge-status-processing',
      COMPLETED: 'badge badge-status-completed',
      VOIDED: 'badge badge-status-voided'
    };
    return map[stage] ?? 'badge badge-status-default';
  }
}
