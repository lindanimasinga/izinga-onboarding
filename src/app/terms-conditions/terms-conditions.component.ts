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
