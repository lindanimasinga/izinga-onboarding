import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
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
