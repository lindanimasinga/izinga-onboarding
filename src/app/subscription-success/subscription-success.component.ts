import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AnalyticsService } from '../service/analytics.service';

/**
 * TIER-BILLING-01 (T-12) — SubscriptionSuccessComponent.
 *
 * Route: /business/subscription-success/:storeId
 * This is PayFast's `return_url` destination — the browser is sent here immediately
 * after the merchant completes payment on PayFast's hosted page.
 *
 * IMPORTANT: PayFast's browser redirect fires BEFORE the server-to-server ITN is
 * guaranteed to have been processed.  `StoreProfile.subscriptionTier` may still read
 * FREE at this point.  This component MUST NOT:
 *   - Display a Premium tier badge
 *   - Say "payment successful" (implies instant completion)
 *   - Poll for subscription activation status
 *
 * It MUST:
 *   - Communicate the async timing gap ("will activate within a few minutes")
 *   - Provide a working "Go to my dashboard now" CTA at all times
 *   - Auto-redirect to /business/dashboard after a few seconds
 *   - Respect prefers-reduced-motion (static text, no animation)
 */
@Component({
  selector: 'app-subscription-success',
  templateUrl: './subscription-success.component.html',
  styleUrls: ['./subscription-success.component.css']
})
export class SubscriptionSuccessComponent implements OnInit, OnDestroy {

  storeId: string | null = null;

  /** Countdown seconds remaining until auto-redirect. */
  countdown = 5;

  /** True when prefers-reduced-motion is active — skip countdown animation. */
  readonly reducedMotion: boolean =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  private countdownTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private analytics: AnalyticsService
  ) {}

  ngOnInit(): void {
    this.analytics.logScreenView('subscription_success');
    this.storeId = this.route.snapshot.paramMap.get('storeId');
    this.analytics.logEvent('subscription_payment_received', { storeId: this.storeId });

    if (!this.reducedMotion) {
      this.countdownTimer = setInterval(() => {
        this.countdown -= 1;
        if (this.countdown <= 0) {
          this.goToDashboard();
        }
      }, 1000);
    }
    // Under prefers-reduced-motion, still auto-redirect but without a visible countdown.
    // A plain setTimeout keeps the behaviour accessible without animation.
    else {
      this.countdownTimer = setTimeout(() => this.goToDashboard(), 5000) as unknown as ReturnType<typeof setInterval>;
    }
  }

  ngOnDestroy(): void {
    if (this.countdownTimer !== null) {
      clearInterval(this.countdownTimer as any);
      clearTimeout(this.countdownTimer as any);
    }
  }

  goToDashboard(): void {
    this.router.navigate(['/business/dashboard']);
  }
}
