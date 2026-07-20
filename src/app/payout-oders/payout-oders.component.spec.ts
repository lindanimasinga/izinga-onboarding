import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { PayoutOdersComponent } from './payout-oders.component';
import { StorageService } from '../service/storage-service.service';
import { AnalyticsService } from '../service/analytics.service';

describe('PayoutOdersComponent', () => {
  let component: PayoutOdersComponent;
  let fixture: ComponentFixture<PayoutOdersComponent>;

  beforeEach(() => {
    const storageSvc = { payouts: [] } as any;
    const analyticsSvc = { logScreenView: () => {}, logEvent: () => {} } as any;

    TestBed.configureTestingModule({
      declarations: [PayoutOdersComponent],
      imports: [RouterTestingModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: StorageService, useValue: storageSvc },
        { provide: AnalyticsService, useValue: analyticsSvc }
      ]
    });
    fixture = TestBed.createComponent(PayoutOdersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
