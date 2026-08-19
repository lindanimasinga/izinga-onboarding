import { Component, OnInit } from '@angular/core';
import { AnalyticsService } from '../service/analytics.service';
import { StorageService } from '../service/storage-service.service';
import { UserProfile } from '../model/userProfile';

@Component({
  selector: 'app-legal-info',
  templateUrl: './legal-info.component.html',
  styleUrls: ['./legal-info.component.css']
})
export class LegalInfoComponent implements OnInit {

  user: UserProfile | undefined;

  constructor(
    private analytics: AnalyticsService,
    private storageService: StorageService
  ) {}

  ngOnInit(): void {
    this.analytics.logScreenView('legal_info');
    this.user = this.storageService.userProfile ?? undefined;
  }

  get hasSignedIca(): boolean {
    return !!this.user?.icaAccepted;
  }

  get icaPdfPath(): string {
    if (this.user?.role === UserProfile.RoleEnum.AMBASSADOR) {
      return 'assets/docs/ica/ambassador-ica-v2.pdf';
    }
    if (this.user?.role === UserProfile.RoleEnum.MESSENGER) {
      return 'assets/docs/ica/driver-ica-v2.pdf';
    }
    return '';
  }

  get icaLabel(): string {
    if (this.user?.role === UserProfile.RoleEnum.AMBASSADOR) {
      return 'Ambassador Independent Contractor Agreement (v2)';
    }
    if (this.user?.role === UserProfile.RoleEnum.MESSENGER) {
      return 'Driver Independent Contractor Agreement (v2)';
    }
    return 'Independent Contractor Agreement';
  }

  get icaAcceptedDateDisplay(): string {
    if (!this.user?.icaAcceptedDate) {
      return '';
    }
    return new Date(this.user.icaAcceptedDate).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  goBack(): void {
    window.history.back();
  }
}
