import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StorageService } from '../service/storage-service.service';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { UserProfile } from '../model/models';
import { AnalyticsService } from '../service/analytics.service';

@Component({
  selector: 'app-signup-welcome',
  templateUrl: './signup-welcome.component.html',
  styleUrls: ['./signup-welcome.component.css']
})
export class SignupWelcomeComponent implements OnInit {
  userId?: string;
  // Stored after profile resolves so termsRoute and canViewTerms can use the role
  // without re-reading from storageService on every change-detection cycle.
  userRole?: UserProfile.RoleEnum;
  firstName = 'there';
  profession = 'professional';
  areaOfWork = 'your selected area';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private storageService: StorageService,
    private izingaOrderManagementService: IzingaOrderManagementService,
    private analytics: AnalyticsService
  ) {}

  ngOnInit(): void {
    this.analytics.logScreenView('signup_welcome');
    this.userId = this.route.snapshot.paramMap.get('id') || this.storageService.userProfile?.id;

    if (this.storageService.userProfile) {
      this.applyProfile(this.storageService.userProfile);
      return;
    }

    if (this.userId) {
      this.izingaOrderManagementService.getCustomerById(this.userId).subscribe({
        next: (profile) => {
          this.storageService.userProfile = profile;
          this.applyProfile(profile);
        },
        error: (error) => {
          console.error('Failed to load user profile by id:', error);
          this.loadProfileByPhone();
        }
      });
      return;
    }

    this.loadProfileByPhone();
  }

  private loadProfileByPhone(): void {
    const phone = this.storageService.phoneNumber;
    if (!phone) {
      return;
    }

    this.izingaOrderManagementService.getCustomerByPhoneNumber(phone).subscribe({
      next: (profile) => {
        this.storageService.userProfile = profile;
        this.userId = this.userId || profile.id;
        this.applyProfile(profile);
      },
      error: (error) => {
        console.error('Failed to load user profile by phone number:', error);
      }
    });
  }

  private applyProfile(profile: UserProfile): void {
    const sourceName = profile?.name || 'there';
    this.firstName = sourceName.split(' ')[0];
    this.profession = profile?.description || this.profession;
    this.areaOfWork = profile?.address || this.areaOfWork;
    // Capture role so termsRoute and canViewTerms can branch correctly without
    // re-reading from storageService on every change-detection cycle.
    this.userRole = profile?.role;
  }

  get termsRoute(): string[] {
    // REFERRAL_PARTNER must go to the purpose-built enrollment screen
    // (ReferralPartnerEnrollmentComponent), NOT the generic TermsConditionsComponent
    // which only handles customer/store T&Cs and writes to the wrong field
    // (termsAccepted instead of icaAccepted).  The enrollment component reads
    // the current user from storageService.userProfile directly — no userId param
    // needed.  This mirrors the same branch already applied in dashboard.component.ts.
    if (this.userRole === UserProfile.RoleEnum.REFERRALPARTNER) {
      return ['/indivisuals', 'referral-partner-enrollment'];
    }
    const base = this.router.url.includes('/business/') ? '/business' : '/indivisuals';
    return [base, 'terms', this.userId || ''];
  }

  get canViewTerms(): boolean {
    // For REFERRAL_PARTNER the route doesn't need a userId — the enrollment
    // component resolves the user itself — so allow navigation as soon as the
    // role is known, even before userId has resolved from the API response.
    if (this.userRole === UserProfile.RoleEnum.REFERRALPARTNER) {
      return true;
    }
    return !!this.userId;
  }
}
