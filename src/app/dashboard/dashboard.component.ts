import { Component } from '@angular/core';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { StorageService } from '../service/storage-service.service';
import { UserProfile } from '../model/userProfile';
import { Router } from '@angular/router';
import { FirebaseService } from '../service/firebase.service';
import { Device } from '../model/device';
import { AnalyticsService } from '../service/analytics.service';
import { TermsConditionsComponent } from '../terms-conditions/terms-conditions.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {

  isStoreAdmin: boolean = false
  isAdmin: boolean = false
  isMessenger: boolean = false
  isMessengerAdmin: boolean = false
  isAmbassador: boolean = false
  isReferralPartner: boolean = false
  deferredPrompt: any;
  user?: UserProfile | null
  missingDocuments: string[] = []

  constructor(
    private izingaOrderManagementService: IzingaOrderManagementService,
    private storageService: StorageService, private router: Router, 
    private firebaseService: FirebaseService,
    private analytics: AnalyticsService
  ) {}
  
  ngOnInit(): void {
    // Get the store ID from the route parameters
    this.izingaOrderManagementService.getCustomerByPhoneNumber(this.storageService.phoneNumber!)
    .subscribe(user => {
      this.isStoreAdmin = user.role == UserProfile.RoleEnum.STOREADMIN || user.role == UserProfile.RoleEnum.ADMIN
      this.isMessenger = user.role == UserProfile.RoleEnum.MESSENGER || user.role == UserProfile.RoleEnum.CUSTOMER
      this.isMessengerAdmin = user.role == UserProfile.RoleEnum.MESSENGERADMIN
      this.isAdmin = user.role == UserProfile.RoleEnum.ADMIN
      this.isAmbassador = user.role == UserProfile.RoleEnum.AMBASSADOR
      this.isReferralPartner = user.role == UserProfile.RoleEnum.REFERRALPARTNER
      this.user = user
      this.storageService.userProfile = user
      this.analytics.logScreenView('dashboard', { user_role: user.role });

      // Guard: On /business/ routes, WhatsApp OTP auto-creates a placeholder profile
      // with role CUSTOMER. Such users must complete profile setup at /business/user
      // (UserUpdateComponent, which assigns STORE_ADMIN) before reaching terms or the
      // dashboard. Without this guard, new merchants bypass profile setup entirely and
      // land on the driver/messenger dashboard with the wrong role.
      const currentUrl = this.router.url;
      if (currentUrl.includes('/business/') &&
          user.role !== UserProfile.RoleEnum.STOREADMIN &&
          user.role !== UserProfile.RoleEnum.STORE &&
          user.role !== UserProfile.RoleEnum.ADMIN) {
        this.router.navigate(['/business/user']);
        return;
      }

      // Guard: On /indivisuals/ routes, the same WhatsApp OTP placeholder profile
      // leaves the user with role CUSTOMER. A user who entered through the driver door
      // (storageService.userType === 'driver', set by ?userType=driver or the
      // driver.izinga.co.za hostname) but whose role is still CUSTOMER has never
      // completed UserUpdateComponent — the form that upgrades the role to MESSENGER
      // and collects First Name, Last Name, email, town, bank, and service-type.
      // Without this guard, such users land on a fully-rendered driver dashboard with
      // the wrong role and zero profile data submitted.
      //
      // Scoped to userType === 'driver' only:
      //   - plain individuals (userType === 'individual') have CUSTOMER role legitimately
      //     and are NOT sent through the driver profile form
      //   - ambassadors (userType === 'ambassador') and referral-partners have their own
      //     purpose-built flows; the isIcaRole and REFERRALPARTNER branches further down
      //     handle them once their role is set — they are not gated here
      //   - existing MESSENGER/MESSENGER_ADMIN drivers already have the correct role and
      //     are never caught by this condition
      if (currentUrl.includes('/indivisuals/') &&
          this.storageService.userType === 'driver' &&
          (user.role == null || user.role === UserProfile.RoleEnum.CUSTOMER)) {
        // role == null   → brand-new OTP placeholder (backend now creates with role=null
        //                   instead of role=CUSTOMER since commit 73ff2a9 in ijudi-api)
        // role === CUSTOMER → legacy placeholder created before the backend fix, or any
        //                     existing user who entered the driver door without completing
        //                     the driver profile form
        // Both cases must be sent to the driver profile form.
        this.router.navigate(['/indivisuals/user']);
        return;
      }

      // Check if user has accepted terms and conditions.
      // AMBASSADOR and REFERRAL_PARTNER both use the ICA acceptance fields
      // (icaAccepted / icaAcceptedDate / icaVersion) and have their own
      // purpose-built enrollment screens — they must never land on the generic
      // TermsConditionsComponent which only handles customer/store T&Cs and
      // writes to termsAccepted (wrong field for these roles).
      //
      // Ambassador version gate: icaAccepted=true is not sufficient — the stored
      // icaVersion must match TermsConditionsComponent.AMBASSADOR_ICA_VERSION.
      // An ambassador who accepted v1 (icaVersion='v1') is redirected back to
      // the ICA screen to accept v2. The TermsConditionsComponent.needsIcaAcceptance
      // getter handles the same check on the ICA screen side.
      //
      // Driver ICA gate (MESSENGER role): same version-aware logic. The 346 existing
      // drivers who have termsAccepted=true but icaAccepted falsy are blocked here
      // and routed to TermsConditionsComponent which shows them the Driver ICA.
      // A driver who accepted an earlier version (icaVersion !== DRIVER_ICA_VERSION)
      // is also re-gated. TermsConditionsComponent.needsDriverIcaAcceptance mirrors
      // this check on the ICA screen side.
      const isIcaRole = user.role === UserProfile.RoleEnum.AMBASSADOR
        || user.role === UserProfile.RoleEnum.REFERRALPARTNER;
      const isDriverRole = user.role === UserProfile.RoleEnum.MESSENGER;
      // BUG FIX (ONB-REGRESSION-01): STORE_ADMIN and ADMIN were previously falling
      // through to the generic `!!user.termsAccepted` check, which is the wrong
      // field for merchant roles. Merchants accept the Store/Merchant Partner
      // Agreement (ICA), stored in icaAccepted + icaVersion, NOT termsAccepted.
      // A merchant whose termsAccepted was null/false would be incorrectly redirected
      // to the terms screen, where a stale storageService cache could cause
      // isStoreAdmin to evaluate false, showing generic T&Cs and allowing a PATCH
      // that wiped role + ICA fields. Adding an explicit isMerchantRole branch here
      // prevents that redirect entirely for merchants who have already signed the ICA.
      const isMerchantRole = user.role === UserProfile.RoleEnum.STOREADMIN
        || user.role === UserProfile.RoleEnum.ADMIN;
      const ambassadorIcaCurrentVersion = TermsConditionsComponent.AMBASSADOR_ICA_VERSION;
      const driverIcaCurrentVersion = TermsConditionsComponent.DRIVER_ICA_VERSION;
      const merchantIcaCurrentVersion = TermsConditionsComponent.MERCHANT_ICA_VERSION;
      const hasAcceptedTerms = isDriverRole
        ? (!!user.icaAccepted && user.icaVersion === driverIcaCurrentVersion)
        : isIcaRole
          ? (user.role === UserProfile.RoleEnum.AMBASSADOR
              ? !!user.icaAccepted && user.icaVersion === ambassadorIcaCurrentVersion
              : !!user.icaAccepted)
          : isMerchantRole
            ? (!!user.icaAccepted && user.icaVersion === merchantIcaCurrentVersion)
            : !!user.termsAccepted;
      if (!hasAcceptedTerms) {
        if (user.role === UserProfile.RoleEnum.REFERRALPARTNER) {
          // Route to the purpose-built RP enrollment screen (ReferralPartnerEnrollmentComponent).
          // That component's ngOnInit will redirect already-enrolled partners onward to
          // /indivisuals/rp-referral-code, so routing every RP through it is safe.
          this.router.navigate(['/referral-partner/enroll']);
          return;
        }
        if (user.role === UserProfile.RoleEnum.AMBASSADOR) {
          // Ambassadors have their own ICA screen — not yet a dedicated route in this
          // build, so fall through to the indivisuals/terms route which the ICA
          // gate in TermsConditionsComponent handles via the isAmbassador path.
          this.router.navigate(['/indivisuals/terms', user.id]);
          return;
        }
        // STORE_ADMIN and ADMIN always route to /business/terms regardless of the
        // URL context they arrived from. Their ICA is the Store/Merchant Partner
        // Agreement on the business-side terms screen. Routing them to /indivisuals/terms
        // by mistake (e.g. if they enter via /indivisuals/ after clearing localStorage)
        // would show the generic T&Cs and risk a bad PATCH — route them correctly here.
        if (isMerchantRole) {
          this.router.navigate(['/business/terms', user.id]);
          return;
        }
        // Generic customer T&Cs route, maintaining current route context.
        if (currentUrl.includes('/indivisuals/')) {
          this.router.navigate(['/indivisuals/terms', user.id]);
        } else if (currentUrl.includes('/business/')) {
          this.router.navigate(['/business/terms', user.id]);
        } else {
          this.router.navigate(['/indivisuals/terms', user.id]);
        }
        return;
      }
      // Merchant funnel completeness gate.
      // A STOREADMIN who has accepted T&Cs but has never created a store must be
      // redirected to tier selection — they cannot use the merchant dashboard until
      // a store exists.
      //
      // Let through when EITHER:
      //   (a) user.storeId is truthy — real merchant, store already exists.
      //   (b) storageService.selectedTier is truthy — user is mid-session in the
      //       new-store funnel (just picked a tier and is going through store
      //       creation, or just created a FREE-tier store and BusinessUpdateComponent
      //       routed here). selectedTier is sessionStorage-backed, so it clears when
      //       the tab closes; a refresh of the dashboard with no store will correctly
      //       send the user back to tier-select to restart the funnel.
      //
      // Applied only on /business/ routes (STOREADMIN/STORE/ADMIN) — no crossover
      // with the /indivisuals/ flow.
      if (currentUrl.includes('/business/') &&
          user.role === UserProfile.RoleEnum.STOREADMIN &&
          !user.storeId &&
          !this.storageService.selectedTier) {
        this.router.navigate(['/business/tier-select', user.id]);
        return;
      }

      this.updateDevice()
      this.findMissingDocuments()
    }, error => { 
      //if error is 404 navigate to user update
      console.log("Error fetching user:", error)
      if (error.status == 404) {
        // User not found, redirect to user registration flow
        const currentUrl = this.router.url;
        if (currentUrl.includes('/indivisuals/')) {
          this.router.navigate(['/indivisuals/user']);
        } else if (currentUrl.includes('/business/')) {
          this.router.navigate(['/business/user']);
        } else {
          // Default fallback
          this.router.navigate(['/indivisuals/user']);
        }
      }
    })
  }

  findMissingDocuments() {
    console.log("Checking for missing documents for user:", this.user)
    this.missingDocuments = []

    if (!this.user || this.user.role != UserProfile.RoleEnum.MESSENGER) {
      return
    }

    if (!this.user.address || this.user.address.trim().length === 0) {
      this.missingDocuments.push('address')
    }

    if (!this.user.imageUrl || this.user.imageUrl.trim().length === 0) {
      this.missingDocuments.push('profilePicture')
    }

    this.izingaOrderManagementService.getUserConfig()
    .subscribe(config => {
      const matchedConfig = config.find(cfg => cfg.label == this.user?.description)
      if (!matchedConfig) {
        return
      }

      matchedConfig.mandatoryFields.forEach(field => {
        const value = this.user?.tag?.[field.name]
        const isMissing = value === null || value === undefined || (typeof value === 'string' && value.trim().length === 0)

        if (isMissing && !this.missingDocuments.includes(field.name)) {
          this.missingDocuments.push(field.name)
        }
      })
    })
  }

  formatDocumentName(documentName: string): string {
    return documentName
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  registerDevice() {
    var token = this.firebaseService.getCurrentToken()
    if (token) {
      var device: Device = {
        userId: this.user?.id,
        token: token
      }
      this.izingaOrderManagementService.registerDeviceToUser(device).subscribe(device => this.storageService.device = device)
    }
  }

  updateDevice() {
    var device = this.storageService.device
    if(device) {
      this.izingaOrderManagementService.updateDeviceToUser(
        { 
          token: device?.token, 
          userId: this.user?.id
        }, 
        this.user?.id!
      ).subscribe(device => this.storageService.device = device)
    } else {
      this.registerDevice()
    }
    
  }

  logout() {
    this.storageService.logout()
    location.reload()
  }

  initPWAInstaller() {
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      this.deferredPrompt = e;
      // Optionally, prompt the user to install
      // You can show a button or prompt here
      this.showInstallPrompt();
    });
  }

  showInstallPrompt() {
    // When ready to show the prompt
    this.deferredPrompt.prompt();

    this.deferredPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      this.deferredPrompt = undefined;
    });
  }

  setAvailabilityStatus(status: 'ONLINE' | 'AWAY' | 'OFFLINE') {
    if (this.user) {
      this.user.availabilityStatus = status;
      this.izingaOrderManagementService.updateCustomer(this.user)
      .subscribe(resp => {
        console.log("Updated availability status to ", status)
        alert(`Your availability status has been set to ${status}`);
      });
    }
  }

  isProfileBlocked(): boolean {
    return !!(this.user?.tag && this.user.tag['blocked']);
  }

  /** First segment of user.name, safe against null/undefined.
   *  Used for the personalized greeting — never renders as "undefined". */
  get firstNameOnly(): string {
    const raw = this.user?.name;
    if (!raw) return '';
    return raw.split(' ')[0];
  }

  /** Short contextual subtitle for the dashboard greeting. */
  get roleLabel(): string {
    if (this.isAdmin) return 'Admin Dashboard';
    if (this.isStoreAdmin) return 'Store Dashboard';
    if (this.isMessengerAdmin) return 'Driver Manager Dashboard';
    if (this.isMessenger) return 'Driver Dashboard';
    if (this.isAmbassador) return 'Ambassador Dashboard';
    if (this.isReferralPartner) return 'Referral Partner Dashboard';
    return '';
  }

}
