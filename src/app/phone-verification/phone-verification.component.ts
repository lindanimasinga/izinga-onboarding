import { Component } from '@angular/core';
import { UserProfile } from '../model/models';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { ActivatedRoute, Route, Router } from '@angular/router';

import { map, mergeMap, catchError } from 'rxjs/operators';
import { from, Observable, of, throwError } from 'rxjs';
import { FirebaseService } from '../service/firebase.service';
import { StorageService } from '../service/storage-service.service';
import { AnalyticsService } from '../service/analytics.service';

@Component({
  selector: 'app-phone-verification',
  templateUrl: './phone-verification.component.html',
  styleUrls: ['./phone-verification.component.css']
})
export class PhoneVerificationComponent {

  isPhoneNumberVerified = false
  isVerificationRequested = false
  code?: string
  phoneNumber?: string
  // Full E.164-normalised number (+27XXXXXXXXX) used for all API/Firebase calls.
  // Stored separately from phoneNumber so the template input can display only the
  // local digits (no +27 prefix) beside the static "+27" prefix box — preventing
  // the double-"+27" visual regression (ONB-REGRESSION-03).
  private _normalizedPhone?: string

  // Starts as 'whatsapp'; can only be flipped to 'sms' via triple-tap on heading.
  loginMethod: 'sms' | 'whatsapp' = 'whatsapp';

  userAlreadyRegistered?: boolean;
  hasError?: boolean;
  errorMessage?: string;
  messegers?: UserProfile[];

  // Triple-tap state — not exposed in template beyond the click handler.
  private _headingTapCount = 0;
  private _headingTapTimer: any = null;
  // Window within which 3 taps must occur (ms). 1 500 ms is permissive enough
  // for deliberate repeated taps but won't fire by accident during normal use.
  private readonly TAP_WINDOW_MS = 1500;

  constructor(private izingaOrderManager: IzingaOrderManagementService,
    private storageService: StorageService,
    private firebaseService: FirebaseService,
    private router: Router,
    private route: ActivatedRoute,
    private analytics: AnalyticsService) {

    }

  ngOnInit(): void {
    this.analytics.logScreenView('phone_verification');
  }

  ngAfterViewInit() {
    // reCAPTCHA is only needed when SMS mode is active; SMS mode starts dormant.
  }

  /**
   * Hidden debug gesture: tapping the "Registration" heading 3 times within
   * TAP_WINDOW_MS activates Firebase Phone Auth / SMS mode.
   * The timer resets after each tap; if the gap between two consecutive taps
   * exceeds the window the counter drops back to 0.
   */
  onHeadingTap(): void {
    if (this.loginMethod === 'sms') {
      // Already in SMS mode — ignore further taps.
      return;
    }

    this._headingTapCount++;

    // Clear any pending reset timer and restart it.
    if (this._headingTapTimer) {
      clearTimeout(this._headingTapTimer);
    }

    if (this._headingTapCount >= 3) {
      // Gesture fired — activate SMS mode.
      this._headingTapCount = 0;
      this._headingTapTimer = null;
      this.activateSmsMode();
      return;
    }

    // Reset the counter if the next tap doesn't arrive in time.
    this._headingTapTimer = setTimeout(() => {
      this._headingTapCount = 0;
      this._headingTapTimer = null;
    }, this.TAP_WINDOW_MS);
  }

  private activateSmsMode(): void {
    this.loginMethod = 'sms';
    this.isVerificationRequested = false;
    this.hasError = false;
    this.errorMessage = undefined;
    // Defer reCAPTCHA setup by one tick so Angular renders the container div first.
    setTimeout(() => this.firebaseService.createCapture(), 0);
  }

  resend() {
    this.isVerificationRequested = false
  }

  verify() {
    // Normalise to full E.164 (+27XXXXXXXXX) and store in _normalizedPhone.
    // Do NOT write back into this.phoneNumber — the template input is still
    // bound to phoneNumber for two-way ngModel, and writing "+27XXXXXXXXX"
    // back would show double-"+27" once the input is disabled beside the
    // static "+27" prefix box (ONB-REGRESSION-03).
    const raw = this.phoneNumber ?? '';
    this._normalizedPhone = raw.startsWith('+27') ? raw
      : raw.startsWith('0') ? raw.replace('0', '+27')
      : raw.startsWith('27') ? '+' + raw
      : '+27' + raw;

    if (this.loginMethod === 'whatsapp') {
      this.izingaOrderManager.sendWhatsAppOtp(this._normalizedPhone)
        .subscribe(() => {
          this.isVerificationRequested = true;
          this.hasError = false;
          this.analytics.logEvent('verification_code_sent_whatsapp');
        }, (error) => {
          this.hasError = true;
          // error.message on HttpErrorResponse is always the raw
          // "Http failure response for http://…: 500 OK" string — never
          // user-friendly. Extract the backend's own error field first
          // (ONB-REGRESSION-02).
          this.errorMessage = error?.error?.error
            || error?.error?.message
            || 'Failed to send WhatsApp OTP. Please try again.';
        });
      return;
    }

    this.firebaseService.requestVerification(this._normalizedPhone)
      .subscribe(() => {
        this.isVerificationRequested = true
        this.hasError = false;
        this.analytics.logEvent('verification_code_sent');
      }, (error) => {
        this.hasError = true;
        // Firebase auth errors have a user-readable error.message (e.g.
        // "Firebase: TOO_MANY_ATTEMPTS_TRY_LATER (auth/too-many-requests).").
        // Use it directly; no HttpErrorResponse raw-URL leakage here.
        this.errorMessage = error?.message || 'Failed to send verification code. Please try again.';
      })
  }

  private onVerified() {
    this.isPhoneNumberVerified = true;
    // Always persist the E.164 form so downstream components (DashboardComponent,
    // etc.) that call getCustomerByPhoneNumber() receive the correct format.
    this.storageService.phoneNumber = this._normalizedPhone ?? this.phoneNumber!!;
    this.analytics.logEvent('phone_verified');

    // T-12: If the guard stored a returnUrl (e.g. driver came via QR →
    // guard redirected to verify → OTP confirmed), navigate back to the
    // original destination so the ref param is still active in sessionStorage.
    const returnUrl = this.storageService.returnUrl;
    if (returnUrl) {
      this.storageService.returnUrl = null;
      this.router.navigateByUrl(returnUrl);
    } else {
      this.router.navigate(["../dashboard"], { relativeTo: this.route });
    }
  }

  confirmCode() {
    if (this.loginMethod === 'whatsapp') {
      // Use _normalizedPhone (E.164) for the backend OTP verify call.
      const phone = this._normalizedPhone ?? this.phoneNumber!;
      this.izingaOrderManager.verifyWhatsAppOtp(phone, this.code!)
        .subscribe(response => {
          this.firebaseService.signInWithWhatsAppToken(response.customToken)
            .subscribe(() => {
              this.onVerified();
            }, (error) => {
              this.hasError = true;
              // Firebase errors have user-readable .message; prefer that.
              this.errorMessage = error?.message || 'Firebase sign-in failed after WhatsApp verification.';
            });
        }, (error) => {
          this.hasError = true;
          // Backend HttpErrorResponse — extract the body's error field
          // (ONB-REGRESSION-02).
          this.errorMessage = error?.error?.error
            || error?.error?.message
            || 'Invalid verification code. Please try again.';
        });
      return;
    }

    this.firebaseService.confirmCode(this.code!)
      .subscribe(cred => {
        this.onVerified();
      }, (error) => {
        this.hasError = true;
        // Firebase error — .message is user-friendly.
        this.errorMessage = error?.message || 'Failed to confirm SMS code. Please try again.';
      })
  }

}
