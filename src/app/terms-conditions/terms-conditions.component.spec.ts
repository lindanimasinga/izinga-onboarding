import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of, throwError } from 'rxjs';

import { TermsConditionsComponent } from './terms-conditions.component';
const CURRENT_ICA_VERSION = TermsConditionsComponent.AMBASSADOR_ICA_VERSION;
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { StorageService } from '../service/storage-service.service';
import { AnalyticsService } from '../service/analytics.service';
import { UserProfile } from '../model/userProfile';

describe('TermsConditionsComponent', () => {
  let component: TermsConditionsComponent;
  let fixture: ComponentFixture<TermsConditionsComponent>;
  let orderManagerSpy: jasmine.SpyObj<IzingaOrderManagementService>;
  let analyticsSpy: jasmine.SpyObj<AnalyticsService>;
  let routerSpy: jasmine.SpyObj<Router>;

  // Plain writable mock so the component can both read and assign userProfile
  let storageServiceMock: { userProfile: UserProfile | undefined };

  const makeUser = (role: UserProfile.RoleEnum): UserProfile =>
    ({ id: 'user-001', role } as UserProfile);

  const setupComponent = (user: UserProfile) => {
    storageServiceMock.userProfile = user;
    fixture = TestBed.createComponent(TermsConditionsComponent);
    component = fixture.componentInstance;
  };

  beforeEach(() => {
    storageServiceMock = { userProfile: undefined };

    orderManagerSpy = jasmine.createSpyObj('IzingaOrderManagementService', ['updateCustomer']);
    analyticsSpy = jasmine.createSpyObj('AnalyticsService', ['logScreenView', 'logEvent']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate'], { url: '/indivisuals/terms' });

    TestBed.configureTestingModule({
      imports: [FormsModule],
      declarations: [TermsConditionsComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: IzingaOrderManagementService, useValue: orderManagerSpy },
        { provide: StorageService, useValue: storageServiceMock },
        { provide: AnalyticsService, useValue: analyticsSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: { params: of({ id: 'user-001' }) } }
      ]
    }).compileComponents();
  });

  // TC-01: Ambassador role — isAmbassador returns true
  describe('TC-01: Ambassador role', () => {
    it('should set isAmbassador to true', () => {
      setupComponent(makeUser(UserProfile.RoleEnum.AMBASSADOR));
      fixture.detectChanges();

      expect(component.isAmbassador).toBeTrue();
    });
  });

  // TC-02: Non-ambassador role — isAmbassador returns false
  describe('TC-02: Non-ambassador (MESSENGER) role', () => {
    it('should set isAmbassador to false', () => {
      setupComponent(makeUser(UserProfile.RoleEnum.MESSENGER));
      fixture.detectChanges();

      expect(component.isAmbassador).toBeFalse();
    });
  });

  // TC-03: Ambassador acceptTerms() sets ICA fields on the user object
  describe('TC-03: Ambassador acceptTerms() sets ICA fields', () => {
    it('should call updateCustomer with icaAccepted true, icaAcceptedDate set, and current icaVersion', () => {
      const user = makeUser(UserProfile.RoleEnum.AMBASSADOR);
      setupComponent(user);
      fixture.detectChanges();

      orderManagerSpy.updateCustomer.and.returnValue(of({ ...user, icaAccepted: true } as UserProfile));

      component.userId = 'user-001';
      component.termsAccepted = true;
      component.acceptTerms();

      expect(orderManagerSpy.updateCustomer).toHaveBeenCalledOnceWith(
        jasmine.objectContaining({
          icaAccepted: true,
          icaVersion: TermsConditionsComponent.AMBASSADOR_ICA_VERSION,
          icaAcceptedDate: jasmine.any(Date)
        })
      );
    });
  });

  // TC-04: Ambassador acceptTerms() does NOT set termsAccepted on the user
  describe('TC-04: Ambassador acceptTerms() does not set termsAccepted', () => {
    it('should leave user.termsAccepted unchanged after ambassador acceptance', () => {
      const user = makeUser(UserProfile.RoleEnum.AMBASSADOR);
      setupComponent(user);
      fixture.detectChanges();

      orderManagerSpy.updateCustomer.and.returnValue(of({ ...user, icaAccepted: true } as UserProfile));

      component.userId = 'user-001';
      component.termsAccepted = true;
      component.acceptTerms();

      const calledWith: UserProfile = orderManagerSpy.updateCustomer.calls.mostRecent().args[0];
      expect(calledWith.termsAccepted).toBeUndefined();
    });
  });

  // TC-05: Non-ambassador acceptTerms() sets termsAccepted and does NOT set icaAccepted
  describe('TC-05: Non-ambassador acceptTerms() sets termsAccepted', () => {
    it('should set user.termsAccepted true and termsAcceptedDate, and not set icaAccepted', () => {
      const user = makeUser(UserProfile.RoleEnum.MESSENGER);
      setupComponent(user);
      fixture.detectChanges();

      orderManagerSpy.updateCustomer.and.returnValue(of({ ...user, termsAccepted: true } as UserProfile));

      component.userId = 'user-001';
      component.termsAccepted = true;
      component.acceptTerms();

      expect(orderManagerSpy.updateCustomer).toHaveBeenCalledOnceWith(
        jasmine.objectContaining({
          termsAccepted: true,
          termsAcceptedDate: jasmine.any(Date)
        })
      );

      const calledWith: UserProfile = orderManagerSpy.updateCustomer.calls.mostRecent().args[0];
      expect(calledWith.icaAccepted).toBeUndefined();
    });
  });

  // TC-06: Analytics events — ica_accepted for ambassador, terms_accepted for non-ambassador
  describe('TC-06: Analytics events', () => {
    it('should log ica_accepted event for ambassador and not terms_accepted', () => {
      const user = makeUser(UserProfile.RoleEnum.AMBASSADOR);
      setupComponent(user);
      fixture.detectChanges();

      orderManagerSpy.updateCustomer.and.returnValue(of({ ...user, icaAccepted: true } as UserProfile));

      component.userId = 'user-001';
      component.termsAccepted = true;
      component.acceptTerms();

      expect(analyticsSpy.logEvent).toHaveBeenCalledWith('ica_accepted', jasmine.objectContaining({ userId: 'user-001' }));
      expect(analyticsSpy.logEvent).not.toHaveBeenCalledWith('terms_accepted', jasmine.anything());
    });

    it('should log terms_accepted event for non-ambassador and not ica_accepted', () => {
      const user = makeUser(UserProfile.RoleEnum.MESSENGER);
      setupComponent(user);
      fixture.detectChanges();

      orderManagerSpy.updateCustomer.and.returnValue(of({ ...user, termsAccepted: true } as UserProfile));

      component.userId = 'user-001';
      component.termsAccepted = true;
      component.acceptTerms();

      expect(analyticsSpy.logEvent).toHaveBeenCalledWith('terms_accepted', { userId: 'user-001' });
      expect(analyticsSpy.logEvent).not.toHaveBeenCalledWith('ica_accepted', jasmine.anything());
    });
  });

  // TC-07: Error state — updateCustomer error sets acceptError to true
  describe('TC-07: Error state on updateCustomer failure', () => {
    it('should set acceptError to true when updateCustomer errors (ambassador)', () => {
      const user = makeUser(UserProfile.RoleEnum.AMBASSADOR);
      setupComponent(user);
      fixture.detectChanges();

      orderManagerSpy.updateCustomer.and.returnValue(throwError(() => new Error('network error')));

      component.userId = 'user-001';
      component.termsAccepted = true;
      component.acceptTerms();

      expect(component.acceptError).toBeTrue();
    });

    it('should set acceptError to true when updateCustomer errors (non-ambassador)', () => {
      const user = makeUser(UserProfile.RoleEnum.MESSENGER);
      setupComponent(user);
      fixture.detectChanges();

      orderManagerSpy.updateCustomer.and.returnValue(throwError(() => new Error('network error')));

      component.userId = 'user-001';
      component.termsAccepted = true;
      component.acceptTerms();

      expect(component.acceptError).toBeTrue();
    });
  });

  // TC-08: acceptError is reset to false at the start of each acceptTerms() call
  describe('TC-08: acceptError reset on each acceptTerms() call', () => {
    it('should reset acceptError to false at the start of acceptTerms()', () => {
      const user = makeUser(UserProfile.RoleEnum.MESSENGER);
      setupComponent(user);
      fixture.detectChanges();

      // First call: simulate failure so acceptError becomes true
      orderManagerSpy.updateCustomer.and.returnValue(throwError(() => new Error('error')));
      component.userId = 'user-001';
      component.termsAccepted = true;
      component.acceptTerms();
      expect(component.acceptError).toBeTrue();

      // Second call: succeeds — acceptError must be reset to false before the request
      orderManagerSpy.updateCustomer.and.returnValue(of({ ...user, termsAccepted: true } as UserProfile));
      component.acceptTerms();

      expect(component.acceptError).toBeFalse();
    });
  });

  // TC-09: needsIcaAcceptance — v1 ambassador must re-accept v2
  describe('TC-09: needsIcaAcceptance — ambassador with v1 requires re-acceptance', () => {
    it('should return true when ambassador has icaAccepted=true but icaVersion is the previous version', () => {
      const user: UserProfile = {
        ...makeUser(UserProfile.RoleEnum.AMBASSADOR),
        icaAccepted: true,
        icaVersion: 'v1'   // previous version — not current
      } as UserProfile;
      setupComponent(user);
      fixture.detectChanges();

      expect(component.needsIcaAcceptance).toBeTrue();
    });
  });

  // TC-10: needsIcaAcceptance — current-version ambassador must NOT be prompted again
  describe('TC-10: needsIcaAcceptance — ambassador with current version does not require re-acceptance', () => {
    it('should return false when ambassador has icaAccepted=true and icaVersion matches current', () => {
      const user: UserProfile = {
        ...makeUser(UserProfile.RoleEnum.AMBASSADOR),
        icaAccepted: true,
        icaVersion: CURRENT_ICA_VERSION
      } as UserProfile;
      setupComponent(user);
      fixture.detectChanges();

      expect(component.needsIcaAcceptance).toBeFalse();
    });
  });

  // TC-11: needsIcaAcceptance — new ambassador (no icaAccepted) returns true
  describe('TC-11: needsIcaAcceptance — brand-new ambassador returns true', () => {
    it('should return true when ambassador has never accepted the ICA', () => {
      const user = makeUser(UserProfile.RoleEnum.AMBASSADOR);
      setupComponent(user);
      fixture.detectChanges();

      expect(component.needsIcaAcceptance).toBeTrue();
    });
  });

  // TC-12: needsIcaAcceptance — non-ambassador always returns false
  describe('TC-12: needsIcaAcceptance — non-ambassador role returns false', () => {
    it('should return false for MESSENGER role regardless of ICA fields', () => {
      const user = makeUser(UserProfile.RoleEnum.MESSENGER);
      setupComponent(user);
      fixture.detectChanges();

      expect(component.needsIcaAcceptance).toBeFalse();
    });
  });

  // TC-13: analytics event carries icaVersion on ambassador acceptance
  describe('TC-13: ica_accepted event includes icaVersion', () => {
    it('should log ica_accepted with icaVersion matching the current version constant', () => {
      const user = makeUser(UserProfile.RoleEnum.AMBASSADOR);
      setupComponent(user);
      fixture.detectChanges();

      orderManagerSpy.updateCustomer.and.returnValue(of({ ...user, icaAccepted: true } as UserProfile));

      component.userId = 'user-001';
      component.termsAccepted = true;
      component.acceptTerms();

      expect(analyticsSpy.logEvent).toHaveBeenCalledWith(
        'ica_accepted',
        jasmine.objectContaining({ icaVersion: CURRENT_ICA_VERSION })
      );
    });
  });
});
