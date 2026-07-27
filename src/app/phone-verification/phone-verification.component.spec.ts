import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';

import { PhoneVerificationComponent } from './phone-verification.component';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { StorageService } from '../service/storage-service.service';
import { FirebaseService } from '../service/firebase.service';
import { AnalyticsService } from '../service/analytics.service';

describe('PhoneVerificationComponent', () => {
  let component: PhoneVerificationComponent;
  let fixture: ComponentFixture<PhoneVerificationComponent>;

  beforeEach(() => {
    const orderSvc = { getUser: () => of(null), createUser: () => of(null) } as any;
    const storageSvc = { userProfile: undefined, phoneNumber: '' } as any;
    const firebaseSvc = { sendOtp: () => {}, verifyOtp: () => {}, requestNotificationPermission: () => {}, createCapture: () => {} } as any;
    const analyticsSvc = { logScreenView: () => {}, logEvent: () => {} } as any;

    TestBed.configureTestingModule({
      declarations: [PhoneVerificationComponent],
      imports: [RouterTestingModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: IzingaOrderManagementService, useValue: orderSvc },
        { provide: StorageService, useValue: storageSvc },
        { provide: FirebaseService, useValue: firebaseSvc },
        { provide: AnalyticsService, useValue: analyticsSvc }
      ]
    });
    fixture = TestBed.createComponent(PhoneVerificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
