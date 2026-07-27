import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { WelcomeSelectionComponent } from './welcome-selection.component';
import { StorageService } from '../service/storage-service.service';
import { AnalyticsService } from '../service/analytics.service';

const analyticsSvcStub = { logScreenView: () => {}, logEvent: () => {} };

// Mutable stub so all tests share one TestBed/RouterTestingModule instance,
// avoiding the Karma "full page reload" that appears when multiple describe
// blocks each initialise RouterTestingModule independently.
const storageSvcStub: { userProfile: any; userType: string | undefined } = {
  userProfile: undefined,
  userType: undefined
};

describe('WelcomeSelectionComponent', () => {
  let component: WelcomeSelectionComponent;
  let fixture: ComponentFixture<WelcomeSelectionComponent>;

  beforeEach(() => {
    // Reset mutable stub before each test
    storageSvcStub.userProfile = undefined;
    storageSvcStub.userType = undefined;

    TestBed.configureTestingModule({
      declarations: [WelcomeSelectionComponent],
      imports: [RouterTestingModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: StorageService, useValue: storageSvcStub },
        { provide: AnalyticsService, useValue: analyticsSvcStub }
      ]
    });
    fixture = TestBed.createComponent(WelcomeSelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ── Smoke ──────────────────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── isReferralPartner ──────────────────────────────────────────────────────

  it('isReferralPartner: returns true when userType is referral-partner', () => {
    component.userType = 'referral-partner' as any;
    expect(component.isReferralPartner).toBeTrue();
  });

  it('isReferralPartner: returns false when userType is ambassador', () => {
    component.userType = 'ambassador' as any;
    expect(component.isReferralPartner).toBeFalse();
  });

  it('isReferralPartner: returns false when userType is driver', () => {
    component.userType = 'driver' as any;
    expect(component.isReferralPartner).toBeFalse();
  });

  it('isReferralPartner: returns false when userType is shop', () => {
    component.userType = 'shop' as any;
    expect(component.isReferralPartner).toBeFalse();
  });

  it('isReferralPartner: returns false when userType is individual', () => {
    component.userType = 'individual' as any;
    expect(component.isReferralPartner).toBeFalse();
  });

  it('isReferralPartner: returns false when userType is empty string', () => {
    component.userType = '' as any;
    expect(component.isReferralPartner).toBeFalse();
  });

  // ── isAmbassador ───────────────────────────────────────────────────────────

  it('isAmbassador: returns true when userType is ambassador', () => {
    component.userType = 'ambassador' as any;
    expect(component.isAmbassador).toBeTrue();
  });

  it('isAmbassador: returns false when userType is referral-partner', () => {
    component.userType = 'referral-partner' as any;
    expect(component.isAmbassador).toBeFalse();
  });

  // ── ngOnInit — userType from StorageService ────────────────────────────────
  // Mutate the stub directly; no new TestBed init needed.

  it('ngOnInit: adopts referral-partner from StorageService', () => {
    storageSvcStub.userType = 'referral-partner';
    component.ngOnInit();
    expect(component.userType).toBe('referral-partner' as any);
  });

  it('ngOnInit: adopts ambassador from StorageService', () => {
    storageSvcStub.userType = 'ambassador';
    component.ngOnInit();
    expect(component.userType).toBe('ambassador' as any);
  });
});
