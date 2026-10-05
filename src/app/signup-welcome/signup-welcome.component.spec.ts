import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Router, ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { SignupWelcomeComponent } from './signup-welcome.component';
import { StorageService } from '../service/storage-service.service';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { AnalyticsService } from '../service/analytics.service';
import { UserProfile } from '../model/models';

/**
 * TC-SW-01  REFERRAL_PARTNER: termsRoute → ['/referral-partner/enroll']
 * TC-SW-02  REFERRAL_PARTNER: termsRoute has no userId segment (length === 2)
 * TC-SW-03  REFERRAL_PARTNER: canViewTerms is true even before userId resolves
 * TC-SW-04  REFERRAL_PARTNER: canViewTerms is true after full profile resolution
 * TC-SW-05  MESSENGER (regular): termsRoute → ['/indivisuals', 'terms', userId]  (regression guard)
 * TC-SW-06  MESSENGER: canViewTerms is false while userId is undefined            (regression guard)
 * TC-SW-07  MESSENGER: canViewTerms is true once userId resolves                  (regression guard)
 * TC-SW-08  STOREADMIN via /business/ URL: termsRoute → ['/business', 'terms', userId]
 * TC-SW-09  applyProfile stores role from API-loaded profile
 */
describe('SignupWelcomeComponent — termsRoute and canViewTerms', () => {
  let component: SignupWelcomeComponent;
  let fixture: ComponentFixture<SignupWelcomeComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockStorage: Partial<StorageService>;
  let mockOrderService: jasmine.SpyObj<IzingaOrderManagementService>;
  let mockAnalytics: jasmine.SpyObj<AnalyticsService>;

  const ROUTE_PARAM_ID = 'user-123';

  const activatedRouteStub = {
    snapshot: { paramMap: convertToParamMap({ id: ROUTE_PARAM_ID }) }
  };

  function buildProfile(role: UserProfile.RoleEnum, id = ROUTE_PARAM_ID): UserProfile {
    return { id, name: 'Thabo Nkosi', role } as UserProfile;
  }

  function setup(profileInStorage: UserProfile | undefined, routerUrl = '/indivisuals/signup-welcome/user-123'): void {
    mockRouter = jasmine.createSpyObj('Router', ['navigate'], { url: routerUrl });
    mockStorage = { userProfile: profileInStorage, phoneNumber: '+27812815555' };
    mockOrderService = jasmine.createSpyObj('IzingaOrderManagementService', [
      'getCustomerById', 'getCustomerByPhoneNumber'
    ]);
    mockAnalytics = jasmine.createSpyObj('AnalyticsService', ['logScreenView']);

    TestBed.configureTestingModule({
      declarations: [SignupWelcomeComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: activatedRouteStub },
        { provide: StorageService, useValue: mockStorage },
        { provide: IzingaOrderManagementService, useValue: mockOrderService },
        { provide: AnalyticsService, useValue: mockAnalytics },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SignupWelcomeComponent);
    component = fixture.componentInstance;
  }

  // -------------------------------------------------------------------------
  // TC-SW-01 to TC-SW-04: REFERRAL_PARTNER — bug fix assertions
  // -------------------------------------------------------------------------

  describe('REFERRAL_PARTNER role', () => {
    beforeEach(() => {
      setup(buildProfile(UserProfile.RoleEnum.REFERRALPARTNER));
      fixture.detectChanges();
    });

    it('TC-SW-01: termsRoute points to /referral-partner/enroll, not generic terms', () => {
      expect(component.termsRoute).toEqual(['/referral-partner/enroll']);
    });

    it('TC-SW-02: termsRoute is a single-element array (no userId segment)', () => {
      expect(component.termsRoute.length).toBe(1);
    });

    it('TC-SW-04: canViewTerms is true after profile resolves', () => {
      expect(component.canViewTerms).toBeTrue();
    });
  });

  it('TC-SW-03: canViewTerms is true for REFERRAL_PARTNER even before userId resolves', () => {
    // Test the getter directly without triggering ngOnInit's async API calls.
    // Simulate the state where applyProfile has stored the role but userId has
    // not yet been set (e.g. API response still in flight on a slow device).
    setup(undefined);
    // Do NOT call fixture.detectChanges() — we do not need ngOnInit to run;
    // we just need to verify the getter's branching logic.
    component.userRole = UserProfile.RoleEnum.REFERRALPARTNER;
    component.userId = undefined;
    expect(component.canViewTerms).toBeTrue();
  });

  // -------------------------------------------------------------------------
  // TC-SW-05 to TC-SW-07: MESSENGER — regression guard (preserve existing behaviour)
  // -------------------------------------------------------------------------

  describe('MESSENGER role (regression guard)', () => {
    beforeEach(() => {
      setup(buildProfile(UserProfile.RoleEnum.MESSENGER));
      fixture.detectChanges();
    });

    it('TC-SW-05: termsRoute returns [/indivisuals, terms, userId]', () => {
      // userId is set from route param 'id' = ROUTE_PARAM_ID in ngOnInit
      expect(component.termsRoute).toEqual(['/indivisuals', 'terms', ROUTE_PARAM_ID]);
    });

    it('TC-SW-07: canViewTerms is true once userId has resolved', () => {
      expect(component.canViewTerms).toBeTrue();
    });
  });

  it('TC-SW-06: canViewTerms is false for a regular user while userId is undefined', () => {
    setup(buildProfile(UserProfile.RoleEnum.MESSENGER));
    fixture.detectChanges();
    component.userId = undefined;
    component.userRole = UserProfile.RoleEnum.MESSENGER;
    expect(component.canViewTerms).toBeFalse();
  });

  // -------------------------------------------------------------------------
  // TC-SW-08: STOREADMIN via /business/ URL — T-10 (ONB-02) behaviour
  // -------------------------------------------------------------------------

  it('TC-SW-08: STORE_ADMIN via /business/ URL: termsRoute → tier-select (T-10 ONB-02)', () => {
    // T-10 change: STORE_ADMIN in the business flow goes to tier selection first.
    setup(buildProfile(UserProfile.RoleEnum.STOREADMIN), '/business/signup-welcome/user-123');
    fixture.detectChanges();
    expect(component.termsRoute).toEqual(['/business', 'tier-select', ROUTE_PARAM_ID]);
  });

  // TC-SW-10: updated to reflect the Instance-3 placeholder-role fix.
  // MESSENGER is not an established merchant role (STOREADMIN/STORE/ADMIN), so on a
  // /business/ route it must now redirect to /business/user for profile completion
  // instead of falling through to /business/terms/:id (the old behaviour that allowed
  // the CUSTOMER placeholder to bypass profile setup).
  it('TC-SW-10: MESSENGER via /business/ URL: termsRoute → [/business, user] (profile completion)', () => {
    setup(buildProfile(UserProfile.RoleEnum.MESSENGER), '/business/signup-welcome/user-123');
    fixture.detectChanges();
    expect(component.termsRoute).toEqual(['/business', 'user']);
  });

  // -------------------------------------------------------------------------
  // TC-SW-16 to TC-SW-19: Instance-3 business-flow placeholder-role fix
  // Same root cause as DashboardComponent (cc86278) and UserUpdateComponent (a045a48).
  // -------------------------------------------------------------------------

  it('TC-SW-16: CUSTOMER role + /business/ URL: termsRoute → [/business, user] (primary regression case)', () => {
    // This is the exact case that was broken: WhatsApp OTP auto-creates a UserProfile
    // with role CUSTOMER when no existing profile is found. The user must complete
    // profile setup at /business/user (assigns STORE_ADMIN) before proceeding.
    setup(buildProfile(UserProfile.RoleEnum.CUSTOMER), '/business/signup-welcome/user-123');
    fixture.detectChanges();
    expect(component.termsRoute).toEqual(['/business', 'user']);
  });

  it('TC-SW-17: STORE role + /business/ URL: termsRoute → [/business, terms, userId] (established employee role)', () => {
    // STORE is an established sub-role for store employees — they have an existing
    // profile and should proceed to terms, not be redirected to profile setup.
    setup(buildProfile(UserProfile.RoleEnum.STORE), '/business/signup-welcome/user-123');
    fixture.detectChanges();
    expect(component.termsRoute).toEqual(['/business', 'terms', ROUTE_PARAM_ID]);
  });

  it('TC-SW-18: ADMIN role + /business/ URL: termsRoute → [/business, terms, userId] (iZinga admin role)', () => {
    // ADMIN is the iZinga internal admin — already fully established, should proceed to terms.
    setup(buildProfile(UserProfile.RoleEnum.ADMIN), '/business/signup-welcome/user-123');
    fixture.detectChanges();
    expect(component.termsRoute).toEqual(['/business', 'terms', ROUTE_PARAM_ID]);
  });

  it('TC-SW-19: STOREADMIN + /business/ URL: termsRoute → tier-select (unchanged from TC-SW-08)', () => {
    // Regression guard: the STOREADMIN → tier-select branch must be unaffected.
    setup(buildProfile(UserProfile.RoleEnum.STOREADMIN), '/business/signup-welcome/user-123');
    fixture.detectChanges();
    expect(component.termsRoute).toEqual(['/business', 'tier-select', ROUTE_PARAM_ID]);
  });

  it('TC-SW-20: REFERRALPARTNER + /business/ URL: termsRoute → /referral-partner/enroll (unchanged from TC-SW-01)', () => {
    // Regression guard: the REFERRALPARTNER branch fires before the base-route check
    // and must be unaffected regardless of the URL prefix.
    setup(buildProfile(UserProfile.RoleEnum.REFERRALPARTNER), '/business/signup-welcome/user-123');
    fixture.detectChanges();
    expect(component.termsRoute).toEqual(['/referral-partner/enroll']);
  });

  // -------------------------------------------------------------------------
  // TC-SW-09: applyProfile stores role from API response
  // -------------------------------------------------------------------------

  it('TC-SW-09: applyProfile sets userRole from an API-loaded REFERRAL_PARTNER profile', () => {
    setup(undefined); // no cached profile — will load via API
    mockOrderService.getCustomerById.and.returnValue(
      of(buildProfile(UserProfile.RoleEnum.REFERRALPARTNER))
    );
    fixture.detectChanges();
    expect(component.userRole).toBe(UserProfile.RoleEnum.REFERRALPARTNER);
  });

  // -------------------------------------------------------------------------
  // TC-SW-11 to TC-SW-14: isStoreAdmin getter and STORE_ADMIN copy branch
  // -------------------------------------------------------------------------

  it('TC-SW-11: isStoreAdmin is true for STORE_ADMIN role', () => {
    setup(buildProfile(UserProfile.RoleEnum.STOREADMIN), '/business/signup-welcome/user-123');
    fixture.detectChanges();
    expect(component.isStoreAdmin).toBeTrue();
  });

  it('TC-SW-12: isStoreAdmin is false for MESSENGER role', () => {
    setup(buildProfile(UserProfile.RoleEnum.MESSENGER));
    fixture.detectChanges();
    expect(component.isStoreAdmin).toBeFalse();
  });

  it('TC-SW-13: isStoreAdmin is false when userRole is undefined', () => {
    setup(undefined);
    // Do not call detectChanges — userRole remains undefined
    expect(component.isStoreAdmin).toBeFalse();
  });

  describe('STORE_ADMIN copy branch in template', () => {
    beforeEach(() => {
      setup(buildProfile(UserProfile.RoleEnum.STOREADMIN), '/business/signup-welcome/user-123');
      fixture.detectChanges();
    });

    it('TC-SW-14: STORE_ADMIN shows business-plan copy, not the review copy', () => {
      const text: string = fixture.nativeElement.textContent;
      expect(text).toContain('choose the plan that fits your business');
      expect(text).not.toContain('Your profile is being reviewed');
    });
  });

  // TC-SW-15 is a standalone test (not inside the STORE_ADMIN describe) because
  // it calls setup() directly and cannot re-configure TestBed after a beforeEach
  // has already compiled it.
  it('TC-SW-15: non-STORE_ADMIN shows review copy, not the business-plan copy', () => {
    setup(buildProfile(UserProfile.RoleEnum.MESSENGER));
    fixture.detectChanges();
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Your profile is being reviewed');
    expect(text).not.toContain('choose the plan that fits your business');
  });
});
