import { TestBed } from '@angular/core/testing';
import { FixedBarService } from './fixed-bar.service';

describe('FixedBarService', () => {
  let service: FixedBarService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FixedBarService);
    // Ensure a clean body state before each test
    document.body.classList.remove('has-fixed-bar');
    // Reset the private counter by creating a fresh instance via TestBed
  });

  afterEach(() => {
    document.body.classList.remove('has-fixed-bar');
    TestBed.resetTestingModule();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // FIXED-BAR-01: acquire adds the class
  it('FIXED-BAR-01 — acquire() adds has-fixed-bar to document.body', () => {
    service.acquire();
    expect(document.body.classList.contains('has-fixed-bar')).toBeTrue();
  });

  // FIXED-BAR-02: acquire twice + release once keeps the class (counter still at 1)
  it('FIXED-BAR-02 — acquire twice then release once keeps has-fixed-bar (counter = 1)', () => {
    service.acquire();
    service.acquire();
    service.release();
    expect(document.body.classList.contains('has-fixed-bar')).toBeTrue();
  });

  // FIXED-BAR-03: release to 0 removes the class
  it('FIXED-BAR-03 — release to 0 removes has-fixed-bar from document.body', () => {
    service.acquire();
    service.release();
    expect(document.body.classList.contains('has-fixed-bar')).toBeFalse();
  });

  // FIXED-BAR-04: release below zero does not go negative (idempotent)
  it('FIXED-BAR-04 — release with count already at 0 does not throw and class stays absent', () => {
    expect(() => service.release()).not.toThrow();
    expect(document.body.classList.contains('has-fixed-bar')).toBeFalse();
  });

  // FIXED-BAR-05: router-transition regression
  // Angular fires ngOnInit (incoming) BEFORE ngOnDestroy (outgoing).
  // Simulate: component A acquire, component B acquire, component A release → class must still be present.
  it('FIXED-BAR-05 — router-transition order: A.acquire, B.acquire, A.release → class still present', () => {
    // Component A initialises (ngOnInit)
    service.acquire(); // count = 1

    // Component B initialises (ngOnInit) — incoming route, fires before A's ngOnDestroy
    service.acquire(); // count = 2

    // Component A destroys (ngOnDestroy)
    service.release(); // count = 1 — class must NOT be removed yet

    expect(document.body.classList.contains('has-fixed-bar'))
      .withContext('has-fixed-bar must remain while B is still mounted')
      .toBeTrue();

    // Component B eventually destroys
    service.release(); // count = 0 — now class should be gone
    expect(document.body.classList.contains('has-fixed-bar'))
      .withContext('has-fixed-bar must be removed once all holders release')
      .toBeFalse();
  });
});
