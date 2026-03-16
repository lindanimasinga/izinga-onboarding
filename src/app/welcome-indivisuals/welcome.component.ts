import { Component } from '@angular/core';
import { AnalyticsService } from '../service/analytics.service';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css']
})
export class WelcomeIndivisualsComponent {

  constructor(private analytics: AnalyticsService) {}

  ngOnInit(): void {
    this.analytics.logScreenView('welcome_individual');
  }
}
