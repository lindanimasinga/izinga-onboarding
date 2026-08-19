import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StorageService } from '../service/storage-service.service';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { UserProfile } from '../model/userProfile';
import { AnalyticsService } from '../service/analytics.service';

@Component({
  selector: 'app-terms-conditions',
  templateUrl: './terms-conditions.component.html',
  styleUrls: ['./terms-conditions.component.css']
})
export class TermsConditionsComponent implements OnInit {

  /**
   * Current Ambassador ICA version. Bump this constant when a new ICA version
   * is deployed. The dashboard also checks this version — update
   * dashboard.component.ts AMBASSADOR_ICA_VERSION in the same commit.
   *
   * v1 → v2 (2026-08-12): added clause 1.5 (no minimum obligation) and
   * clause 6.8 (POPIA cross-border cloud transfer). Jason van der Merwe
   * provided written sign-off on 2026-08-12 ("Hi Lindani i confirm you may
   * proceed."). ADR-017 gate cleared.
   */
  static readonly AMBASSADOR_ICA_VERSION = 'v2';

  /**
   * Current Driver ICA version. Bump this constant when the Driver ICA content
   * changes. The dashboard also checks this version — update
   * dashboard.component.ts in the same commit.
   *
   * driver-v2 (2026-08-19): clause 3.1 replaced (automatic EFT/mobile-wallet
   * payout — no invoicing required); clause 20 sub-numbering corrected to
   * 20.1–20.4; registration number 2016/429327/07 inserted in preamble.
   * Jason van der Merwe approved in writing 2026-08-19 ("No issues with the
   * changes to 3.1. You may proceed."). ADR-017 gate cleared.
   */
  static readonly DRIVER_ICA_VERSION = 'driver-v2';

  termsAccepted = false;
  acceptError = false;
  userId?: string;
  user: UserProfile | undefined;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private storageService: StorageService,
    private izingaOrderManager: IzingaOrderManagementService,
    private analytics: AnalyticsService
  ) {}

  get isAmbassador(): boolean {
    return this.user?.role === UserProfile.RoleEnum.AMBASSADOR;
  }

  /**
   * Returns true when the Ambassador must accept (or re-accept) the ICA.
   * A v1 ambassador (icaAccepted=true, icaVersion='v1') requires re-acceptance
   * when the current version has advanced to v2.
   */
  get needsIcaAcceptance(): boolean {
    if (!this.isAmbassador) {
      return false;
    }
    return !this.user?.icaAccepted || this.user?.icaVersion !== TermsConditionsComponent.AMBASSADOR_ICA_VERSION;
  }

  get isDriver(): boolean {
    return this.user?.role === UserProfile.RoleEnum.MESSENGER;
  }

  /**
   * Returns true when the Driver (MESSENGER) must accept (or re-accept) the
   * Driver ICA. This gates both brand-new drivers (icaAccepted falsy) and
   * the 346 existing drivers who completed onboarding before the ICA was
   * introduced (termsAccepted=true, icaAccepted falsy). It also re-gates any
   * driver who accepted a previous version (icaVersion !== DRIVER_ICA_VERSION).
   */
  get needsDriverIcaAcceptance(): boolean {
    if (!this.isDriver) {
      return false;
    }
    return !this.user?.icaAccepted || this.user?.icaVersion !== TermsConditionsComponent.DRIVER_ICA_VERSION;
  }

  ngOnInit() {
    this.analytics.logScreenView('terms_conditions');
    this.route.params.subscribe(params => {
      this.userId = params['id'];
    });
    this.user = this.storageService.userProfile!;
  }

  acceptTerms() {
    this.acceptError = false;

    if (this.termsAccepted && this.userId && this.user) {
      if (this.isAmbassador) {
        this.user.icaAccepted = true;
        this.user.icaAcceptedDate = new Date();
        this.user.icaVersion = TermsConditionsComponent.AMBASSADOR_ICA_VERSION;

        this.izingaOrderManager.updateCustomer(this.user).subscribe({
          next: (updatedUser: UserProfile) => {
            this.storageService.userProfile = updatedUser;
            this.analytics.logEvent('ica_accepted', { userId: this.userId, icaVersion: TermsConditionsComponent.AMBASSADOR_ICA_VERSION });
            this.router.navigate(['/indivisuals/training-guide']);
          },
          error: () => { this.acceptError = true; }
        });
      } else if (this.isDriver) {
        // Driver ICA: set both ICA fields (ADR-017) and termsAccepted in one PATCH.
        // This covers new drivers (termsAccepted not yet set) and the 346 existing
        // drivers who are returned here to sign the ICA after having termsAccepted=true.
        this.user.icaAccepted = true;
        this.user.icaAcceptedDate = new Date();
        this.user.icaVersion = TermsConditionsComponent.DRIVER_ICA_VERSION;
        this.user.termsAccepted = true;
        this.user.termsAcceptedDate = new Date();

        this.izingaOrderManager.updateCustomer(this.user).subscribe({
          next: (updatedUser: UserProfile) => {
            this.storageService.userProfile = updatedUser;
            this.analytics.logEvent('driver_ica_accepted', { userId: this.userId, icaVersion: TermsConditionsComponent.DRIVER_ICA_VERSION });
            const currentUrl = this.router.url;
            if (currentUrl.includes('/business/')) {
              this.router.navigate(['/business/dashboard']);
            } else {
              this.router.navigate(['/indivisuals/dashboard']);
            }
          },
          error: () => { this.acceptError = true; }
        });
      } else {
        this.user.termsAccepted = true;
        this.user.termsAcceptedDate = new Date();

        this.izingaOrderManager.updateCustomer(this.user).subscribe({
          next: (updatedUser: UserProfile) => {
            this.storageService.userProfile = updatedUser;
            this.analytics.logEvent('terms_accepted', { userId: this.userId });

            const currentUrl = this.router.url;
            if (currentUrl.includes('/indivisuals/')) {
              this.router.navigate(['/indivisuals/dashboard']);
            } else if (currentUrl.includes('/business/')) {
              this.router.navigate(['/business/dashboard']);
            } else {
              this.router.navigate(['/indivisuals/dashboard']);
            }
          },
          error: () => { this.acceptError = true; }
        });
      }
    }
  }

}
