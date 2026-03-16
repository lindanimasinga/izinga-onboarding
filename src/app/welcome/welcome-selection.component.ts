import { Component } from '@angular/core';
import { StorageService } from '../service/storage-service.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AnalyticsService } from '../service/analytics.service';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css']
})
export class WelcomeSelectionComponent {

  userType: string = '';

  constructor(private storageService: StorageService, private router: Router, private activatedRoute: ActivatedRoute, private analytics: AnalyticsService) {
  }

  ngOnInit(): void {
    this.analytics.logScreenView('welcome_selection');
    this.activatedRoute.queryParams.subscribe(params => {
      console.log("User profile on welcome page:", params);
      if (params['type']) {
        this.userType = params['type'];
        console.log("User type from query params: " + this.userType);
      }
    });

    console.log("User profile from storage service on welcome page:", this.activatedRoute.snapshot.queryParamMap.get('type'));

    // Scroll to top on route change
    if (this.storageService.userProfile?.role == 'ADMIN' || this.storageService.userProfile?.role == 'STORE_ADMIN') {
      this.router.navigate(['/business/dashboard'])
    } else if(this.storageService.userProfile?.role == 'MESSENGER' || this.storageService.userProfile?.role == 'CUSTOMER') {
      this.router.navigate(['/indivisuals/dashboard'])
    }
  }

}
