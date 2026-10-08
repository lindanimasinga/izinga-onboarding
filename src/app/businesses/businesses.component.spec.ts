import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { of, Subject } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { BusinessesComponent } from './businesses.component';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { StorageService } from '../service/storage-service.service';
import { AnalyticsService } from '../service/analytics.service';

describe('BusinessesComponent', () => {
  let component: BusinessesComponent;
  let fixture: ComponentFixture<BusinessesComponent>;

  beforeEach(() => {
    const orderSvc = {
      getCustomerByPhoneNumber: () => of({ id: 'user-1' }),
      getAllStoresSummary: () => of([])
    } as any;
    const storageSvc = { userProfile: undefined, phoneNumber: undefined } as any;
    const analyticsSvc = { logScreenView: () => {}, logEvent: () => {} } as any;

    TestBed.configureTestingModule({
      declarations: [BusinessesComponent],
      imports: [RouterTestingModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        DatePipe,
        { provide: IzingaOrderManagementService, useValue: orderSvc },
        { provide: StorageService, useValue: storageSvc },
        { provide: AnalyticsService, useValue: analyticsSvc }
      ]
    });
    fixture = TestBed.createComponent(BusinessesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // AC-16-a: empty state shows after fetch returns []
  it('AC-16-a — empty-state h5 visible when stores list is empty', () => {
    // component already initialised with getAllStoresSummary returning [] — isLoaded is true
    fixture.detectChanges();
    const h5: HTMLElement = fixture.nativeElement.querySelector('h5');
    expect(h5).not.toBeNull();
    expect(h5.textContent).toContain("You haven't added a shop yet.");
  });

  // NOTE-04: empty state must NOT flash before the fetch resolves
  it('NOTE-04 — empty state is absent before the fetch resolves', () => {
    const storesSubject = new Subject<any[]>();
    const lazySvc = {
      getCustomerByPhoneNumber: () => of({ id: 'user-1' }),
      getAllStoresSummary: () => storesSubject.asObservable()
    } as any;
    const storageSvc = { userProfile: undefined, phoneNumber: undefined } as any;
    const analyticsSvc = { logScreenView: () => {}, logEvent: () => {} } as any;

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      declarations: [BusinessesComponent],
      imports: [RouterTestingModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        DatePipe,
        { provide: IzingaOrderManagementService, useValue: lazySvc },
        { provide: StorageService, useValue: storageSvc },
        { provide: AnalyticsService, useValue: analyticsSvc }
      ]
    });
    const lazyFixture = TestBed.createComponent(BusinessesComponent);
    lazyFixture.detectChanges();

    // Before the observable emits, isLoaded is false — empty state must not appear
    const h5Before: HTMLElement = lazyFixture.nativeElement.querySelector('h5');
    expect(h5Before).toBeNull();

    // Emit empty list → isLoaded becomes true → empty state appears
    storesSubject.next([]);
    lazyFixture.detectChanges();
    const h5After: HTMLElement = lazyFixture.nativeElement.querySelector('h5');
    expect(h5After).not.toBeNull();
    expect(h5After.textContent).toContain("You haven't added a shop yet.");
  });
});

// ---------------------------------------------------------------------------
// ONB-UX-02 new tests — REQ-04 loading state, REQ-09 search-clear button
// ---------------------------------------------------------------------------

describe('BusinessesComponent — ONB-UX-02', () => {
  afterEach(() => TestBed.resetTestingModule());

  function buildFixture(storesSubject?: Subject<any[]>) {
    const stores$ = storesSubject ?? new Subject<any[]>();
    const lazySvc = {
      getCustomerByPhoneNumber: () => of({ id: 'user-1' }),
      getAllStoresSummary: () => stores$.asObservable()
    } as any;
    const storageSvc = { userProfile: undefined, phoneNumber: undefined } as any;
    const analyticsSvc = { logScreenView: () => {}, logEvent: () => {} } as any;

    TestBed.configureTestingModule({
      declarations: [BusinessesComponent],
      imports: [RouterTestingModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        DatePipe,
        { provide: IzingaOrderManagementService, useValue: lazySvc },
        { provide: StorageService, useValue: storageSvc },
        { provide: AnalyticsService, useValue: analyticsSvc }
      ]
    });
    const fixture = TestBed.createComponent(BusinessesComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    return { fixture, component, stores$ };
  }

  // REQ-04: isLoadingShops is true before API resolves
  it('REQ-04 — isLoadingShops is true before shops API resolves', () => {
    const { component } = buildFixture();
    // stores$ has not emitted; isLoadingShops should still be true
    expect(component.isLoadingShops).toBe(true);
  });

  // REQ-04: isLoadingShops is false after API resolves
  it('REQ-04 — isLoadingShops is false after shops API resolves', () => {
    const stores$ = new Subject<any[]>();
    const { component, fixture } = buildFixture(stores$);
    stores$.next([]);
    fixture.detectChanges();
    expect(component.isLoadingShops).toBe(false);
  });

  // REQ-04: loading placeholder visible while in flight
  it('REQ-04 — loading spinner alert is present while API is in flight', () => {
    const { fixture } = buildFixture();
    const alert = fixture.nativeElement.querySelector('.alert.alert-info');
    expect(alert).not.toBeNull();
    expect(alert.textContent).toContain('Loading your shops');
  });

  // FAIL-01: FixedBarService.acquire() called on ngOnInit; release() on ngOnDestroy
  it('FAIL-01 — ngOnInit acquires has-fixed-bar; ngOnDestroy releases it', () => {
    const { component, fixture } = buildFixture();
    fixture.detectChanges();
    expect(document.body.classList.contains('has-fixed-bar')).toBe(true);
    component.ngOnDestroy();
    expect(document.body.classList.contains('has-fixed-bar')).toBe(false);
  });

  // REQ-09: search-clear button uses btn-outline-dark, not btn-outline-secondary
  it('REQ-09 — search-clear button uses btn-outline-dark', () => {
    const stores$ = new Subject<any[]>();
    const { fixture, component } = buildFixture(stores$);
    stores$.next([]);
    component.searchTerm = 'test';
    fixture.detectChanges();
    const clearBtn: HTMLButtonElement = fixture.nativeElement.querySelector('button.btn-outline-dark');
    expect(clearBtn).not.toBeNull();
    const secondaryBtn: HTMLButtonElement = fixture.nativeElement.querySelector('button.btn-outline-secondary');
    expect(secondaryBtn).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// BUG7 regression tests — Add Shop / Add New Business must route to tier-select
// (not the ungated /business/info route that produces GET /store/undefined 500)
// ---------------------------------------------------------------------------

describe('BusinessesComponent — BUG7 tier-select routing', () => {
  afterEach(() => TestBed.resetTestingModule());

  function buildFixture(storesSubject?: Subject<any[]>) {
    const stores$ = storesSubject ?? new Subject<any[]>();
    const lazySvc = {
      getCustomerByPhoneNumber: () => of({ id: 'user-1' }),
      getAllStoresSummary: () => stores$.asObservable()
    } as any;
    const storageSvc = { userProfile: undefined, phoneNumber: undefined } as any;
    const analyticsSvc = { logScreenView: () => {}, logEvent: () => {} } as any;

    TestBed.configureTestingModule({
      declarations: [BusinessesComponent],
      imports: [RouterTestingModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        DatePipe,
        { provide: IzingaOrderManagementService, useValue: lazySvc },
        { provide: StorageService, useValue: storageSvc },
        { provide: AnalyticsService, useValue: analyticsSvc }
      ]
    });
    const fixture = TestBed.createComponent(BusinessesComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    return { fixture, component, stores$ };
  }

  // BUG7-a: userId is populated from getCustomerByPhoneNumber after ngOnInit
  it('BUG7-a — userId is set to the resolved user id after ngOnInit', () => {
    const stores$ = new Subject<any[]>();
    const { component, fixture } = buildFixture(stores$);
    stores$.next([]);
    fixture.detectChanges();
    expect(component.userId).toBe('user-1');
  });

  // BUG7-b: fixed-bar button is disabled before getCustomerByPhoneNumber resolves (userId is null)
  it('BUG7-b — Add New Business button is disabled before userId loads', () => {
    // Use a deferred Subject for getCustomerByPhoneNumber so userId stays null
    const userSubject = new Subject<any>();
    const deferredSvc = {
      getCustomerByPhoneNumber: () => userSubject.asObservable(),
      getAllStoresSummary: () => new Subject<any[]>().asObservable()
    } as any;
    const storageSvc = { userProfile: undefined, phoneNumber: undefined } as any;
    const analyticsSvc = { logScreenView: () => {}, logEvent: () => {} } as any;
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      declarations: [BusinessesComponent],
      imports: [RouterTestingModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        DatePipe,
        { provide: IzingaOrderManagementService, useValue: deferredSvc },
        { provide: StorageService, useValue: storageSvc },
        { provide: AnalyticsService, useValue: analyticsSvc }
      ]
    });
    const lazyFixture = TestBed.createComponent(BusinessesComponent);
    lazyFixture.detectChanges();

    // userId must be null — API hasn't resolved yet
    expect(lazyFixture.componentInstance.userId).toBeNull();

    // Fixed-bar "Add New Business" button is always in DOM; must be disabled when userId is null
    const allButtons: HTMLButtonElement[] = Array.from(lazyFixture.nativeElement.querySelectorAll('button'));
    const addBizBtn = allButtons.find(b => b.textContent?.trim() === 'Add New Business');
    expect(addBizBtn).not.toBeUndefined();
    expect(addBizBtn!.disabled).toBe(true);
  });

  // BUG7-c: "Add Your Shop" button removed from empty state (product decision — redundant with fixed-bar)
  it('BUG7-c — empty state does NOT render an "Add Your Shop" button (redundant button removed)', () => {
    const stores$ = new Subject<any[]>();
    const { fixture } = buildFixture(stores$);
    stores$.next([]);
    fixture.detectChanges();

    const allButtons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
    const addShopBtn = allButtons.find(b => b.textContent?.trim() === 'Add Your Shop');
    // The empty-state "Add Your Shop" button was removed; only the fixed-bar button remains
    expect(addShopBtn).toBeUndefined();
  });

  // BUG7-d: fixed-bar "Add New Business" [routerLink] points to tier-select/:userId, not ../info
  it('BUG7-d — fixed-bar Add New Business [routerLink] points to tier-select/:userId, not info', () => {
    const stores$ = new Subject<any[]>();
    const { fixture } = buildFixture(stores$);
    stores$.next([{ id: 's1', name: 'Existing Shop' }]);
    fixture.detectChanges();

    const allButtons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
    const addBizBtn = allButtons.find(b => b.textContent?.trim() === 'Add New Business');
    expect(addBizBtn).not.toBeUndefined();

    // Angular reflects [routerLink] input as ng-reflect-router-link in test/dev mode
    const reflectedLink = addBizBtn!.getAttribute('ng-reflect-router-link');
    expect(reflectedLink).not.toBeNull();
    expect(reflectedLink).toContain('tier-select');
    expect(reflectedLink).not.toContain('../info');
    // userId is 'user-1' from the mock; confirm it's encoded in the link
    expect(reflectedLink).toContain('user-1');
  });
});
