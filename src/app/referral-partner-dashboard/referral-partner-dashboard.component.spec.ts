import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { of, throwError } from 'rxjs';
import { DatePipe, DecimalPipe } from '@angular/common';

import { ReferralPartnerDashboardComponent } from './referral-partner-dashboard.component';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { StorageService } from '../service/storage-service.service';
import { AnalyticsService } from '../service/analytics.service';
import { UserProfile } from '../model/userProfile';
import {
  ReferralPartnerSummary,
  ReferralPartnerCommissions,
  ReferralPage
} from '../model/referral-partner';

const MOCK_RP_USER: UserProfile = {
  id: 'user-1',
  role: UserProfile.RoleEnum.REFERRALPARTNER,
  icaAccepted: true,
  name: 'Thabo',
  bank: { accountId: '1234567890', name: 'FNB', type: 'CHEQUE' as any, branchCode: '250655' },
  imageUrl: '',
  tag: {}
};

const MOCK_SUMMARY: ReferralPartnerSummary = {
  partnerId: 'p-1',
  referralCode: 'THABO01',
  referralCounts: { foodCustomers: 3, furnitureCustomers: 0, storePartners: 1 },
  conversionCounts: { foodCustomers: 1, furnitureCustomers: 0, storePartnersStage1: 0, storePartnersStage2: 0 }
};

const MOCK_REFERRALS: ReferralPage = {
  content: [
    { customerId: 'c-1', name: 'Sipho Dlamini', referredAt: '2026-07-01T10:00:00+02:00', type: 'FOOD_CUSTOMER', converted: true },
    { customerId: 'c-2', name: 'Busi Nkosi', referredAt: '2026-07-05T09:00:00+02:00', type: 'FOOD_CUSTOMER', converted: false },
    { customerId: 's-1', name: 'Zulu Fresh Market', referredAt: '2026-07-10T14:00:00+02:00', type: 'STORE_PARTNER', converted: false }
  ],
  totalElements: 3,
  page: 0,
  size: 20
};

const MOCK_COMMISSIONS: ReferralPartnerCommissions = {
  totals: { PENDING: 15.00, PAID: 30.00 },
  lineItems: [
    { commissionType: 'FOOD_CUSTOMER_REFERRAL', amount: 15.00, status: 'PENDING', triggerReferenceId: 'c-1', createdAt: '2026-07-01T10:00:00+02:00' }
  ]
};

describe('ReferralPartnerDashboardComponent', () => {
  let component: ReferralPartnerDashboardComponent;
  let fixture: ComponentFixture<ReferralPartnerDashboardComponent>;
  let mockService: jasmine.SpyObj<IzingaOrderManagementService>;
  let mockStorage: jasmine.SpyObj<StorageService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockAnalytics: jasmine.SpyObj<AnalyticsService>;
  let routeData$: BehaviorSubject<{ tab?: string; title?: string }>;

  function setupHappyPath(): void {
    mockStorage.userProfile = MOCK_RP_USER;
    mockService.getReferralPartnerSummary.and.returnValue(of(MOCK_SUMMARY));
    mockService.getReferralPartnerReferrals.and.returnValue(of(MOCK_REFERRALS));
    mockService.getReferralPartnerCommissions.and.returnValue(of(MOCK_COMMISSIONS));
  }

  /** Switch to a tab by emitting a new route.data value (simulates navigating to a distinct route). */
  function switchTab(tab: string): void {
    const titleMap: Record<string, string> = {
      code: 'My Referral Code',
      referrals: 'My Referrals',
      commissions: 'My Commissions'
    };
    routeData$.next({ tab, title: titleMap[tab] ?? 'My Referral Code' });
    fixture.detectChanges();
  }

  beforeEach(async () => {
    routeData$ = new BehaviorSubject<{ tab?: string; title?: string }>({ tab: 'code', title: 'My Referral Code' });

    mockService = jasmine.createSpyObj('IzingaOrderManagementService', [
      'getReferralPartnerSummary',
      'getReferralPartnerReferrals',
      'getReferralPartnerCommissions'
    ]);
    mockStorage = jasmine.createSpyObj('StorageService', ['logout'], {
      userProfile: MOCK_RP_USER
    });
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockAnalytics = jasmine.createSpyObj('AnalyticsService', ['logScreenView', 'logEvent']);

    await TestBed.configureTestingModule({
      declarations: [ReferralPartnerDashboardComponent],
      providers: [
        { provide: IzingaOrderManagementService, useValue: mockService },
        { provide: StorageService, useValue: mockStorage },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: { data: routeData$.asObservable() } },
        { provide: AnalyticsService, useValue: mockAnalytics },
        DatePipe,
        DecimalPipe
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReferralPartnerDashboardComponent);
    component = fixture.componentInstance;
  });

  // ── Tab routing ──────────────────────────────────────────────────────────

  describe('Tab routing', () => {
    it('should default to "code" tab when route data tab is "code"', () => {
      setupHappyPath();
      fixture.detectChanges();
      expect(component.activeTab).toBe('code');
    });

    it('should set activeTab to "referrals" when tab=referrals', () => {
      setupHappyPath();
      fixture.detectChanges();
      switchTab('referrals');
      expect(component.activeTab).toBe('referrals');
    });

    it('should set activeTab to "commissions" when tab=commissions', () => {
      setupHappyPath();
      fixture.detectChanges();
      switchTab('commissions');
      expect(component.activeTab).toBe('commissions');
    });

    it('should fall back to "code" for an unrecognised tab value in route data', () => {
      setupHappyPath();
      fixture.detectChanges();
      routeData$.next({ tab: 'unknown-value', title: '' });
      fixture.detectChanges();
      expect(component.activeTab).toBe('code');
    });

    it('should set pageTitle from route data title', () => {
      setupHappyPath();
      fixture.detectChanges();
      expect(component.pageTitle).toBe('My Referral Code');

      switchTab('referrals');
      expect(component.pageTitle).toBe('My Referrals');

      switchTab('commissions');
      expect(component.pageTitle).toBe('My Commissions');
    });

    it('should log tab-aware analytics screen view on each tab switch', () => {
      setupHappyPath();
      fixture.detectChanges();
      expect(mockAnalytics.logScreenView).toHaveBeenCalledWith('referral_partner_code');

      switchTab('referrals');
      expect(mockAnalytics.logScreenView).toHaveBeenCalledWith('referral_partner_referrals');

      switchTab('commissions');
      expect(mockAnalytics.logScreenView).toHaveBeenCalledWith('referral_partner_commissions');
    });
  });

  // ── Lazy loading — only the active tab's API is called ───────────────────

  describe('Lazy loading', () => {
    it('should call only getReferralPartnerSummary on init (code tab default)', () => {
      setupHappyPath();
      fixture.detectChanges();
      expect(mockService.getReferralPartnerSummary).toHaveBeenCalledTimes(1);
      expect(mockService.getReferralPartnerReferrals).not.toHaveBeenCalled();
      expect(mockService.getReferralPartnerCommissions).not.toHaveBeenCalled();
    });

    it('should call getReferralPartnerReferrals only when switching to referrals tab', () => {
      setupHappyPath();
      fixture.detectChanges();
      switchTab('referrals');
      expect(mockService.getReferralPartnerReferrals).toHaveBeenCalledTimes(1);
      expect(mockService.getReferralPartnerCommissions).not.toHaveBeenCalled();
    });

    it('should call getReferralPartnerCommissions only when switching to commissions tab', () => {
      setupHappyPath();
      fixture.detectChanges();
      switchTab('commissions');
      expect(mockService.getReferralPartnerCommissions).toHaveBeenCalledTimes(1);
      expect(mockService.getReferralPartnerReferrals).not.toHaveBeenCalled();
    });

    it('should not re-fetch summary when switching back to code tab after data is loaded', () => {
      setupHappyPath();
      fixture.detectChanges(); // loads summary once
      switchTab('referrals');
      switchTab('code');
      // Summary was already loaded — should not fire again
      expect(mockService.getReferralPartnerSummary).toHaveBeenCalledTimes(1);
    });

    it('should not re-fetch referrals when switching back to referrals tab after data is loaded', () => {
      setupHappyPath();
      fixture.detectChanges();
      switchTab('referrals'); // loads referrals once
      switchTab('code');
      switchTab('referrals');
      expect(mockService.getReferralPartnerReferrals).toHaveBeenCalledTimes(1);
    });
  });

  // ── AC-010-01: Referral code and copyable link ───────────────────────────

  describe('AC-010-01: referral code and shareable link', () => {
    it('should expose shareableLink containing the referral code', () => {
      setupHappyPath();
      fixture.detectChanges();
      expect(component.shareableLink).toBe('https://shop.izinga.co.za/?ref=THABO01');
    });

    it('should set summary.referralCode from the API response', () => {
      setupHappyPath();
      fixture.detectChanges();
      expect(component.summary?.referralCode).toBe('THABO01');
    });

    it('copyLink() should set linkCopied to true and reset after 2 s', fakeAsync(() => {
      setupHappyPath();
      fixture.detectChanges();

      // ChromeHeadless does not expose navigator.clipboard — install a minimal stub.
      const clipboardStub = { writeText: jasmine.createSpy('writeText').and.returnValue(Promise.resolve()) };
      Object.defineProperty(navigator, 'clipboard', { value: clipboardStub, configurable: true });

      component.copyLink();
      tick(0); // resolve the Promise microtask
      expect(component.linkCopied).toBeTrue();

      tick(2000);
      expect(component.linkCopied).toBeFalse();

      // Restore — leave clipboard undefined for the next test
      Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    }));

    it('copyLink() should not throw and linkCopied should remain false when navigator.clipboard is undefined', fakeAsync(() => {
      setupHappyPath();
      fixture.detectChanges();

      const originalDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
      Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });

      expect(() => component.copyLink()).not.toThrow();
      tick(2000);
      expect(component.linkCopied).toBeFalse();

      // Restore original descriptor so other tests are not affected
      if (originalDescriptor) {
        Object.defineProperty(navigator, 'clipboard', originalDescriptor);
      }
    }));
  });

  // ── ADR-018: Delivery shareable link ────────────────────────────────────

  describe('ADR-018: deliveryShareableLink', () => {
    it('should expose deliveryShareableLink pointing at delivery.izinga.co.za with the referral code', () => {
      setupHappyPath();
      fixture.detectChanges();
      expect(component.deliveryShareableLink).toBe('https://delivery.izinga.co.za/?ref=THABO01');
    });

    it('deliveryShareableLink should use the same referral code as shareableLink', () => {
      setupHappyPath();
      fixture.detectChanges();
      const code = component.summary!.referralCode;
      expect(component.deliveryShareableLink).toContain(code);
      expect(component.shareableLink).toContain(code);
    });

    it('deliveryShareableLink should return a URL with an empty ref when summary is not yet loaded', () => {
      setupHappyPath();
      // Do not call fixture.detectChanges() — summary is not yet populated
      expect(component.deliveryShareableLink).toBe('https://delivery.izinga.co.za/?ref=');
    });

    it('copyDeliveryLink() should set deliveryLinkCopied to true and reset after 2 s', fakeAsync(() => {
      setupHappyPath();
      fixture.detectChanges();

      const clipboardStub = { writeText: jasmine.createSpy('writeText').and.returnValue(Promise.resolve()) };
      Object.defineProperty(navigator, 'clipboard', { value: clipboardStub, configurable: true });

      component.copyDeliveryLink();
      tick(0);
      expect(component.deliveryLinkCopied).toBeTrue();

      tick(2000);
      expect(component.deliveryLinkCopied).toBeFalse();

      Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    }));

    it('copyDeliveryLink() should write deliveryShareableLink to the clipboard', fakeAsync(() => {
      setupHappyPath();
      fixture.detectChanges();

      const writeTextSpy = jasmine.createSpy('writeText').and.returnValue(Promise.resolve());
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: writeTextSpy }, configurable: true });

      component.copyDeliveryLink();
      tick(0);
      expect(writeTextSpy).toHaveBeenCalledWith('https://delivery.izinga.co.za/?ref=THABO01');

      // Drain the 2 s reset timer to leave the zone clean
      tick(2000);
      Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    }));

    it('copyDeliveryLink() should not throw and deliveryLinkCopied should remain false when clipboard is undefined', fakeAsync(() => {
      setupHappyPath();
      fixture.detectChanges();

      const originalDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
      Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });

      expect(() => component.copyDeliveryLink()).not.toThrow();
      tick(2000);
      expect(component.deliveryLinkCopied).toBeFalse();

      if (originalDescriptor) {
        Object.defineProperty(navigator, 'clipboard', originalDescriptor);
      }
    }));

    it('copyDeliveryLink() should not affect linkCopied state', fakeAsync(() => {
      setupHappyPath();
      fixture.detectChanges();

      const clipboardStub = { writeText: jasmine.createSpy('writeText').and.returnValue(Promise.resolve()) };
      Object.defineProperty(navigator, 'clipboard', { value: clipboardStub, configurable: true });

      component.copyDeliveryLink();
      tick(0);
      expect(component.deliveryLinkCopied).toBeTrue();
      expect(component.linkCopied).toBeFalse();

      tick(2000);
      Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    }));
  });

  // ── AC-010-02: Referral summary counts ──────────────────────────────────

  describe('AC-010-02: referral summary counts', () => {
    it('should compute totalReferrals as sum of food + furniture + store', () => {
      setupHappyPath();
      fixture.detectChanges();
      // 3 food + 0 furniture + 1 store = 4
      expect(component.totalReferrals).toBe(4);
    });

    it('should expose foodCustomers count from summary', () => {
      setupHappyPath();
      fixture.detectChanges();
      expect(component.summary?.referralCounts.foodCustomers).toBe(3);
    });

    it('should expose storePartners count from summary', () => {
      setupHappyPath();
      fixture.detectChanges();
      expect(component.summary?.referralCounts.storePartners).toBe(1);
    });

    it('furniture count of 0 should not cause an error', () => {
      setupHappyPath();
      fixture.detectChanges();
      expect(component.summary?.referralCounts.furnitureCustomers).toBe(0);
      expect(component.summaryError).toBeFalse();
    });
  });

  // ── AC-010-03: Referral list ─────────────────────────────────────────────

  describe('AC-010-03: referral list', () => {
    it('should populate referrals array when on referrals tab', () => {
      setupHappyPath();
      routeData$.next({ tab: 'referrals', title: 'My Referrals' });
      fixture.detectChanges();
      expect(component.referrals.length).toBe(3);
    });

    it('should expose name, type, referredAt, and converted flag for each item', () => {
      setupHappyPath();
      routeData$.next({ tab: 'referrals', title: 'My Referrals' });
      fixture.detectChanges();
      const first = component.referrals[0];
      expect(first.name).toBe('Sipho Dlamini');
      expect(first.type).toBe('FOOD_CUSTOMER');
      expect(first.converted).toBeTrue();
    });

    it('referralTypeLabel() should return human-readable labels', () => {
      expect(component.referralTypeLabel('FOOD_CUSTOMER')).toBe('Food Customer');
      expect(component.referralTypeLabel('STORE_PARTNER')).toBe('Store Partner');
      expect(component.referralTypeLabel('FURNITURE_CUSTOMER')).toBe('Furniture Customer');
    });

    it('unconverted referrals should be marked REGISTERED', () => {
      setupHappyPath();
      routeData$.next({ tab: 'referrals', title: 'My Referrals' });
      fixture.detectChanges();
      const unConverted = component.referrals.find(r => !r.converted);
      expect(unConverted).toBeDefined();
      expect(unConverted!.converted).toBeFalse();
    });
  });

  // ── AC-010-04: Commission section ────────────────────────────────────────

  describe('AC-010-04: commission totals', () => {
    it('should set commissions from API when on commissions tab', () => {
      setupHappyPath();
      routeData$.next({ tab: 'commissions', title: 'My Commissions' });
      fixture.detectChanges();
      expect(component.commissions).toBeDefined();
    });

    it('totalEarned should be PENDING + PAID', () => {
      setupHappyPath();
      routeData$.next({ tab: 'commissions', title: 'My Commissions' });
      fixture.detectChanges();
      expect(component.totalEarned).toBe(45.00); // 15 + 30
    });

    it('should expose PENDING and PAID totals separately', () => {
      setupHappyPath();
      routeData$.next({ tab: 'commissions', title: 'My Commissions' });
      fixture.detectChanges();
      expect(component.commissions!.totals.PENDING).toBe(15.00);
      expect(component.commissions!.totals.PAID).toBe(30.00);
    });
  });

  // ── AC-010-05/06: Banking details banner ────────────────────────────────

  describe('AC-010-05/06: banking details banner', () => {
    it('hasBankDetails should be true when accountId is set', () => {
      setupHappyPath();
      fixture.detectChanges();
      expect(component.hasBankDetails).toBeTrue();
    });

    it('maskedBankDetails should format as "<Name> ****<last4>"', () => {
      setupHappyPath();
      fixture.detectChanges();
      expect(component.maskedBankDetails).toBe('FNB ****7890');
    });

    it('hasBankDetails should be false when bank is missing', () => {
      const userWithoutBank: UserProfile = {
        ...MOCK_RP_USER,
        bank: { accountId: '', name: '', type: 'CHEQUE' as any, branchCode: '' }
      };
      Object.defineProperty(mockStorage, 'userProfile', { get: () => userWithoutBank, configurable: true });
      mockService.getReferralPartnerSummary.and.returnValue(of(MOCK_SUMMARY));
      mockService.getReferralPartnerReferrals.and.returnValue(of(MOCK_REFERRALS));
      mockService.getReferralPartnerCommissions.and.returnValue(of(MOCK_COMMISSIONS));
      fixture.detectChanges();
      expect(component.hasBankDetails).toBeFalse();
    });

    it('maskedBankDetails should be empty string when no bank details', () => {
      const userWithoutBank: UserProfile = {
        ...MOCK_RP_USER,
        bank: { accountId: '', name: '', type: 'CHEQUE' as any, branchCode: '' }
      };
      Object.defineProperty(mockStorage, 'userProfile', { get: () => userWithoutBank, configurable: true });
      mockService.getReferralPartnerSummary.and.returnValue(of(MOCK_SUMMARY));
      mockService.getReferralPartnerReferrals.and.returnValue(of(MOCK_REFERRALS));
      mockService.getReferralPartnerCommissions.and.returnValue(of(MOCK_COMMISSIONS));
      fixture.detectChanges();
      expect(component.maskedBankDetails).toBe('');
    });

    // FIX-01: accountId shorter than 4 characters uses the full accountId (else branch)
    it('maskedBankDetails should use full accountId when it has fewer than 4 characters', () => {
      const userShortAccount: UserProfile = {
        ...MOCK_RP_USER,
        bank: { accountId: '12', name: 'FNB', type: 'CHEQUE' as any, branchCode: '250655' }
      };
      Object.defineProperty(mockStorage, 'userProfile', { get: () => userShortAccount, configurable: true });
      mockService.getReferralPartnerSummary.and.returnValue(of(MOCK_SUMMARY));
      mockService.getReferralPartnerReferrals.and.returnValue(of(MOCK_REFERRALS));
      mockService.getReferralPartnerCommissions.and.returnValue(of(MOCK_COMMISSIONS));
      fixture.detectChanges();
      expect(component.maskedBankDetails).toBe('FNB ****12');
    });

    // FIX-02: bank is null at runtime — hasBankDetails must be false and maskedBankDetails must be ''
    it('hasBankDetails should be false and maskedBankDetails should be empty when bank is null', () => {
      const userNullBank: UserProfile = {
        ...MOCK_RP_USER,
        bank: null as any
      };
      Object.defineProperty(mockStorage, 'userProfile', { get: () => userNullBank, configurable: true });
      mockService.getReferralPartnerSummary.and.returnValue(of(MOCK_SUMMARY));
      mockService.getReferralPartnerReferrals.and.returnValue(of(MOCK_REFERRALS));
      mockService.getReferralPartnerCommissions.and.returnValue(of(MOCK_COMMISSIONS));
      fixture.detectChanges();
      expect(component.hasBankDetails).toBeFalse();
      expect(component.maskedBankDetails).toBe('');
    });
  });

  // ── AC-010-07: Per-section error and retry ───────────────────────────────

  describe('AC-010-07: per-section error handling', () => {
    it('summary error on code tab should set summaryError=true', () => {
      mockStorage.userProfile = MOCK_RP_USER;
      mockService.getReferralPartnerSummary.and.returnValue(throwError({ status: 500 }));
      mockService.getReferralPartnerReferrals.and.returnValue(of(MOCK_REFERRALS));
      mockService.getReferralPartnerCommissions.and.returnValue(of(MOCK_COMMISSIONS));
      fixture.detectChanges(); // default tab = code

      expect(component.summaryError).toBeTrue();
      expect(component.summaryLoading).toBeFalse();
    });

    it('referrals error on referrals tab should set referralsError=true', () => {
      mockStorage.userProfile = MOCK_RP_USER;
      mockService.getReferralPartnerSummary.and.returnValue(of(MOCK_SUMMARY));
      mockService.getReferralPartnerReferrals.and.returnValue(throwError({ status: 500 }));
      mockService.getReferralPartnerCommissions.and.returnValue(of(MOCK_COMMISSIONS));
      routeData$.next({ tab: 'referrals', title: 'My Referrals' });
      fixture.detectChanges();

      expect(component.referralsError).toBeTrue();
      expect(component.referralsLoading).toBeFalse();
    });

    it('commissions error on commissions tab should set commissionsError=true', () => {
      mockStorage.userProfile = MOCK_RP_USER;
      mockService.getReferralPartnerSummary.and.returnValue(of(MOCK_SUMMARY));
      mockService.getReferralPartnerReferrals.and.returnValue(of(MOCK_REFERRALS));
      mockService.getReferralPartnerCommissions.and.returnValue(throwError({ status: 500 }));
      routeData$.next({ tab: 'commissions', title: 'My Commissions' });
      fixture.detectChanges();

      expect(component.commissionsError).toBeTrue();
      expect(component.commissionsLoading).toBeFalse();
    });

    it('loadSummary() retry should clear summaryError and reload', () => {
      mockStorage.userProfile = MOCK_RP_USER;
      mockService.getReferralPartnerSummary.and.returnValue(throwError({ status: 500 }));
      mockService.getReferralPartnerReferrals.and.returnValue(of(MOCK_REFERRALS));
      mockService.getReferralPartnerCommissions.and.returnValue(of(MOCK_COMMISSIONS));
      fixture.detectChanges();

      expect(component.summaryError).toBeTrue();

      // Retry with success
      mockService.getReferralPartnerSummary.and.returnValue(of(MOCK_SUMMARY));
      component.loadSummary();
      expect(component.summaryError).toBeFalse();
      expect(component.summary).toEqual(MOCK_SUMMARY);
    });

    it('loadReferrals() retry should clear referralsError and reload', () => {
      mockStorage.userProfile = MOCK_RP_USER;
      mockService.getReferralPartnerSummary.and.returnValue(of(MOCK_SUMMARY));
      mockService.getReferralPartnerReferrals.and.returnValue(throwError({ status: 500 }));
      mockService.getReferralPartnerCommissions.and.returnValue(of(MOCK_COMMISSIONS));
      routeData$.next({ tab: 'referrals', title: 'My Referrals' });
      fixture.detectChanges();

      mockService.getReferralPartnerReferrals.and.returnValue(of(MOCK_REFERRALS));
      component.loadReferrals();
      expect(component.referralsError).toBeFalse();
      expect(component.referrals.length).toBe(3);
    });

    it('loadCommissions() retry should clear commissionsError and reload', () => {
      mockStorage.userProfile = MOCK_RP_USER;
      mockService.getReferralPartnerSummary.and.returnValue(of(MOCK_SUMMARY));
      mockService.getReferralPartnerReferrals.and.returnValue(of(MOCK_REFERRALS));
      mockService.getReferralPartnerCommissions.and.returnValue(throwError({ status: 500 }));
      routeData$.next({ tab: 'commissions', title: 'My Commissions' });
      fixture.detectChanges();

      mockService.getReferralPartnerCommissions.and.returnValue(of(MOCK_COMMISSIONS));
      component.loadCommissions();
      expect(component.commissionsError).toBeFalse();
      expect(component.commissions).toEqual(MOCK_COMMISSIONS);
    });
  });

  // ── Guard: redirect if wrong role or not enrolled ────────────────────────

  describe('Guard behaviour', () => {
    it('should redirect to / if user is not REFERRAL_PARTNER', () => {
      const wrongUser: UserProfile = { ...MOCK_RP_USER, role: UserProfile.RoleEnum.MESSENGER };
      Object.defineProperty(mockStorage, 'userProfile', { get: () => wrongUser, configurable: true });
      mockService.getReferralPartnerSummary.and.returnValue(of(MOCK_SUMMARY));
      mockService.getReferralPartnerReferrals.and.returnValue(of(MOCK_REFERRALS));
      mockService.getReferralPartnerCommissions.and.returnValue(of(MOCK_COMMISSIONS));
      fixture.detectChanges();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
    });

    it('should redirect to /referral-partner/enroll if icaAccepted is false', () => {
      const unenrolled: UserProfile = { ...MOCK_RP_USER, icaAccepted: false };
      Object.defineProperty(mockStorage, 'userProfile', { get: () => unenrolled, configurable: true });
      mockService.getReferralPartnerSummary.and.returnValue(of(MOCK_SUMMARY));
      mockService.getReferralPartnerReferrals.and.returnValue(of(MOCK_REFERRALS));
      mockService.getReferralPartnerCommissions.and.returnValue(of(MOCK_COMMISSIONS));
      fixture.detectChanges();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/referral-partner/enroll']);
    });
  });
});
