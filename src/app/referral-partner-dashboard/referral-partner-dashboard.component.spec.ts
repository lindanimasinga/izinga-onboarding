import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
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

  function setupHappyPath(): void {
    mockStorage.userProfile = MOCK_RP_USER;
    mockService.getReferralPartnerSummary.and.returnValue(of(MOCK_SUMMARY));
    mockService.getReferralPartnerReferrals.and.returnValue(of(MOCK_REFERRALS));
    mockService.getReferralPartnerCommissions.and.returnValue(of(MOCK_COMMISSIONS));
  }

  beforeEach(async () => {
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
        { provide: AnalyticsService, useValue: mockAnalytics },
        DatePipe,
        DecimalPipe
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReferralPartnerDashboardComponent);
    component = fixture.componentInstance;
  });

  // ── AC-010-01: Referral code and copyable link ───────────────────────────

  describe('AC-010-01: referral code and shareable link', () => {
    it('should expose shareableLink containing the referral code', () => {
      setupHappyPath();
      fixture.detectChanges();
      expect(component.shareableLink).toBe('https://izinga.co.za/register?ref=THABO01');
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
    it('should populate referrals array from API', () => {
      setupHappyPath();
      fixture.detectChanges();
      expect(component.referrals.length).toBe(3);
    });

    it('should expose name, type, referredAt, and converted flag for each item', () => {
      setupHappyPath();
      fixture.detectChanges();
      const first = component.referrals[0];
      expect(first.name).toBe('Sipho Dlamini');
      expect(first.type).toBe('FOOD_CUSTOMER');
      expect(first.converted).toBeTrue();
    });

    it('referralTypeLabel() should return human-readable labels', () => {
      expect(component.referralTypeLabel('FOOD_CUSTOMER')).toBe('Food Customer');
      expect(component.referralTypeLabel('STORE_PARTNER')).toBe('Store Partner');
    });

    it('unconverted referrals should be marked REGISTERED', () => {
      setupHappyPath();
      fixture.detectChanges();
      const unConverted = component.referrals.find(r => !r.converted);
      expect(unConverted).toBeDefined();
      expect(unConverted!.converted).toBeFalse();
    });
  });

  // ── AC-010-04: Commission section ────────────────────────────────────────

  describe('AC-010-04: commission totals', () => {
    it('should set commissions from API', () => {
      setupHappyPath();
      fixture.detectChanges();
      expect(component.commissions).toBeDefined();
    });

    it('totalEarned should be PENDING + PAID', () => {
      setupHappyPath();
      fixture.detectChanges();
      expect(component.totalEarned).toBe(45.00); // 15 + 30
    });

    it('should expose PENDING and PAID totals separately', () => {
      setupHappyPath();
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
  });

  // ── AC-010-07: Per-section error and retry ───────────────────────────────

  describe('AC-010-07: per-section error handling', () => {
    it('summary error should set summaryError=true without affecting referrals or commissions', () => {
      mockStorage.userProfile = MOCK_RP_USER;
      mockService.getReferralPartnerSummary.and.returnValue(throwError({ status: 500 }));
      mockService.getReferralPartnerReferrals.and.returnValue(of(MOCK_REFERRALS));
      mockService.getReferralPartnerCommissions.and.returnValue(of(MOCK_COMMISSIONS));
      fixture.detectChanges();

      expect(component.summaryError).toBeTrue();
      expect(component.summaryLoading).toBeFalse();
      expect(component.referralsError).toBeFalse();
      expect(component.commissionsError).toBeFalse();
    });

    it('referrals error should set referralsError=true without affecting summary or commissions', () => {
      mockStorage.userProfile = MOCK_RP_USER;
      mockService.getReferralPartnerSummary.and.returnValue(of(MOCK_SUMMARY));
      mockService.getReferralPartnerReferrals.and.returnValue(throwError({ status: 500 }));
      mockService.getReferralPartnerCommissions.and.returnValue(of(MOCK_COMMISSIONS));
      fixture.detectChanges();

      expect(component.referralsError).toBeTrue();
      expect(component.referralsLoading).toBeFalse();
      expect(component.summaryError).toBeFalse();
      expect(component.commissionsError).toBeFalse();
    });

    it('commissions error should set commissionsError=true without affecting summary or referrals', () => {
      mockStorage.userProfile = MOCK_RP_USER;
      mockService.getReferralPartnerSummary.and.returnValue(of(MOCK_SUMMARY));
      mockService.getReferralPartnerReferrals.and.returnValue(of(MOCK_REFERRALS));
      mockService.getReferralPartnerCommissions.and.returnValue(throwError({ status: 500 }));
      fixture.detectChanges();

      expect(component.commissionsError).toBeTrue();
      expect(component.commissionsLoading).toBeFalse();
      expect(component.summaryError).toBeFalse();
      expect(component.referralsError).toBeFalse();
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
