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
    routerSvc = { navigate: jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true)),
                  navigateByUrl: jasmine.createSpy('navigateByUrl').and.returnValue(Promise.resolve(true)) } as any;
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

  it('should default loginMethod to sms', () => {
    expect(component.loginMethod).toBe('sms');
  });

  describe('verify() — SMS path', () => {
    it('calls firebaseService.requestVerification when loginMethod is sms', () => {
      firebaseSvc.requestVerification.and.returnValue(of({} as any));
      component.loginMethod = 'sms';
      component.phoneNumber = '0815551234';
      component.verify();
      expect(firebaseSvc.requestVerification).toHaveBeenCalledWith('+27815551234');
      expect(orderSvc.sendWhatsAppOtp).not.toHaveBeenCalled();
    });

    it('sets isVerificationRequested on success', () => {
      firebaseSvc.requestVerification.and.returnValue(of({} as any));
      component.loginMethod = 'sms';
      component.phoneNumber = '0815551234';
      component.verify();
      expect(component.isVerificationRequested).toBeTrue();
    });

    it('sets hasError on failure', () => {
      firebaseSvc.requestVerification.and.returnValue(throwError({ message: 'SMS error' }));
      component.loginMethod = 'sms';
      component.phoneNumber = '0815551234';
      component.verify();
      expect(component.hasError).toBeTrue();
      expect(component.errorMessage).toBe('SMS error');
    });
  });

  describe('verify() — WhatsApp path', () => {
    it('calls orderManager.sendWhatsAppOtp when loginMethod is whatsapp', () => {
      orderSvc.sendWhatsAppOtp.and.returnValue(of(undefined as any));
      component.loginMethod = 'whatsapp';
      component.phoneNumber = '0815551234';
      component.verify();
      expect(orderSvc.sendWhatsAppOtp).toHaveBeenCalledWith('+27815551234');
      expect(firebaseSvc.requestVerification).not.toHaveBeenCalled();
    });

    it('sets isVerificationRequested on success', () => {
      orderSvc.sendWhatsAppOtp.and.returnValue(of(undefined as any));
      component.loginMethod = 'whatsapp';
      component.phoneNumber = '0815551234';
      component.verify();
      expect(component.isVerificationRequested).toBeTrue();
    });

    it('sets hasError on failure', () => {
      orderSvc.sendWhatsAppOtp.and.returnValue(throwError({ message: 'WA error' }));
      component.loginMethod = 'whatsapp';
      component.phoneNumber = '0815551234';
      component.verify();
      expect(component.hasError).toBeTrue();
    });
  });

  describe('confirmCode() — SMS path', () => {
    it('calls firebaseService.confirmCode when loginMethod is sms', () => {
      firebaseSvc.confirmCode.and.returnValue(of({} as any));
      component.loginMethod = 'sms';
      component.phoneNumber = '+27815551234';
      component.code = '123456';
      component.confirmCode();
      expect(firebaseSvc.confirmCode).toHaveBeenCalledWith('123456');
      expect(orderSvc.verifyWhatsAppOtp).not.toHaveBeenCalled();
      expect(firebaseSvc.signInWithWhatsAppToken).not.toHaveBeenCalled();
    });

    it('navigates on successful SMS confirmation', () => {
      firebaseSvc.confirmCode.and.returnValue(of({} as any));
      storageSvc.returnUrl = null;
      component.loginMethod = 'sms';
      component.phoneNumber = '+27815551234';
      component.code = '123456';
      component.confirmCode();
      expect(routerSvc.navigate).toHaveBeenCalledWith(['../dashboard'], { relativeTo: routeSvc });
    });
  });

  describe('confirmCode() — WhatsApp path', () => {
    it('calls verifyWhatsAppOtp then signInWithWhatsAppToken when loginMethod is whatsapp', () => {
      orderSvc.verifyWhatsAppOtp.and.returnValue(of({ customToken: 'tok123' }));
      firebaseSvc.signInWithWhatsAppToken.and.returnValue(of({} as any));
      storageSvc.returnUrl = null;
      component.loginMethod = 'whatsapp';
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
      component.loginMethod = 'whatsapp';
      component.phoneNumber = '+27815551234';
      component.code = '000000';
      component.confirmCode();
      expect(component.hasError).toBeTrue();
      expect(firebaseSvc.signInWithWhatsAppToken).not.toHaveBeenCalled();
    });

    it('sets hasError when signInWithWhatsAppToken fails', () => {
      orderSvc.verifyWhatsAppOtp.and.returnValue(of({ customToken: 'tok123' }));
      firebaseSvc.signInWithWhatsAppToken.and.returnValue(throwError({ message: 'Firebase error' }));
      component.loginMethod = 'whatsapp';
      component.phoneNumber = '+27815551234';
      component.code = '654321';
      component.confirmCode();
      expect(component.hasError).toBeTrue();
      expect(component.errorMessage).toBeTruthy();
    });
  });

  describe('setLoginMethod()', () => {
    it('updates loginMethod and resets state', () => {
      component.loginMethod = 'sms';
      component.isVerificationRequested = true;
      component.hasError = true;
      component.setLoginMethod('whatsapp');
      expect(component.loginMethod).toBe('whatsapp');
      expect(component.isVerificationRequested).toBeFalse();
      expect(component.hasError).toBeFalse();
    });

    it('re-creates reCAPTCHA capture when switching back to sms', (done) => {
      component.loginMethod = 'whatsapp';
      component.setLoginMethod('sms');
      setTimeout(() => {
        expect(firebaseSvc.createCapture).toHaveBeenCalled();
        done();
      }, 10);
    });
  });
});
