import { Injectable } from '@angular/core';
import { StoreProfile } from '../model/storeProfile';
import { UserProfile } from '../model/userProfile';
import { Device } from '../model/device';
import { StoreSummary } from '../model/store-summary';
import { Payout } from '../payout/payout.component';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  USER_PROFILE_KEY = "sdfwefdsfsd";
  PHONE_KEY = "alsfnadfwefsdfn"
  STORE_TO_PAY = "nvcaseuhfdkfs"
  PAYOUT = "we434dfsdfsdf"
  AMBASSADOR_REF_KEY = "ambassadorRef"
  REFERRAL_PARTNER_REF_KEY = "referralPartnerRef"
  RETURN_URL_KEY = "returnUrl"
  /**
   * T-10 (ONB-02): Subscription tier selected during the store sign-up flow.
   * Stored in sessionStorage so it survives Angular router navigation within the
   * tab but clears when the tab is closed. Loss on page refresh is acceptable per
   * the feature brief — the user restarts from tier-select.
   * Valid values: 'FREE' | 'PREMIUM_1' | 'PREMIUM_2'
   */
  SELECTED_TIER_KEY = "onb02SelectedTier"
  /**
   * ONB-02 analytics: set to true when the merchant has seen the tier preview
   * section on the /business landing page. Read at TierSelectionComponent
   * (tier_select_reached event) and at the Get Started click to measure whether
   * showing pricing upfront affects conversion. Cleared when the tab closes
   * (sessionStorage).
   */
  SAW_PRICING_KEY = "onb02SawPricing"
  shop?: StoreProfile;
  cache: Storage = window.localStorage
  sessionCache: Storage = window.sessionStorage
  _userProfile?: UserProfile
  _phoneNumber?: string | undefined
  errorMessage: string | undefined;
  infoMessage: string | undefined;
  DEVICE_KEY = "skjda287nndfsd";
  USER_TYPE_KEY = "kjsdfkjsdf_user_type";
  _payouts: Payout[] | undefined;
  _shopToPayout: StoreSummary| undefined;
  _userType?: string;

  constructor(private router: Router) { }

  get payouts():  Payout[] | undefined {
    var data = this.cache.getItem(this.PAYOUT)
    return data != null ? JSON.parse(data) : []
  }

  set payouts(payouts: Payout[] | undefined) {
    if(payouts == undefined) {
      payouts = []
    }
    this.cache.setItem(this.PAYOUT, JSON.stringify(payouts))
  }

  get shopToPayout():  StoreSummary | undefined {
    return JSON.parse(this.cache.getItem(this.STORE_TO_PAY)!)
  }

  set shopToPayout(shopToPayout: StoreSummary | undefined) {
    this.cache.setItem(this.STORE_TO_PAY, JSON.stringify(shopToPayout))
  }

  logout() {
    this.cache.clear()
    this.userProfile = undefined
    this.phoneNumber = undefined
    this.router.navigate([''])
  }

  /**
   * The Firebase Auth session (IndexedDB-backed, its own refresh-token lifecycle) can be lost
   * independently of this app's own "logged in" flag (phoneNumber, plain localStorage, no expiry,
   * only ever set once at login). When that happens, PhoneVerifiedGuard still lets the user
   * through — they can browse and fill in forms — but any call requiring a Firebase ID token
   * (store save, stock save, etc.) fails with "No authenticated Firebase user".
   *
   * Clear the stale phoneNumber flag so PhoneVerifiedGuard requires a fresh OTP, remember where
   * the user was so PhoneVerificationComponent's existing onVerified() sends them straight back,
   * and redirect to the same /{role}/verify route the guard itself uses.
   *
   * NOTE: the role-prefix computation below is intentionally kept in sync with
   * PhoneVerifiedGuard.canActivate() (phone-verified.guard.ts) by hand — the guard returns a
   * UrlTree built from its own ActivatedRouteSnapshot rather than a reusable string, so there's
   * no shared helper. If the guard's default role or route shape ever changes, update both.
   * Unlike the guard, this path skips queryParamsHandling: 'preserve' — the session-expired case
   * is a mid-session interruption, not a deep-link arrival, and returnUrl already captures the
   * full originating path including any query params.
   */
  sessionExpired(currentUrl: string): void {
    this.phoneNumber = undefined;
    this.returnUrl = currentUrl;
    const urlSegments = currentUrl.split('/').filter(s => s.length > 0);
    const rolePrefix = urlSegments[0] ?? 'indivisuals';
    this.router.navigate([`/${rolePrefix}/verify`]);
  }

  get phoneNumber():  string | undefined {
    if (this._phoneNumber == null) {
      const raw = this.cache.getItem(this.PHONE_KEY);
      if (raw && raw !== 'undefined' && raw !== 'null') {
        this._phoneNumber = JSON.parse(raw);
      }
    }
    return this._phoneNumber;
  }

  set phoneNumber(phoneNumber: string | undefined) {
    this._phoneNumber = phoneNumber;
    if (phoneNumber === undefined || phoneNumber === null) {
      this.cache.removeItem(this.PHONE_KEY);
    } else {
      this.cache.setItem(this.PHONE_KEY, JSON.stringify(phoneNumber));
    }
  }

  get device():  Device | undefined {
    return JSON.parse(this.cache.getItem(this.DEVICE_KEY)!)
  }

  set device(device: Device | undefined) {
    this.cache.setItem(this.DEVICE_KEY, JSON.stringify(device))
  }

  get userProfile():  UserProfile | undefined {
    if (!this._userProfile) {
      const raw = this.cache.getItem(this.USER_PROFILE_KEY);
      if (raw && raw !== 'undefined' && raw !== 'null') {
        this._userProfile = JSON.parse(raw);
      }
    }
    return this._userProfile;
  }

  set userProfile(userProfile: UserProfile | undefined) {
    this._userProfile = userProfile;
    if (userProfile === undefined || userProfile === null) {
      this.cache.removeItem(this.USER_PROFILE_KEY);
    } else {
      this.cache.setItem(this.USER_PROFILE_KEY, JSON.stringify(userProfile));
    }
  }

  get ambassadorRef(): string | null {
    return this.sessionCache.getItem(this.AMBASSADOR_REF_KEY);
  }

  set ambassadorRef(ref: string | null) {
    if (ref) {
      this.sessionCache.setItem(this.AMBASSADOR_REF_KEY, ref);
    } else {
      this.sessionCache.removeItem(this.AMBASSADOR_REF_KEY);
    }
  }

  /**
   * RP-005b: Referral Partner code captured from ?ref= query param on the business
   * registration entry point. Persisted in sessionStorage so it survives navigation
   * through the phone-verify → dashboard → store-create flow without surviving
   * a full browser restart (intentional — stale referral attribution should not persist).
   */
  get referralPartnerRef(): string | null {
    return this.sessionCache.getItem(this.REFERRAL_PARTNER_REF_KEY);
  }

  set referralPartnerRef(ref: string | null) {
    if (ref) {
      this.sessionCache.setItem(this.REFERRAL_PARTNER_REF_KEY, ref);
    } else {
      this.sessionCache.removeItem(this.REFERRAL_PARTNER_REF_KEY);
    }
  }

  get returnUrl(): string | null {
    return this.sessionCache.getItem(this.RETURN_URL_KEY);
  }

  set returnUrl(url: string | null) {
    if (url) {
      this.sessionCache.setItem(this.RETURN_URL_KEY, url);
    } else {
      this.sessionCache.removeItem(this.RETURN_URL_KEY);
    }
  }

  /**
   * T-10 (ONB-02): Subscription tier chosen at the tier selection step.
   * Cleared automatically when the tab closes (sessionStorage).
   * Null if the user has not yet passed through tier-select in this session.
   */
  get selectedTier(): string | null {
    return this.sessionCache.getItem(this.SELECTED_TIER_KEY);
  }

  set selectedTier(tier: string | null) {
    if (tier) {
      this.sessionCache.setItem(this.SELECTED_TIER_KEY, tier);
    } else {
      this.sessionCache.removeItem(this.SELECTED_TIER_KEY);
    }
  }

  get sawPricing(): boolean {
    return this.sessionCache.getItem(this.SAW_PRICING_KEY) === 'true';
  }

  set sawPricing(saw: boolean) {
    if (saw) {
      this.sessionCache.setItem(this.SAW_PRICING_KEY, 'true');
    } else {
      this.sessionCache.removeItem(this.SAW_PRICING_KEY);
    }
  }

  get userType(): string | undefined {
    if (!this._userType && this.cache.getItem(this.USER_TYPE_KEY)) {
      this._userType = JSON.parse(this.cache.getItem(this.USER_TYPE_KEY)!);
    }
    return this._userType;
  }

  set userType(userType: string | undefined) {
    this._userType = userType;
    this.cache.setItem(this.USER_TYPE_KEY, JSON.stringify(this._userType));
  }

}
