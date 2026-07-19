import { Component, OnDestroy } from '@angular/core';
import { StorageService } from '../service/storage-service.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AnalyticsService } from '../service/analytics.service';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from '../../environments/environment';

type UserType = '' | 'shop' | 'individual' | 'driver' | 'ambassador';

interface WelcomeHeroCopy {
  heading: string;
  description: string;
}

interface SignupCardCopy {
  title: string;
  description: string;
  cta: string;
  route: string;
}

interface SeoConfig {
  title: string;
  description: string;
  keywords: string;
  ogTitle: string;
  ogDescription: string;
  twitterTitle: string;
  twitterDescription: string;
}

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css']
})
export class WelcomeSelectionComponent {

  userType: UserType = environment.userTypeConfig.defaultUserType as UserType;
  readonly heroCopyConfig = environment.userTypeConfig.heroCopy as Record<UserType, WelcomeHeroCopy>;
  readonly signupCardConfig = environment.userTypeConfig.signupCards as Record<'shop' | 'individual' | 'driver' | 'ambassador', SignupCardCopy>;

  constructor(
    private storageService: StorageService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private analytics: AnalyticsService
  ) {
  }

  get currentHeroCopy(): WelcomeHeroCopy {
    const resolvedUserType = this.userType as UserType;
    return this.heroCopyConfig[resolvedUserType] || this.heroCopyConfig['ambassador'] || this.heroCopyConfig.driver;
  }

  get isAmbassador(): boolean {
    return this.userType === 'ambassador';
  }

  ngOnInit(): void {
    this.analytics.logScreenView('welcome_selection');

    if (this.storageService.userType) {
      this.userType = this.storageService.userType as UserType;
    }

    console.log("User profile from storage service on welcome page:", this.activatedRoute.snapshot.queryParamMap.get('type'));

    // Scroll to top on route change
    if (this.storageService.userProfile?.role == 'ADMIN' || this.storageService.userProfile?.role == 'STORE_ADMIN') {
      this.router.navigate(['/business/dashboard'])
    } else if(this.storageService.userProfile?.role == 'MESSENGER' || this.storageService.userProfile?.role == 'MESSENGER_ADMIN' || this.storageService.userProfile?.role == 'CUSTOMER') {
      this.router.navigate(['/indivisuals/dashboard'])
    } else if (this.storageService.userProfile?.role == 'AMBASSADOR') {
      this.router.navigate(['/ambassador/qr'])
    } else if (this.storageService.userProfile?.role == 'REFERRAL_PARTNER') {
      // RP-010: route to enrollment if Agreement not yet accepted,
      // otherwise to the Referral Partner Dashboard.
      if (this.storageService.userProfile?.icaAccepted) {
        this.router.navigate(['/indivisuals/rp-referral-code'])
      } else {
        this.router.navigate(['/referral-partner/enroll'])
      }
    }
  }



}
