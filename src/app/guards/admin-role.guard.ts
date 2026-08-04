/**
 * AdminRoleGuard — #65.
 *
 * Protects all /admin/recon/* routes. Reads the current user's profile from
 * StorageService (populated after Firebase auth during normal login/session
 * flow — the same source used by DashboardComponent). Redirects to the
 * root if the user is not ADMIN.
 *
 * Does not re-fetch the profile from the backend — StorageService already
 * holds it after login, consistent with how isAdmin is checked in
 * DashboardComponent.
 */

import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { StorageService } from '../service/storage-service.service';
import { UserProfile } from '../model/userProfile';

@Injectable({
  providedIn: 'root'
})
export class AdminRoleGuard implements CanActivate {

  constructor(
    private storageService: StorageService,
    private router: Router
  ) {}

  canActivate(): boolean | UrlTree {
    const profile = this.storageService.userProfile;
    if (profile && profile.role === UserProfile.RoleEnum.ADMIN) {
      return true;
    }
    return this.router.createUrlTree(['/']);
  }
}
