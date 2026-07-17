import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of, throwError } from 'rxjs';
import { ReferralPartnerEnrollmentComponent } from './referral-partner-enrollment.component';
import { StorageService } from '../service/storage-service.service';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { AnalyticsService } from '../service/analytics.service';
import { UserProfile } from '../model/userProfile';

/**
 * RP-002 unit tests — ReferralPartnerEnrollmentComponent
 *
 * RP-ENR-01  No user profile: redirects to root.
 * RP-ENR-02  User already enrolled (icaAccepted=true, icaVersion='rpa-v1'): redirects to dashboard.
 * RP-ENR-02b User accepted old version (icaAccepted=true, icaVersion='rpa-draft-v1'): NOT redirected — sees form.
 * RP-ENR-03  Checkbox unticked: enroll() does not call updateCustomer.
 * RP-ENR-04  Checkbox ticked: calls updateCustomer with correct ICA fields.
 * RP-ENR-05  Successful save: stores profile from assignReferralCode (not updateCustomer) and navigates.
 * RP-ENR-06  API error on updateCustomer: sets acceptError, clears saving flag.
 * RP-ENR-06b API error on assignReferralCode: sets acceptError, clears saving flag.
 * RP-ENR-07  Screen view analytics event fired on init.
 * RP-ENR-08  rpa_accepted analytics event fired on success.
 * RP-ENR-09  Enrolled partner ends up with a non-empty referralCode after enrollment.
 */
describe('ReferralPartnerEnrollmentComponent', () => {
  let component: ReferralPartnerEnrollmentComponent;
  let fixture: ComponentFixture<ReferralPartnerEnrollmentComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockStorage: Partial<StorageService>;
  let mockOrderService: jasmine.SpyObj<IzingaOrderManagementService>;
  let mockAnalytics: jasmine.SpyObj<AnalyticsService>;

  const baseProfile: Partial<UserProfile> = {
    id: 'user-rp-1',
    name: 'Test Partner',
    mobileNumber: '+27811234567',
    role: UserProfile.RoleEnum.REFERRALPARTNER
  };

  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockStorage = { userProfile: { ...baseProfile } as UserProfile };
    mockOrderService = jasmine.createSpyObj('IzingaOrderManagementService', ['updateCustomer', 'assignReferralCode']);
    mockAnalytics = jasmine.createSpyObj('AnalyticsService', ['logScreenView', 'logEvent']);

    await TestBed.configureTestingModule({
      declarations: [ReferralPartnerEnrollmentComponent],
      imports: [FormsModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: StorageService, useValue: mockStorage },
        { provide: IzingaOrderManagementService, useValue: mockOrderService },
        { provide: AnalyticsService, useValue: mockAnalytics }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReferralPartnerEnrollmentComponent);
    component = fixture.componentInstance;
  });

  // RP-ENR-07
  it('should log screen view on init', () => {
    fixture.detectChanges();
    expect(mockAnalytics.logScreenView).toHaveBeenCalledWith('referral_partner_enrollment');
  });

  // RP-ENR-01
  it('RP-ENR-01: redirects to "/" when no user profile in storage', () => {
    mockStorage.userProfile = undefined;
    fixture.detectChanges();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
  });

  // RP-ENR-02
  it('RP-ENR-02: redirects to dashboard when user already enrolled under current version', () => {
    mockStorage.userProfile = {
      ...baseProfile,
      icaAccepted: true,
      icaVersion: 'rpa-v1'
    } as UserProfile;
    fixture.detectChanges();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/indivisuals/rp-dashboard']);
  });

  // RP-ENR-02b
  it('RP-ENR-02b: does NOT redirect to dashboard when user accepted old version rpa-draft-v1', () => {
    mockStorage.userProfile = {
      ...baseProfile,
      icaAccepted: true,
      icaVersion: 'rpa-draft-v1'
    } as UserProfile;
    fixture.detectChanges();
    expect(mockRouter.navigate).not.toHaveBeenCalledWith(['/indivisuals/rp-dashboard']);
  });

  // RP-ENR-03
  it('RP-ENR-03: does NOT call updateCustomer when checkbox not ticked', () => {
    fixture.detectChanges();
    component.agreementAccepted = false;
    component.enroll();
    expect(mockOrderService.updateCustomer).not.toHaveBeenCalled();
  });

  // RP-ENR-04
  it('RP-ENR-04: calls updateCustomer with correct ICA fields when checkbox ticked', () => {
    const savedProfile = { ...baseProfile, icaAccepted: true, icaVersion: 'rpa-v1' } as UserProfile;
    const profileWithCode = { ...savedProfile, referralCode: 'ABC12345' } as UserProfile;
    mockOrderService.updateCustomer.and.returnValue(of(savedProfile));
    mockOrderService.assignReferralCode.and.returnValue(of(profileWithCode));
    fixture.detectChanges();

    component.agreementAccepted = true;
    component.enroll();

    const callArg: UserProfile = mockOrderService.updateCustomer.calls.mostRecent().args[0];
    expect(callArg.icaAccepted).toBeTrue();
    expect(callArg.icaAcceptedDate).toBeDefined();
    expect(callArg.icaVersion).toBe('rpa-v1');
  });

  // RP-ENR-05
  it('RP-ENR-05: stores the profile returned by assignReferralCode and navigates to dashboard on success', () => {
    const savedProfile = { ...baseProfile, icaAccepted: true, icaVersion: 'rpa-v1' } as UserProfile;
    const profileWithCode = { ...savedProfile, referralCode: 'ABC12345' } as UserProfile;
    mockOrderService.updateCustomer.and.returnValue(of(savedProfile));
    mockOrderService.assignReferralCode.and.returnValue(of(profileWithCode));
    fixture.detectChanges();

    component.agreementAccepted = true;
    component.enroll();

    // Storage must hold the profile from step 2, which carries referralCode
    expect(mockStorage.userProfile).toEqual(profileWithCode);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/indivisuals/rp-dashboard']);
  });

  // RP-ENR-06
  it('RP-ENR-06: sets acceptError and clears saving flag when updateCustomer fails', () => {
    mockOrderService.updateCustomer.and.returnValue(throwError(() => new Error('500')));
    fixture.detectChanges();

    component.agreementAccepted = true;
    component.enroll();

    expect(component.acceptError).toBeTrue();
    expect(component.saving).toBeFalse();
  });

  // RP-ENR-06b
  it('RP-ENR-06b: sets acceptError and clears saving flag when assignReferralCode fails', () => {
    const savedProfile = { ...baseProfile, icaAccepted: true, icaVersion: 'rpa-v1' } as UserProfile;
    mockOrderService.updateCustomer.and.returnValue(of(savedProfile));
    mockOrderService.assignReferralCode.and.returnValue(throwError(() => new Error('500')));
    fixture.detectChanges();

    component.agreementAccepted = true;
    component.enroll();

    expect(component.acceptError).toBeTrue();
    expect(component.saving).toBeFalse();
  });

  // RP-ENR-08
  it('RP-ENR-08: fires rpa_accepted analytics event on success', () => {
    const savedProfile = { ...baseProfile, id: 'user-rp-1', icaAccepted: true, icaVersion: 'rpa-v1' } as UserProfile;
    const profileWithCode = { ...savedProfile, referralCode: 'XYZ99887' } as UserProfile;
    mockOrderService.updateCustomer.and.returnValue(of(savedProfile));
    mockOrderService.assignReferralCode.and.returnValue(of(profileWithCode));
    fixture.detectChanges();

    component.agreementAccepted = true;
    component.enroll();

    expect(mockAnalytics.logEvent).toHaveBeenCalledWith(
      'referral_partner_rpa_accepted',
      jasmine.objectContaining({ userId: 'user-rp-1', icaVersion: 'rpa-v1' })
    );
  });

  // RP-ENR-09
  it('RP-ENR-09: enrolled partner ends up with a non-empty referralCode in StorageService after enrollment', () => {
    const savedProfile = { ...baseProfile, icaAccepted: true, icaVersion: 'rpa-v1' } as UserProfile;
    const profileWithCode = { ...savedProfile, referralCode: 'RP000TEST' } as UserProfile;
    mockOrderService.updateCustomer.and.returnValue(of(savedProfile));
    // assignReferralCode is called with the userId returned from updateCustomer
    mockOrderService.assignReferralCode.and.callFake((userId: string) => {
      expect(userId).toBe('user-rp-1');
      return of(profileWithCode);
    });
    fixture.detectChanges();

    component.agreementAccepted = true;
    component.enroll();

    const storedProfile = mockStorage.userProfile as UserProfile;
    expect(storedProfile.referralCode).toBeTruthy();
    expect(storedProfile.referralCode!.length).toBeGreaterThan(0);
  });
});
