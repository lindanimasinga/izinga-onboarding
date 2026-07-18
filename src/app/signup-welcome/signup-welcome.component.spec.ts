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
 * TC-SW-01  REFERRAL_PARTNER: termsRoute → ['/indivisuals', 'referral-partner-enrollment']
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

    it('TC-SW-01: termsRoute points to referral-partner-enrollment, not generic terms', () => {
      expect(component.termsRoute).toEqual(['/indivisuals', 'referral-partner-enrollment']);
    });

    it('TC-SW-02: termsRoute has no userId segment', () => {
      expect(component.termsRoute.length).toBe(2);
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
  // TC-SW-08: STOREADMIN via /business/ URL
  // -------------------------------------------------------------------------

  it('TC-SW-08: termsRoute uses /business base when URL contains /business/', () => {
    setup(buildProfile(UserProfile.RoleEnum.STOREADMIN), '/business/signup-welcome/user-123');
    fixture.detectChanges();
    expect(component.termsRoute).toEqual(['/business', 'terms', ROUTE_PARAM_ID]);
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
});
