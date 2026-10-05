import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StorageService } from '../service/storage-service.service';
import { AnalyticsService } from '../service/analytics.service';

/**
 * T-10 (ONB-02) — TierSelectionComponent.
 *
 * Presents three tier cards (Free, Premium Tier 1, Premium Tier 2) matching the
 * copy on store-draft.html that has passed the legal-compliance review.  The 6.5%
 * service fee is disclosed on every card.  A payout-cadence note appears below the
 * cards as specified in T-10.
 *
 * On selection the chosen tier is stored in StorageService.selectedTier (sessionStorage)
 * and the user is navigated to /business/terms/:id.  The TierSelectedGuard on
 * /business/info/:id redirects back here if no tier is in session.
 *
 * Null subscriptionTier on an existing StoreProfile must be treated as FREE in all
 * display logic — this component does not render existing tier state, it only writes
 * the selection for the current sign-up session.
 *
 * Route: /business/tier-select/:id
 */
@Component({
  selector: 'app-tier-selection',
  templateUrl: './tier-selection.component.html',
  styleUrls: ['./tier-selection.component.css']
})
export class TierSelectionComponent implements OnInit {

  userId?: string;

  /**
   * Currently highlighted tier — drives the selection state UI (card border + checkmark).
   * Defaults to FREE; pre-populated from session state so the edit path pre-selects
   * whichever tier the store owner had already chosen in this session.
   */
  selectedTier: 'FREE' | 'PREMIUM_1' | 'PREMIUM_2' = 'FREE';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private storageService: StorageService,
    private analytics: AnalyticsService
  ) {}

  ngOnInit(): void {
    this.analytics.logScreenView('tier_selection');
    this.userId = this.route.snapshot.paramMap.get('id') || this.storageService.userProfile?.id;

    // Pre-select from session state on the edit path.
    // storageService.selectedTier is null on a fresh sign-up; FREE stays as the default.
    const stored = this.storageService.selectedTier;
    if (stored === 'PREMIUM_1' || stored === 'PREMIUM_2') {
      this.selectedTier = stored;
    }

    // ONB-02 analytics: fire tier_select_reached and pass through whether the
    // merchant saw the tier preview on the /business landing page.  This lets
    // Growth & Analytics compare tier-select reach rates for visitors who saw
    // pricing upfront vs. those who did not (Remote Config A/B flag).
    this.analytics.logEvent('tier_select_reached', {
      saw_pricing: this.storageService.sawPricing
    });
  }

  /**
   * Set the visual selection state without navigating.
   * Called by per-card buttons and card-click areas.
   */
  chooseTier(tier: 'FREE' | 'PREMIUM_1' | 'PREMIUM_2'): void {
    this.selectedTier = tier;
  }

  /**
   * Navigate forward with the currently selected tier.
   * Called by the single shared Continue button at the bottom of the page.
   */
  onContinue(): void {
    this.selectTier(this.selectedTier);
  }

  /**
   * Reactive label for the shared Continue button.
   */
  get continueBtnText(): string {
    switch (this.selectedTier) {
      case 'PREMIUM_1': return 'Continue with Tier 1 — R800/month';
      case 'PREMIUM_2': return 'Continue with Tier 2 — R3,000/month';
      default:          return 'Continue with Free';
    }
  }

  /**
   * Store the selected tier in session state and advance to the next step.
   * Valid tier values match the backend SubscriptionTier enum: FREE | PREMIUM_1 | PREMIUM_2.
   * Null subscriptionTier on an existing store is treated as FREE — no special handling
   * needed here since this component always writes an explicit value.
   *
   * Routing decision (TIER-BILLING-01 bug fix — sixth bug in family):
   *   - termsAccepted falsy (first-time path): navigate to /business/terms/:id as before.
   *     TermsConditionsComponent.acceptTerms() success chains to the dashboard, then the
   *     merchant clicks their way to /business/info/:id (store creation).
   *   - termsAccepted already true (returning user with no store): skip the terms step
   *     entirely and navigate directly to /business/info/:id. The TierSelectedGuard on
   *     that route passes because selectedTier is now set in session. Routing through terms
   *     when termsAccepted is already true causes c8d964e's skip-redirect to fire, which
   *     sends the user to the dashboard and silently discards the tier selection.
   */
  selectTier(tier: 'FREE' | 'PREMIUM_1' | 'PREMIUM_2'): void {
    this.storageService.selectedTier = tier;
    this.analytics.logEvent('tier_selected', { tier, userId: this.userId });

    if (this.storageService.userProfile?.termsAccepted) {
      // Returning user who already accepted terms — go straight to store creation.
      this.router.navigate(['/business/info', this.userId || '']);
    } else {
      // First-time path — terms acceptance needed first.
      this.router.navigate(['/business/terms', this.userId || '']);
    }
  }
}
