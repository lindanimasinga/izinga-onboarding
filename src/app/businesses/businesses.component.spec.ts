import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
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
  it('AC-16-a — empty-state h5 and Add Your Shop button present when stores list is empty', () => {
    // component already initialised with getAllStoresSummary returning [] — isLoaded is true
    fixture.detectChanges();
    const h5: HTMLElement = fixture.nativeElement.querySelector('h5');
    expect(h5).not.toBeNull();
    expect(h5.textContent).toContain("You haven't added a shop yet.");

    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button.btn.btn-dark');
    const addBtn = Array.from(buttons).find(b => b.textContent?.trim() === 'Add Your Shop');
    expect(addBtn).not.toBeUndefined();
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
