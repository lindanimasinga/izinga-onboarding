import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { StorageService } from '../service/storage-service.service';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { UserProfile } from '../model/userProfile';
import { AnalyticsService } from '../service/analytics.service';

/**
 * RP-002: Referral Partner enrollment — click-wrap acceptance of the Referral Partner Agreement.
 *
 * ADR-017 pattern: acceptance is recorded on the UserProfile via the three ICA fields
 * (icaAccepted, icaAcceptedDate, icaVersion) using version string 'rpa-v1'.
 * This version stamp was bumped from 'rpa-draft-v1' on 2026-07-17 when the two
 * placeholder commission amounts were replaced with confirmed material terms.
 * Partners who accepted under 'rpa-draft-v1' are NOT redirected — they see the form
 * again and must re-accept the corrected terms. See the RPA_VERSION property JSDoc.
 *
 * Enrollment flow (two-step, sequential):
 *   1. PATCH /user/{id} — persists ICA acceptance fields (icaAccepted, icaAcceptedDate, icaVersion).
 *   2. POST  /user/{id}/referral-code — assigns a unique referral code (idempotent).
 *
 *      OUTSTANDING BACKEND DEPENDENCY: the ADMIN-or-self authorization widening for
 *      this endpoint has NOT yet merged. It lives on ijudi-api branch
 *      `fix/rp-enrollment-referral-code-assignment`, which is currently blocked in
 *      Code Review on a security-test coverage gap. The existing production backend
 *      only accepts ADMIN tokens for this call — self-calls from enrolled partners
 *      will receive 403 until that branch merges to develop.
 *
 *      DO NOT deploy this frontend branch to any shared environment (dev, staging,
 *      or production) ahead of ijudi-api `fix/rp-enrollment-referral-code-assignment`
 *      merging to develop. Deploying this frontend first would cause every enrollment
 *      attempt to fail at step 2 with a 403.
 *
 *      Both calls must succeed before navigation to the dashboard.
 */
@Component({
  selector: 'app-referral-partner-enrollment',
  templateUrl: './referral-partner-enrollment.component.html',
  styleUrls: ['./referral-partner-enrollment.component.css']
})
export class ReferralPartnerEnrollmentComponent implements OnInit {

  agreementAccepted = false;
  acceptError = false;
  saving = false;
  user: UserProfile | undefined;

  /**
   * Version stamp written to icaVersion on the UserProfile at acceptance.
   *
   * Bumped from 'rpa-draft-v1' to 'rpa-v1' on 2026-07-17 when the two
   * R[TBC by attorney] commission placeholders in Schedule 1 were replaced
   * with the confirmed material terms (Food Customer: R15.00 flat; Furniture
   * Customer: 5% of Total Delivery Charge). This constitutes a material change
   * to the agreement text — any acceptance recorded under 'rpa-draft-v1' used
   * placeholder text and is distinguishable in the audit log from partners who
   * accepted the confirmed terms under 'rpa-v1'.
   *
   * Terms confirmed by co-founder Lindani Masinga on 14 July 2026.
   * See docs/referral-partner-agreement.md, Schedule 1.
   */
  readonly RPA_VERSION = 'rpa-v1';

  constructor(
    private router: Router,
    private storageService: StorageService,
    private izingaOrderManager: IzingaOrderManagementService,
    private analytics: AnalyticsService
  ) {}

  ngOnInit(): void {
    this.analytics.logScreenView('referral_partner_enrollment');
    this.user = this.storageService.userProfile;

    if (!this.user) {
      this.router.navigate(['/']);
      return;
    }

    // If the user has already completed enrollment under the current agreement version, skip to dashboard.
    // Partners who accepted an older version (e.g. 'rpa-draft-v1') must re-accept the corrected terms.
    if (this.user.icaAccepted && this.user.icaVersion === this.RPA_VERSION && this.user.role === UserProfile.RoleEnum.REFERRALPARTNER) {
      this.router.navigate(['/indivisuals/rp-referral-code']);
    }
  }

  enroll(): void {
    if (!this.agreementAccepted || !this.user || this.saving) {
      return;
    }

    this.saving = true;
    this.acceptError = false;

    const updatedProfile: UserProfile = {
      ...this.user,
      icaAccepted: true,
      icaAcceptedDate: new Date(),
      icaVersion: this.RPA_VERSION
    };

    // NOTE-01 fix: flattened from nested subscribe to switchMap so that navigating
    // away between the two calls does not leave an inner subscription alive against
    // a destroyed component. A single subscription covers both steps; cancellation
    // of the outer observable also cancels any in-flight step-2 request.
    this.izingaOrderManager.updateCustomer(updatedProfile).pipe(
      switchMap((savedProfile: UserProfile) => {
        // Step 1 succeeded — ICA acceptance persisted. Now assign the referral code (RP-003).
        return this.izingaOrderManager.assignReferralCode(savedProfile.id!);
      })
    ).subscribe({
      next: (profileWithCode: UserProfile) => {
        // Both steps succeeded. Persist the profile that now carries referralCode.
        this.storageService.userProfile = profileWithCode;
        this.analytics.logEvent('referral_partner_rpa_accepted', {
          userId: profileWithCode.id,
          icaVersion: this.RPA_VERSION
        });
        this.router.navigate(['/indivisuals/rp-referral-code']);
      },
      error: () => {
        // Either step failed — surface the error so the user can retry.
        // ICA may already be recorded (step 1 succeeded) but referral code is
        // not yet assigned. The retry is safe: updateCustomer is idempotent for
        // the same icaVersion, and assignReferralCode is idempotent by design.
        this.acceptError = true;
        this.saving = false;
      }
    });
  }
}
