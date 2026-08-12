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

/**
 * TC-DASH-01  REFERRAL_PARTNER without icaAccepted: redirected to /referral-partner/enroll.
 * TC-DASH-02  REFERRAL_PARTNER without icaAccepted: NOT redirected to /indivisuals/terms.
 * TC-DASH-03  REFERRAL_PARTNER with icaAccepted=true: NOT redirected (proceeds normally, no nav call).
 * TC-DASH-04  AMBASSADOR without icaAccepted: redirected to /indivisuals/terms (regression guard).
 * TC-DASH-05  AMBASSADOR with icaAccepted=true and current icaVersion: NOT redirected (proceeds normally).
 * TC-DASH-06  MESSENGER without termsAccepted: redirected to /indivisuals/terms.
 * TC-DASH-07  MESSENGER with termsAccepted=true: NOT redirected (proceeds normally).
 * TC-DASH-08  API 404: redirected to /indivisuals/user (existing error path, regression guard).
 * TC-DASH-10  AMBASSADOR with icaAccepted=true but PREVIOUS icaVersion ('v1'): redirected to re-accept.
 * TC-DASH-11  AMBASSADOR with icaAccepted=true and CURRENT icaVersion: NOT redirected.
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

  // TC-DASH-06
  it('TC-DASH-06: MESSENGER without termsAccepted is redirected to /indivisuals/terms', fakeAsync(() => {
    const user = buildUser(UserProfile.RoleEnum.MESSENGER, { termsAccepted: false });
    mockService.getCustomerByPhoneNumber.and.returnValue(of(user));

    fixture.detectChanges();
    tick();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/indivisuals/terms', user.id]);
  }));

  // TC-DASH-07
  it('TC-DASH-07: MESSENGER with termsAccepted=true proceeds normally (no redirect)', fakeAsync(() => {
    const user = buildUser(UserProfile.RoleEnum.MESSENGER, { termsAccepted: true });
    mockService.getCustomerByPhoneNumber.and.returnValue(of(user));
    mockService.getUserConfig.and.returnValue(of([]));

    fixture.detectChanges();
    tick();

    expect(mockRouter.navigate).not.toHaveBeenCalled();
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

  // TC-DASH-08
  it('TC-DASH-08: API 404 redirects to /indivisuals/user (existing error path regression)', fakeAsync(() => {
    mockService.getCustomerByPhoneNumber.and.returnValue(throwError({ status: 404 }));

    fixture.detectChanges();
    tick();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/indivisuals/user']);
  }));
});
