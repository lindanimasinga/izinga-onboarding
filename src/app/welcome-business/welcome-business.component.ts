import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { StorageService } from '../service/storage-service.service';
import { AnalyticsService } from '../service/analytics.service';
import { FirebaseService } from '../service/firebase.service';

/**
 * RP-005b: Capture ?ref=CODE query param at the start of the business registration
 * journey so the referral code can be attributed to the Referral Partner who assisted
 * the store owner.  The code is stored in sessionStorage via StorageService and
 * attached to the StoreProfile by BusinessUpdateComponent on store creation.
 *
 * ONB-02: Shows a read-only tier preview section (Free / Premium Tier 1 / Premium Tier 2)
 * before any sign-up so merchants see pricing upfront.  Gated by the Remote Config boolean
 * 'business_landing_tier_preview_enabled' (default true).  No tier is committed here —
 * the actual commitment happens at TierSelectionComponent post-OTP.
 *
 * Analytics instrumentation (ONB-02 Growth & Analytics requirement):
 *   - business_landing_viewed: fires on load with UTM params
 *   - tier_preview_entered_viewport: fires once via IntersectionObserver
 *   - get_started_clicked: fires on button click with saw_pricing flag
 */
@Component({
  selector: 'app-welcome',
  templateUrl: './welcome-business.component.html',
  styleUrls: ['./welcome-business.component.css']
})
export class WelcomeBusinessComponent implements OnInit, AfterViewInit, OnDestroy {

  /**
   * Reference to the tier preview wrapper div.  Undefined when tierPreviewEnabled is
   * false (the *ngIf removes the element from the DOM before ngAfterViewInit runs).
   */
  @ViewChild('tierPreviewSection') tierPreviewSectionRef?: ElementRef;

  /**
   * Mirrors the Remote Config flag 'business_landing_tier_preview_enabled'.
   * Defaults to true so the section is shown before the RC fetch completes.
   */
  tierPreviewEnabled = true;

  private intersectionObserver?: IntersectionObserver;

  constructor(
    private route: ActivatedRoute,
    private storageService: StorageService,
    private analytics: AnalyticsService,
    private firebaseService: FirebaseService
  ) {}

  ngOnInit(): void {
    // Apply Remote Config flag — getValue reads the last-activated cache;
    // the default (true) is used on first load before the async fetch completes.
    this.tierPreviewEnabled = this.firebaseService.getRemoteConfigBoolean(
      'business_landing_tier_preview_enabled'
    );

    this.route.queryParams.subscribe(params => {
      // RP-005b: persist referral partner code
      const ref = params['ref'];
      if (ref) {
        this.storageService.referralPartnerRef = ref;
      }

      // business_landing_viewed — capture UTM attribution for the landing page
      this.analytics.logEvent('business_landing_viewed', {
        utm_source:   params['utm_source']   || null,
        utm_medium:   params['utm_medium']   || null,
        utm_campaign: params['utm_campaign'] || null
      });
    });
  }

  ngAfterViewInit(): void {
    // Guard: section is absent from the DOM when tierPreviewEnabled is false,
    // or in environments without IntersectionObserver (test runners).
    if (!this.tierPreviewEnabled || !this.tierPreviewSectionRef) { return; }
    if (typeof IntersectionObserver === 'undefined') { return; }

    // tier_preview_entered_viewport — fires once when at least 20% of the
    // pricing section scrolls into view.  Sets saw_pricing in sessionStorage
    // so downstream steps (tier-select, get_started_clicked) can carry it.
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !this.storageService.sawPricing) {
            this.storageService.sawPricing = true;
            this.analytics.logEvent('tier_preview_entered_viewport', { saw_pricing: true });
          }
        });
      },
      { threshold: 0.2 }
    );
    this.intersectionObserver.observe(this.tierPreviewSectionRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
  }

  /**
   * Fires get_started_clicked with the saw_pricing flag before routerLink
   * navigates to ./verify.  Both this handler and the routerLink directive on
   * the button fire on the same click — analytics first, then navigation.
   */
  onGetStarted(): void {
    this.analytics.logEvent('get_started_clicked', {
      saw_pricing: this.storageService.sawPricing
    });
  }
}
