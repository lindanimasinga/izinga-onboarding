import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of, throwError } from 'rxjs';

import { PhoneVerificationComponent } from './phone-verification.component';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { StorageService } from '../service/storage-service.service';
import { FirebaseService } from '../service/firebase.service';
import { AnalyticsService } from '../service/analytics.service';

describe('PhoneVerificationComponent', () => {
  let component: PhoneVerificationComponent;
  let fixture: ComponentFixture<PhoneVerificationComponent>;
  let orderSvc: jasmine.SpyObj<IzingaOrderManagementService>;
  let firebaseSvc: jasmine.SpyObj<FirebaseService>;
  let storageSvc: any;
  let analyticsSvc: any;
  let routerSvc: any;
  let routeSvc: any;

  beforeEach(() => {
    orderSvc = jasmine.createSpyObj('IzingaOrderManagementService', [
      'sendWhatsAppOtp', 'verifyWhatsAppOtp'
    ]);
    firebaseSvc = jasmine.createSpyObj('FirebaseService', [
      'requestVerification', 'confirmCode', 'signInWithWhatsAppToken', 'createCapture'
    ]);
    storageSvc = { phoneNumber: '', returnUrl: null } as any;
    analyticsSvc = { logScreenView: () => {}, logEvent: () => {} } as any;
    routerSvc = { navigate: jasmine.createSpy('navigate').and.stub(),
                  navigateByUrl: jasmine.createSpy('navigateByUrl').and.stub() } as any;
    routeSvc = {} as any;

    TestBed.configureTestingModule({
      declarations: [PhoneVerificationComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: IzingaOrderManagementService, useValue: orderSvc },
        { provide: StorageService, useValue: storageSvc },
        { provide: FirebaseService, useValue: firebaseSvc },
        { provide: AnalyticsService, useValue: analyticsSvc },
        { provide: Router, useValue: routerSvc },
        { provide: ActivatedRoute, useValue: routeSvc }
      ]
    });
    fixture = TestBed.createComponent(PhoneVerificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('verify()', () => {
    it('calls orderManager.sendWhatsAppOtp with normalised number', () => {
      orderSvc.sendWhatsAppOtp.and.returnValue(of(undefined as any));
      component.phoneNumber = '0815551234';
      component.verify();
      expect(orderSvc.sendWhatsAppOtp).toHaveBeenCalledWith('+27815551234');
      expect(firebaseSvc.requestVerification).not.toHaveBeenCalled();
    });

    it('sets isVerificationRequested on success', () => {
      orderSvc.sendWhatsAppOtp.and.returnValue(of(undefined as any));
      component.phoneNumber = '0815551234';
      component.verify();
      expect(component.isVerificationRequested).toBeTrue();
    });

    it('sets hasError on failure', () => {
      orderSvc.sendWhatsAppOtp.and.returnValue(throwError({ message: 'WA error' }));
      component.phoneNumber = '0815551234';
      component.verify();
      expect(component.hasError).toBeTrue();
    });
  });

  describe('confirmCode()', () => {
    it('calls verifyWhatsAppOtp then signInWithWhatsAppToken', () => {
      orderSvc.verifyWhatsAppOtp.and.returnValue(of({ customToken: 'tok123' }));
      firebaseSvc.signInWithWhatsAppToken.and.returnValue(of({} as any));
      storageSvc.returnUrl = null;
      component.phoneNumber = '+27815551234';
      component.code = '654321';
      component.confirmCode();
      expect(orderSvc.verifyWhatsAppOtp).toHaveBeenCalledWith('+27815551234', '654321');
      expect(firebaseSvc.signInWithWhatsAppToken).toHaveBeenCalledWith('tok123');
      expect(firebaseSvc.confirmCode).not.toHaveBeenCalled();
      expect(routerSvc.navigate).toHaveBeenCalledWith(['../dashboard'], { relativeTo: routeSvc });
    });

    it('sets hasError when verifyWhatsAppOtp fails', () => {
      orderSvc.verifyWhatsAppOtp.and.returnValue(throwError({ message: 'Bad code' }));
      component.phoneNumber = '+27815551234';
      component.code = '000000';
      component.confirmCode();
      expect(component.hasError).toBeTrue();
      expect(firebaseSvc.signInWithWhatsAppToken).not.toHaveBeenCalled();
    });

    it('sets hasError when signInWithWhatsAppToken fails', () => {
      orderSvc.verifyWhatsAppOtp.and.returnValue(of({ customToken: 'tok123' }));
      firebaseSvc.signInWithWhatsAppToken.and.returnValue(throwError({ message: 'Firebase error' }));
      component.phoneNumber = '+27815551234';
      component.code = '654321';
      component.confirmCode();
      expect(component.hasError).toBeTrue();
      expect(component.errorMessage).toBeTruthy();
    });

    it('navigates to returnUrl when one is stored', () => {
      orderSvc.verifyWhatsAppOtp.and.returnValue(of({ customToken: 'tok123' }));
      firebaseSvc.signInWithWhatsAppToken.and.returnValue(of({} as any));
      storageSvc.returnUrl = '/indivisuals/some-deep-route';
      component.phoneNumber = '+27815551234';
      component.code = '654321';
      component.confirmCode();
      expect(routerSvc.navigateByUrl).toHaveBeenCalledWith('/indivisuals/some-deep-route');
    });
  });
});
