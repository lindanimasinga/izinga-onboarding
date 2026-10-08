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

  // ── Double-submit guard (ONB-BUG-03) ─────────────────────────────────────

  describe('confirmCode() — double-submit guard (ONB-BUG-03)', () => {
    it('a second call while the first is in flight does NOT call verifyWhatsAppOtp again', () => {
      // Simulate a never-completing in-flight request so the guard stays active.
      const { Subject } = (window as any)['rxjs'] || {};
      // Use a subject that never completes, or just verify call count synchronously.
      // verifyWhatsAppOtp returns a synchronous observable here; the guard sets
      // isConfirming=true at entry and only resets it on error/success. Since the
      // spy returns an observable that completes synchronously with a token, the
      // first call fully resolves before the second call — isConfirming is still
      // true because onVerified() navigates away (no reset path on success).
      orderSvc.verifyWhatsAppOtp.and.returnValue(of({ customToken: 'tok-double' }));
      firebaseSvc.signInWithWhatsAppToken.and.returnValue(of({} as any));
      storageSvc.returnUrl = null;
      component.phoneNumber = '+27815551234';
      component.code = '654321';

      component.confirmCode(); // first call — isConfirming set to true
      component.confirmCode(); // second call — must be blocked by guard

      // verifyWhatsAppOtp must have been called exactly once despite two
      // invocations of confirmCode(). This is the regression guard for the
      // bug where a duplicate POST /auth/whatsapp/otp/verify caused "Invalid
      // or expired code" because the OTP is single-use (ONB-BUG-03).
      expect(orderSvc.verifyWhatsAppOtp).toHaveBeenCalledTimes(1);
    });

    it('isConfirming resets after verifyWhatsAppOtp error, allowing retry', () => {
      orderSvc.verifyWhatsAppOtp.and.returnValue(throwError({ error: { error: 'No active OTP' } }));
      component.phoneNumber = '+27815551234';
      component.code = '000000';

      component.confirmCode();

      // After an error, isConfirming must be reset so the user can retry.
      expect(component.isConfirming).toBeFalse();
      expect(component.hasError).toBeTrue();
    });

    it('isConfirming resets after signInWithWhatsAppToken error, allowing retry', () => {
      orderSvc.verifyWhatsAppOtp.and.returnValue(of({ customToken: 'tok-err' }));
      firebaseSvc.signInWithWhatsAppToken.and.returnValue(throwError({ message: 'Firebase error' }));
      component.phoneNumber = '+27815551234';
      component.code = '654321';

      component.confirmCode();

      expect(component.isConfirming).toBeFalse();
      expect(component.hasError).toBeTrue();
    });

    it('isConfirming resets after SMS confirmCode error, allowing retry', fakeAsync(() => {
      firebaseSvc.confirmCode.and.returnValue(throwError({ message: 'Wrong SMS code' }));

      component.onHeadingTap();
      component.onHeadingTap();
      component.onHeadingTap();
      tick(0);

      component.phoneNumber = '+27815551234';
      component.code = '000000';
      component.confirmCode();

      expect(component.isConfirming).toBeFalse();
      expect(component.hasError).toBeTrue();
    }));
  });
});

// REQ-PP: no inline privacy notice in phone-verification template (ONB-UX-02)
// Note: TestBed already configured in the outer describe — we use a separate describe
// with its own TestBed configuration to keep test isolation.
describe('PhoneVerificationComponent — REQ-PP (ONB-UX-02)', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('REQ-PP — no .privacy-notice element rendered in phone-verification template', () => {
    const orderSvc = jasmine.createSpyObj('IzingaOrderManagementService', ['sendWhatsAppOtp', 'verifyWhatsAppOtp']);
    const firebaseSvc = jasmine.createSpyObj('FirebaseService', ['requestVerification', 'confirmCode', 'signInWithWhatsAppToken', 'createCapture']);
    const storageSvc = { phoneNumber: '', returnUrl: null } as any;
    const analyticsSvc = { logScreenView: () => {}, logEvent: () => {} } as any;
    const routerSvc = { navigate: jasmine.createSpy(), navigateByUrl: jasmine.createSpy() } as any;

    TestBed.configureTestingModule({
      declarations: [PhoneVerificationComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: IzingaOrderManagementService, useValue: orderSvc },
        { provide: StorageService, useValue: storageSvc },
        { provide: FirebaseService, useValue: firebaseSvc },
        { provide: AnalyticsService, useValue: analyticsSvc },
        { provide: Router, useValue: routerSvc },
        { provide: ActivatedRoute, useValue: {} }
      ]
    });
    const f = TestBed.createComponent(PhoneVerificationComponent);
    f.detectChanges();
    const privacyNotice = f.nativeElement.querySelector('.privacy-notice');
    expect(privacyNotice).toBeNull();
  });
});
