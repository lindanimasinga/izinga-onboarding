import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { IzingaOrderManagementService } from './izinga-order-management.service';
import { FirebaseService } from './firebase.service';
import { StoreProfile } from '../model/storeProfile';
import { environment } from 'src/environments/environment';

describe('IzingaOrderManagementService', () => {
  let service: IzingaOrderManagementService;
  let httpTestingController: HttpTestingController;

  const firebaseServiceStub = {};

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

      req.flush({ ...baseStoreProfile, id: 'store-001' });
    });
  });
});
