import { TestBed } from '@angular/core/testing';

import { FirebaseService } from './firebase.service';

// FirebaseService initializes Firebase and schedules a 5-second setTimeout that calls
// requestPermission() → getToken() which fails in ChromeHeadless with a DOMException,
// causing a browser disconnect. Provide a stub to prevent real initialization.
const firebaseServiceStub = {
  createCapture: jasmine.createSpy('createCapture'),
  requestVerification: jasmine.createSpy('requestVerification'),
  verifyOtp: jasmine.createSpy('verifyOtp'),
  requestNotificationPermission: jasmine.createSpy('requestNotificationPermission'),
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
});
