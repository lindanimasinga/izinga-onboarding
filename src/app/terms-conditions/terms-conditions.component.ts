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
        this.user.icaVersion = 'v1';

        this.izingaOrderManager.updateCustomer(this.user).subscribe({
          next: (updatedUser: UserProfile) => {
            this.storageService.userProfile = updatedUser;
            this.analytics.logEvent('ica_accepted', { userId: this.userId });
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
