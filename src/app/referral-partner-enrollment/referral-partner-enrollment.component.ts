import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { StorageService } from '../service/storage-service.service';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { UserProfile } from '../model/userProfile';
import { AnalyticsService } from '../service/analytics.service';

/**
 * RP-002: Referral Partner enrollment — click-wrap acceptance of the Referral Partner Agreement.
 *
 * ADR-017 pattern: acceptance is recorded on the UserProfile via the three ICA fields
 * (icaAccepted, icaAcceptedDate, icaVersion) using version string 'rpa-draft-v1'.
 * The version string MUST be updated to 'rpa-v1' (or the final version stamp supplied
 * by attorney Jason van der Merwe) before this screen goes live in production.
 *
 * Blocking dependency: referral code assignment (ReferralCodeService.assignReferralCode)
 * requires backend endpoint RP-003 to be merged and available. Until then, enrollment
 * completes the ICA acceptance but does NOT call a referral code endpoint.
 * See PR notes for the assumed API contract.
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

    // If the user has already completed enrollment, skip to dashboard.
    if (this.user.icaAccepted && this.user.role === UserProfile.RoleEnum.REFERRALPARTNER) {
      this.router.navigate(['/indivisuals/rp-dashboard']);
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

    this.izingaOrderManager.updateCustomer(updatedProfile).subscribe({
      next: (savedProfile: UserProfile) => {
        this.storageService.userProfile = savedProfile;
        this.analytics.logEvent('referral_partner_rpa_accepted', {
          userId: savedProfile.id,
          icaVersion: this.RPA_VERSION
        });
        // NOTE-03 (tracked as GitHub issue — raise under RP-003 follow-up):
        // Enrolled partners reach the dashboard without a referral code until
        // POST /user/{id}/referral-code is wired here. That call must be added
        // before this enrollment flow is considered complete for production.
        // Contract: POST /user/{userId}/referral-code, no request body,
        // response is updated UserProfile with referralCode populated.
        // This enrollment is BLOCKED from production use until RP-003 merges
        // on ijudi-api and this call is added.
        this.router.navigate(['/indivisuals/rp-dashboard']);
      },
      error: () => {
        this.acceptError = true;
        this.saving = false;
      }
    });
  }
}
