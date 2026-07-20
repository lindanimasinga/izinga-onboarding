import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { PayoutDetailsComponent } from './payout-details.component';
import { StorageService } from '../service/storage-service.service';
import { AnalyticsService } from '../service/analytics.service';

describe('PayoutDetailsComponent', () => {
  let component: PayoutDetailsComponent;
  let fixture: ComponentFixture<PayoutDetailsComponent>;

  beforeEach(() => {
    const mockStore = { id: 'store-1', name: 'Test Store' } as any;
    const storageSvc = { shopToPayout: mockStore, payouts: [] } as any;
    const analyticsSvc = { logScreenView: () => {}, logEvent: () => {} } as any;

    TestBed.configureTestingModule({
      declarations: [PayoutDetailsComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: StorageService, useValue: storageSvc },
        { provide: AnalyticsService, useValue: analyticsSvc }
      ]
    });
    fixture = TestBed.createComponent(PayoutDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
