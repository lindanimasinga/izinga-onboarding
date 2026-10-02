import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { TierSelectedGuard } from './tier-selected.guard';
import { StorageService } from '../service/storage-service.service';

/** Minimal StorageService stub. */
function makeStorageStub(overrides: Partial<StorageService> = {}): StorageService {
  return {
    selectedTier: null,
    userProfile: undefined,
    ...overrides
  } as unknown as StorageService;
}

describe('TierSelectedGuard', () => {
  let guard: TierSelectedGuard;
  let router: Router;

  function buildGuard(stub: StorageService): TierSelectedGuard {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [
        TierSelectedGuard,
        { provide: StorageService, useValue: stub }
      ]
    });
    guard = TestBed.inject(TierSelectedGuard);
    router = TestBed.inject(Router);
    return guard;
  }

  function fakeRoute(id: string) {
    return { paramMap: { get: (_k: string) => id } } as any;
  }

  it('should allow through when a tier has been selected', () => {
    const stub = makeStorageStub({ selectedTier: 'FREE' } as any);
    buildGuard(stub);
    const result = guard.canActivate(fakeRoute('user-123'), {} as any);
    expect(result).toBe(true);
  });

  it('should allow through when the user has an existing storeId (edit path)', () => {
    const stub = makeStorageStub({
      selectedTier: null,
      userProfile: { storeId: 'store-abc' } as any
    } as any);
    buildGuard(stub);
    const result = guard.canActivate(fakeRoute('store-abc'), {} as any);
    expect(result).toBe(true);
  });

  it('should redirect to tier-select when no tier selected and no existing store', () => {
    const stub = makeStorageStub({
      selectedTier: null,
      userProfile: { id: 'user-123', storeId: null } as any
    } as any);
    buildGuard(stub);
    const result = guard.canActivate(fakeRoute('user-123'), {} as any);
    expect(result).not.toBe(true);
    const tree = result as import('@angular/router').UrlTree;
    expect(tree.toString()).toContain('/business/tier-select/user-123');
  });

  it('should redirect to tier-select when userProfile is undefined and no tier', () => {
    const stub = makeStorageStub({ selectedTier: null, userProfile: undefined } as any);
    buildGuard(stub);
    const result = guard.canActivate(fakeRoute(''), {} as any);
    expect(result).not.toBe(true);
  });

  it('should allow through when PREMIUM_1 is stored', () => {
    const stub = makeStorageStub({ selectedTier: 'PREMIUM_1' } as any);
    buildGuard(stub);
    const result = guard.canActivate(fakeRoute('user-999'), {} as any);
    expect(result).toBe(true);
  });

  it('should allow through when PREMIUM_2 is stored', () => {
    const stub = makeStorageStub({ selectedTier: 'PREMIUM_2' } as any);
    buildGuard(stub);
    const result = guard.canActivate(fakeRoute('user-999'), {} as any);
    expect(result).toBe(true);
  });
});
