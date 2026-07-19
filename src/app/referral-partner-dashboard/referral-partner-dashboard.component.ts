import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { StorageService } from '../service/storage-service.service';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { AnalyticsService } from '../service/analytics.service';
import { UserProfile } from '../model/userProfile';
import {
  ReferralPartnerSummary,
  ReferralItem,
  ReferralPartnerCommissions
} from '../model/referral-partner';

/**
 * RP-010: Referral Partner Dashboard (tabbed).
 *
 * Loaded at /indivisuals/rp-dashboard for users whose role is REFERRAL_PARTNER
 * and who have completed enrollment (icaAccepted === true).
 *
 * Query param `tab` drives the active tab: 'code' | 'referrals' | 'commissions'.
 * Defaults to 'code' when absent. Each tab lazy-loads only its own data, and
 * the component reacts to queryParam changes so browser back/forward and direct
 * URL changes all re-render correctly.
 */
@Component({
  selector: 'app-referral-partner-dashboard',
  templateUrl: './referral-partner-dashboard.component.html',
  styleUrls: ['./referral-partner-dashboard.component.css']
})
export class ReferralPartnerDashboardComponent implements OnInit, OnDestroy {

  user: UserProfile | undefined;

  activeTab: 'code' | 'referrals' | 'commissions' = 'code';

  // --- Summary section (AC-010-01, AC-010-02) — loaded for 'code' tab ---
  summary: ReferralPartnerSummary | undefined;
  summaryLoading = false;
  summaryError = false;

  // --- Referrals section (AC-010-03) — loaded for 'referrals' tab ---
  referrals: ReferralItem[] = [];
  referralsLoading = false;
  referralsError = false;

  // --- Commissions section (AC-010-04) — loaded for 'commissions' tab ---
  commissions: ReferralPartnerCommissions | undefined;
  commissionsLoading = false;
  commissionsError = false;

  // --- Copy-to-clipboard feedback ---
  linkCopied = false;

  private queryParamsSub: Subscription | undefined;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private storageService: StorageService,
    private service: IzingaOrderManagementService,
    private analytics: AnalyticsService
  ) {}

  ngOnInit(): void {
    this.user = this.storageService.userProfile ?? undefined;

    if (!this.user || this.user.role !== UserProfile.RoleEnum.REFERRALPARTNER) {
      this.router.navigate(['/']);
      return;
    }

    if (!this.user.icaAccepted) {
      this.router.navigate(['/referral-partner/enroll']);
      return;
    }

    // Subscribe to queryParams so tab switches via browser back/forward or
    // direct URL changes are handled reactively throughout the component lifetime.
    this.queryParamsSub = this.route.queryParams.subscribe(params => {
      const tab = params['tab'];
      this.activeTab = (tab === 'referrals' || tab === 'commissions') ? tab : 'code';
      this.analytics.logScreenView(`referral_partner_${this.activeTab}`);
      this.loadActiveTab();
    });
  }

  ngOnDestroy(): void {
    this.queryParamsSub?.unsubscribe();
  }

  // ── Tab loader ───────────────────────────────────────────────────────────

  private loadActiveTab(): void {
    switch (this.activeTab) {
      case 'code':
        if (!this.summary && !this.summaryLoading) {
          this.loadSummary();
        }
        break;
      case 'referrals':
        if (!this.referrals.length && !this.referralsLoading) {
          this.loadReferrals();
        }
        break;
      case 'commissions':
        if (!this.commissions && !this.commissionsLoading) {
          this.loadCommissions();
        }
        break;
    }
  }

  // ── Section loaders ──────────────────────────────────────────────────────

  loadSummary(): void {
    this.summaryLoading = true;
    this.summaryError = false;
    this.service.getReferralPartnerSummary().subscribe({
      next: (data) => {
        this.summary = data;
        this.summaryLoading = false;
      },
      error: () => {
        this.summaryError = true;
        this.summaryLoading = false;
      }
    });
  }

  loadReferrals(): void {
    this.referralsLoading = true;
    this.referralsError = false;
    this.service.getReferralPartnerReferrals(0, 20).subscribe({
      next: (page) => {
        this.referrals = page.content;
        this.referralsLoading = false;
      },
      error: () => {
        this.referralsError = true;
        this.referralsLoading = false;
      }
    });
  }

  loadCommissions(): void {
    this.commissionsLoading = true;
    this.commissionsError = false;
    this.service.getReferralPartnerCommissions().subscribe({
      next: (data) => {
        this.commissions = data;
        this.commissionsLoading = false;
      },
      error: () => {
        this.commissionsError = true;
        this.commissionsLoading = false;
      }
    });
  }

  // ── Computed properties ──────────────────────────────────────────────────

  /** Shareable referral link (AC-010-01). */
  get shareableLink(): string {
    const code = this.summary?.referralCode ?? '';
    return `https://izinga.co.za/register?ref=${code}`;
  }

  /** Total referrals across all types (AC-010-02). */
  get totalReferrals(): number {
    if (!this.summary) return 0;
    const c = this.summary.referralCounts;
    return c.foodCustomers + c.furnitureCustomers + c.storePartners;
  }

  /** Total earned = PENDING + PAID (AC-010-04). */
  get totalEarned(): number {
    if (!this.commissions) return 0;
    return (this.commissions.totals.PENDING ?? 0) + (this.commissions.totals.PAID ?? 0);
  }

  /**
   * True when the user has banking details on their profile (AC-010-05/06).
   * Derived from user.bank.accountId being present and non-empty.
   */
  get hasBankDetails(): boolean {
    return !!(this.user?.bank?.accountId && this.user.bank.accountId.trim().length > 0);
  }

  /**
   * Masked bank display — e.g. "FNB ****1234" (AC-010-06).
   * Shows bank name + last 4 digits of the account number.
   */
  get maskedBankDetails(): string {
    if (!this.hasBankDetails) return '';
    const accountId = this.user!.bank.accountId;
    const last4 = accountId.length >= 4 ? accountId.slice(-4) : accountId;
    const bankName = this.user!.bank.name ?? '';
    return `${bankName} ****${last4}`;
  }

  /** Human-readable label for referral type (AC-010-03). */
  referralTypeLabel(type: 'FOOD_CUSTOMER' | 'STORE_PARTNER'): string {
    return type === 'FOOD_CUSTOMER' ? 'Food Customer' : 'Store Partner';
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  /** One-click copy of the shareable link (AC-010-01). */
  copyLink(): void {
    if (!navigator.clipboard) {
      return;
    }
    navigator.clipboard.writeText(this.shareableLink).then(() => {
      this.linkCopied = true;
      setTimeout(() => { this.linkCopied = false; }, 2000);
    }).catch(() => {
      // Silently ignore write errors (e.g. permission denied).
    });
  }

  navigateToProfile(): void {
    this.router.navigate(['/indivisuals/user']);
  }

  logout(): void {
    this.storageService.logout();
    location.reload();
  }
}
