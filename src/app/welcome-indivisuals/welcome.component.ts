import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AnalyticsService } from '../service/analytics.service';
import { StorageService } from '../service/storage-service.service';
import { FixedBarService } from '../service/fixed-bar.service';

type UserType = '' | 'shop' | 'individual' | 'driver' | 'ambassador' | 'referral-partner';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css']
})
export class WelcomeIndivisualsComponent implements OnDestroy {

  userType: UserType = 'individual';

  constructor(
    private analytics: AnalyticsService,
    private storageService: StorageService,
    private route: ActivatedRoute,
    private fixedBarService: FixedBarService
  ) {}

  get isDriver(): boolean {
    return this.userType === 'driver';
  }

  get isAmbassador(): boolean {
    return this.userType === 'ambassador';
  }

  ngOnDestroy(): void {
    this.fixedBarService.release();
  }

  ngOnInit(): void {
    this.fixedBarService.acquire();
    const storedUserType = this.storageService.userType as UserType | undefined;
    if (storedUserType === 'driver' || storedUserType === 'individual' || storedUserType === 'shop' || storedUserType === '' || storedUserType === 'ambassador' || storedUserType === 'referral-partner') {
      this.userType = storedUserType;
    }

    // T-11: Capture ambassador referral param from QR code URL (?ref=<ambassadorUserId>)
    // Store in sessionStorage so it survives internal navigation (e.g. OTP → registration)
    this.route.queryParams.subscribe(params => {
      const ref = params['ref'];
      if (ref) {
        this.storageService.ambassadorRef = ref;
      }
    });

    this.analytics.logScreenView('welcome_individual');
  }
}
