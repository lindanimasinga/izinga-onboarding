import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';

import { WelcomeBusinessComponent } from './welcome-business.component';
import { StorageService } from '../service/storage-service.service';
import { AnalyticsService } from '../service/analytics.service';
import { FirebaseService } from '../service/firebase.service';

// ── Shared mocks ──────────────────────────────────────────────────────────────

const mockAnalyticsService: Partial<AnalyticsService> = {
  logEvent: jasmine.createSpy('logEvent'),
  logScreenView: jasmine.createSpy('logScreenView')
};

let mockFirebaseService: Partial<FirebaseService>;
let mockStorage: Partial<StorageService> & { sawPricing: boolean };

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildModule(queryParams: Record<string, string> = {}): Promise<void> {
  return TestBed.configureTestingModule({
    declarations: [WelcomeBusinessComponent],
    schemas: [NO_ERRORS_SCHEMA],
    providers: [
      { provide: StorageService,    useValue: mockStorage },
      { provide: AnalyticsService,  useValue: mockAnalyticsService },
      { provide: FirebaseService,   useValue: mockFirebaseService },
      {
        provide: ActivatedRoute,
        useValue: { queryParams: of(queryParams) }
      }
    ]
  }).compileComponents();
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('WelcomeBusinessComponent', () => {
  let component: WelcomeBusinessComponent;
  let fixture: ComponentFixture<WelcomeBusinessComponent>;

  beforeEach(async () => {
    // Reset mocks before each test
    (mockAnalyticsService.logEvent as jasmine.Spy).calls.reset();

    mockStorage = {
      referralPartnerRef: null,
      sawPricing: false
    };

    mockFirebaseService = {
      getRemoteConfigBoolean: jasmine.createSpy('getRemoteConfigBoolean').and.returnValue(true)
    };

    await buildModule();

    fixture = TestBed.createComponent(WelcomeBusinessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ── Creation ────────────────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── RP-005b: referral partner ref capture ────────────────────────────────────

  it('RP-005b: stores ref param in StorageService when ?ref= is present', async () => {
    await TestBed.resetTestingModule();
    await buildModule({ ref: 'ABC123' });
    const localFixture = TestBed.createComponent(WelcomeBusinessComponent);
    localFixture.detectChanges();
    expect(mockStorage.referralPartnerRef).toBe('ABC123');
  });

  it('RP-005b: does not overwrite referralPartnerRef when ?ref= is absent', async () => {
    mockStorage.referralPartnerRef = 'EXISTING';
    await TestBed.resetTestingModule();
    await buildModule({});
    const localFixture = TestBed.createComponent(WelcomeBusinessComponent);
    localFixture.detectChanges();
    expect(mockStorage.referralPartnerRef).toBe('EXISTING');
  });

  // ── Remote Config flag ────────────────────────────────────────────────────────

  it('should read the Remote Config flag business_landing_tier_preview_enabled on init', () => {
    expect(mockFirebaseService.getRemoteConfigBoolean).toHaveBeenCalledWith(
      'business_landing_tier_preview_enabled'
    );
  });

  it('should set tierPreviewEnabled to true when RC flag returns true', () => {
    expect(component.tierPreviewEnabled).toBe(true);
  });

  it('should set tierPreviewEnabled to false when RC flag returns false', async () => {
    (mockFirebaseService.getRemoteConfigBoolean as jasmine.Spy).and.returnValue(false);
    await TestBed.resetTestingModule();
    await buildModule({});
    const localFixture = TestBed.createComponent(WelcomeBusinessComponent);
    localFixture.detectChanges();
    expect(localFixture.componentInstance.tierPreviewEnabled).toBe(false);
  });

  // ── Analytics: business_landing_viewed ──────────────────────────────────────

  it('should fire business_landing_viewed on init', () => {
    expect(mockAnalyticsService.logEvent).toHaveBeenCalledWith(
      'business_landing_viewed',
      jasmine.objectContaining({ utm_source: null })
    );
  });

  it('should pass utm_source to business_landing_viewed when present', async () => {
    (mockAnalyticsService.logEvent as jasmine.Spy).calls.reset();
    await TestBed.resetTestingModule();
    await buildModule({ utm_source: 'facebook', utm_medium: 'cpc', utm_campaign: 'driver_july' });
    const localFixture = TestBed.createComponent(WelcomeBusinessComponent);
    localFixture.detectChanges();
    expect(mockAnalyticsService.logEvent).toHaveBeenCalledWith(
      'business_landing_viewed',
      jasmine.objectContaining({
        utm_source:   'facebook',
        utm_medium:   'cpc',
        utm_campaign: 'driver_july'
      })
    );
  });

  // ── Analytics: get_started_clicked ──────────────────────────────────────────

  it('should fire get_started_clicked with saw_pricing=false when sawPricing is false', () => {
    mockStorage.sawPricing = false;
    (mockAnalyticsService.logEvent as jasmine.Spy).calls.reset();
    component.onGetStarted();
    expect(mockAnalyticsService.logEvent).toHaveBeenCalledWith(
      'get_started_clicked',
      { saw_pricing: false }
    );
  });

  it('should fire get_started_clicked with saw_pricing=true when sawPricing is true', () => {
    mockStorage.sawPricing = true;
    (mockAnalyticsService.logEvent as jasmine.Spy).calls.reset();
    component.onGetStarted();
    expect(mockAnalyticsService.logEvent).toHaveBeenCalledWith(
      'get_started_clicked',
      { saw_pricing: true }
    );
  });

  // ── Tier preview DOM rendering ────────────────────────────────────────────────

  describe('tier preview section — tierPreviewEnabled=true', () => {
    it('should render the tier preview section when enabled', () => {
      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('Plans & Pricing');
    });

    it('should render three tier cards in the preview', () => {
      const cards: NodeListOf<Element> = fixture.nativeElement.querySelectorAll('.tier-card');
      expect(cards.length).toBe(3);
    });

    it('should show the Free tier badge', () => {
      const badge: Element = fixture.nativeElement.querySelector('.tier-badge--free');
      expect(badge).toBeTruthy();
      expect(badge.textContent).toContain('Free');
    });

    it('should show the Premium Tier 1 badge', () => {
      const badges: NodeListOf<Element> = fixture.nativeElement.querySelectorAll('.tier-badge--gold');
      const texts = Array.from(badges).map(b => b.textContent || '');
      expect(texts.some(t => t.includes('Tier 1'))).toBe(true);
    });

    it('should show the Premium Tier 2 badge', () => {
      const badges: NodeListOf<Element> = fixture.nativeElement.querySelectorAll('.tier-badge--gold');
      const texts = Array.from(badges).map(b => b.textContent || '');
      expect(texts.some(t => t.includes('Tier 2'))).toBe(true);
    });

    it('should show "Free for merchants" as the Free tier price', () => {
      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('Free for merchants');
    });

    it('should show "R800" as the Tier 1 price', () => {
      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('R800');
    });

    it('should show "R3,000" as the Tier 2 price', () => {
      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('R3,000');
    });

    it('should include three fee-disclosure elements', () => {
      const disclosures: NodeListOf<Element> = fixture.nativeElement.querySelectorAll('.fee-disclosure');
      expect(disclosures.length).toBe(3);
    });

    it('every fee-disclosure should mention 6.5%', () => {
      const disclosures: NodeListOf<Element> = fixture.nativeElement.querySelectorAll('.fee-disclosure');
      Array.from(disclosures).forEach((el, idx) => {
        expect(el.textContent).toContain('6.5%', `Card ${idx + 1} fee-disclosure must contain 6.5%`);
      });
    });

    it('should show the confirm-during-signup note', () => {
      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain("confirm your plan during sign-up");
    });

    it('should all preview cards carry the tier-card--preview modifier', () => {
      const previewCards: NodeListOf<Element> = fixture.nativeElement.querySelectorAll('.tier-card--preview');
      expect(previewCards.length).toBe(3);
    });

    it('should NOT render any tier-card--selected class (preview is read-only)', () => {
      const selected: NodeListOf<Element> = fixture.nativeElement.querySelectorAll('.tier-card--selected');
      expect(selected.length).toBe(0);
    });

    // ONB-02 business review: the "Advice mode" regulated-products bullet is
    // intentionally omitted from the landing page preview.
    it('should NOT show "Advice mode" bullet on the unauthenticated landing page', () => {
      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).not.toContain('Advice mode');
    });
  });

  describe('tier preview section — tierPreviewEnabled=false', () => {
    let rcOffFixture: ComponentFixture<WelcomeBusinessComponent>;

    beforeEach(async () => {
      (mockFirebaseService.getRemoteConfigBoolean as jasmine.Spy).and.returnValue(false);
      await TestBed.resetTestingModule();
      await buildModule({});
      rcOffFixture = TestBed.createComponent(WelcomeBusinessComponent);
      rcOffFixture.detectChanges();
    });

    it('should NOT render the tier preview section when RC flag is false', () => {
      const cards: NodeListOf<Element> = rcOffFixture.nativeElement.querySelectorAll('.tier-card');
      expect(cards.length).toBe(0);
    });

    it('should NOT show "Plans & Pricing" heading when tier preview is disabled', () => {
      expect(rcOffFixture.nativeElement.textContent).not.toContain('Plans & Pricing');
    });
  });

  // ── Removed inaccurate / redundant tiles ──────────────────────────────────────

  describe('removed inaccurate tiles', () => {
    it('should NOT render "Instant Payments" tile (overpromises instant settlement)', () => {
      expect(fixture.nativeElement.textContent).not.toContain('Instant Payments');
    });

    it('should NOT render "Easy Withdrawals" tile (ATM claim unconfirmed for stores)', () => {
      expect(fixture.nativeElement.textContent).not.toContain('Easy Withdrawals');
    });

    it('should NOT render "Daily Payouts" benefit tile (covered accurately by tier preview)', () => {
      // "Daily payouts" appears in the tier preview feature list, not as a standalone tile.
      // The standalone tile has been removed; the text still appears inside tier cards.
      const cards = fixture.nativeElement.querySelectorAll('.card.bg-growth, .card.bg-store, .card.bg-secure, .card.bg-tip');
      const tileTexts = Array.from(cards).map((c: any) => c.textContent || '');
      expect(tileTexts.some((t: string) => t.trim() === 'Daily Payouts')).toBe(false);
    });

    it('should NOT render "Withdrawal Limits" benefit tile', () => {
      const cards = fixture.nativeElement.querySelectorAll('.card.bg-growth, .card.bg-store, .card.bg-secure, .card.bg-tip');
      const tileTexts = Array.from(cards).map((c: any) => c.textContent || '');
      expect(tileTexts.some((t: string) => t.includes('Withdrawal Limits'))).toBe(false);
    });
  });

  // ── Remaining benefit tiles ─────────────────────────────────────────────────

  describe('remaining benefit tiles', () => {
    it('should render "Grow Your Business" tile', () => {
      expect(fixture.nativeElement.textContent).toContain('Grow Your Business');
    });

    it('should render "Dedicated Store Page" tile', () => {
      expect(fixture.nativeElement.textContent).toContain('Dedicated Store Page');
    });

    it('should render "Secure Transactions" tile', () => {
      expect(fixture.nativeElement.textContent).toContain('Secure Transactions');
    });

    it('should render "Convenient Tipping" tile', () => {
      expect(fixture.nativeElement.textContent).toContain('Convenient Tipping');
    });
  });

  // ── How to Get Started strip ────────────────────────────────────────────────

  describe('How to Get Started strip', () => {
    it('should render all four steps', () => {
      const text: string = fixture.nativeElement.textContent;
      expect(text).toContain('1. Sign Up');
      expect(text).toContain('2. Set Up Store');
      expect(text).toContain('3. Download QR Code');
      expect(text).toContain('4. Start Selling');
    });
  });
});
