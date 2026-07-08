import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of, throwError } from 'rxjs';

import { TermsConditionsComponent } from './terms-conditions.component';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { StorageService } from '../service/storage-service.service';
import { AnalyticsService } from '../service/analytics.service';
import { UserProfile } from '../model/userProfile';

describe('TermsConditionsComponent', () => {
  let component: TermsConditionsComponent;
  let fixture: ComponentFixture<TermsConditionsComponent>;
  let httpMock: HttpTestingController;
  let orderManagerSpy: jasmine.SpyObj<IzingaOrderManagementService>;
  let analyticsSpy: jasmine.SpyObj<AnalyticsService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let sanitizerSpy: jasmine.SpyObj<DomSanitizer>;

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
    sanitizerSpy = jasmine.createSpyObj('DomSanitizer', ['bypassSecurityTrustHtml']);
    sanitizerSpy.bypassSecurityTrustHtml.and.callFake((v: string) => v as any);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, FormsModule],
      declarations: [TermsConditionsComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: IzingaOrderManagementService, useValue: orderManagerSpy },
        { provide: StorageService, useValue: storageServiceMock },
        { provide: AnalyticsService, useValue: analyticsSpy },
        { provide: Router, useValue: routerSpy },
        { provide: DomSanitizer, useValue: sanitizerSpy },
        { provide: ActivatedRoute, useValue: { params: of({ id: 'user-001' }) } }
      ]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // TC-01: Ambassador sees ICA — isAmbassador returns true and ICA asset is fetched
  describe('TC-01: Ambassador role', () => {
    it('should set isAmbassador to true and fetch ambassador-ica-v1.md', () => {
      setupComponent(makeUser(UserProfile.RoleEnum.AMBASSADOR));
      fixture.detectChanges();

      expect(component.isAmbassador).toBeTrue();

      const req = httpMock.expectOne('/assets/legal/ambassador-ica-v1.md');
      expect(req.request.method).toBe('GET');
      req.flush('# ICA Content');
      expect(component.icaContent).toBe('# ICA Content');
    });
  });

  // TC-02: Non-ambassador sees general T&Cs — isAmbassador false, ICA asset NOT fetched
  describe('TC-02: Non-ambassador (MESSENGER) role', () => {
    it('should set isAmbassador to false and NOT fetch the ICA asset', () => {
      setupComponent(makeUser(UserProfile.RoleEnum.MESSENGER));
      fixture.detectChanges();

      expect(component.isAmbassador).toBeFalse();
      httpMock.expectNone('/assets/legal/ambassador-ica-v1.md');
    });
  });

  // TC-03: Ambassador acceptTerms() sets ICA fields on the user object
  describe('TC-03: Ambassador acceptTerms() sets ICA fields', () => {
    it('should call updateCustomer with icaAccepted true, icaAcceptedDate set, icaVersion v1', () => {
      const user = makeUser(UserProfile.RoleEnum.AMBASSADOR);
      setupComponent(user);
      fixture.detectChanges();
      httpMock.expectOne('/assets/legal/ambassador-ica-v1.md').flush('');

      orderManagerSpy.updateCustomer.and.returnValue(of({ ...user, icaAccepted: true } as UserProfile));

      component.userId = 'user-001';
      component.termsAccepted = true;
      component.acceptTerms();

      expect(orderManagerSpy.updateCustomer).toHaveBeenCalledOnceWith(
        jasmine.objectContaining({
          icaAccepted: true,
          icaVersion: 'v1',
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
      httpMock.expectOne('/assets/legal/ambassador-ica-v1.md').flush('');

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
      httpMock.expectNone('/assets/legal/ambassador-ica-v1.md');

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
      httpMock.expectOne('/assets/legal/ambassador-ica-v1.md').flush('');

      orderManagerSpy.updateCustomer.and.returnValue(of({ ...user, icaAccepted: true } as UserProfile));

      component.userId = 'user-001';
      component.termsAccepted = true;
      component.acceptTerms();

      expect(analyticsSpy.logEvent).toHaveBeenCalledWith('ica_accepted', { userId: 'user-001' });
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
      httpMock.expectOne('/assets/legal/ambassador-ica-v1.md').flush('');

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
});
