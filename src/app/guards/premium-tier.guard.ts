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
 * TIER-BILLING-01 (T-10) — PremiumTierGuard.
 *
 * Protects /business/subscription/:storeId.
 *
 * Allowed through: merchants whose session state has `selectedTier` set to
 * PREMIUM_1 or PREMIUM_2 (i.e. they arrived via the normal onboarding flow after
 * completing store creation).
 *
 * Redirected to /business/dashboard:
 * - Merchants whose selectedTier is FREE or null (no subscription required).
 * - Merchants who navigate directly to the route without completing the
 *   onboarding flow in this session.
 *
 * This guard does NOT make an API call — it reads only the in-session tier state
 * written by TierSelectionComponent (ONB-02).  The backend's HTTP 409 response
 * handles the "subscription already ACTIVE" case inside SubscriptionCheckoutComponent.
 */
@Injectable({
  providedIn: 'root'
})
export class PremiumTierGuard implements CanActivate {

  constructor(
    private storageService: StorageService,
    private router: Router
  ) {}

  canActivate(
    _route: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot
  ): boolean | UrlTree {
    const tier = this.storageService.selectedTier;
    if (tier === 'PREMIUM_1' || tier === 'PREMIUM_2') {
      return true;
    }
    // FREE tier or no tier in session — no subscription required; redirect to dashboard.
    return this.router.createUrlTree(['/business/dashboard']);
  }
}
