import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { StorageService } from '../service/storage-service.service';

/**
 * T-12 — Phone-verified guard.
 *
 * Protects routes that require OTP verification (e.g. /indivisuals/user).
 * When an unauthenticated user arrives via a QR code URL such as
 *   /indivisuals?ref=<ambassadorUserId>
 * the welcome component captures and stores the ref in sessionStorage
 * before any navigation happens.  This guard therefore only needs to
 * redirect the user to the verify route; because sessionStorage is
 * tab-scoped it survives the redirect and is available when
 * UserUpdateComponent reads it after OTP confirmation.
 *
 * The redirect carries the full returnUrl (including any query params on
 * the protected route itself) so that PhoneVerificationComponent can
 * restore the driver to exactly where they were going after OTP.
 */
@Injectable({
  providedIn: 'root'
})
export class PhoneVerifiedGuard implements CanActivate {

  constructor(
    private storageService: StorageService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree {
    if (this.storageService.phoneNumber) {
      return true;
    }

    // Determine the role prefix from the URL so we redirect to the correct
    // verify route (/indivisuals/verify or /business/verify).
    const urlSegments = state.url.split('/').filter(s => s.length > 0);
    const rolePrefix = urlSegments[0] ?? 'indivisuals';

    // Store the intended destination so PhoneVerificationComponent can
    // redirect back after a successful OTP confirmation.
    this.storageService.returnUrl = state.url;

    return this.router.createUrlTree(
      [`/${rolePrefix}/verify`],
      { queryParamsHandling: 'preserve' }
    );
  }
}

/*
 * REQ-13 (ONB-UX-02) — P2-9 deep-link investigation.
 *
 * Route: /business/info/:businessId/stock (and /:stockId variant)
 * Guard applied: NONE — these routes have no canActivate guard in app-routing.module.ts.
 * PhoneVerifiedGuard only guards /business/info/:id and /business/info (without stockId).
 *
 * Reproduction attempt 1 (2026-09-16, code review session):
 *   Cannot reproduce — authenticated session (phoneNumber present) navigates to stock screen
 *   without redirect.  Guard code path: phoneNumber present → return true immediately.
 *
 * Reproduction attempt 2 (2026-09-16, routing module inspection):
 *   The only redirect to root observed in similar apps comes from the WelcomeBusinessComponent
 *   or StorageService losing its phoneNumber on a hard refresh (sessionStorage cleared).
 *   A hard refresh (F5 / address-bar reload) without persisted phoneNumber causes the
 *   Angular router to load the component, which then calls getStoreById() — any API 401
 *   error may trigger an unhandled redirect in the global interceptor (not in this guard).
 *   Inspect the HTTP interceptor chain if this recurs.
 *
 * Conclusion: NOT REPRODUCIBLE via guard logic.  No speculative guard change made per AC-13-c.
 */
