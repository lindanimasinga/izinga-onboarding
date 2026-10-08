import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { PremiumTierGuard } from './premium-tier.guard';
import { StorageService } from '../service/storage-service.service';

/** Minimal StorageService stub. */
function makeStorageStub(selectedTier: string | null): StorageService {
  return { selectedTier } as unknown as StorageService;
}

describe('PremiumTierGuard', () => {
  let guard: PremiumTierGuard;
  let router: Router;

  function buildGuard(stub: StorageService): PremiumTierGuard {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [
        PremiumTierGuard,
        { provide: StorageService, useValue: stub }
      ]
    });
    guard = TestBed.inject(PremiumTierGuard);
    router = TestBed.inject(Router);
    return guard;
  }

  const fakeRoute = {} as any;
  const fakeState = {} as any;

  it('should allow through when selectedTier is PREMIUM_1', () => {
    buildGuard(makeStorageStub('PREMIUM_1'));
    expect(guard.canActivate(fakeRoute, fakeState)).toBe(true);
  });

  it('should allow through when selectedTier is PREMIUM_2', () => {
    buildGuard(makeStorageStub('PREMIUM_2'));
    expect(guard.canActivate(fakeRoute, fakeState)).toBe(true);
  });

  it('should redirect to /business/dashboard when selectedTier is FREE', () => {
    buildGuard(makeStorageStub('FREE'));
    const result = guard.canActivate(fakeRoute, fakeState);
    expect(result).not.toBe(true);
    const tree = result as import('@angular/router').UrlTree;
    expect(tree.toString()).toContain('/business/dashboard');
  });

  it('should redirect to /business/dashboard when selectedTier is null', () => {
    buildGuard(makeStorageStub(null));
    const result = guard.canActivate(fakeRoute, fakeState);
    expect(result).not.toBe(true);
    const tree = result as import('@angular/router').UrlTree;
    expect(tree.toString()).toContain('/business/dashboard');
  });

  it('should redirect to /business/dashboard when selectedTier is undefined (treated as null)', () => {
    buildGuard({ selectedTier: undefined } as unknown as StorageService);
    const result = guard.canActivate(fakeRoute, fakeState);
    expect(result).not.toBe(true);
    const tree = result as import('@angular/router').UrlTree;
    expect(tree.toString()).toContain('/business/dashboard');
  });
});
