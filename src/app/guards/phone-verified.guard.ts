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
