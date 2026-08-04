import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';

import { ReconDashboardComponent } from './recon-dashboard.component';
import { ReconPayoutService } from '../../service/recon-payout.service';

describe('ReconDashboardComponent — CSV confirm/cancel state machine', () => {
  let component: ReconDashboardComponent;
  let fixture: ComponentFixture<ReconDashboardComponent>;
  let reconServiceSpy: jasmine.SpyObj<ReconPayoutService>;

  const makePayouts = (overrides: Partial<any>[] = [{}]): any[] =>
    overrides.map(o => ({
      id: 'p1',
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
      emailSent: false,
      tag: {},
      ...o
    }));

  beforeEach(async () => {
    reconServiceSpy = jasmine.createSpyObj('ReconPayoutService', [
      'getPayoutBundles',
      'triggerShopCsvDownload',
      'triggerMessengerCsvDownload',
      'patchShopPayoutBundle',
      'patchMessengerPayoutBundle'
    ]);

    // Default: return empty arrays so ngOnInit doesn't blow up.
    reconServiceSpy.getPayoutBundles.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      declarations: [ReconDashboardComponent],
      imports: [RouterTestingModule],
      providers: [
        { provide: ReconPayoutService, useValue: reconServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReconDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('requestCsvDownload()', () => {
    it('sets pendingCsvType to "shop" without calling the service (shows confirm dialog)', () => {
      component.requestCsvDownload('shop');

      expect(component.pendingCsvType).toBe('shop');
      expect(reconServiceSpy.triggerShopCsvDownload).not.toHaveBeenCalled();
    });

    it('sets pendingCsvType to "messenger" without calling the service', () => {
      component.requestCsvDownload('messenger');

      expect(component.pendingCsvType).toBe('messenger');
      expect(reconServiceSpy.triggerMessengerCsvDownload).not.toHaveBeenCalled();
    });
  });

  describe('cancelCsvDownload()', () => {
    it('clears pendingCsvType and does NOT call the service', () => {
      component.pendingCsvType = 'shop';

      component.cancelCsvDownload();

      expect(component.pendingCsvType).toBeNull();
      expect(reconServiceSpy.triggerShopCsvDownload).not.toHaveBeenCalled();
    });

    it('clears pendingCsvType for messenger type and does NOT call the service', () => {
      component.pendingCsvType = 'messenger';

      component.cancelCsvDownload();

      expect(component.pendingCsvType).toBeNull();
      expect(reconServiceSpy.triggerMessengerCsvDownload).not.toHaveBeenCalled();
    });
  });

  describe('confirmCsvDownload()', () => {
    it('calls triggerShopCsvDownload when pendingCsvType is "shop" and clears pendingCsvType', () => {
      reconServiceSpy.triggerShopCsvDownload.and.returnValue(of(undefined));
      component.pendingCsvType = 'shop';

      component.confirmCsvDownload();

      expect(reconServiceSpy.triggerShopCsvDownload).toHaveBeenCalledTimes(1);
      expect(component.pendingCsvType).toBeNull();
    });

    it('calls triggerMessengerCsvDownload when pendingCsvType is "messenger" and clears pendingCsvType', () => {
      reconServiceSpy.triggerMessengerCsvDownload.and.returnValue(of(undefined));
      component.pendingCsvType = 'messenger';

      component.confirmCsvDownload();

      expect(reconServiceSpy.triggerMessengerCsvDownload).toHaveBeenCalledTimes(1);
      expect(component.pendingCsvType).toBeNull();
    });

    it('does NOT call either CSV service when pendingCsvType is null', () => {
      component.pendingCsvType = null;

      component.confirmCsvDownload();

      expect(reconServiceSpy.triggerShopCsvDownload).not.toHaveBeenCalled();
      expect(reconServiceSpy.triggerMessengerCsvDownload).not.toHaveBeenCalled();
    });
  });
});

describe('ReconDashboardComponent — Ambassador / Referral Partner read-only sections', () => {
  let component: ReconDashboardComponent;
  let fixture: ComponentFixture<ReconDashboardComponent>;
  let reconServiceSpy: jasmine.SpyObj<ReconPayoutService>;

  const makePayouts = (overrides: Partial<any>[] = [{}]): any[] =>
    overrides.map(o => ({
      id: 'p1',
      toId: 'u1',
      toName: 'Test Recipient',
      toType: 'CHEQUE',
      toBankName: 'FNB',
      toAccountNumber: '123',
      toBranchCode: '250655',
      fromReference: 'ref',
      toReference: 'ref',
      orders: [],
      payoutStage: 'PENDING',
      paid: false,
      total: 0,
      emailSent: false,
      tag: {},
      ...o
    }));

  beforeEach(async () => {
    reconServiceSpy = jasmine.createSpyObj('ReconPayoutService', [
      'getPayoutBundles',
      'triggerShopCsvDownload',
      'triggerMessengerCsvDownload',
      'patchShopPayoutBundle',
      'patchMessengerPayoutBundle'
    ]);
    reconServiceSpy.getPayoutBundles.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      declarations: [ReconDashboardComponent],
      imports: [RouterTestingModule],
      providers: [{ provide: ReconPayoutService, useValue: reconServiceSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(ReconDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('loadAmbassadorPayouts()', () => {
    it('calls getPayoutBundles with AMBASSADOR type and the current date range', () => {
      reconServiceSpy.getPayoutBundles.calls.reset();
      reconServiceSpy.getPayoutBundles.and.returnValue(of([]));

      component.loadAmbassadorPayouts();

      const calls = reconServiceSpy.getPayoutBundles.calls.allArgs();
      expect(calls.some(args => args[0] === 'AMBASSADOR')).toBeTrue();
    });

    it('groups returned payouts by stage', () => {
      const payouts = makePayouts([
        { payoutStage: 'PENDING', commissionAmount: 50 },
        { payoutStage: 'PENDING', commissionAmount: 75 },
        { payoutStage: 'COMPLETED', commissionAmount: 30 }
      ]);
      reconServiceSpy.getPayoutBundles.and.returnValue(of(payouts));

      component.loadAmbassadorPayouts();

      expect(component.ambassadorGroupedPayouts['PENDING'].length).toBe(2);
      expect(component.ambassadorGroupedPayouts['COMPLETED'].length).toBe(1);
    });

    it('sets ambassadorError and clears isLoadingAmbassador on error', () => {
      reconServiceSpy.getPayoutBundles.and.returnValue(throwError(() => new Error('net')));

      component.loadAmbassadorPayouts();

      expect(component.ambassadorError).toBeTruthy();
      expect(component.isLoadingAmbassador).toBeFalse();
    });
  });

  describe('loadReferralPayouts()', () => {
    it('calls getPayoutBundles with REFERRAL_PARTNER type', () => {
      reconServiceSpy.getPayoutBundles.calls.reset();
      reconServiceSpy.getPayoutBundles.and.returnValue(of([]));

      component.loadReferralPayouts();

      const calls = reconServiceSpy.getPayoutBundles.calls.allArgs();
      expect(calls.some(args => args[0] === 'REFERRAL_PARTNER')).toBeTrue();
    });

    it('groups returned payouts by stage', () => {
      const payouts = makePayouts([
        { payoutStage: 'PROCESSING', commissionAmount: 200 },
        { payoutStage: 'COMPLETED', commissionAmount: 150 }
      ]);
      reconServiceSpy.getPayoutBundles.and.returnValue(of(payouts));

      component.loadReferralPayouts();

      expect(component.referralGroupedPayouts['PROCESSING'].length).toBe(1);
      expect(component.referralGroupedPayouts['COMPLETED'].length).toBe(1);
    });

    it('sets referralError and clears isLoadingReferral on error', () => {
      reconServiceSpy.getPayoutBundles.and.returnValue(throwError(() => new Error('net')));

      component.loadReferralPayouts();

      expect(component.referralError).toBeTruthy();
      expect(component.isLoadingReferral).toBeFalse();
    });
  });

  describe('commissionTotal()', () => {
    it('sums commissionAmount across all payouts in the array', () => {
      const payouts = makePayouts([
        { commissionAmount: 100 },
        { commissionAmount: 250 },
        { commissionAmount: 50 }
      ]);

      expect(component.commissionTotal(payouts)).toBe(400);
    });

    it('treats undefined commissionAmount as zero', () => {
      const payouts = makePayouts([{ commissionAmount: undefined }, { commissionAmount: 100 }]);

      expect(component.commissionTotal(payouts)).toBe(100);
    });
  });

  describe('getTotalCommission()', () => {
    it('sums commission across all stages', () => {
      component.ambassadorGroupedPayouts = {
        PENDING: makePayouts([{ commissionAmount: 100 }]),
        COMPLETED: makePayouts([{ commissionAmount: 200 }])
      };

      expect(component.getTotalCommission(component.ambassadorGroupedPayouts)).toBe(300);
    });
  });

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

  describe('onDayChange() triggers all four loaders', () => {
    it('calls getPayoutBundles 4 times (SHOP, MESSENGER, AMBASSADOR, REFERRAL_PARTNER)', () => {
      reconServiceSpy.getPayoutBundles.calls.reset();
      reconServiceSpy.getPayoutBundles.and.returnValue(of([]));

      component.onDayChange();

      const types = reconServiceSpy.getPayoutBundles.calls.allArgs().map(a => a[0]);
      expect(types).toContain('SHOP');
      expect(types).toContain('MESSENGER');
      expect(types).toContain('AMBASSADOR');
      expect(types).toContain('REFERRAL_PARTNER');
    });
  });
});
