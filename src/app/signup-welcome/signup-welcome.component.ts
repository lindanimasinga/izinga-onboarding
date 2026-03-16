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
  }

  get termsRoute(): string[] {
    const base = this.router.url.includes('/business/') ? '/business' : '/indivisuals';
    return [base, 'terms', this.userId || ''];
  }

  get canViewTerms(): boolean {
    return !!this.userId;
  }
}
