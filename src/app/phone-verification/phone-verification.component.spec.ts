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
    // T-06: ngOnInit now subscribes to queryParams for returnUrl handling (REQ-07).
    // Provide an empty-params Observable so ngOnInit does not throw on detectChanges().
    routeSvc = { queryParams: of({}) } as any;

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
      // PV-7: onHeadingTap removed; set SMS mode directly for coverage of that code path.
      component.loginMethod = 'sms';
      tick(0);

      component.phoneNumber = '0815551234';
      component.verify();

      expect(firebaseSvc.requestVerification).toHaveBeenCalledWith('+27815551234');
      expect(orderSvc.sendWhatsAppOtp).not.toHaveBeenCalled();
    }));

    it('sets isVerificationRequested on SMS requestVerification success', fakeAsync(() => {
      firebaseSvc.requestVerification.and.returnValue(of({} as any));
      component.loginMethod = 'sms';
      tick(0);

      component.phoneNumber = '0815551234';
      component.verify();

      expect(component.isVerificationRequested).toBeTrue();
    }));

    it('sets hasError when SMS requestVerification fails', fakeAsync(() => {
      firebaseSvc.requestVerification.and.returnValue(throwError({ message: 'SMS error' }));
      component.loginMethod = 'sms';
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

      // PV-7: set SMS mode directly — onHeadingTap removed.
      component.loginMethod = 'sms';
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

      // PV-7: set SMS mode directly — onHeadingTap removed.
      component.loginMethod = 'sms';
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

      // PV-7: set SMS mode directly — onHeadingTap removed.
      component.loginMethod = 'sms';
      tick(0);

      component.phoneNumber = '+27815551234';
      component.code = '000000';
      component.confirmCode();

      expect(component.isConfirming).toBeFalse();
      expect(component.hasError).toBeTrue();
    }));
  });
});

// T-06 / REQ-07 / AC-21: ngOnInit returnUrl query-param handling.
// Uses a separate describe with fresh TestBed to supply different queryParams per case.
describe('PhoneVerificationComponent — T-06 returnUrl handling (REQ-07 / AC-21)', () => {
  afterEach(() => TestBed.resetTestingModule());

  function makeComponent(queryParamsValue: Record<string, string>, storageSvcRef: any) {
    const orderSvc = jasmine.createSpyObj('IzingaOrderManagementService', ['sendWhatsAppOtp', 'verifyWhatsAppOtp']);
    const firebaseSvc = jasmine.createSpyObj('FirebaseService', ['requestVerification', 'confirmCode', 'signInWithWhatsAppToken', 'createCapture']);
    const analyticsSvc = { logScreenView: () => {}, logEvent: () => {} } as any;
    const routerSvc = { navigate: jasmine.createSpy(), navigateByUrl: jasmine.createSpy() } as any;

    TestBed.configureTestingModule({
      declarations: [PhoneVerificationComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: IzingaOrderManagementService, useValue: orderSvc },
        { provide: StorageService, useValue: storageSvcRef },
        { provide: FirebaseService, useValue: firebaseSvc },
        { provide: AnalyticsService, useValue: analyticsSvc },
        { provide: Router, useValue: routerSvc },
        { provide: ActivatedRoute, useValue: { queryParams: of(queryParamsValue) } }
      ]
    });
    const f = TestBed.createComponent(PhoneVerificationComponent);
    f.detectChanges();
    return f.componentInstance;
  }

  it('T-06: internal returnUrl starting with "/" is stored in StorageService (REQ-07)', () => {
    const storageSvc: any = { phoneNumber: '', returnUrl: null };
    makeComponent({ returnUrl: '/indivisuals/store-invite?code=abc123' }, storageSvc);
    expect(storageSvc.returnUrl).toBe('/indivisuals/store-invite?code=abc123');
  });

  it('AC-21: external returnUrl (https://evil.com) is NOT stored — redirect guard', () => {
    const storageSvc: any = { phoneNumber: '', returnUrl: null };
    makeComponent({ returnUrl: 'https://evil.com' }, storageSvc);
    expect(storageSvc.returnUrl).toBeNull();
  });

  it('AC-21: external returnUrl without scheme ("evil.com") is NOT stored', () => {
    const storageSvc: any = { phoneNumber: '', returnUrl: null };
    makeComponent({ returnUrl: 'evil.com/steal' }, storageSvc);
    expect(storageSvc.returnUrl).toBeNull();
  });

  it('T-06: absent returnUrl leaves StorageService.returnUrl unchanged', () => {
    const storageSvc: any = { phoneNumber: '', returnUrl: null };
    makeComponent({}, storageSvc);
    expect(storageSvc.returnUrl).toBeNull();
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
        // T-06: provide queryParams Observable so ngOnInit doesn't throw.
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } }
      ]
    });
    const f = TestBed.createComponent(PhoneVerificationComponent);
    f.detectChanges();
    const privacyNotice = f.nativeElement.querySelector('.privacy-notice');
    expect(privacyNotice).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// UX review ONB-UX-02 — PV-1, PV-2, PV-4, PV-7
// Verifies that input attributes and structural fixes are present in the
// rendered DOM, not just in the template source.
// ---------------------------------------------------------------------------
describe('PhoneVerificationComponent — UX review fixes (PV-1 PV-2 PV-4 PV-7)', () => {
  afterEach(() => TestBed.resetTestingModule());

  function buildPVFixture() {
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
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } }
      ]
    });
    const f = TestBed.createComponent(PhoneVerificationComponent);
    const c = f.componentInstance;
    f.detectChanges();
    return { fixture: f, component: c };
  }

  // PV-1: phone input must expose numeric keypad and phone autocomplete on mobile
  it('PV-1 — phone input has type="tel", inputmode="tel", autocomplete="tel"', () => {
    const { fixture } = buildPVFixture();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[name="mobileNumber"]');
    expect(input).not.toBeNull('phone input must be present in DOM');
    expect(input.type).toBe('tel');
    expect(input.getAttribute('inputmode')).toBe('tel');
    expect(input.getAttribute('autocomplete')).toBe('tel');
  });

  // PV-2: OTP input must trigger numeric keypad and SMS autofill on mobile
  it('PV-2 — OTP input has inputmode="numeric" and autocomplete="one-time-code"', () => {
    const { fixture, component } = buildPVFixture();
    // The OTP input is rendered only when isVerificationRequested is true.
    component.isVerificationRequested = true;
    fixture.detectChanges();
    const otpInput: HTMLInputElement = fixture.nativeElement.querySelector('input[name="code"]');
    expect(otpInput).not.toBeNull('OTP input must be present after verification is requested');
    expect(otpInput.getAttribute('inputmode')).toBe('numeric');
    expect(otpInput.getAttribute('autocomplete')).toBe('one-time-code');
  });

  // PV-4: resend must be a keyboard-reachable <button>, not a <div> with a click handler
  it('PV-4 — resend control is button.btn-link.resend type=button; no div.resend wrapper', () => {
    const { fixture, component } = buildPVFixture();
    // The resend section is inside *ngIf="isVerificationRequested"
    component.isVerificationRequested = true;
    fixture.detectChanges();
    // New: a focusable <button> with the resend class
    const resendBtn: HTMLButtonElement = fixture.nativeElement.querySelector('button.resend');
    expect(resendBtn).not.toBeNull('resend <button> must be present');
    expect(resendBtn.type).toBe('button');
    expect(resendBtn.classList.contains('btn-link')).toBeTrue();
    // Old wrapper <div> with click handler must be gone
    const resendDiv = fixture.nativeElement.querySelector('div.resend');
    expect(resendDiv).toBeNull('div.resend must not exist — click was moved to a <button>');
  });

  // PV-7: onHeadingTap() was a debugging aid on the heading; it must be absent from the class
  it('PV-7 — onHeadingTap method does not exist on the component class', () => {
    const { component } = buildPVFixture();
    expect((component as any).onHeadingTap).toBeUndefined();
  });
});
