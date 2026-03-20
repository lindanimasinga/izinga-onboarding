import { Component } from '@angular/core';
import { AnalyticsService } from '../service/analytics.service';

@Component({
  selector: 'app-legal-info',
  templateUrl: './legal-info.component.html',
  styleUrls: ['./legal-info.component.css']
})
export class LegalInfoComponent {

  constructor(private analytics: AnalyticsService) {}

  ngOnInit(): void {
    this.analytics.logScreenView('legal_info');
  }

  goBack(): void {
    window.history.back();
  }
}
