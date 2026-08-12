import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

import { PhoneVerifiedGuard } from './phone-verified.guard';
import { StorageService } from '../service/storage-service.service';

/**
 * ADR-018 (QA gate AC-4): PhoneVerifiedGuard unit tests.
 *
 * PVG-01  phoneNumber present: canActivate returns true (allow through).
 * PVG-02  no phoneNumber, /business/info URL: redirects to /business/verify.
 * PVG-03  no phoneNumber, /business/info/:id URL: redirects to /business/verify.
 * PVG-04  no phoneNumber, /indivisuals/user URL: redirects to /indivisuals/verify.
 * PVG-05  no phoneNumber: sets storageService.returnUrl to the protected URL before redirecting.
 */
describe('PhoneVerifiedGuard', () => {
  let guard: PhoneVerifiedGuard;
  let router: Router;
  let storageServiceStub: Partial<StorageService>;

  const makeState = (url: string): RouterStateSnapshot =>
    ({ url } as RouterStateSnapshot);

  const makeRoute = (): ActivatedRouteSnapshot =>
    ({} as ActivatedRouteSnapshot);

  beforeEach(() => {
    storageServiceStub = {
      phoneNumber: undefined,
      returnUrl: null
    };

    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [
        PhoneVerifiedGuard,
        { provide: StorageService, useValue: storageServiceStub }
      ]
    });

    guard = TestBed.inject(PhoneVerifiedGuard);
    router = TestBed.inject(Router);
  });

  // PVG-01
  it('PVG-01: returns true when phoneNumber is present in storage', () => {
    storageServiceStub.phoneNumber = '+27821234567';
    const result = guard.canActivate(makeRoute(), makeState('/business/info'));
    expect(result).toBeTrue();
  });

  // PVG-02
  it('PVG-02: redirects to /business/verify when accessing /business/info without phoneNumber', () => {
    storageServiceStub.phoneNumber = undefined;
    const result = guard.canActivate(makeRoute(), makeState('/business/info'));
    expect(result instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(result as UrlTree)).toBe('/business/verify');
  });

  // PVG-03
  it('PVG-03: redirects to /business/verify when accessing /business/info/:id without phoneNumber', () => {
    storageServiceStub.phoneNumber = undefined;
    const result = guard.canActivate(makeRoute(), makeState('/business/info/shop-abc'));
    expect(result instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(result as UrlTree)).toBe('/business/verify');
  });

  // PVG-04
  it('PVG-04: redirects to /indivisuals/verify when accessing /indivisuals/user without phoneNumber', () => {
    storageServiceStub.phoneNumber = undefined;
    const result = guard.canActivate(makeRoute(), makeState('/indivisuals/user'));
    expect(result instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(result as UrlTree)).toBe('/indivisuals/verify');
  });

  // PVG-05
  it('PVG-05: sets returnUrl on StorageService to the intended URL before redirecting', () => {
    storageServiceStub.phoneNumber = undefined;
    guard.canActivate(makeRoute(), makeState('/business/info'));
    expect(storageServiceStub.returnUrl).toBe('/business/info');
  });
});
