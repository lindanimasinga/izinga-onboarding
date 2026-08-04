import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';

import { ReconDashboardComponent } from './recon-dashboard.component';
import { ReconPayoutService } from '../../service/recon-payout.service';
import { PayoutBundle } from '../../model/recon/payout-bundle';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeReconPayout = (overrides: Partial<any> = {}): any => ({
  id: 'p1',
  bundleId: 'b1',
  toId: 'u1',
  toName: 'Test User',
  toType: 'CHEQUE',
  toBankName: 'FNB',
  toAccountNumber: '123',
  toBranchCode: '250655',
  fromReference: 'ref',
  toReference: 'ref',
  orders: [],
  payoutStage: 'PENDING',
  paid: false,
  total: 100,
  commissionAmount: 50,
  emailSent: false,
  tag: {},
  date: new Date('2024-01-01'),
  ...overrides
});

const makeBundle = (payouts: any[], overrides: Partial<PayoutBundle> = {}): PayoutBundle => ({
  id: 'b1',
  date: new Date('2024-01-01'),
  tag: {},
  type: 'AMBASSADOR',
  payouts,
  createdBy: 'admin',
  payoutTotalAmount: payouts.reduce((s: number, p: any) => s + (p.total ?? 0), 0),
  numberOfPayouts: payouts.length,
  ...overrides
});

// ---------------------------------------------------------------------------
// Suite 1: CSV confirm/cancel state machine (Shop + Messenger)
// ---------------------------------------------------------------------------

describe('ReconDashboardComponent — CSV confirm/cancel state machine', () => {
  let component: ReconDashboardComponent;
  let fixture: ComponentFixture<ReconDashboardComponent>;
  let reconServiceSpy: jasmine.SpyObj<ReconPayoutService>;

  beforeEach(async () => {
    reconServiceSpy = jasmine.createSpyObj('ReconPayoutService', [
      'getPayoutBundles',
      'getAmbassadorPayoutBundle',
      'getReferralPartnerPayoutBundle',
      'triggerShopCsvDownload',
      'triggerMessengerCsvDownload',
      'triggerAmbassadorCsvDownload',
      'triggerReferralPartnerCsvDownload',
      'patchShopPayoutBundle',
      'patchMessengerPayoutBundle',
      'patchAmbassadorPayoutBundle',
      'patchReferralPartnerPayoutBundle'
    ]);

    reconServiceSpy.getPayoutBundles.and.returnValue(of([]));
    reconServiceSpy.getAmbassadorPayoutBundle.and.returnValue(of(makeBundle([])));
    reconServiceSpy.getReferralPartnerPayoutBundle.and.returnValue(of(makeBundle([], { type: 'REFERRAL_PARTNER' })));

    await TestBed.configureTestingModule({
      declarations: [ReconDashboardComponent],
      imports: [RouterTestingModule],
      providers: [{ provide: ReconPayoutService, useValue: reconServiceSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(ReconDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('requestCsvDownload()', () => {
    it('sets pendingCsvType to "shop" without calling the service', () => {
      component.requestCsvDownload('shop');
      expect(component.pendingCsvType).toBe('shop');
      expect(reconServiceSpy.triggerShopCsvDownload).not.toHaveBeenCalled();
    });

    it('sets pendingCsvType to "messenger" without calling the service', () => {
      component.requestCsvDownload('messenger');
      expect(component.pendingCsvType).toBe('messenger');
      expect(reconServiceSpy.triggerMessengerCsvDownload).not.toHaveBeenCalled();
    });

    it('sets pendingCsvType to "ambassador" without calling the service', () => {
      component.requestCsvDownload('ambassador');
      expect(component.pendingCsvType).toBe('ambassador');
      expect(reconServiceSpy.triggerAmbassadorCsvDownload).not.toHaveBeenCalled();
    });

    it('sets pendingCsvType to "referral" without calling the service', () => {
      component.requestCsvDownload('referral');
      expect(component.pendingCsvType).toBe('referral');
      expect(reconServiceSpy.triggerReferralPartnerCsvDownload).not.toHaveBeenCalled();
    });
  });

  describe('cancelCsvDownload()', () => {
    it('clears pendingCsvType for shop and does NOT call the service', () => {
      component.pendingCsvType = 'shop';
      component.cancelCsvDownload();
      expect(component.pendingCsvType).toBeNull();
      expect(reconServiceSpy.triggerShopCsvDownload).not.toHaveBeenCalled();
    });

    it('clears pendingCsvType for ambassador and does NOT call the service', () => {
      component.pendingCsvType = 'ambassador';
      component.cancelCsvDownload();
      expect(component.pendingCsvType).toBeNull();
      expect(reconServiceSpy.triggerAmbassadorCsvDownload).not.toHaveBeenCalled();
    });

    it('clears pendingCsvType for referral and does NOT call the service', () => {
      component.pendingCsvType = 'referral';
      component.cancelCsvDownload();
      expect(component.pendingCsvType).toBeNull();
      expect(reconServiceSpy.triggerReferralPartnerCsvDownload).not.toHaveBeenCalled();
    });
  });

  describe('confirmCsvDownload()', () => {
    it('calls triggerShopCsvDownload when pendingCsvType is "shop" and clears it', () => {
      reconServiceSpy.triggerShopCsvDownload.and.returnValue(of(undefined));
      component.pendingCsvType = 'shop';
      component.confirmCsvDownload();
      expect(reconServiceSpy.triggerShopCsvDownload).toHaveBeenCalledTimes(1);
      expect(component.pendingCsvType).toBeNull();
    });

    it('calls triggerMessengerCsvDownload when pendingCsvType is "messenger" and clears it', () => {
      reconServiceSpy.triggerMessengerCsvDownload.and.returnValue(of(undefined));
      component.pendingCsvType = 'messenger';
      component.confirmCsvDownload();
      expect(reconServiceSpy.triggerMessengerCsvDownload).toHaveBeenCalledTimes(1);
      expect(component.pendingCsvType).toBeNull();
    });

    it('calls triggerAmbassadorCsvDownload when pendingCsvType is "ambassador" and clears it', () => {
      reconServiceSpy.triggerAmbassadorCsvDownload.and.returnValue(of(undefined));
      component.pendingCsvType = 'ambassador';
      component.confirmCsvDownload();
      expect(reconServiceSpy.triggerAmbassadorCsvDownload).toHaveBeenCalledTimes(1);
      expect(component.pendingCsvType).toBeNull();
    });

    it('calls triggerReferralPartnerCsvDownload when pendingCsvType is "referral" and clears it', () => {
      reconServiceSpy.triggerReferralPartnerCsvDownload.and.returnValue(of(undefined));
      component.pendingCsvType = 'referral';
      component.confirmCsvDownload();
      expect(reconServiceSpy.triggerReferralPartnerCsvDownload).toHaveBeenCalledTimes(1);
      expect(component.pendingCsvType).toBeNull();
    });

    it('does NOT call any CSV service when pendingCsvType is null', () => {
      component.pendingCsvType = null;
      component.confirmCsvDownload();
      expect(reconServiceSpy.triggerShopCsvDownload).not.toHaveBeenCalled();
      expect(reconServiceSpy.triggerMessengerCsvDownload).not.toHaveBeenCalled();
      expect(reconServiceSpy.triggerAmbassadorCsvDownload).not.toHaveBeenCalled();
      expect(reconServiceSpy.triggerReferralPartnerCsvDownload).not.toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// Suite 2: Ambassador and Referral Partner — full action sections
// ---------------------------------------------------------------------------

describe('ReconDashboardComponent — Ambassador and Referral Partner action sections', () => {
  let component: ReconDashboardComponent;
  let fixture: ComponentFixture<ReconDashboardComponent>;
  let reconServiceSpy: jasmine.SpyObj<ReconPayoutService>;

  beforeEach(async () => {
    reconServiceSpy = jasmine.createSpyObj('ReconPayoutService', [
      'getPayoutBundles',
      'getAmbassadorPayoutBundle',
      'getReferralPartnerPayoutBundle',
      'triggerShopCsvDownload',
      'triggerMessengerCsvDownload',
      'triggerAmbassadorCsvDownload',
      'triggerReferralPartnerCsvDownload',
      'patchShopPayoutBundle',
      'patchMessengerPayoutBundle',
      'patchAmbassadorPayoutBundle',
      'patchReferralPartnerPayoutBundle'
    ]);

    reconServiceSpy.getPayoutBundles.and.returnValue(of([]));
    reconServiceSpy.getAmbassadorPayoutBundle.and.returnValue(of(makeBundle([])));
    reconServiceSpy.getReferralPartnerPayoutBundle.and.returnValue(of(makeBundle([], { type: 'REFERRAL_PARTNER' })));

    await TestBed.configureTestingModule({
      declarations: [ReconDashboardComponent],
      imports: [RouterTestingModule],
      providers: [{ provide: ReconPayoutService, useValue: reconServiceSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(ReconDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // -----------------------------------------------------------------------
  // loadAmbassadorPayouts() — dedicated bundle endpoint
  // -----------------------------------------------------------------------

  describe('loadAmbassadorPayouts()', () => {
    it('calls getAmbassadorPayoutBundle() — not getPayoutBundles', () => {
      reconServiceSpy.getAmbassadorPayoutBundle.calls.reset();
      reconServiceSpy.getAmbassadorPayoutBundle.and.returnValue(of(makeBundle([])));

      component.loadAmbassadorPayouts();

      expect(reconServiceSpy.getAmbassadorPayoutBundle).toHaveBeenCalledTimes(1);
      expect(reconServiceSpy.getPayoutBundles).not.toHaveBeenCalledWith('AMBASSADOR' as any, jasmine.anything(), jasmine.anything());
    });

    it('groups bundle.payouts by payoutStage', () => {
      const payouts = [
        makeReconPayout({ payoutStage: 'PENDING', commissionAmount: 50 }),
        makeReconPayout({ id: 'p2', payoutStage: 'PENDING', commissionAmount: 75 }),
        makeReconPayout({ id: 'p3', payoutStage: 'COMPLETED', commissionAmount: 30 })
      ];
      reconServiceSpy.getAmbassadorPayoutBundle.and.returnValue(of(makeBundle(payouts)));

      component.loadAmbassadorPayouts();

      expect(component.ambassadorGroupedPayouts['PENDING'].length).toBe(2);
      expect(component.ambassadorGroupedPayouts['COMPLETED'].length).toBe(1);
      expect(component.isLoadingAmbassador).toBeFalse();
    });

    it('handles empty bundle.payouts without throwing', () => {
      reconServiceSpy.getAmbassadorPayoutBundle.and.returnValue(of(makeBundle([])));

      component.loadAmbassadorPayouts();

      expect(Object.keys(component.ambassadorGroupedPayouts).length).toBe(0);
      expect(component.isLoadingAmbassador).toBeFalse();
    });

    it('sets ambassadorError and clears isLoadingAmbassador on API error', () => {
      reconServiceSpy.getAmbassadorPayoutBundle.and.returnValue(throwError(() => new Error('net')));

      component.loadAmbassadorPayouts();

      expect(component.ambassadorError).toBeTruthy();
      expect(component.isLoadingAmbassador).toBeFalse();
    });
  });

  // -----------------------------------------------------------------------
  // loadReferralPayouts() — dedicated bundle endpoint
  // -----------------------------------------------------------------------

  describe('loadReferralPayouts()', () => {
    it('calls getReferralPartnerPayoutBundle() — not getPayoutBundles', () => {
      reconServiceSpy.getReferralPartnerPayoutBundle.calls.reset();
      reconServiceSpy.getReferralPartnerPayoutBundle.and.returnValue(
        of(makeBundle([], { type: 'REFERRAL_PARTNER' }))
      );

      component.loadReferralPayouts();

      expect(reconServiceSpy.getReferralPartnerPayoutBundle).toHaveBeenCalledTimes(1);
      expect(reconServiceSpy.getPayoutBundles).not.toHaveBeenCalledWith('REFERRAL_PARTNER' as any, jasmine.anything(), jasmine.anything());
    });

    it('groups bundle.payouts by payoutStage', () => {
      const payouts = [
        makeReconPayout({ payoutStage: 'PROCESSING', commissionAmount: 200 }),
        makeReconPayout({ id: 'p2', payoutStage: 'COMPLETED', commissionAmount: 150 })
      ];
      reconServiceSpy.getReferralPartnerPayoutBundle.and.returnValue(
        of(makeBundle(payouts, { type: 'REFERRAL_PARTNER' }))
      );

      component.loadReferralPayouts();

      expect(component.referralGroupedPayouts['PROCESSING'].length).toBe(1);
      expect(component.referralGroupedPayouts['COMPLETED'].length).toBe(1);
      expect(component.isLoadingReferral).toBeFalse();
    });

    it('sets referralError and clears isLoadingReferral on API error', () => {
      reconServiceSpy.getReferralPartnerPayoutBundle.and.returnValue(throwError(() => new Error('net')));

      component.loadReferralPayouts();

      expect(component.referralError).toBeTruthy();
      expect(component.isLoadingReferral).toBeFalse();
    });
  });

  // -----------------------------------------------------------------------
  // updateAmbassadorPayouts() — mark-paid submit flow
  // -----------------------------------------------------------------------

  describe('updateAmbassadorPayouts()', () => {
    it('calls patchAmbassadorPayoutBundle with correct bundleId and type, then reloads', () => {
      const payouts = [
        makeReconPayout({ bundleId: 'b99', paid: true }),
        makeReconPayout({ id: 'p2', bundleId: 'b99', paid: false })
      ];
      reconServiceSpy.patchAmbassadorPayoutBundle.and.returnValue(of(undefined));
      reconServiceSpy.getAmbassadorPayoutBundle.and.returnValue(of(makeBundle([])));

      component.updateAmbassadorPayouts(payouts);

      expect(reconServiceSpy.patchAmbassadorPayoutBundle).toHaveBeenCalledTimes(1);
      const args = reconServiceSpy.patchAmbassadorPayoutBundle.calls.first().args[0];
      expect(args.bundleId).toBe('b99');
      expect(args.payoutItemResults[0].type).toBe('AMBASSADOR');
      expect(args.payoutItemResults[1].paid).toBeFalse();
    });

    it('clears ambassadorSubmitInProgress on success', () => {
      const payouts = [makeReconPayout()];
      reconServiceSpy.patchAmbassadorPayoutBundle.and.returnValue(of(undefined));
      reconServiceSpy.getAmbassadorPayoutBundle.and.returnValue(of(makeBundle([])));

      component.updateAmbassadorPayouts(payouts);

      expect(component.ambassadorSubmitInProgress).toBeFalse();
    });

    it('clears ambassadorSubmitInProgress and alerts on API error', () => {
      spyOn(window, 'alert');
      const payouts = [makeReconPayout()];
      reconServiceSpy.patchAmbassadorPayoutBundle.and.returnValue(throwError(() => new Error('err')));

      component.updateAmbassadorPayouts(payouts);

      expect(component.ambassadorSubmitInProgress).toBeFalse();
      expect(window.alert).toHaveBeenCalled();
    });

    it('is idempotent: a second call while in progress does not call the service again', () => {
      // Set in-progress manually — simulates a slow first call
      component.ambassadorSubmitInProgress = true;
      const payouts = [makeReconPayout()];

      component.updateAmbassadorPayouts(payouts);

      expect(reconServiceSpy.patchAmbassadorPayoutBundle).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // updateReferralPayouts() — mark-paid submit flow
  // -----------------------------------------------------------------------

  describe('updateReferralPayouts()', () => {
    it('calls patchReferralPartnerPayoutBundle with correct bundleId and type, then reloads', () => {
      const payouts = [makeReconPayout({ bundleId: 'br1', paid: true })];
      reconServiceSpy.patchReferralPartnerPayoutBundle.and.returnValue(of(undefined));
      reconServiceSpy.getReferralPartnerPayoutBundle.and.returnValue(
        of(makeBundle([], { type: 'REFERRAL_PARTNER' }))
      );

      component.updateReferralPayouts(payouts);

      expect(reconServiceSpy.patchReferralPartnerPayoutBundle).toHaveBeenCalledTimes(1);
      const args = reconServiceSpy.patchReferralPartnerPayoutBundle.calls.first().args[0];
      expect(args.bundleId).toBe('br1');
      expect(args.payoutItemResults[0].type).toBe('REFERRAL_PARTNER');
    });

    it('clears referralSubmitInProgress on success', () => {
      const payouts = [makeReconPayout()];
      reconServiceSpy.patchReferralPartnerPayoutBundle.and.returnValue(of(undefined));
      reconServiceSpy.getReferralPartnerPayoutBundle.and.returnValue(
        of(makeBundle([], { type: 'REFERRAL_PARTNER' }))
      );

      component.updateReferralPayouts(payouts);

      expect(component.referralSubmitInProgress).toBeFalse();
    });

    it('clears referralSubmitInProgress and alerts on API error', () => {
      spyOn(window, 'alert');
      const payouts = [makeReconPayout()];
      reconServiceSpy.patchReferralPartnerPayoutBundle.and.returnValue(throwError(() => new Error('err')));

      component.updateReferralPayouts(payouts);

      expect(component.referralSubmitInProgress).toBeFalse();
      expect(window.alert).toHaveBeenCalled();
    });

    it('is idempotent: a second call while in progress does not call the service again', () => {
      component.referralSubmitInProgress = true;
      const payouts = [makeReconPayout()];

      component.updateReferralPayouts(payouts);

      expect(reconServiceSpy.patchReferralPartnerPayoutBundle).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // onDayChange() triggers all four loaders with correct endpoints
  // -----------------------------------------------------------------------

  describe('onDayChange()', () => {
    it('calls getPayoutBundles for SHOP and MESSENGER, dedicated endpoints for AMBASSADOR and REFERRAL_PARTNER', () => {
      reconServiceSpy.getPayoutBundles.calls.reset();
      reconServiceSpy.getAmbassadorPayoutBundle.calls.reset();
      reconServiceSpy.getReferralPartnerPayoutBundle.calls.reset();
      reconServiceSpy.getPayoutBundles.and.returnValue(of([]));
      reconServiceSpy.getAmbassadorPayoutBundle.and.returnValue(of(makeBundle([])));
      reconServiceSpy.getReferralPartnerPayoutBundle.and.returnValue(
        of(makeBundle([], { type: 'REFERRAL_PARTNER' }))
      );

      component.onDayChange();

      const types = reconServiceSpy.getPayoutBundles.calls.allArgs().map((a: any[]) => a[0]);
      expect(types).toContain('SHOP');
      expect(types).toContain('MESSENGER');
      expect(types).not.toContain('AMBASSADOR');
      expect(types).not.toContain('REFERRAL_PARTNER');
      expect(reconServiceSpy.getAmbassadorPayoutBundle).toHaveBeenCalledTimes(1);
      expect(reconServiceSpy.getReferralPartnerPayoutBundle).toHaveBeenCalledTimes(1);
    });
  });

  // -----------------------------------------------------------------------
  // Helper: commissionTotal / getTotalCommission
  // -----------------------------------------------------------------------

  describe('commissionTotal()', () => {
    it('sums commissionAmount across all payouts', () => {
      const payouts = [
        makeReconPayout({ commissionAmount: 100 }),
        makeReconPayout({ commissionAmount: 250 }),
        makeReconPayout({ commissionAmount: 50 })
      ];
      expect(component.commissionTotal(payouts)).toBe(400);
    });

    it('treats undefined commissionAmount as zero', () => {
      const payouts = [makeReconPayout({ commissionAmount: undefined }), makeReconPayout({ commissionAmount: 100 })];
      expect(component.commissionTotal(payouts)).toBe(100);
    });
  });

  describe('getTotalCommission()', () => {
    it('sums commission across all stages in the grouped map', () => {
      component.ambassadorGroupedPayouts = {
        PENDING: [makeReconPayout({ commissionAmount: 100 })],
        COMPLETED: [makeReconPayout({ commissionAmount: 200 })]
      };
      expect(component.getTotalCommission(component.ambassadorGroupedPayouts)).toBe(300);
    });
  });

  // -----------------------------------------------------------------------
  // Section collapse toggles
  // -----------------------------------------------------------------------

  describe('section collapse toggles', () => {
    it('toggleAmbassadorSection() flips ambassadorSectionCollapsed', () => {
      expect(component.ambassadorSectionCollapsed).toBeFalse();
      component.toggleAmbassadorSection();
      expect(component.ambassadorSectionCollapsed).toBeTrue();
      component.toggleAmbassadorSection();
      expect(component.ambassadorSectionCollapsed).toBeFalse();
    });

    it('toggleReferralSection() flips referralSectionCollapsed', () => {
      expect(component.referralSectionCollapsed).toBeFalse();
      component.toggleReferralSection();
      expect(component.referralSectionCollapsed).toBeTrue();
      component.toggleReferralSection();
      expect(component.referralSectionCollapsed).toBeFalse();
    });
  });

  // -----------------------------------------------------------------------
  // getStatusBadgeClass() — iZinga token-based badge classes
  // -----------------------------------------------------------------------

  describe('getStatusBadgeClass()', () => {
    it('returns badge-status-pending for PENDING', () => {
      expect(component.getStatusBadgeClass('PENDING')).toBe('badge badge-status-pending');
    });

    it('returns badge-status-processing for PROCESSING', () => {
      expect(component.getStatusBadgeClass('PROCESSING')).toBe('badge badge-status-processing');
    });

    it('returns badge-status-completed for COMPLETED', () => {
      expect(component.getStatusBadgeClass('COMPLETED')).toBe('badge badge-status-completed');
    });

    it('returns badge-status-voided for VOIDED', () => {
      expect(component.getStatusBadgeClass('VOIDED')).toBe('badge badge-status-voided');
    });

    it('returns badge-status-default for unknown stage', () => {
      expect(component.getStatusBadgeClass('UNKNOWN')).toBe('badge badge-status-default');
    });

    it('returns badge-status-default for empty string', () => {
      expect(component.getStatusBadgeClass('')).toBe('badge badge-status-default');
    });
  });

  // -----------------------------------------------------------------------
  // markAllPayments() — shared helper
  // -----------------------------------------------------------------------

  describe('markAllPayments()', () => {
    it('toggles paid flag on every payout in the array', () => {
      const payouts = [
        makeReconPayout({ paid: false }),
        makeReconPayout({ id: 'p2', paid: false })
      ];
      component.markAllPayments(payouts);
      expect(payouts[0].paid).toBeTrue();
      expect(payouts[1].paid).toBeTrue();
    });

    it('toggles paid=true → false when all were already paid', () => {
      const payouts = [makeReconPayout({ paid: true })];
      component.markAllPayments(payouts);
      expect(payouts[0].paid).toBeFalse();
    });
  });
});
