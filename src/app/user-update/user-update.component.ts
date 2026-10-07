import { Component } from '@angular/core';
import { DataType, UserConfig, UserProfile } from '../model/models';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { ActivatedRoute, Route, Router } from '@angular/router';

import { map, mergeMap, catchError } from 'rxjs/operators';
import { from, Observable, of, throwError } from 'rxjs';
import { StoreProfile } from '../model/storeProfile';
import { StorageService } from '../service/storage-service.service';
import { AnalyticsService } from '../service/analytics.service';
import { BankConfig } from '../model/bank-config';

@Component({
  selector: 'app-user-update',
  templateUrl: './user-update.component.html',
  styleUrls: ['./user-update.component.css']
})
export class UserUpdateComponent {

  shippingBuildingUnitNumber?: string
  shippingBuildingName?: string
  additionalInstructions?: string
  _newAddressLatitude?: number
  _newAddressLongitude?: number
  private _roleDescription?: string;
  /** Cached result of getUserConfigFields — recomputed only when the role selection changes. */
  cachedConfigFields: Array<{name: string, label: string, dataType: DataType}> = [];

  get roleDescription(): string | undefined {
    return this._roleDescription;
  }

  set roleDescription(value: string | undefined) {
    this._roleDescription = value;
    this._refreshConfigFields();
  }
  city?: string
  bankConfigs: BankConfig[] = [];
  selectedBankConfig?: BankConfig;
  ewallet?: string
  paymentType = "EWALLET"
  hasTipCard = false
  dateOfBirth?: string
  cardId?: string
  wantsToAddBusiness = false
  shopLogo?: string
  businessName?: string
  businessHours?: string
  storeType?: StoreProfile.StoreTypeEnum
  
  // Upload progress tracking
  uploadProgress: { [key: string]: number } = {};

  // Profile picture validation
  profilePictureUploaded = false;
  showProfilePictureError = false;
  private readonly DEFAULT_PROFILE_PIC = 'https://pbs.twimg.com/media/C1OKE9QXgAAArDp.jpg';

  // Bank account number validation
  showAccountNumberError = false;

  // Required-field validation flags
  showRoleDescriptionError = false;
  showFirstNameError = false;
  showSurnameError = false;
  showEmailError = false;
  showCityError = false;
  showBankNameError = false;
  showAccountTypeError = false;
  showBranchCodeError = false;
  showBankPhoneError = false;

  userProfile: UserProfile = {
    imageUrl: "https://pbs.twimg.com/media/C1OKE9QXgAAArDp.jpg",
    role: UserProfile.RoleEnum.MESSENGER,
    bank: {
      type: "EWALLET",
      name: "FNB",
      accountId: "",
      branchCode: "250655",
      phone: ""
    },
    tag: {}
  }
  
  userConfig: Array<UserConfig> = [];
  config?: UserConfig;

  constructor(private izingaOrderManager: IzingaOrderManagementService,
    private router: Router,
    private route: ActivatedRoute, 
    private storageService: StorageService,
    private analytics: AnalyticsService) {
      
  }

  ngOnInit() {
    this.analytics.logScreenView('profile_setup');
    console.log(`bank is ${JSON.stringify(this.userProfile.bank)}`)
    this.loadUserConfig()
    this.loadBankConfigs()
    this.userProfile.mobileNumber = this.storageService.phoneNumber
    // Seed bank.phone from mobileNumber so new-user BANK_ACC submissions have it set
    this.userProfile.bank.phone = this.storageService.phoneNumber || ''
    var userObservable = this.storageService.userProfile != null ? of(this.storageService.userProfile!) : this.izingaOrderManager.getCustomerByPhoneNumber(this.storageService.phoneNumber!)
    userObservable.subscribe(user => {
      if(!user.bank) user.bank = this.userProfile.bank
      if(!user.tag) user.tag = {}; // Initialize tags if not present
      this.userProfile = user
      this.storageService.userProfile = user
      // Don't let a profile with no description wipe a selection already made (e.g. the
      // shop flow's auto-selected store-owner type when the config loaded first).
      this.roleDescription = user.description || this.roleDescription
      this.city = user.address
      this.ewallet = user.mobileNumber
      this.paymentType = user.bank.type == 'EWALLET' ? "EWALLET" : "BANK_ACC"
      // Default bank.phone to mobileNumber if not already set (backend requires this field)
      if (!this.userProfile.bank.phone) {
        this.userProfile.bank.phone = this.userProfile.mobileNumber || ''
      }
      // Mark picture as uploaded if user already has a non-default profile picture
      if (user.imageUrl && user.imageUrl !== this.DEFAULT_PROFILE_PIC) {
        this.profilePictureUploaded = true;
      }
      console.log("Loaded user profile: ", user)
      // Load existing dynamic field data if present
      this.loadExistingDynamicFields(user);
    })
  }

  isStoreAdmin(): boolean {
    return this.userProfile.role == UserProfile.RoleEnum.STOREADMIN
  }

  createCustomer() {
    this.showProfilePictureError = false;
    this.showAccountNumberError = false;
    this.showRoleDescriptionError = false;
    this.showFirstNameError = false;
    this.showSurnameError = false;
    this.showEmailError = false;
    this.showCityError = false;
    this.showBankNameError = false;
    this.showAccountTypeError = false;
    this.showBranchCodeError = false;
    this.showBankPhoneError = false;
    if (!this.profilePictureUploaded) {
      this.showProfilePictureError = true;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!this.roleDescription?.trim()) {
      this.showRoleDescriptionError = true;
      return;
    }
    if (!this.userProfile.name?.trim()) {
      this.showFirstNameError = true;
      return;
    }
    if (!this.userProfile.surname?.trim()) {
      this.showSurnameError = true;
      return;
    }
    if (!this.userProfile.emailAddress?.trim()) {
      this.showEmailError = true;
      return;
    }
    if (!this.city?.trim()) {
      this.showCityError = true;
      return;
    }
    if (this.paymentType === 'BANK_ACC') {
      if (!this.selectedBankConfig) {
        this.showBankNameError = true;
        return;
      }
      if (!this.accountNumber?.trim()) {
        this.showAccountNumberError = true;
        return;
      }
      if (!this.userProfile.bank.type) {
        this.showAccountTypeError = true;
        return;
      }
      if (!this.userProfile.bank.branchCode?.trim()) {
        this.showBranchCodeError = true;
        return;
      }
      if (!this.bankPhone?.trim()) {
        this.showBankPhoneError = true;
        return;
      }
    }
    this.syncAddressCoordinates()
    this.userProfile.description = this.roleDescription

    // For the business/shop flow, assign STORE_ADMIN directly rather than relying
    // on a UserConfig lookup. The UserConfig HTTP response may not have returned
    // yet when the user submits the form (race condition), which would cause the
    // lookup to return undefined and fall back to CUSTOMER.
    // isShopFlow() guards this: it returns true only when the router URL starts
    // with /business or userType is 'shop' — both unambiguous store-owner contexts.
    this.userProfile.role = this.isShopFlow()
      ? UserProfile.RoleEnum.STOREADMIN
      : (this.isStoreAdmin()
          ? UserProfile.RoleEnum.STOREADMIN
          : this.userConfig.find(config => config.label === this.roleDescription)?.userRole
            || UserProfile.RoleEnum.CUSTOMER);

    // Ensure tags field is initialized
    this.addDynamicFieldsToProfile();

    // T-11: Include ambassador referral ID from sessionStorage in POST /user payload.
    // ambassadorId is null when no ?ref= param was present — do not send a default value.
    this.userProfile.ambassadorId = this.storageService.ambassadorRef ?? null;

    console.log(`creating customer ${this.userProfile.id} ${this.userProfile.address} ${this.userProfile.description}`)
    console.log('User profile tags:', this.userProfile.tag);
    console.log('Ambassador ref:', this.userProfile.ambassadorId);

    this.izingaOrderManager.registerCustomer(this.userProfile)
    .pipe(
      map(user => {
      this.userProfile = user
      return user;
    })).subscribe(resp => {
      // Bug 15: write the fresh server response back to the shared cache so every
      // subsequent component (SignupWelcomeComponent, TermsConditionsComponent, etc.)
      // reads the correct role — especially STORE_ADMIN — rather than the stale
      // CUSTOMER placeholder that was in storage before this call.
      this.storageService.userProfile = resp;
      console.log(`customer ${this.userProfile.id} created or updated`)
      this.storageService.ambassadorRef = null;
      if (this.cardId) {
        this.linkCode()
      }
      const firstName = (resp.name || this.userProfile.name || 'there').split(' ')[0]
      this.analytics.logEvent('profile_created', { role: this.userProfile.role });
      this.router.navigate(['../signup-welcome', resp.id], {
        relativeTo: this.route,
        queryParams: { name: firstName }
      })
    }, error => console.error(error))
  }

  updateCustomer() {
    this.showAccountNumberError = false;
    this.showRoleDescriptionError = false;
    this.showFirstNameError = false;
    this.showSurnameError = false;
    this.showEmailError = false;
    this.showCityError = false;
    this.showBankNameError = false;
    this.showAccountTypeError = false;
    this.showBranchCodeError = false;
    this.showBankPhoneError = false;
    if (!this.roleDescription?.trim()) {
      this.showRoleDescriptionError = true;
      return;
    }
    if (!this.userProfile.name?.trim()) {
      this.showFirstNameError = true;
      return;
    }
    if (!this.userProfile.surname?.trim()) {
      this.showSurnameError = true;
      return;
    }
    if (!this.userProfile.emailAddress?.trim()) {
      this.showEmailError = true;
      return;
    }
    if (!this.city?.trim()) {
      this.showCityError = true;
      return;
    }
    if (this.paymentType === 'BANK_ACC') {
      if (!this.selectedBankConfig) {
        this.showBankNameError = true;
        return;
      }
      if (!this.accountNumber?.trim()) {
        this.showAccountNumberError = true;
        return;
      }
      if (!this.userProfile.bank.type) {
        this.showAccountTypeError = true;
        return;
      }
      if (!this.userProfile.bank.branchCode?.trim()) {
        this.showBranchCodeError = true;
        return;
      }
      if (!this.bankPhone?.trim()) {
        this.showBankPhoneError = true;
        return;
      }
    }
    this.syncAddressCoordinates()
    this.userProfile.description = this.roleDescription
    this.userProfile.role = this.isStoreAdmin() ? UserProfile.RoleEnum.STOREADMIN : this.userConfig.find(config => config.label === this.roleDescription)?.userRole || UserProfile.RoleEnum.CUSTOMER
    
    // Ensure tags field is initialized
    this.addDynamicFieldsToProfile();
    
    console.log(`creating customer ${this.userProfile.id} ${this.userProfile.address} ${this.userProfile.description}`)
    console.log('User profile tags:', this.userProfile.tag);

    this.izingaOrderManager.updateCustomer(this.userProfile)
    .pipe(
      map(user => {
      this.userProfile = user
      return user;
    })).subscribe(resp => {
      // Bug 15: write the fresh server response back to the shared StorageService cache.
      // The component's local this.userProfile was already updated by the map() above, but
      // storageService.userProfile (the inter-component cache that TermsConditionsComponent,
      // DashboardComponent, etc. all read from via this.storageService.userProfile) still held
      // the stale pre-update profile — e.g. role: CUSTOMER — even though the backend now has
      // role: STORE_ADMIN. TermsConditionsComponent.isStoreAdmin evaluated the stale value,
      // which caused the generic consumer terms to render instead of the Merchant ICA.
      this.storageService.userProfile = resp;
      console.log(`customer ${this.userProfile.id} created or updated`)
      if (this.cardId) {
        this.linkCode()
      }
      this.analytics.logEvent('profile_updated', { role: this.userProfile.role });

      // STORE_ADMIN users who have never selected a tier and have no existing store are
      // still mid-funnel: they updated their UserProfile but never picked a subscription
      // tier. Route them to tier-select so they pass through the onboarding gate.
      // Existing merchants (storeId present) and anyone who already chose a tier in this
      // session (selectedTier set in sessionStorage) follow the normal edit-profile path.
      const needsTierSelection =
        resp.role === UserProfile.RoleEnum.STOREADMIN &&
        !resp.storeId &&
        !this.storageService.selectedTier;

      if (needsTierSelection) {
        this.router.navigate(['../tier-select', resp.id], { relativeTo: this.route });
      } else {
        this.router.navigate(['../info'], { relativeTo: this.route });
      }
    }, error => console.error(error))
  }

  get userExist(): boolean {
    // A profile created by WhatsAppOtpService at OTP-verification time has an id
    // but no role (role === null). That is a placeholder — the user has not yet
    // submitted the profile form. Only a profile with BOTH an id AND a role is
    // a real, completed registration that warrants the "Update" path.
    // Previously this returned `id != null`, which made every post-OTP visit
    // fall into updateCustomer() instead of createCustomer(), permanently
    // bypassing the signup-welcome → terms flow for new drivers and merchants.
    return this.userProfile.id != null && this.userProfile.role != null;
  }

  get phoneNumber(): string | undefined {
    return this.userProfile.mobileNumber
  }

  set phoneNumber(phoneNumber: string | undefined) {
    this.userProfile.mobileNumber =  phoneNumber
  }

  get emailAddress(): string | undefined {
    return this.userProfile.emailAddress
  }

  set emailAddress(emailAddress: string | undefined) {
    this.userProfile.emailAddress =  emailAddress
  }

  set newAddressLatitude(latitude: number| undefined) {
    this._newAddressLatitude = latitude;
  }

  get newAddressLatitude(): number | undefined {
    return this._newAddressLatitude;
  } 

  set newAddressLongitude(longitude: number | undefined) {
    this._newAddressLongitude = longitude;
  }

  get newAddressLongitude(): number | undefined {
    return this._newAddressLongitude;
  } 

  get bankName(): string {
    return this.userProfile.bank.name
  }

  set bankName(name: string) {
    this.userProfile.bank.name = name
  }

  get accountNumber(): string {
    return this.userProfile.bank.accountId
  }

  set accountNumber(name: string) {
    this.userProfile.bank.accountId = name
  }

  get bankPhone(): string {
    return this.userProfile.bank.phone || ''
  }

  set bankPhone(value: string) {
    this.userProfile.bank.phone = value
  }

  findCustomer() {
    this.izingaOrderManager.getCustomerByPhoneNumber(this.userProfile.mobileNumber!)
    .pipe(
      catchError(error => {
        if(error.status === 404) {
          console.log("Not found user")
          return of(this.userProfile)
        } else {
          return throwError(error); 
        }
      }),
    )
    .subscribe(user => {
      if(!user.bank) user.bank = this.userProfile.bank
      this.userProfile = user
      this.roleDescription = user.description
      this.city = user.address
      this.ewallet = user.mobileNumber
      this.paymentType = user.bank.type == 'EWALLET' ? "EWALLET" : "BANK_ACC"
    })
  }

  ewalletSelected() {
    this.paymentType = 'EWALLET'
    this.userProfile.bank.type = 'EWALLET'
    this.userProfile.bank.accountId = this.userProfile.mobileNumber!
    this.userProfile.bank.name = 'fnb'
    this.userProfile.bank.branchCode = '250655'
  }

  onBankSelected(bankConfig: BankConfig): void {
    this.userProfile.bank.name = bankConfig.bankName;
    this.userProfile.bank.branchCode = bankConfig.branchCode;
    this.userProfile.bank.accountId = this.userProfile.bank.accountId || '';
    // Default phone to mobileNumber when a bank is selected, if not already set
    this.userProfile.bank.phone = this.userProfile.bank.phone || this.userProfile.mobileNumber || '';
  }

  linkCode() {
    this.syncAddressCoordinates()
    this.userProfile.description = this.roleDescription
    console.log(`creating customer ${this.userProfile.id} ${this.userProfile.address} ${this.userProfile.description}`)

    this.izingaOrderManager.linkCard(this.userProfile, this.cardId!!).subscribe(resp => {
      console.log(`customer ${this.userProfile.id} has linked the code ${this.cardId}`)
    }, error => console.error(error))
  }

  logout() {
    this.storageService.logout()
    this.router.navigate([''])
  }

  private syncAddressCoordinates(): void {
    const nextAddress = (this.city || '').trim()
    const previousAddress = (this.userProfile.address || '').trim()

    this.userProfile.address = this.city

    if (nextAddress !== previousAddress) {
      if (this.newAddressLatitude != null && this.newAddressLongitude != null) {
        this.userProfile.latitude = this.newAddressLatitude
        this.userProfile.longitude = this.newAddressLongitude
      } else {
        this.userProfile.latitude = undefined
        this.userProfile.longitude = undefined
      }
      return
    }

    if ((this.userProfile.latitude == null || this.userProfile.longitude == null)
      && this.newAddressLatitude != null
      && this.newAddressLongitude != null) {
      this.userProfile.latitude = this.newAddressLatitude
      this.userProfile.longitude = this.newAddressLongitude
    }
  }

  /**
   * biz.izinga.co.za and the /business routes are the shop-owner signup. The backend's
   * UserConfig list is shared with the driver/ambassador/referral flows, so without this
   * a shop owner is offered "Bike Delivery Driver", "iZinga Ambassador", etc. and can end
   * up registered with the wrong role.
   */
  isShopFlow(): boolean {
    return this.router.url.startsWith('/business') || this.storageService.userType === 'shop';
  }

  /**
   * Returns true when the signing-up user is a delivery driver / messenger.
   * Identified by storageService.userType === 'driver', which is set by the welcome
   * entry flow when the user selects the driver option.
   */
  isDriverFlow(): boolean {
    return this.storageService.userType === 'driver';
  }

  loadUserConfig() {
    console.log("Loading user config...")
    this.izingaOrderManager.getUserConfig()
    .subscribe(config => {
      console.log("Loaded user config: ", config)
      // Filter the global UserConfig list to only the entries relevant to the
      // current signup context, mirroring the existing shop-flow pattern.
      if (this.isShopFlow()) {
        this.userConfig = config.filter(c => c.userRole === UserProfile.RoleEnum.STOREADMIN);
      } else if (this.isDriverFlow()) {
        // MESSENGER and MESSENGER_ADMIN both represent driver service types on the backend.
        this.userConfig = config.filter(
          c => c.userRole === UserProfile.RoleEnum.MESSENGER ||
               c.userRole === UserProfile.RoleEnum.MESSENGERADMIN
        );
      } else {
        this.userConfig = config;
      }
      // Auto-select the service type when there is exactly one match for the current flow —
      // saves the user a redundant click. Mirrors the existing shop-flow convenience.
      if ((this.isShopFlow() || this.isDriverFlow()) && this.userConfig.length === 1 && !this._roleDescription) {
        this.roleDescription = this.userConfig[0].label;
      }
      // Refresh cached fields now that config is available — roleDescription may
      // already be set from a returning user profile loaded in ngOnInit.
      this._refreshConfigFields();
    }, error => console.error("Error loading user config: ", error))
  }

  getInputType(dataType: DataType): string {
    switch(dataType) {
      case 'STRING':
        return 'text'
      case 'NUMBER':
        return 'number'
      case 'DATE':
        return 'date'
      case 'BOOLEAN':
        return 'checkbox'
      case 'DOCUMENT_URL':
        return 'file'  
      default:
        return 'text'
    }
  }

  /**
   * Recomputes cachedConfigFields and this.config whenever the role selection changes.
   * Called only from the roleDescription setter and after userConfig loads — never
   * from the template — so Angular change detection does not trigger repeated
   * invocations that caused the 6 000+/min logging loop (Bug 3).
   */
  private _refreshConfigFields(): void {
    this.config = this.userConfig.find(c => c.label === this._roleDescription);
    if (this.config) {
      console.log(`Found user config for role description ${this._roleDescription}:`, this.config);
      this.cachedConfigFields = [...this.config.mandatoryFields, ...this.config.optionalFields]
        .sort((a, b) => b.label.localeCompare(a.label))
        .sort((a, b) => a.dataType === 'DOCUMENT_URL' ? -1 : 1);
    } else {
      this.cachedConfigFields = [];
    }
  }

  /** @deprecated Use cachedConfigFields directly — kept only as a named alias for any call sites outside the template. */
  getUserConfigFields(roleDescriptionLabel: string | undefined): Array<{name: string, label: string, dataType: DataType}> {
    return this.cachedConfigFields;
  }

  /**
   * Ensure tags field exists on user profile
   * Since we're storing data directly in tags, this just ensures the field is initialized
   */
  private addDynamicFieldsToProfile(): void {
    // Initialize tags if not present
    if (!this.userProfile.tag) {
      this.userProfile.tag = {};
    }
    // Data is already stored directly in tags, so no copying needed
  }

  private loadBankConfigs(): void {
    console.log("Loading bank configs...")
    this.izingaOrderManager.getBankConfigs().subscribe({
      next: (banks) => {
        this.bankConfigs = banks;
        if (this.userProfile.bank?.name) {
          this.selectedBankConfig = banks.find(b =>
            b.bankName === this.userProfile.bank.name ||
            b.branchCode === this.userProfile.bank.branchCode
          );
        }
      },
      error: () => { 
        console.error("Error loading bank configs");
      }
    });
  }

  /**
   * Initialize user profile tags if not present when the component loads
   * @param user The user profile to initialize
   */
  private loadExistingDynamicFields(user: UserProfile): void {
    // Simply ensure tags exist - no need to copy data since we're using tags directly
    if (!user.tag) {
      user.tag = {};
    }
  }

  /**
   * Handle file selection and upload for dynamic form fields
   * @param event File input change event
   * @param fieldName Name of the dynamic field
   */
  onFileSelect(event: any, fieldName: string): void {
    const file = event.target.files[0];
    if (file) {
      console.log(`File selected for field ${fieldName}:`, file.name);
      
      // Initialize progress
      this.uploadProgress[fieldName] = 0;
      
      // Upload file using the izinga service
      this.izingaOrderManager.uploadFile(file, true, undefined, this.config)
      .subscribe({
        next: (response: {[key: string]: any}) => {
          console.log(`File uploaded successfully for field ${fieldName}:`, response);
          
          // Store the uploaded file URL directly in userProfile.tags
          if (!this.userProfile.tag) {
            this.userProfile.tag = {};
          }
          //loop through possible keys to find url
          for (const key of Object.keys(response)) {
            if (response['url']) {
              this.userProfile.tag[fieldName] = response['url'];
              break;
            }
          }

          var metadata = response['metadata'] || {}
          // Store any additional metadata if needed
          for (const metaKey of Object.keys(metadata)) {
            if (metadata[metaKey] && metadata[metaKey] !== '' && metaKey !== fieldName) {
              this.userProfile.tag[metaKey] = metadata[metaKey];
            }
          }
          
          // Complete progress
          this.uploadProgress[fieldName] = 100;
          
          // Remove progress indicator after a short delay
          setTimeout(() => {
            delete this.uploadProgress[fieldName];
          }, 2000);
        },
        error: (error: any) => {
          console.error(`Error uploading file for field ${fieldName}:`, error);
          delete this.uploadProgress[fieldName];
          
          // You could add error handling UI here
          alert(`Failed to upload file for ${fieldName}. Please try again.`);
        }
      });
    }
  }

  /**
   * Take a selfie using device camera
   */
  async takeSelfie(): Promise<void> {
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Camera access is not supported on this device or browser');
        return;
      }

      // Request camera access with front camera preference
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user', // Front camera for selfie
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });

      // Create video element for camera preview
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;

      // Create canvas for capturing photo
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      // Create modal for camera interface
      const modal = this.createCameraModal(video, () => {
        // Capture photo
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        
        // Convert to blob
        canvas.toBlob((blob) => {
          if (blob) {
            // Create file from blob
            const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
            this.uploadProfilePicture(file);
          }
          
          // Clean up
          stream.getTracks().forEach(track => track.stop());
          modal.remove();
        }, 'image/jpeg', 0.8);
      }, () => {
        // Cancel - clean up
        stream.getTracks().forEach(track => track.stop());
        modal.remove();
      });

      document.body.appendChild(modal);

    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check your camera permissions and try again.');
    }
  }

  /**
   * Create camera modal interface
   */
  private createCameraModal(video: HTMLVideoElement, onCapture: () => void, onCancel: () => void): HTMLElement {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      z-index: 10000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    `;

    const container = document.createElement('div');
    container.style.cssText = `
      background: white;
      border-radius: 10px;
      padding: 20px;
      max-width: 90vw;
      max-height: 90vh;
      text-align: center;
    `;

    const title = document.createElement('h3');
    title.textContent = 'Take a Selfie';
    title.style.marginBottom = '20px';

    video.style.cssText = `
      max-width: 100%;
      max-height: 400px;
      border-radius: 10px;
      margin-bottom: 20px;
    `;

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      gap: 10px;
      justify-content: center;
    `;

    const captureBtn = document.createElement('button');
    captureBtn.textContent = '📸 Take Photo';
    captureBtn.className = 'btn btn-primary';
    captureBtn.onclick = onCapture;

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.onclick = onCancel;

    buttonContainer.appendChild(captureBtn);
    buttonContainer.appendChild(cancelBtn);
    
    container.appendChild(title);
    container.appendChild(video);
    container.appendChild(buttonContainer);
    modal.appendChild(container);

    return modal;
  }

  /**
   * Upload profile picture file
   * @param file Image file to upload
   */
  private uploadProfilePicture(file: File): void {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPG, PNG, GIF, etc.)');
      return;
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      alert('File size must be less than 5MB');
      return;
    }

    console.log('Profile picture selected:', file.name);
    
    // Initialize progress for profile picture
    this.uploadProgress['profilePicture'] = 0;
    
    // Upload file using the izinga service
    this.izingaOrderManager.uploadFile(file, false, undefined, this.config).subscribe({
      next: (response: {[key: string]: any}) => {
        console.log('Profile picture uploaded successfully:', response);        

        this.userProfile.imageUrl = response['url'];
        this.profilePictureUploaded = true;
        this.showProfilePictureError = false;
        console.log('Profile picture URL assigned:', this.userProfile.imageUrl);

        // Complete progress
        this.uploadProgress['profilePicture'] = 100;
        
        // Remove progress indicator after a short delay to show success
        setTimeout(() => {
          delete this.uploadProgress['profilePicture'];
        }, 1500);
      },
      error: (error: any) => {
        console.error('Error uploading profile picture:', error);
        delete this.uploadProgress['profilePicture'];
        alert('Failed to upload profile picture. Please try again.');
      }
    });
  }

}
