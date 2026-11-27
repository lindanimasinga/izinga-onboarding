import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';

import { WelcomeIndivisualsComponent } from './welcome.component';
import { StorageService } from '../service/storage-service.service';
import { AnalyticsService } from '../service/analytics.service';

/**
 * ADR-004 / T-13 — Scenario 8: Ambassador ref capture from QR link.
 *
 * TC-WEL-01  Component creates without error.
 * TC-WEL-02  ?ref param present: ambassadorRef stored in sessionStorage via StorageService.
 * TC-WEL-03  No ref param: ambassadorRef is NOT set in storage (null is preserved).
 * TC-WEL-04  Empty ref param: not stored (falsy guard in StorageService setter is respected).
 * TC-WEL-05  Analytics screen view is logged on init.
 */
describe('WelcomeIndivisualsComponent', () => {
  let component: WelcomeIndivisualsComponent;
  let fixture: ComponentFixture<WelcomeIndivisualsComponent>;
  let mockStorage: { ambassadorRef: string | null; userType: string | undefined };
  let mockAnalytics: jasmine.SpyObj<AnalyticsService>;
  let queryParams$ = of({} as Record<string, string>);

  function buildModule(params: Record<string, string>) {
    queryParams$ = of(params);
    mockStorage = { ambassadorRef: null, userType: undefined };
    mockAnalytics = jasmine.createSpyObj('AnalyticsService', ['logScreenView']);

    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [WelcomeIndivisualsComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: StorageService, useValue: mockStorage },
        { provide: AnalyticsService, useValue: mockAnalytics },
        {
          provide: ActivatedRoute,
          useValue: { queryParams: of(params) }
        }
      ]
    }).compileComponents();

    fixture   = TestBed.createComponent(WelcomeIndivisualsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  // -----------------------------------------------------------------------
  // TC-WEL-01 — Component renders
  // -----------------------------------------------------------------------
  it('TC-WEL-01: should create', () => {
    buildModule({});
    expect(component).toBeTruthy();
  });

  // -----------------------------------------------------------------------
  // TC-WEL-02 — ?ref present: stored in sessionStorage (Scenario 8)
  // -----------------------------------------------------------------------
  it('TC-WEL-02: stores ambassadorRef in sessionStorage when ?ref param is present', () => {
    buildModule({ ref: 'abc123' });

    expect(mockStorage.ambassadorRef).toBe('abc123');
  });

  // -----------------------------------------------------------------------
  // TC-WEL-03 — No ref param: ambassadorRef stays null (Scenario 2)
  // -----------------------------------------------------------------------
  it('TC-WEL-03: does not set ambassadorRef when no ref param is present', () => {
    buildModule({});

    expect(mockStorage.ambassadorRef).toBeNull();
  });

  // -----------------------------------------------------------------------
  // TC-WEL-04 — Empty ref string: StorageService setter guards against falsy
  // -----------------------------------------------------------------------
  it('TC-WEL-04: does not store ambassadorRef when ref param is an empty string', () => {
    buildModule({ ref: '' });

    // StorageService.ambassadorRef setter only stores truthy values
    expect(mockStorage.ambassadorRef).toBeNull();
  });

  // -----------------------------------------------------------------------
  // TC-WEL-05 — Analytics logged
  // -----------------------------------------------------------------------
  it('TC-WEL-05: logs welcome_individual screen view on init', () => {
    buildModule({});

    expect(mockAnalytics.logScreenView).toHaveBeenCalledWith('welcome_individual');
  });
});

// ---------------------------------------------------------------------------
// UX review ONB-UX-02 — I-1, I-2
// ---------------------------------------------------------------------------
describe('WelcomeIndivisualsComponent — UX review fixes (I-1 I-2)', () => {
  afterEach(() => TestBed.resetTestingModule());

  function buildIFixture() {
    const storage = { ambassadorRef: null, userType: undefined } as any;
    const analytics = jasmine.createSpyObj('AnalyticsService', ['logScreenView']);
    TestBed.configureTestingModule({
      imports: [CommonModule, RouterTestingModule],
      declarations: [WelcomeIndivisualsComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: StorageService, useValue: storage },
        { provide: AnalyticsService, useValue: analytics },
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } }
      ]
    });
    const f = TestBed.createComponent(WelcomeIndivisualsComponent);
    const c = f.componentInstance;
    f.detectChanges();
    return { fixture: f, component: c };
  }

  // I-1: individual welcome role cards must include col-12 (full-width at xs, was col-6 before the fix)
  it('I-1 — individual welcome role cards include col-12 (single column on mobile xs)', () => {
    // Default userType is 'individual' — the #individualWelcome template renders.
    // Before the fix cards used col-6 (2-up = ~153px wide at 375px); after the fix they include col-12.
    const { fixture } = buildIFixture();
    // The row of role cards is inside a .row.g-3 — query the direct column children.
    const rows: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.row.g-3 > div');
    // Filter to column divs that have col-12 (fix confirmed) and col-sm-6 (responsive layout)
    const fixedCards = Array.from(rows).filter((el: HTMLElement) =>
      el.classList.contains('col-12') && el.classList.contains('col-sm-6')
    );
    expect(fixedCards.length).toBeGreaterThan(0,
      'individual welcome role cards must have col-12 (full-width xs) and col-sm-6 (2-up sm+); pre-fix they were col-6 only');
    fixedCards.forEach((card: HTMLElement) => {
      expect(card.classList.contains('col-12')).toBeTrue();
    });
  });

  // I-2: FixedBarService must be wired — acquire() on ngOnInit, release() on ngOnDestroy
  it('I-2 — ngOnInit acquires has-fixed-bar; ngOnDestroy releases it', () => {
    const { component, fixture } = buildIFixture();
    fixture.detectChanges();
    expect(document.body.classList.contains('has-fixed-bar')).toBeTrue();
    component.ngOnDestroy();
    expect(document.body.classList.contains('has-fixed-bar')).toBeFalse();
  });
});
