import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { ReconPayoutService } from './recon-payout.service';
import { FirebaseService } from './firebase.service';
import { environment } from 'src/environments/environment';

describe('ReconPayoutService', () => {
  let service: ReconPayoutService;
  let httpTestingController: HttpTestingController;

  const FAKE_TOKEN = 'test-firebase-id-token';

  const firebaseServiceStub: Partial<FirebaseService> = {
    getFirebaseIdToken: jasmine.createSpy('getFirebaseIdToken').and.returnValue(of(FAKE_TOKEN))
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ReconPayoutService,
        { provide: FirebaseService, useValue: firebaseServiceStub }
      ]
    });

    service = TestBed.inject(ReconPayoutService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Authorization header construction', () => {
    it('attaches Bearer token on getShopPayoutBundle()', () => {
      service.getShopPayoutBundle().subscribe();

      const req = httpTestingController.expectOne(
        `${environment.izingaUrl}/recon/shopPayoutBundle`
      );
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${FAKE_TOKEN}`);
      req.flush({});
    });

    it('attaches Bearer token on getMessengerPayoutBundle()', () => {
      service.getMessengerPayoutBundle().subscribe();

      const req = httpTestingController.expectOne(
        `${environment.izingaUrl}/recon/messengerPayoutBundle`
      );
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${FAKE_TOKEN}`);
      req.flush({});
    });

    it('attaches Bearer token on getPayoutBundles()', () => {
      const from = new Date('2024-01-01T00:00:00.000Z');
      const to = new Date('2024-02-01T00:00:00.000Z');

      service.getPayoutBundles('SHOP', from, to).subscribe();

      const req = httpTestingController.expectOne(r =>
        r.url === `${environment.izingaUrl}/recon/payoutBundle`
      );
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${FAKE_TOKEN}`);
      req.flush([]);
    });

    it('attaches Bearer token on patchShopPayoutBundle()', () => {
      const results = { bundleId: 'b1', payoutItemResults: [] };
      service.patchShopPayoutBundle(results).subscribe();

      const req = httpTestingController.expectOne(
        `${environment.izingaUrl}/recon/shopPayoutBundle`
      );
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${FAKE_TOKEN}`);
      req.flush(null);
    });
  });

  describe('getFirebaseIdToken delegation', () => {
    it('calls FirebaseService.getFirebaseIdToken() for each request', () => {
      (firebaseServiceStub.getFirebaseIdToken as jasmine.Spy).calls.reset();

      service.getShopPayoutBundle().subscribe();
      httpTestingController.expectOne(
        `${environment.izingaUrl}/recon/shopPayoutBundle`
      ).flush({});

      service.getMessengerPayoutBundle().subscribe();
      httpTestingController.expectOne(
        `${environment.izingaUrl}/recon/messengerPayoutBundle`
      ).flush({});

      expect(firebaseServiceStub.getFirebaseIdToken).toHaveBeenCalledTimes(2);
    });
  });
});
