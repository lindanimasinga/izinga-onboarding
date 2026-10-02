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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private storageService: StorageService,
    private analytics: AnalyticsService
  ) {}

  ngOnInit(): void {
    this.analytics.logScreenView('tier_selection');
    this.userId = this.route.snapshot.paramMap.get('id') || this.storageService.userProfile?.id;
  }

  /**
   * Store the selected tier in session state and advance to the terms step.
   * Valid tier values match the backend SubscriptionTier enum: FREE | PREMIUM_1 | PREMIUM_2.
   * Null subscriptionTier on an existing store is treated as FREE — no special handling
   * needed here since this component always writes an explicit value.
   */
  selectTier(tier: 'FREE' | 'PREMIUM_1' | 'PREMIUM_2'): void {
    this.storageService.selectedTier = tier;
    this.analytics.logEvent('tier_selected', { tier, userId: this.userId });
    this.router.navigate(['/business/terms', this.userId || '']);
  }
}
