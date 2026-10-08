import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
  UrlTree
} from '@angular/router';
import { StorageService } from '../service/storage-service.service';

/**
 * T-10 (ONB-02) — Tier-selected guard.
 *
 * Protects /business/info/:id during the new-store sign-up flow.
 * If the user arrives without having passed through /business/tier-select/:id
 * in the current browser session they are redirected back to tier selection.
 *
 * Existing store owners (those with a storeId already on their UserProfile)
 * are allowed through unconditionally — they are on the edit path, not the
 * sign-up flow, and do not need to re-select a tier.
 *
 * Loss of the tier on page refresh is acceptable per the feature brief
 * (ONB-02 T-10) — the user restarts from tier-select.
 */
@Injectable({
  providedIn: 'root'
})
export class TierSelectedGuard implements CanActivate {

  constructor(
    private storageService: StorageService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot
  ): boolean | UrlTree {

    // Existing store owners editing their store — always let through.
    const userProfile = this.storageService.userProfile;
    if (userProfile?.storeId) {
      return true;
    }

    // New sign-up flow — require tier selection in this session.
    if (this.storageService.selectedTier) {
      return true;
    }

    // Redirect to tier selection, preserving the :id param so the route
    // resolves correctly after the user completes tier selection.
    const id = route.paramMap.get('id') || userProfile?.id || '';
    return this.router.createUrlTree(['/business/tier-select', id]);
  }
}
