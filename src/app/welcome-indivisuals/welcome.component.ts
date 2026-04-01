import { Component } from '@angular/core';
import { AnalyticsService } from '../service/analytics.service';
import { StorageService } from '../service/storage-service.service';

type UserType = '' | 'shop' | 'individual' | 'driver';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css']
})
export class WelcomeIndivisualsComponent {

  userType: UserType = 'individual';

  constructor(
    private analytics: AnalyticsService,
    private storageService: StorageService
  ) {}

  get isDriver(): boolean {
    return this.userType === 'driver';
  }

  ngOnInit(): void {
    const storedUserType = this.storageService.userType as UserType | undefined;
    if (storedUserType === 'driver' || storedUserType === 'individual' || storedUserType === 'shop' || storedUserType === '') {
      this.userType = storedUserType;
    }

    this.analytics.logScreenView('welcome_individual');
  }
}
