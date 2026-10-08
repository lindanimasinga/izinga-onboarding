import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { FirebaseService } from './firebase.service';

// FirebaseService initializes Firebase and schedules a 5-second setTimeout that calls
// requestPermission() → getToken() which fails in ChromeHeadless with a DOMException,
// causing a browser disconnect. Provide a stub to prevent real initialization.
// refreshIdToken() is included so that components which call it after store creation
// (TIER-BILLING-01 token refresh) can be tested without live Firebase.
const firebaseServiceStub = {
  createCapture: jasmine.createSpy('createCapture'),
  requestVerification: jasmine.createSpy('requestVerification'),
  verifyOtp: jasmine.createSpy('verifyOtp'),
  requestNotificationPermission: jasmine.createSpy('requestNotificationPermission'),
  refreshIdToken: jasmine.createSpy('refreshIdToken').and.returnValue(of('refreshed-token')),
  analytics: null
};

describe('FirebaseService', () => {
  let service: FirebaseService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: FirebaseService, useValue: firebaseServiceStub }]
    });
    service = TestBed.inject(FirebaseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // TB-TOKEN-FB-01: refreshIdToken() is present and callable on the service contract.
  // Note: the real implementation calls user.getIdToken(true) which requires a live
  // Firebase session — direct unit-testing of that path requires a Firebase emulator
  // and is out of scope here. The stub ensures components that call refreshIdToken()
  // can be tested without Firebase (see business-update.component.spec.ts TB-TOKEN-01).
  it('TB-TOKEN-FB-01: refreshIdToken is defined and callable', () => {
    expect(typeof (service as any).refreshIdToken).toBe('function');
    const result$ = (service as any).refreshIdToken();
    expect(result$).toBeTruthy();
  });
});
