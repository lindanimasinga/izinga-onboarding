import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AnalyticsService } from '../service/analytics.service';

/**
 * TIER-BILLING-01 (T-13) — SubscriptionCancelComponent.
 *
 * Route: /business/subscription-cancel/:storeId
 * This is PayFast's `cancel_url` destination — the browser is sent here when the
 * merchant clicks "Cancel" on PayFast's hosted payment page or navigates away.
 *
 * The store ALREADY EXISTS at this point (it was created before the subscription
 * flow started) and is usable on the FREE tier.  This component MUST NOT delete
 * or modify the store record in any way.
 *
 * Design direction: teal accent, positive framing, no guilt, no discount offers,
 * no retention popups.  Lead with "Your store is ready" — not "Payment cancelled".
 */
@Component({
  selector: 'app-subscription-cancel',
  templateUrl: './subscription-cancel.component.html',
  styleUrls: ['./subscription-cancel.component.css']
})
export class SubscriptionCancelComponent implements OnInit {

  storeId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private analytics: AnalyticsService
  ) {}

  ngOnInit(): void {
    this.analytics.logScreenView('subscription_cancel');
    this.storeId = this.route.snapshot.paramMap.get('storeId');
    this.analytics.logEvent('subscription_payment_cancelled', { storeId: this.storeId });
  }

  goToDashboard(): void {
    this.router.navigate(['/business/dashboard']);
  }

  tryAgain(): void {
    // Navigate back to the checkout screen for the same store.
    this.router.navigate(['/business/subscription', this.storeId]);
  }
}
