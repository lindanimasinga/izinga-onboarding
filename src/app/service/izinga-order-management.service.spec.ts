import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';

import { IzingaOrderManagementService } from './izinga-order-management.service';
import { FirebaseService } from './firebase.service';
import { StoreProfile } from '../model/storeProfile';
import { environment } from 'src/environments/environment';

describe('IzingaOrderManagementService', () => {
  let service: IzingaOrderManagementService;
  let httpTestingController: HttpTestingController;

  // ADR-018: stub must provide getFirebaseIdToken() so that createStore() and
  // updateStore() — which now require a Bearer token — can complete in tests.
  const firebaseServiceStub = {
    getFirebaseIdToken: () => of('fake-firebase-token')
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        IzingaOrderManagementService,
        { provide: FirebaseService, useValue: firebaseServiceStub }
      ]
    });
    service = TestBed.inject(IzingaOrderManagementService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('createStore()', () => {
    const baseStoreProfile: StoreProfile = {
      id: 'store-001',
      name: 'Test Store',
      phone: '0821234567',
      description: 'A test store',
      address: '1 Main Road',
      type: 'RETAIL',
      active: true,
      categories: [],
      stock: [],
      businessHours: [],
      image: '',
      deliveryCost: 0,
      lat: 0,
      lng: 0,
      tags: [],
      minimumDeposit: 0,
      maximumDeliveryDistance: 0,
      availabilityStatus: 'AVAILABLE'
    } as unknown as StoreProfile;

    it('Test case 1: sends referralCode as a query param and strips it from the request body when referralCode is set', () => {
      const referralCode = 'REF-ABC123';
      const storeProfileWithReferral: StoreProfile = {
        ...baseStoreProfile,
        referralCode
      };

      service.createStore(storeProfileWithReferral).subscribe();

      const req = httpTestingController.expectOne(r =>
        r.url === `${environment.izingaUrl}/store` &&
        r.params.get('referralCode') === referralCode
      );

      expect(req.request.method).toBe('POST');
      expect(req.request.params.get('referralCode')).toBe(referralCode);
      expect(req.request.body['referralCode']).toBeUndefined();
      // ADR-018: Bearer token must be present on all store write calls.
      expect(req.request.headers.get('Authorization')).toBe('Bearer fake-firebase-token');

      req.flush({ ...baseStoreProfile, id: 'store-001' });
    });

    it('Test case 2: sends no referralCode query param when referralCode is absent on the store profile', () => {
      const storeProfileWithoutReferral: StoreProfile = { ...baseStoreProfile };
      // Ensure the field is not present at all
      delete (storeProfileWithoutReferral as any).referralCode;

      service.createStore(storeProfileWithoutReferral).subscribe();

      const req = httpTestingController.expectOne(`${environment.izingaUrl}/store`);

      expect(req.request.method).toBe('POST');
      expect(req.request.params.has('referralCode')).toBeFalse();
      expect(req.request.body['referralCode']).toBeUndefined();
      // ADR-018: Bearer token must be present on all store write calls.
      expect(req.request.headers.get('Authorization')).toBe('Bearer fake-firebase-token');

      req.flush({ ...baseStoreProfile, id: 'store-001' });
    });

    it('Test case 3: attaches Authorization Bearer header derived from Firebase token', () => {
      service.createStore(baseStoreProfile).subscribe();

      const req = httpTestingController.expectOne(`${environment.izingaUrl}/store`);

      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Authorization')).toBe('Bearer fake-firebase-token');

      req.flush({ ...baseStoreProfile });
    });

    // AC-3 (ADR-018 QA): getFirebaseIdToken() failure must propagate to the caller — no silent swallow.
    it('Test case 4: propagates getFirebaseIdToken() error to the caller without making an HTTP request', (done) => {
      spyOn(firebaseServiceStub, 'getFirebaseIdToken').and.returnValue(throwError(() => new Error('auth/no-user')));

      service.createStore(baseStoreProfile).subscribe({
        next: () => fail('expected an error, not a success response'),
        error: (err: Error) => {
          expect(err.message).toBe('auth/no-user');
          done();
        }
      });
    });
  });

  // ADR-018: updateStore() now requires Firebase JWT — full coverage below.
  describe('updateStore()', () => {
    const storeProfile: StoreProfile = {
      id: 'store-002',
      name: 'Updated Store',
      phone: '0831234567',
      description: 'Updated description',
      address: '2 Main Road',
      type: 'RETAIL',
      active: true,
      categories: [],
      stock: [],
      businessHours: [],
      image: '',
      deliveryCost: 0,
      lat: 0,
      lng: 0,
      tags: [],
      minimumDeposit: 0,
      maximumDeliveryDistance: 0,
      availabilityStatus: 'AVAILABLE'
    } as unknown as StoreProfile;

    it('Test case 1: sends PATCH to /store/{id} with Authorization Bearer header', () => {
      service.updateStore(storeProfile).subscribe();

      const req = httpTestingController.expectOne(`${environment.izingaUrl}/store/${storeProfile.id}`);

      expect(req.request.method).toBe('PATCH');
      expect(req.request.headers.get('Authorization')).toBe('Bearer fake-firebase-token');

      req.flush({ ...storeProfile });
    });

    it('Test case 2: sends the full store profile as the PATCH request body', () => {
      service.updateStore(storeProfile).subscribe();

      const req = httpTestingController.expectOne(`${environment.izingaUrl}/store/${storeProfile.id}`);

      expect(req.request.body).toEqual(storeProfile);

      req.flush({ ...storeProfile });
    });

    it('Test case 3: targets the correct store id in the URL', () => {
      const differentStore = { ...storeProfile, id: 'store-999' };

      service.updateStore(differentStore as StoreProfile).subscribe();

      const req = httpTestingController.expectOne(`${environment.izingaUrl}/store/store-999`);

      expect(req.request.method).toBe('PATCH');

      req.flush({ ...differentStore });
    });

    // AC-3 (ADR-018 QA): getFirebaseIdToken() failure must propagate to the caller — no silent swallow.
    it('Test case 4: propagates getFirebaseIdToken() error to the caller without making an HTTP request', (done) => {
      spyOn(firebaseServiceStub, 'getFirebaseIdToken').and.returnValue(throwError(() => new Error('auth/no-user')));

      service.updateStore(storeProfile).subscribe({
        next: () => fail('expected an error, not a success response'),
        error: (err: Error) => {
          expect(err.message).toBe('auth/no-user');
          done();
        }
      });
    });
  });
});
