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

/**
 * TC-DASH-01  REFERRAL_PARTNER without icaAccepted: redirected to /referral-partner/enroll.
 * TC-DASH-02  REFERRAL_PARTNER without icaAccepted: NOT redirected to /indivisuals/terms.
 * TC-DASH-03  REFERRAL_PARTNER with icaAccepted=true: NOT redirected (proceeds normally, no nav call).
 * TC-DASH-04  AMBASSADOR without icaAccepted: redirected to /indivisuals/terms (regression guard).
 * TC-DASH-05  AMBASSADOR with icaAccepted=true: NOT redirected (proceeds normally).
 * TC-DASH-06  MESSENGER without termsAccepted: redirected to /indivisuals/terms.
 * TC-DASH-07  MESSENGER with termsAccepted=true: NOT redirected (proceeds normally).
 * TC-DASH-08  API 404: redirected to /indivisuals/user (existing error path, regression guard).
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
  it('TC-DASH-05: AMBASSADOR with icaAccepted=true proceeds normally (no redirect)', fakeAsync(() => {
    const user = buildUser(UserProfile.RoleEnum.AMBASSADOR, { icaAccepted: true });
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

  // TC-DASH-08
  it('TC-DASH-08: API 404 redirects to /indivisuals/user (existing error path regression)', fakeAsync(() => {
    mockService.getCustomerByPhoneNumber.and.returnValue(throwError({ status: 404 }));

    fixture.detectChanges();
    tick();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/indivisuals/user']);
  }));
});
