import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { StorageService } from './storage-service.service';

describe('StorageService', () => {
  let service: StorageService;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        StorageService,
        { provide: Router, useValue: router }
      ]
    });
    service = TestBed.inject(StorageService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('sessionExpired()', () => {
    it('clears the stale phoneNumber flag so PhoneVerifiedGuard requires fresh OTP', () => {
      service.phoneNumber = '0821234567';

      service.sessionExpired('/business/info/store-1');

      expect(service.phoneNumber).toBeUndefined();
    });

    it('stores the current url as returnUrl so onVerified() can send the user back', () => {
      service.sessionExpired('/business/info/store-1');

      expect(service.returnUrl).toBe('/business/info/store-1');
    });

    it('navigates to /business/verify for a business-prefixed url', () => {
      service.sessionExpired('/business/info/store-1');

      expect(router.navigate).toHaveBeenCalledWith(['/business/verify']);
    });

    it('navigates to /indivisuals/verify for an indivisuals-prefixed url', () => {
      service.sessionExpired('/indivisuals/user');

      expect(router.navigate).toHaveBeenCalledWith(['/indivisuals/verify']);
    });

    it('defaults to /indivisuals/verify when the url has no leading segment', () => {
      service.sessionExpired('/');

      expect(router.navigate).toHaveBeenCalledWith(['/indivisuals/verify']);
    });
  });
});
