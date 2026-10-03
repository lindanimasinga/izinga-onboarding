import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { StorageService } from '../service/storage-service.service';
import { AnalyticsService } from '../service/analytics.service';
import { environment } from 'src/environments/environment';

/**
 * TIER-BILLING-01 (T-11) — SubscriptionCheckoutComponent.
 *
 * Route: /business/subscription/:storeId
 * Guard: PremiumTierGuard (redirects FREE/null tier to /business/dashboard)
 *
 * On init:
 *  1. Calls POST /merchant/subscription/initiate with the tier from session state.
 *  2. On success: constructs a hidden PayFast form and auto-submits it — the browser
 *     navigates to PayFast's hosted payment page.
 *  3. On HTTP 409 (SUBSCRIPTION_ALREADY_ACTIVE): navigates to /business/dashboard.
 *  4. On other errors: shows an in-page error state with a retry button.
 *
 * The PayFast URL (sandbox vs production) is environment-gated via environment.payFastUrl.
 * The storeId is resolved server-side from the Firebase JWT — it is NOT sent in the
 * request body (IDOR prevention per REQ-02).
 */
@Component({
  selector: 'app-subscription-checkout',
  templateUrl: './subscription-checkout.component.html',
  styleUrls: ['./subscription-checkout.component.css']
})
export class SubscriptionCheckoutComponent implements OnInit {

  storeId: string | null = null;
  loading = false;
  errorMessage: string | null = null;

  /** PayFast form action URL — sandbox in non-production; production otherwise. */
  readonly payFastUrl: string = environment.payFastUrl;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderManagementService: IzingaOrderManagementService,
    private storageService: StorageService,
    private analytics: AnalyticsService
  ) {}

  ngOnInit(): void {
    this.analytics.logScreenView('subscription_checkout');
    this.storeId = this.route.snapshot.paramMap.get('storeId');
    this.initiateCheckout();
  }

  /** Calls the initiate endpoint and, on success, auto-submits the PayFast form. */
  initiateCheckout(): void {
    const tier = this.storageService.selectedTier as 'PREMIUM_1' | 'PREMIUM_2' | null;
    if (tier !== 'PREMIUM_1' && tier !== 'PREMIUM_2') {
      // Guard should have caught this, but belt-and-suspenders.
      this.router.navigate(['/business/dashboard']);
      return;
    }

    this.loading = true;
    this.errorMessage = null;

    this.orderManagementService.initiateSubscription(tier).subscribe({
      next: (params) => {
        this.loading = false;
        this.submitPayFastForm(params);
      },
      error: (err) => {
        this.loading = false;
        if (err?.status === 409) {
          // Subscription already ACTIVE — navigate to dashboard (AC-10).
          this.router.navigate(['/business/dashboard']);
        } else {
          this.errorMessage = "We couldn't start your payment. Please try again or contact support.";
          this.analytics.logEvent('subscription_checkout_error', {
            status: err?.status,
            storeId: this.storeId
          });
        }
      }
    });
  }

  /**
   * Constructs a hidden HTML form with the PayFast parameters returned by the backend
   * and programmatically submits it.  PayFast requires a form POST — a redirect or link
   * is not sufficient for the signed parameter set.
   *
   * This method is extracted so tests can spy on it without triggering a real form submit.
   */
  protected submitPayFastForm(params: { [key: string]: string }): void {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = this.payFastUrl;
    form.style.display = 'none';

    Object.entries(params).forEach(([name, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  }

  /** Returns the tier label for display (drives the price shown on screen). */
  get tierLabel(): 'PREMIUM_1' | 'PREMIUM_2' | null {
    const t = this.storageService.selectedTier;
    if (t === 'PREMIUM_1' || t === 'PREMIUM_2') {
      return t;
    }
    return null;
  }

  get tierPrice(): string {
    return this.tierLabel === 'PREMIUM_2' ? 'R3,000' : 'R800';
  }
}
