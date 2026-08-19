import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { StorageService } from '../service/storage-service.service';
import { AnalyticsService } from '../service/analytics.service';
import { UserProfile } from '../model/userProfile';

/**
 * ONB-POST-ICA: Post-ICA Training Guide screen.
 *
 * Shown after an Ambassador or Referral Partner accepts their ICA / completes enrollment.
 * Displays a role-specific training guide PDF download and a Continue button that routes
 * to the appropriate dashboard.
 *
 * Route: /indivisuals/training-guide  (canActivate: PhoneVerifiedGuard)
 *
 * REQ-01–REQ-12 per Feature Brief ONB-post-ica-training-guide.
 */
@Component({
  selector: 'app-post-ica-training',
  templateUrl: './post-ica-training.component.html',
  styleUrls: ['./post-ica-training.component.css']
})
export class PostIcaTrainingComponent implements OnInit {

  user: UserProfile | undefined;

  constructor(
    private router: Router,
    private storageService: StorageService,
    private analytics: AnalyticsService
  ) {}

  get isAmbassador(): boolean {
    return this.user?.role === UserProfile.RoleEnum.AMBASSADOR;
  }

  get isReferralPartner(): boolean {
    return this.user?.role === UserProfile.RoleEnum.REFERRALPARTNER;
  }

  get heading(): string {
    if (this.isAmbassador) {
      return 'Your Ambassador Training Guide';
    }
    if (this.isReferralPartner) {
      return 'Your Referral Partner Training Guide';
    }
    return 'Training Guide';
  }

  get description(): string {
    if (this.isAmbassador) {
      return 'This guide covers everything you need to know to sign up drivers using your personal QR code, ' +
        'track your referred drivers, and start earning your ambassador rewards.';
    }
    if (this.isReferralPartner) {
      return 'This guide covers how to refer merchants to iZinga using your referral code, ' +
        'track your referred merchants, and earn your referral commissions.';
    }
    return '';
  }

  get pdfPath(): string {
    if (this.isAmbassador) {
      return 'assets/docs/ambassador-training-pack-v1.pdf';
    }
    if (this.isReferralPartner) {
      return 'assets/docs/referral-partner-training-pack-v1.pdf';
    }
    return '';
  }

  /**
   * Path to the signed ICA agreement PDF for the current user's role.
   * Ambassadors can view the agreement they just accepted; Referral Partners
   * use a separate enrollment contract and have no ICA PDF here.
   */
  get icaPdfPath(): string {
    if (this.isAmbassador) {
      return 'assets/docs/ica/ambassador-ica-v2.pdf';
    }
    return '';
  }

  get continueLabel(): string {
    if (this.isReferralPartner) {
      return 'Continue';
    }
    return 'Continue to Dashboard';
  }

  get continueRoute(): string[] {
    if (this.isReferralPartner) {
      return ['/indivisuals/rp-referral-code'];
    }
    // Ambassador and any other valid role falls back to dashboard
    return ['/indivisuals/dashboard'];
  }

  ngOnInit(): void {
    this.user = this.storageService.userProfile;

    if (!this.user) {
      this.router.navigate(['/']);
      return;
    }

    this.analytics.logScreenView('training_guide_viewed', { role: this.user.role });
  }

  onDownloadClicked(): void {
    this.analytics.logEvent('training_guide_downloaded', { role: this.user?.role });
  }

  continueToDashboard(): void {
    this.router.navigate(this.continueRoute);
  }
}
