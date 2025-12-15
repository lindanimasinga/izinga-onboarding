import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StorageService } from '../service/storage-service.service';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { UserProfile } from '../model/userProfile';

@Component({
  selector: 'app-terms-conditions',
  templateUrl: './terms-conditions.component.html',
  styleUrls: ['./terms-conditions.component.css']
})
export class TermsConditionsComponent {
  
  termsAccepted = false;
  userId?: string;
  user: UserProfile | undefined;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private storageService: StorageService,
    private izingaOrderManager: IzingaOrderManagementService
  ) {}

  ngOnInit() {
    // Get user ID from route parameters
    this.route.params.subscribe(params => {
      this.userId = params['id'];
    });
    this.user = this.storageService.userProfile!;
  }

  acceptTerms() {
    if (this.termsAccepted && this.userId) {
      // Get the current user profile and update it with terms acceptance
      if (this.user) {
        this.user.termsAccepted = true;
        this.user.termsAcceptedDate = new Date();

        // Update the user profile
        this.izingaOrderManager.updateCustomer(this.user).subscribe((updatedUser: UserProfile) => {
          console.log('Terms accepted and user updated');
          this.storageService.userProfile = updatedUser;
          
          // Navigate based on user role and current route context
          const currentUrl = this.router.url;
          if (currentUrl.includes('/indivisuals/')) {
            this.router.navigate(['/indivisuals/dashboard']);
          } else if (currentUrl.includes('/business/')) {
            this.router.navigate(['/business/dashboard']);
          } else {
            // Default fallback
            this.router.navigate(['/indivisuals/dashboard']);
          }
        }, (error: any) => {
          console.error('Error updating user with terms acceptance:', error);
        });
      }
    }
  }
}