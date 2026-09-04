import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
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

  it('starts in whatsapp mode', () => {
    expect(component.loginMethod).toBe('whatsapp');
  });

  // ── Triple-tap gesture ──────────────────────────────────────────────────────

  describe('onHeadingTap() — triple-tap gesture', () => {
    it('switches to SMS mode after 3 rapid taps and calls createCapture()', fakeAsync(() => {
      component.onHeadingTap(); // tap 1
      component.onHeadingTap(); // tap 2
      component.onHeadingTap(); // tap 3 — fires immediately
      tick(0); // flush setTimeout(() => createCapture(), 0)

      expect(component.loginMethod).toBe('sms');
      expect(firebaseSvc.createCapture).toHaveBeenCalledTimes(1);
    }));

    it('does NOT switch when the gap between taps exceeds the window', fakeAsync(() => {
      component.onHeadingTap(); // tap 1
      tick(1600);               // window expires — counter resets
      component.onHeadingTap(); // tap 1 again (fresh counter)
      component.onHeadingTap(); // tap 2

      expect(component.loginMethod).toBe('whatsapp');
      expect(firebaseSvc.createCapture).not.toHaveBeenCalled();

      // Clean up pending timer so fakeAsync doesn't complain.
      tick(1500);
    }));

    it('resets tap counter correctly across multiple slow sequences', fakeAsync(() => {
      component.onHeadingTap();
      tick(1600); // reset
      component.onHeadingTap();
      tick(1600); // reset again
      component.onHeadingTap();

      expect(component.loginMethod).toBe('whatsapp');

      tick(1500); // drain remaining timer
    }));

    it('ignores further taps once already in SMS mode', fakeAsync(() => {
      // Activate SMS mode via gesture.
      component.onHeadingTap();
      component.onHeadingTap();
      component.onHeadingTap();
      tick(0);
      expect(component.loginMethod).toBe('sms');

      firebaseSvc.createCapture.calls.reset();

      // More taps should be no-ops.
      component.onHeadingTap();
      component.onHeadingTap();
      component.onHeadingTap();
      tick(0);

      expect(firebaseSvc.createCapture).not.toHaveBeenCalled();
    }));

    it('resets error state when activating SMS mode', fakeAsync(() => {
      component.hasError = true;
      component.errorMessage = 'some error';
      component.isVerificationRequested = true;

      component.onHeadingTap();
      component.onHeadingTap();
      component.onHeadingTap();
      tick(0);

      expect(component.hasError).toBeFalse();
      expect(component.errorMessage).toBeUndefined();
      expect(component.isVerificationRequested).toBeFalse();
    }));
  });

  // ── verify() ───────────────────────────────────────────────────────────────

  describe('verify()', () => {
    it('calls orderManager.sendWhatsAppOtp with normalised number (whatsapp mode)', () => {
      orderSvc.sendWhatsAppOtp.and.returnValue(of(undefined as any));
      component.phoneNumber = '0815551234';
      component.verify();
      expect(orderSvc.sendWhatsAppOtp).toHaveBeenCalledWith('+27815551234');
      expect(firebaseSvc.requestVerification).not.toHaveBeenCalled();
    });

    it('sets isVerificationRequested on WhatsApp OTP success', () => {
      orderSvc.sendWhatsAppOtp.and.returnValue(of(undefined as any));
      component.phoneNumber = '0815551234';
      component.verify();
      expect(component.isVerificationRequested).toBeTrue();
    });

    it('sets hasError on WhatsApp OTP failure', () => {
      orderSvc.sendWhatsAppOtp.and.returnValue(throwError({ message: 'WA error' }));
      component.phoneNumber = '0815551234';
      component.verify();
      expect(component.hasError).toBeTrue();
    });

    it('calls firebaseService.requestVerification in SMS mode', fakeAsync(() => {
      firebaseSvc.requestVerification.and.returnValue(of({} as any));
      // Activate SMS mode.
      component.onHeadingTap();
      component.onHeadingTap();
      component.onHeadingTap();
      tick(0);

      component.phoneNumber = '0815551234';
      component.verify();

      expect(firebaseSvc.requestVerification).toHaveBeenCalledWith('+27815551234');
      expect(orderSvc.sendWhatsAppOtp).not.toHaveBeenCalled();
    }));

    it('sets isVerificationRequested on SMS requestVerification success', fakeAsync(() => {
      firebaseSvc.requestVerification.and.returnValue(of({} as any));
      component.onHeadingTap();
      component.onHeadingTap();
      component.onHeadingTap();
      tick(0);

      component.phoneNumber = '0815551234';
      component.verify();

      expect(component.isVerificationRequested).toBeTrue();
    }));

    it('sets hasError when SMS requestVerification fails', fakeAsync(() => {
      firebaseSvc.requestVerification.and.returnValue(throwError({ message: 'SMS error' }));
      component.onHeadingTap();
      component.onHeadingTap();
      component.onHeadingTap();
      tick(0);

      component.phoneNumber = '0815551234';
      component.verify();

      expect(component.hasError).toBeTrue();
    }));
  });

  // ── confirmCode() ──────────────────────────────────────────────────────────

  describe('confirmCode()', () => {
    it('calls verifyWhatsAppOtp then signInWithWhatsAppToken (whatsapp mode)', () => {
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

    it('calls firebaseService.confirmCode in SMS mode', fakeAsync(() => {
      firebaseSvc.confirmCode.and.returnValue(of({} as any));
      storageSvc.returnUrl = null;

      component.onHeadingTap();
      component.onHeadingTap();
      component.onHeadingTap();
      tick(0);

      component.phoneNumber = '+27815551234';
      component.code = '123456';
      component.confirmCode();

      expect(firebaseSvc.confirmCode).toHaveBeenCalledWith('123456');
      expect(orderSvc.verifyWhatsAppOtp).not.toHaveBeenCalled();
      expect(routerSvc.navigate).toHaveBeenCalledWith(['../dashboard'], { relativeTo: routeSvc });
    }));

    it('sets hasError when SMS confirmCode fails', fakeAsync(() => {
      firebaseSvc.confirmCode.and.returnValue(throwError({ message: 'Wrong code' }));

      component.onHeadingTap();
      component.onHeadingTap();
      component.onHeadingTap();
      tick(0);

      component.phoneNumber = '+27815551234';
      component.code = '000000';
      component.confirmCode();

      expect(component.hasError).toBeTrue();
    }));
  });
});
