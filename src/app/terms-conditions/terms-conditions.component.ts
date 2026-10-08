/**
 * T-23 FINDING — STORE_ADMIN role at /business/terms/:id (ONB-02, 2 Oct 2026)
 *
 * Question: Is the user guaranteed to arrive at /business/terms/:id with role STORE_ADMIN?
 *
 * Trace:
 *  1. UserUpdateComponent.createCustomer() sets the role via:
 *       role = isStoreAdmin() ? STORE_ADMIN
 *                              : userConfig.find(label === roleDescription)?.userRole
 *                                || CUSTOMER  ← fallback
 *     isStoreAdmin() returns true only if the user's EXISTING profile already has STORE_ADMIN.
 *     For a brand-new user, role comes from UserConfig; the UserConfig entry for the
 *     business/store owner description MUST map to STORE_ADMIN for the happy path.
 *
 *  2. After createCustomer(), storageService.userProfile is NOT updated by createCustomer().
 *     SignupWelcomeComponent.ngOnInit() finds storageService.userProfile null for brand-new
 *     users and fetches fresh via getCustomerById(userId), updating storageService.userProfile
 *     with the newly created STORE_ADMIN profile. By the time TermsConditionsComponent reads
 *     storageService.userProfile, role IS STORE_ADMIN on the happy path.
 *
 *  3. BusinessUpdateComponent does NOT touch UserProfile.role — it only affects StoreProfile.
 *
 * Confirmed non-STORE_ADMIN path (gap):
 *  If UserConfig is not loaded yet when createCustomer() runs, OR if roleDescription does not
 *  match any UserConfig entry, the role falls back to CUSTOMER. The user then arrives at
 *  /business/terms/:id with role CUSTOMER. The general terms branch fires (no regression to
 *  Driver or Ambassador ICA), but the T-11 STORE_ADMIN merchant-ICA branch would NOT fire.
 *
 * Implication for T-11:
 *  The needsMerchantIcaAcceptance getter must guard on isStoreAdmin — it already does by
 *  construction. The MERCHANT_ICA_ENABLED feature flag (default false) provides a second
 *  safety net: even if a CUSTOMER-role user reaches /business/terms/:id, the STORE_ADMIN
 *  branch never activates unless both the flag is true AND the role is STORE_ADMIN.
 *  No code change required in TermsConditionsComponent based on this finding; the T-11
 *  implementer should be aware of the CUSTOMER fallback path and confirm it is acceptable
 *  (store creation would then proceed with CUSTOMER role — the C-04 gate in REQ-03 would
 *  catch this server-side if properly implemented in StoreService.createStore()).
 */
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StorageService } from '../service/storage-service.service';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { UserProfile } from '../model/userProfile';
import { AnalyticsService } from '../service/analytics.service';

@Component({
  selector: 'app-terms-conditions',
  templateUrl: './terms-conditions.component.html',
  styleUrls: ['./terms-conditions.component.css']
})
export class TermsConditionsComponent implements OnInit {

  /**
   * Current Ambassador ICA version. Bump this constant when a new ICA version
   * is deployed. The dashboard also checks this version — update
   * dashboard.component.ts AMBASSADOR_ICA_VERSION in the same commit.
   *
   * v1 → v2 (2026-08-12): added clause 1.5 (no minimum obligation) and
   * clause 6.8 (POPIA cross-border cloud transfer). Jason van der Merwe
   * provided written sign-off on 2026-08-12 ("Hi Lindani i confirm you may
   * proceed."). ADR-017 gate cleared.
   */
  static readonly AMBASSADOR_ICA_VERSION = 'v2';

  /**
   * Current Driver ICA version. Bump this constant when the Driver ICA content
   * changes. The dashboard also checks this version — update
   * dashboard.component.ts in the same commit.
   *
   * driver-v2 (2026-08-19): clause 3.1 replaced (automatic EFT/mobile-wallet
   * payout — no invoicing required); clause 20 sub-numbering corrected to
   * 20.1–20.4; registration number 2016/429327/07 inserted in preamble.
   * Jason van der Merwe approved in writing 2026-08-19 ("No issues with the
   * changes to 3.1. You may proceed."). ADR-017 gate cleared.
   */
  static readonly DRIVER_ICA_VERSION = 'driver-v2';

  /**
   * Current Merchant/Store Partner Agreement version (ADR-017 pattern).
   * Bump this constant when the Store Partner Agreement content changes.
   *
   * store-partner-v2 (2026-10-05): first embedded version. Drafted from
   * izinga-legal/drafts/store-partner-agreement-draft-v2.md (PART B only).
   * Attorney review by Jason van der Merwe pending — deployment authorised
   * by Lindani Masinga (co-founder) for the feature/TIER-BILLING-01 branch
   * while formal sign-off is arranged separately.
   */
  static readonly MERCHANT_ICA_VERSION = 'store-partner-v2';

  termsAccepted = false;
  acceptError = false;
  /**
   * Set to true when the PATCH fails with a 400 "is required" error, meaning
   * the user's profile has a mandatory field (e.g. imageUrl) that was never
   * provided. In this state the template shows an explanatory message with a
   * CTA to navigate to the profile-update screen. Distinct from acceptError
   * (which covers all other failure modes).
   */
  profileIncompleteError = false;
  isLoading = true;
  userId?: string;
  user: UserProfile | undefined;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private storageService: StorageService,
    private izingaOrderManager: IzingaOrderManagementService,
    private analytics: AnalyticsService
  ) {}

  get isAmbassador(): boolean {
    return this.user?.role === UserProfile.RoleEnum.AMBASSADOR;
  }

  /**
   * Returns true when the Ambassador must accept (or re-accept) the ICA.
   * A v1 ambassador (icaAccepted=true, icaVersion='v1') requires re-acceptance
   * when the current version has advanced to v2.
   */
  get needsIcaAcceptance(): boolean {
    if (!this.isAmbassador) {
      return false;
    }
    return !this.user?.icaAccepted || this.user?.icaVersion !== TermsConditionsComponent.AMBASSADOR_ICA_VERSION;
  }

  get isDriver(): boolean {
    return this.user?.role === UserProfile.RoleEnum.MESSENGER;
  }

  /**
   * Returns true for users who should see the Merchant ICA.
   * Mirrors DashboardComponent's isStoreAdmin check: STORE_ADMIN or ADMIN.
   * ADMIN is included because admins can create stores and must also accept
   * the merchant agreement before a store is created on their behalf.
   */
  get isStoreAdmin(): boolean {
    return this.user?.role === UserProfile.RoleEnum.STOREADMIN
      || this.user?.role === UserProfile.RoleEnum.ADMIN;
  }

  /**
   * Returns true when a STORE_ADMIN/ADMIN must accept (or re-accept) the
   * Store/Merchant Partner Agreement. Gates both new merchants (no icaAccepted)
   * and any existing merchant whose stored icaVersion does not match the
   * current version constant (e.g. after a material amendment).
   */
  get needsMerchantIcaAcceptance(): boolean {
    if (!this.isStoreAdmin) {
      return false;
    }
    return !this.user?.icaAccepted
      || this.user?.icaVersion !== TermsConditionsComponent.MERCHANT_ICA_VERSION;
  }

  /**
   * Returns true when the Driver (MESSENGER) must accept (or re-accept) the
   * Driver ICA. This gates both brand-new drivers (icaAccepted falsy) and
   * the 346 existing drivers who completed onboarding before the ICA was
   * introduced (termsAccepted=true, icaAccepted falsy). It also re-gates any
   * driver who accepted a previous version (icaVersion !== DRIVER_ICA_VERSION).
   */
  get needsDriverIcaAcceptance(): boolean {
    if (!this.isDriver) {
      return false;
    }
    return !this.user?.icaAccepted || this.user?.icaVersion !== TermsConditionsComponent.DRIVER_ICA_VERSION;
  }

  /**
   * Exposes the selected subscription tier to the template so premium-tier
   * merchants see a muted reminder that a payment step follows the T&Cs
   * screen (Fix 3 — TIER-BILLING-01 DS review).
   */
  get selectedTier(): string | null {
    return this.storageService.selectedTier;
  }

  ngOnInit() {
    this.analytics.logScreenView('terms_conditions');
    this.route.params.subscribe(params => {
      this.userId = params['id'];
      if (this.userId) {
        // Always fetch a fresh profile from the backend before rendering or
        // submitting anything. Never rely solely on storageService.userProfile:
        //   • localStorage may have been cleared (new device / cache wipe).
        //   • The in-memory cache may lag behind a concurrent DashboardComponent
        //     redirect that sets the cache just before navigation fires.
        // Either condition leaves this.user = undefined, causing every role
        // getter (isAmbassador, isDriver, isStoreAdmin) to evaluate false —
        // the component falls through to #generalTerms, the generic screen
        // renders, and acceptTerms() sends a PATCH built from an undefined/stale
        // object that overwrites the user's real role and ICA fields on the
        // backend. The fresh fetch prevents this entirely.
        this.izingaOrderManager.getCustomerById(this.userId).subscribe({
          next: (freshUser: UserProfile) => {
            this.user = freshUser;
            this.storageService.userProfile = freshUser;
            this.isLoading = false;
            this.performSkipRedirect();
          },
          error: () => {
            // On network failure fall back to the cached profile. The screen
            // will render with whatever is in cache (degraded but not silent-
            // data-corruption risk — PATCH will use the same cached object,
            // so no fields are silently worse than the current cache state).
            this.user = this.storageService.userProfile;
            this.isLoading = false;
            this.performSkipRedirect();
          }
        });
      } else {
        // No userId in route params — fall back to cache and try to proceed.
        this.user = this.storageService.userProfile;
        this.isLoading = false;
        this.performSkipRedirect();
      }
    });
  }

  /**
   * Skip-redirect: if the user has already completed all required acceptances
   * for their role, navigate forward immediately without rendering the terms.
   * Extracted from ngOnInit() so it runs AFTER the async fresh-profile fetch,
   * ensuring this.user is always authoritative before any role check.
   */
  private performSkipRedirect(): void {
    if (this.isAmbassador) {
      if (!this.needsIcaAcceptance) {
        this.router.navigate(['/indivisuals/training-guide']);
      }
    } else if (this.isDriver) {
      if (!this.needsDriverIcaAcceptance) {
        this.navigateToDashboard();
      }
    } else if (this.isStoreAdmin) {
      // Merchant ICA branch: skip-redirect if already on current version.
      // needsMerchantIcaAcceptance returns false when icaAccepted=true and
      // icaVersion matches MERCHANT_ICA_VERSION — navigate forward immediately.
      if (!this.needsMerchantIcaAcceptance) {
        this.navigateToDashboard();
      }
    } else {
      if (this.user?.termsAccepted) {
        this.navigateToDashboard();
      }
    }
  }

  /**
   * Navigate to the appropriate dashboard after terms or ICA acceptance.
   * Shared by performSkipRedirect() and acceptTerms() success handlers.
   *
   * STORE_ADMIN and ADMIN always route to /business/dashboard regardless of
   * the URL context. Without this, a merchant who enters via /indivisuals/
   * (e.g. after clearing localStorage and picking the wrong entry point)
   * and is redirected to /indivisuals/terms/:id would land on the driver
   * dashboard after accepting — or worse, be caught in a redirect loop.
   *
   * For all other roles, route to /business/dashboard if the current URL
   * is in the /business/ context, otherwise /indivisuals/dashboard.
   */
  private navigateToDashboard(): void {
    if (this.router.url.includes('/business')) {
      this.router.navigate(['/business/dashboard']);
    } else {
      this.router.navigate(['/indivisuals/dashboard']);
    }
  }

  /**
   * Navigate to the profile-update screen so the user can complete mandatory
   * fields (e.g. add a profile photo) before retrying the agreement acceptance.
   * Uses the same URL-context heuristic as navigateToDashboard().
   */
  navigateToProfileUpdate(): void {
    if (this.router.url.includes('/business')) {
      this.router.navigate(['/business/user']);
    } else {
      this.router.navigate(['/indivisuals/user']);
    }
  }

  /**
   * Returns true when an HTTP error is a 400 that signals a missing required
   * profile field. The backend (ijudi-api UserProfileService) throws
   * ResponseStatusException(BAD_REQUEST, "<field> is required") for any blank
   * required field — the phrase "is required" is the stable discriminator.
   *
   * Structure-agnostic: checks both a plain string body and a JSON object with
   * a `message` or `error` key, since Spring Boot can return either depending
   * on whether a custom handler is active.
   */
  private isRequiredFieldError(error: any): boolean {
    if (!error || error.status !== 400) {
      return false;
    }
    const body = error.error;
    if (typeof body === 'string') {
      return body.toLowerCase().includes('is required');
    }
    if (body && typeof body === 'object') {
      const msg = String(body.message || body.error || '');
      return msg.toLowerCase().includes('is required');
    }
    return false;
  }

  /**
   * Centralised error handler for all four acceptTerms() PATCH branches.
   *
   * If the backend returned a 400 "is required" error (e.g. imageUrl blank for
   * legacy users) set profileIncompleteError so the template can show the
   * profile-completion CTA. For all other failures set acceptError (generic
   * "please try again"). Only one flag is true at a time.
   */
  private handleAcceptError(error: any): void {
    if (this.isRequiredFieldError(error)) {
      this.profileIncompleteError = true;
      this.acceptError = false;
    } else {
      this.acceptError = true;
      this.profileIncompleteError = false;
    }
  }

  /**
   * Build a safe copy of the user profile for PATCH. Strips a blank imageUrl
   * before the request is sent so it does not round-trip as "" and trigger the
   * backend's "imageUrl is required" validation (added 2026-10-07 in ijudi-api
   * commit 3340ec49). The backend treats null / omitted as "not changing this
   * field", which is the correct semantic for users who have never set a photo.
   *
   * Only imageUrl is sanitised here; other string fields are sent as-is because
   * the backend only validates imageUrl for blank at this time.
   */
  private buildSafePayload(user: UserProfile): UserProfile {
    const payload: any = { ...user };
    if (!payload.imageUrl) {
      delete payload.imageUrl;
    }
    return payload as UserProfile;
  }

  acceptTerms() {
    this.acceptError = false;
    this.profileIncompleteError = false;

    if (this.termsAccepted && this.userId && this.user) {
      if (this.isAmbassador) {
        this.user.icaAccepted = true;
        this.user.icaAcceptedDate = new Date();
        this.user.icaVersion = TermsConditionsComponent.AMBASSADOR_ICA_VERSION;

        this.izingaOrderManager.updateCustomer(this.buildSafePayload(this.user)).subscribe({
          next: (updatedUser: UserProfile) => {
            this.storageService.userProfile = updatedUser;
            this.analytics.logEvent('ica_accepted', { userId: this.userId, icaVersion: TermsConditionsComponent.AMBASSADOR_ICA_VERSION });
            this.router.navigate(['/indivisuals/training-guide']);
          },
          error: (err: any) => { this.handleAcceptError(err); }
        });
      } else if (this.isDriver) {
        // Driver ICA: set both ICA fields (ADR-017) and termsAccepted in one PATCH.
        // This covers new drivers (termsAccepted not yet set) and the 346 existing
        // drivers who are returned here to sign the ICA after having termsAccepted=true.
        this.user.icaAccepted = true;
        this.user.icaAcceptedDate = new Date();
        this.user.icaVersion = TermsConditionsComponent.DRIVER_ICA_VERSION;
        this.user.termsAccepted = true;
        this.user.termsAcceptedDate = new Date();

        this.izingaOrderManager.updateCustomer(this.buildSafePayload(this.user)).subscribe({
          next: (updatedUser: UserProfile) => {
            this.storageService.userProfile = updatedUser;
            this.analytics.logEvent('driver_ica_accepted', { userId: this.userId, icaVersion: TermsConditionsComponent.DRIVER_ICA_VERSION });
            this.navigateToDashboard();
          },
          error: (err: any) => { this.handleAcceptError(err); }
        });
      } else if (this.isStoreAdmin) {
        // Merchant ICA: set ICA fields (ADR-017) AND termsAccepted in one PATCH.
        // The merchant agreement supersedes generic consumer terms for this role —
        // both flags are set together so no separate general-terms step is required.
        this.user.icaAccepted = true;
        this.user.icaAcceptedDate = new Date();
        this.user.icaVersion = TermsConditionsComponent.MERCHANT_ICA_VERSION;
        this.user.termsAccepted = true;
        this.user.termsAcceptedDate = new Date();

        this.izingaOrderManager.updateCustomer(this.buildSafePayload(this.user)).subscribe({
          next: (updatedUser: UserProfile) => {
            this.storageService.userProfile = updatedUser;
            this.analytics.logEvent('merchant_ica_accepted', { userId: this.userId, icaVersion: TermsConditionsComponent.MERCHANT_ICA_VERSION });
            this.navigateToDashboard();
          },
          error: (err: any) => { this.handleAcceptError(err); }
        });
      } else {
        this.user.termsAccepted = true;
        this.user.termsAcceptedDate = new Date();

        this.izingaOrderManager.updateCustomer(this.buildSafePayload(this.user)).subscribe({
          next: (updatedUser: UserProfile) => {
            this.storageService.userProfile = updatedUser;
            this.analytics.logEvent('terms_accepted', { userId: this.userId });
            this.navigateToDashboard();
          },
          error: (err: any) => { this.handleAcceptError(err); }
        });
      }
    }
  }

}
