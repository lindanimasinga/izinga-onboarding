import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AnalyticsService } from '../service/analytics.service';

@Component({
  selector: 'app-privacy-policy',
  templateUrl: './privacy-policy.component.html',
  styleUrls: ['./privacy-policy.component.css']
})
export class PrivacyPolicyComponent {

  constructor(private router: Router, private analytics: AnalyticsService) {}

  ngOnInit(): void {
    this.analytics.logScreenView('privacy_policy');
  }

  goBack(): void {
    this.router.navigate(['../dashboard'], { relativeTo: undefined });
    window.history.back();
  }
}
