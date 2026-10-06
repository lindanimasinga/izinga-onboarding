import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { DashboardComponent } from './dashboard.component';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { StorageService } from '../service/storage-service.service';
import { FirebaseService } from '../service/firebase.service';
import { AnalyticsService } from '../service/analytics.service';
import { UserProfile } from '../model/userProfile';
import { TermsConditionsComponent } from '../terms-conditions/terms-conditions.component';

const CURRENT_AMBASSADOR_ICA_VERSION = TermsConditionsComponent.AMBASSADOR_ICA_VERSION;
const CURRENT_DRIVER_ICA_VERSION = TermsConditionsComponent.DRIVER_ICA_VERSION;
const CURRENT_MERCHANT_ICA_VERSION = TermsConditionsComponent.MERCHANT_ICA_VERSION;

/**
 * TC-DASH-01  REFERRAL_PARTNER without icaAccepted: redirected to /referral-partner/enroll.
 * TC-DASH-02  REFERRAL_PARTNER without icaAccepted: NOT redirected to /indivisuals/terms.
 * TC-DASH-03  REFERRAL_PARTNER with icaAccepted=true: NOT redirected (proceeds normally, no nav call).
 * TC-DASH-04  AMBASSADOR without icaAccepted: redirected to /indivisuals/terms (regression guard).
 * TC-DASH-05  AMBASSADOR with icaAccepted=true and current icaVersion: NOT redirected (proceeds normally).
 * TC-DASH-06  MESSENGER without icaAccepted: redirected to /indivisuals/terms (driver ICA gate).
 * TC-DASH-07  MESSENGER with termsAccepted=true but no icaAccepted: redirected (driver ICA gate, covers 346 existing drivers).
 * TC-DASH-08  API 404: redirected to /indivisuals/user (existing error path, regression guard).
 * TC-DASH-10  AMBASSADOR with icaAccepted=true but PREVIOUS icaVersion ('v1'): redirected to re-accept.
 * TC-DASH-11  AMBASSADOR with icaAccepted=true and CURRENT icaVersion: NOT redirected.
 * TC-DASH-12  MESSENGER with icaAccepted=true but previous driver icaVersion: redirected to re-accept Driver ICA.
 * TC-DASH-13  MESSENGER with icaAccepted=true and current driver icaVersion: NOT redirected.
 */
describe('DashboardComponent — terms routing', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let mockService: jasmine.SpyObj<IzingaOrderManagementService>;
  let mockStorage: Partial<StorageService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockFirebase: jasmine.SpyObj<FirebaseService>;
  let mockAnalytics: jasmine.SpyObj<AnalyticsService>;

  const buildUser = (role: UserProfile.RoleEnum, overrides: Partial<UserProfile> = {}): UserProfile => ({
    id: 'user-001',
    role,
    mobileNumber: '+27812815555',
    ...overrides
  } as UserProfile);

  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate'], { url: '/indivisuals/dashboard' });

    mockStorage = { phoneNumber: '+27812815555', userProfile: undefined as any };

    mockAnalytics = jasmine.createSpyObj('AnalyticsService', ['logScreenView', 'logEvent']);
    mockFirebase = jasmine.createSpyObj('FirebaseService', ['getCurrentToken']);
    mockFirebase.getCurrentToken.and.returnValue(null);

    mockService = jasmine.createSpyObj('IzingaOrderManagementService', [
      'getCustomerByPhoneNumber',
      'getUserConfig',
      'updateDeviceToUser',
      'registerDeviceToUser'
    ]);
    // Default: getUserConfig returns empty (used by findMissingDocuments)
    mockService.getUserConfig.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      declarations: [DashboardComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: IzingaOrderManagementService, useValue: mockService },
        { provide: StorageService, useValue: mockStorage },
        { provide: Router, useValue: mockRouter },
        { provide: FirebaseService, useValue: mockFirebase },
        { provide: AnalyticsService, useValue: mockAnalytics }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
  });

  // TC-DASH-01
  it('TC-DASH-01: REFERRAL_PARTNER without icaAccepted is redirected to /referral-partner/enroll', fakeAsync(() => {
    const user = buildUser(UserProfile.RoleEnum.REFERRALPARTNER, { icaAccepted: false });
    mockService.getCustomerByPhoneNumber.and.returnValue(of(user));

    fixture.detectChanges();
    tick();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/referral-partner/enroll']);
  }));

  // TC-DASH-02
  it('TC-DASH-02: REFERRAL_PARTNER without icaAccepted is NOT redirected to /indivisuals/terms', fakeAsync(() => {
    const user = buildUser(UserProfile.RoleEnum.REFERRALPARTNER, { icaAccepted: false });
    mockService.getCustomerByPhoneNumber.and.returnValue(of(user));

    fixture.detectChanges();
    tick();

    const calls = mockRouter.navigate.calls.allArgs();
    const wentToTerms = calls.some(args => {
      const route = args[0] as unknown as string[];
      return Array.isArray(route) && route[0]?.includes('/terms');
    });
    expect(wentToTerms).toBeFalse();
  }));

  // TC-DASH-03
  it('TC-DASH-03: REFERRAL_PARTNER with icaAccepted=true proceeds normally (no redirect)', fakeAsync(() => {
    const user = buildUser(UserProfile.RoleEnum.REFERRALPARTNER, { icaAccepted: true });
    mockService.getCustomerByPhoneNumber.and.returnValue(of(user));
    mockService.getUserConfig.and.returnValue(of([]));

    fixture.detectChanges();
    tick();

    expect(mockRouter.navigate).not.toHaveBeenCalled();
    expect(component.isReferralPartner).toBeTrue();
    expect(component.isAmbassador).toBeFalse();
  }));

  // TC-DASH-09
  it('TC-DASH-09: REFERRAL_PARTNER with icaAccepted=true shows RP card grid and hides generic Payouts card', fakeAsync(() => {
    const user = buildUser(UserProfile.RoleEnum.REFERRALPARTNER, { icaAccepted: true });
    mockService.getCustomerByPhoneNumber.and.returnValue(of(user));
    mockService.getUserConfig.and.returnValue(of([]));

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const nativeEl: HTMLElement = fixture.nativeElement;

    // RP card grid must be present — contains the 5 new card titles
    const allText = nativeEl.textContent || '';
    expect(allText).toContain('My Referral Code');
    expect(allText).toContain('My Referrals');
    expect(allText).toContain('My Commissions');

    // Generic grid Payouts card must NOT be present — the generic grid is hidden for RP
    // Query all fw-bold elements and verify none of the non-RP-grid ones render "Payouts"
    const genericGrid = nativeEl.querySelector('[class*="menu-items"]:not([class*="ng-hide"])');
    // Simpler: the generic grid div has *ngIf="!isAmbassador && !isReferralPartner", so it
    // should be absent from the DOM entirely when isReferralPartner is true.
    // We verify no element with text "Payouts" exists outside the RP grid context by checking
    // that the generic payouts card label is not rendered.
    const boldDivs = Array.from(nativeEl.querySelectorAll('.fw-bold'));
    const payoutsLabels = boldDivs.filter(el => el.textContent?.trim() === 'Payouts' || el.textContent?.trim() === 'Team Payouts');
    expect(payoutsLabels.length).toBe(0);
  }));

  // TC-DASH-04
  it('TC-DASH-04: AMBASSADOR without icaAccepted is redirected to /indivisuals/terms (regression)', fakeAsync(() => {
    const user = buildUser(UserProfile.RoleEnum.AMBASSADOR, { icaAccepted: false });
    mockService.getCustomerByPhoneNumber.and.returnValue(of(user));

    fixture.detectChanges();
    tick();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/indivisuals/terms', user.id]);
  }));

  // TC-DASH-05
  it('TC-DASH-05: AMBASSADOR with icaAccepted=true and current icaVersion proceeds normally (no redirect)', fakeAsync(() => {
    const user = buildUser(UserProfile.RoleEnum.AMBASSADOR, {
      icaAccepted: true,
      icaVersion: CURRENT_AMBASSADOR_ICA_VERSION
    });
    mockService.getCustomerByPhoneNumber.and.returnValue(of(user));
    mockService.getUserConfig.and.returnValue(of([]));

    fixture.detectChanges();
    tick();

    expect(mockRouter.navigate).not.toHaveBeenCalled();
  }));

  // TC-DASH-06: MESSENGER without icaAccepted is redirected (driver ICA gate)
  it('TC-DASH-06: MESSENGER without icaAccepted is redirected to /indivisuals/terms (driver ICA gate)', fakeAsync(() => {
    const user = buildUser(UserProfile.RoleEnum.MESSENGER, { termsAccepted: false, icaAccepted: false });
    mockService.getCustomerByPhoneNumber.and.returnValue(of(user));

    fixture.detectChanges();
    tick();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/indivisuals/terms', user.id]);
  }));

  // TC-DASH-07: MESSENGER with termsAccepted=true but no Driver ICA must be redirected.
  // This is the 346-existing-drivers case: they completed onboarding before the ICA was
  // introduced so termsAccepted=true but icaAccepted is falsy. The driver ICA gate must
  // block them and route them back to sign the agreement.
  it('TC-DASH-07: MESSENGER with termsAccepted=true but icaAccepted=false is redirected to /indivisuals/terms (existing-driver gate)', fakeAsync(() => {
    const user = buildUser(UserProfile.RoleEnum.MESSENGER, { termsAccepted: true, icaAccepted: false });
    mockService.getCustomerByPhoneNumber.and.returnValue(of(user));

    fixture.detectChanges();
    tick();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/indivisuals/terms', user.id]);
  }));

  // TC-DASH-10: Ambassador with previous ICA version must be redirected to re-accept
  it('TC-DASH-10: AMBASSADOR with icaAccepted=true but previous icaVersion is redirected to re-accept ICA', fakeAsync(() => {
    const user = buildUser(UserProfile.RoleEnum.AMBASSADOR, {
      icaAccepted: true,
      icaVersion: 'v1'   // previous version — pre-dates the v2 requirement
    });
    mockService.getCustomerByPhoneNumber.and.returnValue(of(user));

    fixture.detectChanges();
    tick();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/indivisuals/terms', user.id]);
  }));

  // TC-DASH-11: Ambassador with current ICA version must NOT be redirected
  it('TC-DASH-11: AMBASSADOR with icaAccepted=true and current icaVersion is NOT redirected', fakeAsync(() => {
    const user = buildUser(UserProfile.RoleEnum.AMBASSADOR, {
      icaAccepted: true,
      icaVersion: CURRENT_AMBASSADOR_ICA_VERSION
    });
    mockService.getCustomerByPhoneNumber.and.returnValue(of(user));
    mockService.getUserConfig.and.returnValue(of([]));

    fixture.detectChanges();
    tick();

    expect(mockRouter.navigate).not.toHaveBeenCalled();
  }));

  // TC-DASH-12: MESSENGER with icaAccepted=true but previous driver ICA version must be redirected
  it('TC-DASH-12: MESSENGER with icaAccepted=true but previous icaVersion is redirected to re-accept Driver ICA', fakeAsync(() => {
    const user = buildUser(UserProfile.RoleEnum.MESSENGER, {
      termsAccepted: true,
      icaAccepted: true,
      icaVersion: 'driver-v1'   // previous version — not current
    });
    mockService.getCustomerByPhoneNumber.and.returnValue(of(user));

    fixture.detectChanges();
    tick();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/indivisuals/terms', user.id]);
  }));

  // TC-DASH-13: MESSENGER with icaAccepted=true and current driver ICA version must NOT be redirected
  it('TC-DASH-13: MESSENGER with icaAccepted=true and current driver icaVersion proceeds normally (no redirect)', fakeAsync(() => {
    const user = buildUser(UserProfile.RoleEnum.MESSENGER, {
      termsAccepted: true,
      icaAccepted: true,
      icaVersion: CURRENT_DRIVER_ICA_VERSION
    });
    mockService.getCustomerByPhoneNumber.and.returnValue(of(user));
    mockService.getUserConfig.and.returnValue(of([]));

    fixture.detectChanges();
    tick();

    expect(mockRouter.navigate).not.toHaveBeenCalled();
  }));

  // TC-DASH-08
  it('TC-DASH-08: API 404 redirects to /indivisuals/user (existing error path regression)', fakeAsync(() => {
    mockService.getCustomerByPhoneNumber.and.returnValue(throwError({ status: 404 }));

    fixture.detectChanges();
    tick();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/indivisuals/user']);
  }));
});

// ---------------------------------------------------------------------------
// ONB-STORE-ROLE — STORE_ADMIN role guard for the /business/ onboarding flow.
//
// TC-DASH-14  CUSTOMER on /business/dashboard is redirected to /business/user for profile setup.
// TC-DASH-15  CUSTOMER on /business/dashboard is NOT routed to /business/terms (old broken path).
// TC-DASH-16  STOREADMIN on /business/dashboard with termsAccepted proceeds normally (no redirect).
// ---------------------------------------------------------------------------
describe('DashboardComponent — business profile-setup guard', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let mockService: jasmine.SpyObj<IzingaOrderManagementService>;
  let mockStorage: Partial<StorageService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockFirebase: jasmine.SpyObj<FirebaseService>;
  let mockAnalytics: jasmine.SpyObj<AnalyticsService>;

  const buildUser = (role: UserProfile.RoleEnum, overrides: Partial<UserProfile> = {}): UserProfile => ({
    id: 'user-biz-001',
    role,
    mobileNumber: '+27812819999',
    ...overrides
  } as UserProfile);

  beforeEach(async () => {
    // Simulate being on the /business/ route
    mockRouter = jasmine.createSpyObj('Router', ['navigate'], { url: '/business/dashboard' });
    mockStorage = { phoneNumber: '+27812819999', userProfile: undefined as any };
    mockAnalytics = jasmine.createSpyObj('AnalyticsService', ['logScreenView', 'logEvent']);
    mockFirebase = jasmine.createSpyObj('FirebaseService', ['getCurrentToken']);
    mockFirebase.getCurrentToken.and.returnValue(null);
    mockService = jasmine.createSpyObj('IzingaOrderManagementService', [
      'getCustomerByPhoneNumber', 'getUserConfig', 'updateDeviceToUser', 'registerDeviceToUser'
    ]);
    mockService.getUserConfig.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      declarations: [DashboardComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: IzingaOrderManagementService, useValue: mockService },
        { provide: StorageService, useValue: mockStorage },
        { provide: Router, useValue: mockRouter },
        { provide: FirebaseService, useValue: mockFirebase },
        { provide: AnalyticsService, useValue: mockAnalytics }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
  });

  // TC-DASH-14: Primary regression guard — WhatsApp auto-created CUSTOMER on /business/
  // must be redirected to profile setup, not past it.
  it('TC-DASH-14: CUSTOMER on /business/dashboard is redirected to /business/user for profile setup', fakeAsync(() => {
    // Simulate a WhatsApp-auto-created profile: role CUSTOMER, no terms accepted.
    const user = buildUser(UserProfile.RoleEnum.CUSTOMER, { termsAccepted: false });
    mockService.getCustomerByPhoneNumber.and.returnValue(of(user));

    fixture.detectChanges();
    tick();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/business/user']);
  }));

  // TC-DASH-15: The WhatsApp auto-created CUSTOMER must NOT be sent to /business/terms —
  // that route would show general T&Cs with the wrong role, producing the driver dashboard.
  it('TC-DASH-15: CUSTOMER on /business/dashboard is NOT redirected to /business/terms', fakeAsync(() => {
    const user = buildUser(UserProfile.RoleEnum.CUSTOMER, { termsAccepted: false });
    mockService.getCustomerByPhoneNumber.and.returnValue(of(user));

    fixture.detectChanges();
    tick();

    const calls = mockRouter.navigate.calls.allArgs();
    const wentToTerms = calls.some(args => {
      const route = args[0] as unknown as string[];
      return Array.isArray(route) && route[0]?.includes('/terms');
    });
    expect(wentToTerms).toBeFalse();
  }));

  // TC-DASH-16: An existing STOREADMIN with accepted ICA (merchant version) AND an existing
  // store must pass through the new guards and proceed normally (no redirect).
  it('TC-DASH-16: STOREADMIN on /business/dashboard with accepted ICA and storeId proceeds normally (no redirect)', fakeAsync(() => {
    const user = buildUser(UserProfile.RoleEnum.STOREADMIN, {
      icaAccepted: true,
      icaVersion: CURRENT_MERCHANT_ICA_VERSION,
      storeId: 'store-biz-001'
    });
    mockService.getCustomerByPhoneNumber.and.returnValue(of(user));

    fixture.detectChanges();
    tick();

    expect(mockRouter.navigate).not.toHaveBeenCalled();
  }));
});

// ---------------------------------------------------------------------------
// ONB-UX-01 — REQ-17, REQ-16 (driver toggle, empty state)
// ---------------------------------------------------------------------------

describe('DashboardComponent — ONB-UX-01 requirements', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let mockService: jasmine.SpyObj<IzingaOrderManagementService>;
  let mockStorage: Partial<StorageService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockFirebase: jasmine.SpyObj<FirebaseService>;
  let mockAnalytics: jasmine.SpyObj<AnalyticsService>;

  const buildUser = (role: UserProfile.RoleEnum, overrides: Partial<UserProfile> = {}): UserProfile => ({
    id: 'user-001',
    role,
    mobileNumber: '+27812815555',
    termsAccepted: true,
    icaAccepted: true,
    icaVersion: TermsConditionsComponent.DRIVER_ICA_VERSION,
    ...overrides
  } as UserProfile);

  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate'], { url: '/business/dashboard' });
    mockStorage = { phoneNumber: '+27812815555', userProfile: undefined as any };
    mockAnalytics = jasmine.createSpyObj('AnalyticsService', ['logScreenView', 'logEvent']);
    mockFirebase = jasmine.createSpyObj('FirebaseService', ['getCurrentToken']);
    mockFirebase.getCurrentToken.and.returnValue(null);
    mockService = jasmine.createSpyObj('IzingaOrderManagementService', [
      'getCustomerByPhoneNumber', 'getUserConfig', 'updateDeviceToUser', 'registerDeviceToUser'
    ]);
    mockService.getUserConfig.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      declarations: [DashboardComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: IzingaOrderManagementService, useValue: mockService },
        { provide: StorageService, useValue: mockStorage },
        { provide: Router, useValue: mockRouter },
        { provide: FirebaseService, useValue: mockFirebase },
        { provide: AnalyticsService, useValue: mockAnalytics }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
  });

  // REQ-17: no shadow-sm on dashboard cards
  it('REQ-17 — no shadow-sm classes exist on dashboard cards', fakeAsync(() => {
    mockService.getCustomerByPhoneNumber.and.returnValue(
      of(buildUser(UserProfile.RoleEnum.STOREADMIN, { termsAccepted: true, storeId: 'store-req17' }))
    );
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    const html: string = fixture.nativeElement.innerHTML;
    expect(html).not.toContain('shadow-sm');
  }));

  // REQ-16: driver availability toggle is NOT visible for STORE_ADMIN
  it('REQ-16 — driver availability toggle hidden for STORE_ADMIN', fakeAsync(() => {
    mockService.getCustomerByPhoneNumber.and.returnValue(
      of(buildUser(UserProfile.RoleEnum.STOREADMIN, { termsAccepted: true, storeId: 'store-req16' }))
    );
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(component.isStoreAdmin).toBeTrue();
    // The toggle is inside *ngIf="!isAmbassador && !isStoreAdmin"
    // When isStoreAdmin=true, it should not render
    const toggle = fixture.nativeElement.querySelector('.btn-group-toggle[data-toggle="buttons"]');
    // If the element exists it must be inside the ambassador/referral grids, not the availability toggle
    // The isStoreAdmin check means it won't be the AVAILABLE/AWAY/OFFLINE toggle
    const html: string = fixture.nativeElement.innerHTML;
    const hasAvailabilityToggle = html.includes('AVAILABLE') && html.includes('AWAY') && html.includes('OFFLINE');
    expect(hasAvailabilityToggle).toBeFalse();
  }));
});

// ---------------------------------------------------------------------------
// Merchant funnel completeness gate — TC-DASH-17 through TC-DASH-19
//
// TC-DASH-17  STOREADMIN + termsAccepted + no storeId + no selectedTier → redirected to /business/tier-select/:id
// TC-DASH-18  STOREADMIN + termsAccepted + storeId present → dashboard renders (no redirect, regression guard)
// TC-DASH-19  STOREADMIN + termsAccepted + no storeId + selectedTier set (mid-funnel) → NOT bounced to tier-select
// ---------------------------------------------------------------------------
describe('DashboardComponent — merchant funnel completeness gate', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let mockService: jasmine.SpyObj<IzingaOrderManagementService>;
  let mockStorage: Partial<StorageService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockFirebase: jasmine.SpyObj<FirebaseService>;
  let mockAnalytics: jasmine.SpyObj<AnalyticsService>;

  // Merchant users complete onboarding via the ICA flow (icaAccepted + icaVersion),
  // NOT termsAccepted. Use icaAccepted + CURRENT_MERCHANT_ICA_VERSION as the defaults
  // so hasAcceptedTerms evaluates true for STOREADMIN — the funnel completeness gate
  // (storeId / selectedTier check) is what these tests are actually exercising.
  const buildUser = (overrides: Partial<UserProfile> = {}): UserProfile => ({
    id: 'user-funnel-01',
    role: UserProfile.RoleEnum.STOREADMIN,
    mobileNumber: '+27812810000',
    icaAccepted: true,
    icaVersion: CURRENT_MERCHANT_ICA_VERSION,
    ...overrides
  } as UserProfile);

  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate'], { url: '/business/dashboard' });
    mockAnalytics = jasmine.createSpyObj('AnalyticsService', ['logScreenView', 'logEvent']);
    mockFirebase = jasmine.createSpyObj('FirebaseService', ['getCurrentToken']);
    mockFirebase.getCurrentToken.and.returnValue(null);
    mockService = jasmine.createSpyObj('IzingaOrderManagementService', [
      'getCustomerByPhoneNumber', 'getUserConfig', 'updateDeviceToUser', 'registerDeviceToUser'
    ]);
    mockService.getUserConfig.and.returnValue(of([]));

    // Default: no selectedTier in session (null simulates no session key).
    mockStorage = {
      phoneNumber: '+27812810000',
      userProfile: undefined as any,
      selectedTier: null as any
    };

    await TestBed.configureTestingModule({
      declarations: [DashboardComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: IzingaOrderManagementService, useValue: mockService },
        { provide: StorageService, useValue: mockStorage },
        { provide: Router, useValue: mockRouter },
        { provide: FirebaseService, useValue: mockFirebase },
        { provide: AnalyticsService, useValue: mockAnalytics }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
  });

  // TC-DASH-17: The main fix — STOREADMIN with accepted T&Cs but no store and no session tier
  // must be redirected to tier-select, not left on the merchant dashboard.
  it('TC-DASH-17: STOREADMIN + termsAccepted + no storeId + no selectedTier → redirected to /business/tier-select/:id', fakeAsync(() => {
    const user = buildUser(); // no storeId, mockStorage.selectedTier is null
    mockService.getCustomerByPhoneNumber.and.returnValue(of(user));

    fixture.detectChanges();
    tick();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/business/tier-select', user.id]);
  }));

  // TC-DASH-18: Regression guard — an existing merchant with a store must pass straight
  // through to the dashboard regardless of session tier state.
  it('TC-DASH-18: STOREADMIN + termsAccepted + storeId present → dashboard renders (no redirect)', fakeAsync(() => {
    const user = buildUser({ storeId: 'store-existing-01' });
    mockService.getCustomerByPhoneNumber.and.returnValue(of(user));

    fixture.detectChanges();
    tick();

    expect(mockRouter.navigate).not.toHaveBeenCalled();
    expect(component.isStoreAdmin).toBeTrue();
  }));

  // TC-DASH-19: Mid-funnel pass-through — a STOREADMIN who has no store yet but HAS a tier
  // in their session (they just left /business/tier-select → /business/info) must NOT be
  // bounced back to tier-select if they somehow reach /business/dashboard mid-funnel
  // (e.g. BusinessUpdateComponent navigates here for FREE-tier after store creation before
  // the backend response propagates storeId to the profile). The selectedTier signal keeps
  // them moving forward.
  it('TC-DASH-19: STOREADMIN + termsAccepted + no storeId + selectedTier set → NOT bounced to tier-select', fakeAsync(() => {
    const user = buildUser(); // no storeId
    // Simulate having selected a tier this session
    (mockStorage as any).selectedTier = 'FREE';
    mockService.getCustomerByPhoneNumber.and.returnValue(of(user));

    fixture.detectChanges();
    tick();

    const calls = mockRouter.navigate.calls.allArgs();
    const wentToTierSelect = calls.some(args => {
      const route = args[0] as unknown as string[];
      return Array.isArray(route) && route[0]?.includes('/business/tier-select');
    });
    expect(wentToTierSelect).toBeFalse();
  }));
});

// ---------------------------------------------------------------------------
// ONB-DRIVER-GATE — driver profile-setup guard for /indivisuals/ routes.
//
// TC-DASH-20  CUSTOMER + userType='driver' on /indivisuals/dashboard → redirected to /indivisuals/user.
// TC-DASH-21  CUSTOMER + userType='driver' → NOT redirected to /indivisuals/terms (must go to user form, not T&Cs).
// TC-DASH-22  MESSENGER + userType='driver' → NOT redirected (existing driver, correct role already).
// TC-DASH-23  CUSTOMER + userType='individual' → NOT redirected (plain individual, not a driver-flow user).
// TC-DASH-24  CUSTOMER + userType='ambassador' → NOT redirected by this guard (ambassador flow is separate).
// ---------------------------------------------------------------------------
describe('DashboardComponent — driver profile-setup guard', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let mockService: jasmine.SpyObj<IzingaOrderManagementService>;
  let mockStorage: Partial<StorageService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockFirebase: jasmine.SpyObj<FirebaseService>;
  let mockAnalytics: jasmine.SpyObj<AnalyticsService>;

  const buildUser = (role: UserProfile.RoleEnum, overrides: Partial<UserProfile> = {}): UserProfile => ({
    id: 'user-driver-001',
    role,
    mobileNumber: '+27812811111',
    ...overrides
  } as UserProfile);

  const buildTestBed = async (routerUrl: string, userType: string | undefined) => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate'], { url: routerUrl });
    mockStorage = {
      phoneNumber: '+27812811111',
      userProfile: undefined as any,
      userType
    };
    mockAnalytics = jasmine.createSpyObj('AnalyticsService', ['logScreenView', 'logEvent']);
    mockFirebase = jasmine.createSpyObj('FirebaseService', ['getCurrentToken']);
    mockFirebase.getCurrentToken.and.returnValue(null);
    mockService = jasmine.createSpyObj('IzingaOrderManagementService', [
      'getCustomerByPhoneNumber', 'getUserConfig', 'updateDeviceToUser', 'registerDeviceToUser'
    ]);
    mockService.getUserConfig.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      declarations: [DashboardComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: IzingaOrderManagementService, useValue: mockService },
        { provide: StorageService, useValue: mockStorage },
        { provide: Router, useValue: mockRouter },
        { provide: FirebaseService, useValue: mockFirebase },
        { provide: AnalyticsService, useValue: mockAnalytics }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
  };

  // TC-DASH-20: Primary fix — brand-new CUSTOMER who entered via the driver door must be
  // redirected to the driver profile form, not left on the dashboard with the wrong role.
  it('TC-DASH-20: CUSTOMER + userType="driver" on /indivisuals/dashboard → redirected to /indivisuals/user', fakeAsync(async () => {
    await buildTestBed('/indivisuals/dashboard', 'driver');
    const user = buildUser(UserProfile.RoleEnum.CUSTOMER);
    mockService.getCustomerByPhoneNumber.and.returnValue(of(user));

    fixture.detectChanges();
    tick();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/indivisuals/user']);
  }));

  // TC-DASH-21: The CUSTOMER driver must NOT be sent to /indivisuals/terms — that shows generic
  // T&Cs with the wrong role, producing a functional-looking dashboard for an unregistered user.
  it('TC-DASH-21: CUSTOMER + userType="driver" → NOT redirected to /indivisuals/terms', fakeAsync(async () => {
    await buildTestBed('/indivisuals/dashboard', 'driver');
    const user = buildUser(UserProfile.RoleEnum.CUSTOMER);
    mockService.getCustomerByPhoneNumber.and.returnValue(of(user));

    fixture.detectChanges();
    tick();

    const calls = mockRouter.navigate.calls.allArgs();
    const wentToTerms = calls.some(args => {
      const route = args[0] as unknown as string[];
      return Array.isArray(route) && route[0]?.includes('/terms');
    });
    expect(wentToTerms).toBeFalse();
  }));

  // TC-DASH-22: An existing driver (role already MESSENGER) must never be redirected to profile
  // setup — they completed onboarding and their role was upgraded when they submitted the form.
  it('TC-DASH-22: MESSENGER + userType="driver" → NOT redirected (existing driver, correct role)', fakeAsync(async () => {
    await buildTestBed('/indivisuals/dashboard', 'driver');
    const user = buildUser(UserProfile.RoleEnum.MESSENGER, {
      icaAccepted: true,
      icaVersion: TermsConditionsComponent.DRIVER_ICA_VERSION
    });
    mockService.getCustomerByPhoneNumber.and.returnValue(of(user));
    mockService.getUserConfig.and.returnValue(of([]));

    fixture.detectChanges();
    tick();

    expect(mockRouter.navigate).not.toHaveBeenCalled();
  }));

  // TC-DASH-23: A plain individual (userType='individual') with CUSTOMER role is a legitimate
  // customer, NOT a driver who bypassed setup — must not be gated to the driver profile form.
  it('TC-DASH-23: CUSTOMER + userType="individual" → NOT redirected to /indivisuals/user (plain individual)', fakeAsync(async () => {
    await buildTestBed('/indivisuals/dashboard', 'individual');
    // termsAccepted=true so the terms gate doesn't fire either; we only want to verify
    // the driver profile-setup guard ignores userType !== 'driver'
    const user = buildUser(UserProfile.RoleEnum.CUSTOMER, { termsAccepted: true });
    mockService.getCustomerByPhoneNumber.and.returnValue(of(user));
    mockService.getUserConfig.and.returnValue(of([]));

    fixture.detectChanges();
    tick();

    const calls = mockRouter.navigate.calls.allArgs();
    const wentToDriverUser = calls.some(args => {
      const route = args[0] as unknown as string[];
      return Array.isArray(route) && route[0] === '/indivisuals/user';
    });
    expect(wentToDriverUser).toBeFalse();
  }));

  // TC-DASH-24: An ambassador (userType='ambassador') with CUSTOMER role has their own
  // enrollment flow; the driver guard must not capture them and send them to the driver form.
  it('TC-DASH-24: CUSTOMER + userType="ambassador" → NOT redirected to /indivisuals/user by driver guard', fakeAsync(async () => {
    await buildTestBed('/indivisuals/dashboard', 'ambassador');
    const user = buildUser(UserProfile.RoleEnum.CUSTOMER, { icaAccepted: false });
    mockService.getCustomerByPhoneNumber.and.returnValue(of(user));

    fixture.detectChanges();
    tick();

    const calls = mockRouter.navigate.calls.allArgs();
    const wentToDriverUser = calls.some(args => {
      const route = args[0] as unknown as string[];
      return Array.isArray(route) && route[0] === '/indivisuals/user';
    });
    expect(wentToDriverUser).toBeFalse();
  }));
});
