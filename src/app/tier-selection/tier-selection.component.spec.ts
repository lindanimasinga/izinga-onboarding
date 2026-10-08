import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { TierSelectionComponent } from './tier-selection.component';
import { StorageService } from '../service/storage-service.service';
import { AnalyticsService } from '../service/analytics.service';

const mockStorageService: Partial<StorageService> & { sawPricing: boolean } = {
  selectedTier: null as any,
  userProfile: undefined,
  sawPricing: false   // ONB-02: set by landing page when tier preview entered viewport
};

const mockAnalyticsService: Partial<AnalyticsService> = {
  logScreenView: jasmine.createSpy('logScreenView'),
  logEvent: jasmine.createSpy('logEvent')
};

describe('TierSelectionComponent', () => {
  let component: TierSelectionComponent;
  let fixture: ComponentFixture<TierSelectionComponent>;
  let router: Router;

  beforeEach(async () => {
    // Reset shared mock state before each test
    mockStorageService.selectedTier = null as any;
    mockStorageService.sawPricing = false;
    (mockAnalyticsService.logScreenView as jasmine.Spy).calls.reset();
    (mockAnalyticsService.logEvent as jasmine.Spy).calls.reset();

    await TestBed.configureTestingModule({
      declarations: [TierSelectionComponent],
      imports: [RouterTestingModule.withRoutes([])],
      providers: [
        { provide: StorageService, useValue: mockStorageService },
        { provide: AnalyticsService, useValue: mockAnalyticsService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TierSelectionComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should log screen view on init', () => {
    expect(mockAnalyticsService.logScreenView).toHaveBeenCalledWith('tier_selection');
  });

  // ONB-02: tier_select_reached — fires on load, carries saw_pricing flag
  it('should log tier_select_reached on init with saw_pricing=false when landing page was not seen', () => {
    expect(mockAnalyticsService.logEvent).toHaveBeenCalledWith(
      'tier_select_reached',
      { saw_pricing: false }
    );
  });

  it('should log tier_select_reached with saw_pricing=true when storageService.sawPricing is true', async () => {
    mockStorageService.sawPricing = true;
    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      declarations: [TierSelectionComponent],
      imports: [RouterTestingModule.withRoutes([])],
      providers: [
        { provide: StorageService, useValue: mockStorageService },
        { provide: AnalyticsService, useValue: mockAnalyticsService }
      ]
    }).compileComponents();
    const pricingFixture = TestBed.createComponent(TierSelectionComponent);
    pricingFixture.detectChanges();
    expect(mockAnalyticsService.logEvent).toHaveBeenCalledWith(
      'tier_select_reached',
      { saw_pricing: true }
    );
  });

  // -------------------------------------------------------------------------
  // selectedTier default and edit-path pre-selection
  // -------------------------------------------------------------------------

  it('should default selectedTier to FREE on init when storage is null', () => {
    expect(component.selectedTier).toBe('FREE');
  });

  it('should pre-select PREMIUM_1 from storageService on the edit path', async () => {
    mockStorageService.selectedTier = 'PREMIUM_1';
    // Re-create the component so ngOnInit reads the updated storageService value
    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      declarations: [TierSelectionComponent],
      imports: [RouterTestingModule.withRoutes([])],
      providers: [
        { provide: StorageService, useValue: mockStorageService },
        { provide: AnalyticsService, useValue: mockAnalyticsService }
      ]
    }).compileComponents();
    const editFixture = TestBed.createComponent(TierSelectionComponent);
    editFixture.detectChanges();
    expect(editFixture.componentInstance.selectedTier).toBe('PREMIUM_1');
  });

  it('should pre-select PREMIUM_2 from storageService on the edit path', async () => {
    mockStorageService.selectedTier = 'PREMIUM_2';
    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      declarations: [TierSelectionComponent],
      imports: [RouterTestingModule.withRoutes([])],
      providers: [
        { provide: StorageService, useValue: mockStorageService },
        { provide: AnalyticsService, useValue: mockAnalyticsService }
      ]
    }).compileComponents();
    const editFixture = TestBed.createComponent(TierSelectionComponent);
    editFixture.detectChanges();
    expect(editFixture.componentInstance.selectedTier).toBe('PREMIUM_2');
  });

  // -------------------------------------------------------------------------
  // chooseTier() — visual selection without navigation
  // -------------------------------------------------------------------------

  describe('chooseTier()', () => {
    it('should set selectedTier to FREE', () => {
      component.chooseTier('FREE');
      expect(component.selectedTier).toBe('FREE');
    });

    it('should set selectedTier to PREMIUM_1', () => {
      component.chooseTier('PREMIUM_1');
      expect(component.selectedTier).toBe('PREMIUM_1');
    });

    it('should set selectedTier to PREMIUM_2', () => {
      component.chooseTier('PREMIUM_2');
      expect(component.selectedTier).toBe('PREMIUM_2');
    });

    it('should not navigate when choosing a tier', () => {
      const navigateSpy = spyOn(router, 'navigate');
      component.chooseTier('PREMIUM_1');
      expect(navigateSpy).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // continueBtnText getter — reactive label
  // -------------------------------------------------------------------------

  describe('continueBtnText', () => {
    it('should return "Continue with Free" when selectedTier is FREE', () => {
      component.selectedTier = 'FREE';
      expect(component.continueBtnText).toBe('Continue with Free');
    });

    it('should return "Continue with Tier 1 — R800/month" when selectedTier is PREMIUM_1', () => {
      component.selectedTier = 'PREMIUM_1';
      expect(component.continueBtnText).toBe('Continue with Tier 1 — R800/month');
    });

    it('should return "Continue with Tier 2 — R3,000/month" when selectedTier is PREMIUM_2', () => {
      component.selectedTier = 'PREMIUM_2';
      expect(component.continueBtnText).toBe('Continue with Tier 2 — R3,000/month');
    });

    it('should update continueBtnText when chooseTier is called', () => {
      component.chooseTier('PREMIUM_2');
      expect(component.continueBtnText).toBe('Continue with Tier 2 — R3,000/month');
      component.chooseTier('FREE');
      expect(component.continueBtnText).toBe('Continue with Free');
    });
  });

  // -------------------------------------------------------------------------
  // onContinue() — delegates to selectTier with current selection
  // -------------------------------------------------------------------------

  describe('onContinue()', () => {
    beforeEach(() => {
      component.userId = 'user-abc';
      // Default: termsAccepted falsy (first-time path).
      mockStorageService.userProfile = undefined;
    });

    it('should store the selectedTier in storageService and navigate', () => {
      const navigateSpy = spyOn(router, 'navigate');
      component.selectedTier = 'PREMIUM_1';
      component.onContinue();
      expect(mockStorageService.selectedTier).toBe('PREMIUM_1');
      expect(navigateSpy).toHaveBeenCalledWith(['/business/terms', 'user-abc']);
    });

    it('should navigate with FREE by default', () => {
      const navigateSpy = spyOn(router, 'navigate');
      component.onContinue();
      expect(mockStorageService.selectedTier).toBe('FREE');
      expect(navigateSpy).toHaveBeenCalledWith(['/business/terms', 'user-abc']);
    });

    // TIER-BILLING-01 regression — sixth bug in family.
    // Returning STORE_ADMIN with termsAccepted:true should bypass terms and go
    // straight to store creation (/business/info/:id). Routing through terms would
    // trigger c8d964e's skip-redirect → navigateToDashboard(), silently discarding
    // the tier selection.
    it('should navigate to /business/info/:id when userProfile.termsAccepted is true (returning user)', () => {
      mockStorageService.userProfile = { termsAccepted: true } as any;
      const navigateSpy = spyOn(router, 'navigate');
      component.selectedTier = 'PREMIUM_1';
      component.onContinue();
      expect(mockStorageService.selectedTier).toBe('PREMIUM_1');
      expect(navigateSpy).toHaveBeenCalledWith(['/business/info', 'user-abc']);
    });

    it('should navigate to /business/info/:id for FREE tier when userProfile.termsAccepted is true', () => {
      mockStorageService.userProfile = { termsAccepted: true } as any;
      const navigateSpy = spyOn(router, 'navigate');
      component.selectedTier = 'FREE';
      component.onContinue();
      expect(mockStorageService.selectedTier).toBe('FREE');
      expect(navigateSpy).toHaveBeenCalledWith(['/business/info', 'user-abc']);
    });

    it('should still navigate to /business/terms/:id when userProfile.termsAccepted is false (first-time path unchanged)', () => {
      mockStorageService.userProfile = { termsAccepted: false } as any;
      const navigateSpy = spyOn(router, 'navigate');
      component.selectedTier = 'PREMIUM_1';
      component.onContinue();
      expect(navigateSpy).toHaveBeenCalledWith(['/business/terms', 'user-abc']);
    });
  });

  // -------------------------------------------------------------------------
  // Selection state CSS class in the rendered template
  // -------------------------------------------------------------------------

  describe('tier-card--selected class', () => {
    it('should apply tier-card--selected to the Free card when selectedTier is FREE', () => {
      component.selectedTier = 'FREE';
      fixture.detectChanges();
      const cards: NodeListOf<Element> = fixture.nativeElement.querySelectorAll('.tier-card');
      expect(cards[0].classList).toContain('tier-card--selected');
      expect(cards[1].classList).not.toContain('tier-card--selected');
      expect(cards[2].classList).not.toContain('tier-card--selected');
    });

    it('should apply tier-card--selected to the Tier 1 card when selectedTier is PREMIUM_1', () => {
      component.selectedTier = 'PREMIUM_1';
      fixture.detectChanges();
      const cards: NodeListOf<Element> = fixture.nativeElement.querySelectorAll('.tier-card');
      expect(cards[0].classList).not.toContain('tier-card--selected');
      expect(cards[1].classList).toContain('tier-card--selected');
      expect(cards[2].classList).not.toContain('tier-card--selected');
    });

    it('should apply tier-card--selected to the Tier 2 card when selectedTier is PREMIUM_2', () => {
      component.selectedTier = 'PREMIUM_2';
      fixture.detectChanges();
      const cards: NodeListOf<Element> = fixture.nativeElement.querySelectorAll('.tier-card');
      expect(cards[0].classList).not.toContain('tier-card--selected');
      expect(cards[1].classList).not.toContain('tier-card--selected');
      expect(cards[2].classList).toContain('tier-card--selected');
    });

    it('should move tier-card--selected from Free to Tier 1 after chooseTier(PREMIUM_1)', () => {
      component.selectedTier = 'FREE';
      fixture.detectChanges();
      component.chooseTier('PREMIUM_1');
      fixture.detectChanges();
      const cards: NodeListOf<Element> = fixture.nativeElement.querySelectorAll('.tier-card');
      expect(cards[0].classList).not.toContain('tier-card--selected');
      expect(cards[1].classList).toContain('tier-card--selected');
    });
  });

  // -------------------------------------------------------------------------
  // selectTier() — existing behaviour preserved (regression guard)
  // All tests here run with userProfile undefined (termsAccepted falsy) so
  // navigation goes to /business/terms/:id as before.
  // -------------------------------------------------------------------------

  describe('selectTier()', () => {
    beforeEach(() => {
      component.userId = 'test-user-id';
      // First-time path: no user profile in session (termsAccepted falsy).
      mockStorageService.userProfile = undefined;
    });

    it('should store FREE in storageService', () => {
      const navigateSpy = spyOn(router, 'navigate');
      component.selectTier('FREE');
      expect(mockStorageService.selectedTier).toBe('FREE');
    });

    it('should store PREMIUM_1 in storageService', () => {
      spyOn(router, 'navigate');
      component.selectTier('PREMIUM_1');
      expect(mockStorageService.selectedTier).toBe('PREMIUM_1');
    });

    it('should store PREMIUM_2 in storageService', () => {
      spyOn(router, 'navigate');
      component.selectTier('PREMIUM_2');
      expect(mockStorageService.selectedTier).toBe('PREMIUM_2');
    });

    it('should navigate to /business/terms/:id after selection when termsAccepted is falsy', () => {
      const navigateSpy = spyOn(router, 'navigate');
      component.selectTier('FREE');
      expect(navigateSpy).toHaveBeenCalledWith(['/business/terms', 'test-user-id']);
    });

    it('should navigate with empty string when userId is undefined and termsAccepted is falsy', () => {
      component.userId = undefined;
      const navigateSpy = spyOn(router, 'navigate');
      component.selectTier('PREMIUM_1');
      expect(navigateSpy).toHaveBeenCalledWith(['/business/terms', '']);
    });

    it('should log analytics event with tier and userId', () => {
      spyOn(router, 'navigate');
      component.selectTier('PREMIUM_2');
      expect(mockAnalyticsService.logEvent).toHaveBeenCalledWith(
        'tier_selected',
        { tier: 'PREMIUM_2', userId: 'test-user-id' }
      );
    });

    // TIER-BILLING-01 regression — returning user route (termsAccepted: true).
    it('should navigate to /business/info/:id when userProfile.termsAccepted is true', () => {
      mockStorageService.userProfile = { termsAccepted: true } as any;
      const navigateSpy = spyOn(router, 'navigate');
      component.selectTier('PREMIUM_1');
      expect(navigateSpy).toHaveBeenCalledWith(['/business/info', 'test-user-id']);
    });

    it('should navigate to /business/info/:id for FREE tier when userProfile.termsAccepted is true', () => {
      mockStorageService.userProfile = { termsAccepted: true } as any;
      const navigateSpy = spyOn(router, 'navigate');
      component.selectTier('FREE');
      expect(navigateSpy).toHaveBeenCalledWith(['/business/info', 'test-user-id']);
    });

    it('should navigate to /business/info with empty string when userId is undefined and termsAccepted is true', () => {
      component.userId = undefined;
      mockStorageService.userProfile = { termsAccepted: true } as any;
      const navigateSpy = spyOn(router, 'navigate');
      component.selectTier('PREMIUM_2');
      expect(navigateSpy).toHaveBeenCalledWith(['/business/info', '']);
    });
  });

  // -------------------------------------------------------------------------
  // AC-01 — three tier cards rendered on load (DOM-level)
  // -------------------------------------------------------------------------

  describe('AC-01 — three tier cards rendered', () => {
    it('should render exactly three tier cards', () => {
      const cards: NodeListOf<Element> = fixture.nativeElement.querySelectorAll('.tier-card');
      expect(cards.length).toBe(3);
    });

    it('should show a Free card', () => {
      const text: string = fixture.nativeElement.textContent;
      expect(text).toContain('Free');
    });

    it('should show a Premium Tier 1 card', () => {
      const text: string = fixture.nativeElement.textContent;
      expect(text).toContain('Premium Tier 1');
    });

    it('should show a Premium Tier 2 card', () => {
      const text: string = fixture.nativeElement.textContent;
      expect(text).toContain('Premium Tier 2');
    });
  });

  // -------------------------------------------------------------------------
  // Bug 1 — Select buttons must use tier-action-btn, not btn-outline-dark
  // btn-outline-dark renders charcoal text invisible on dark card backgrounds.
  // -------------------------------------------------------------------------

  describe('Bug 1 — Select button contrast classes', () => {
    it('should not use btn-outline-dark on any Select button', () => {
      const buttons: NodeListOf<Element> = fixture.nativeElement.querySelectorAll('.tier-action-btn');
      // Three Select buttons must exist
      expect(buttons.length).toBe(3);
    });

    it('Select Free button should carry tier-action-btn, not btn-outline-dark', () => {
      const cards = fixture.nativeElement.querySelectorAll('.tier-card');
      const freeBtn = cards[0].querySelector('button.tier-action-btn');
      expect(freeBtn).not.toBeNull();
      expect(freeBtn!.classList).not.toContain('btn-outline-dark');
    });

    it('Select Premium Tier 1 button should carry tier-action-btn, not btn-outline-dark', () => {
      const cards = fixture.nativeElement.querySelectorAll('.tier-card');
      const t1Btn = cards[1].querySelector('button.tier-action-btn');
      expect(t1Btn).not.toBeNull();
      expect(t1Btn!.classList).not.toContain('btn-outline-dark');
    });

    it('Select Premium Tier 2 button should carry tier-action-btn, not btn-outline-dark', () => {
      const cards = fixture.nativeElement.querySelectorAll('.tier-card');
      const t2Btn = cards[2].querySelector('button.tier-action-btn');
      expect(t2Btn).not.toBeNull();
      expect(t2Btn!.classList).not.toContain('btn-outline-dark');
    });
  });

  // -------------------------------------------------------------------------
  // AC-02 — 6.5% fee disclosure present on each tier card (DOM-level)
  // The viewport-width / no-scroll requirement is a browser layout concern
  // that Karma does not verify; the DOM-level check confirms the text is
  // present on all three cards independently of layout.
  // -------------------------------------------------------------------------

  describe('AC-02 — 6.5% fee disclosure on all three tier cards', () => {
    it('should render three .fee-disclosure elements (one per card)', () => {
      const disclosures: NodeListOf<Element> =
        fixture.nativeElement.querySelectorAll('.fee-disclosure');
      expect(disclosures.length).toBe(3);
    });

    it('each .fee-disclosure element should mention 6.5%', () => {
      const disclosures: NodeListOf<Element> =
        fixture.nativeElement.querySelectorAll('.fee-disclosure');
      Array.from(disclosures).forEach((el, idx) => {
        expect(el.textContent).toContain('6.5%',
          `Card ${idx + 1} fee-disclosure must contain "6.5%"`);
      });
    });

    it('each .fee-disclosure should say the fee is paid by the customer', () => {
      const disclosures: NodeListOf<Element> =
        fixture.nativeElement.querySelectorAll('.fee-disclosure');
      Array.from(disclosures).forEach((el, idx) => {
        expect(el.textContent!.toLowerCase()).toContain('customer',
          `Card ${idx + 1} fee-disclosure must mention "customer"`);
      });
    });
  });
});
