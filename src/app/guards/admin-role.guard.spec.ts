import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

import { AdminRoleGuard } from './admin-role.guard';
import { StorageService } from '../service/storage-service.service';
import { UserProfile } from '../model/userProfile';

describe('AdminRoleGuard', () => {
  let guard: AdminRoleGuard;
  let router: Router;
  let storageServiceStub: Partial<StorageService>;

  beforeEach(() => {
    storageServiceStub = {
      userProfile: undefined
    };

    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [
        AdminRoleGuard,
        { provide: StorageService, useValue: storageServiceStub }
      ]
    });

    guard = TestBed.inject(AdminRoleGuard);
    router = TestBed.inject(Router);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('returns true when the stored profile has role ADMIN', () => {
    storageServiceStub.userProfile = { role: UserProfile.RoleEnum.ADMIN } as UserProfile;
    const result = guard.canActivate();
    expect(result).toBeTrue();
  });

  it('returns a UrlTree redirect to "/" for a MESSENGER role', () => {
    storageServiceStub.userProfile = { role: UserProfile.RoleEnum.MESSENGER } as UserProfile;
    const result = guard.canActivate();
    expect(result instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(result as UrlTree)).toBe('/');
  });

  it('returns a UrlTree redirect to "/" for a STORE role', () => {
    storageServiceStub.userProfile = { role: UserProfile.RoleEnum.STORE } as UserProfile;
    const result = guard.canActivate();
    expect(result instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(result as UrlTree)).toBe('/');
  });

  it('returns a UrlTree redirect to "/" when no profile is present in StorageService', () => {
    storageServiceStub.userProfile = undefined;
    const result = guard.canActivate();
    expect(result instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(result as UrlTree)).toBe('/');
  });
});
