import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { DatePipe } from '@angular/common';
import { of } from 'rxjs';
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

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
