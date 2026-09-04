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
    this.phoneNumber = this.phoneNumber?.startsWith("+27")? this.phoneNumber : this.phoneNumber?.startsWith("0") ?
      this.phoneNumber.replace("0", "+27") : this.phoneNumber?.startsWith("27") ? "+" + this.phoneNumber : "+27" +this.phoneNumber;

    if (this.loginMethod === 'whatsapp') {
      this.izingaOrderManager.sendWhatsAppOtp(this.phoneNumber!)
        .subscribe(() => {
          this.isVerificationRequested = true;
          this.hasError = false;
          this.analytics.logEvent('verification_code_sent_whatsapp');
        }, (error) => {
          this.hasError = true;
          this.errorMessage = error.message || 'Failed to send WhatsApp OTP. Please try again.';
        });
      return;
    }

    this.firebaseService.requestVerification(this.phoneNumber)
      .subscribe(() => {
        this.isVerificationRequested = true
        this.hasError = false;
        this.analytics.logEvent('verification_code_sent');
      }, (error) => {
        this.hasError = true;
        this.errorMessage = error.message;
      })
  }

  private onVerified() {
    this.isPhoneNumberVerified = true;
    this.storageService.phoneNumber = this.phoneNumber!!;
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
      this.izingaOrderManager.verifyWhatsAppOtp(this.phoneNumber!, this.code!)
        .subscribe(response => {
          this.firebaseService.signInWithWhatsAppToken(response.customToken)
            .subscribe(() => {
              this.onVerified();
            }, (error) => {
              this.hasError = true;
              this.errorMessage = error.message || 'Firebase sign-in failed after WhatsApp verification.';
            });
        }, (error) => {
          this.hasError = true;
          this.errorMessage = error.message || 'Invalid verification code. Please try again.';
        });
      return;
    }

    this.firebaseService.confirmCode(this.code!)
      .subscribe(cred => {
        this.onVerified();
      }, (error) => {
        this.hasError = true;
        this.errorMessage = error.message || 'Failed to confirm SMS code. Please try again.';
      })
  }

}
