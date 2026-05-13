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
  roleDescription?: string
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

  userProfile: UserProfile = {
    imageUrl: "https://pbs.twimg.com/media/C1OKE9QXgAAArDp.jpg",
    role: UserProfile.RoleEnum.MESSENGER,
    bank: {
      type: "EWALLET",
      name: "FNB",
      accountId: "",
      branchCode: "250655"
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
    this.userProfile.mobileNumber = this.storageService.phoneNumber
    var userObservable = this.storageService.userProfile != null ? of(this.storageService.userProfile!) : this.izingaOrderManager.getCustomerByPhoneNumber(this.storageService.phoneNumber!)
    userObservable.subscribe(user => {
      this.userProfile = user
      this.storageService.userProfile = user
      if(!user.bank) user.bank = this.userProfile.bank
      if(!user.tag) user.tag = {}; // Initialize tags if not present
      this.roleDescription = user.description
      this.city = user.address
      this.ewallet = user.mobileNumber
      this.paymentType = user.bank.type == 'EWALLET' ? "EWALLET" : "BANK_ACC"
      console.log("Loaded user profile: ", user)
      // Load existing dynamic field data if present
      this.loadExistingDynamicFields(user);
    })
    this.loadUserConfig()
    this.loadBankConfigs()
  }

  isStoreAdmin(): boolean {
    return this.userProfile.role == UserProfile.RoleEnum.STOREADMIN
  }

  createCustomer() {
    this.syncAddressCoordinates()
    this.userProfile.description = this.roleDescription

    this.userProfile.role = this.isStoreAdmin() ? UserProfile.RoleEnum.STOREADMIN : this.userConfig.find(config => config.label === this.roleDescription)?.userRole || UserProfile.RoleEnum.CUSTOMER

    // Ensure tags field is initialized
    this.addDynamicFieldsToProfile();

    console.log(`creating customer ${this.userProfile.id} ${this.userProfile.address} ${this.userProfile.description}`)
    console.log('User profile tags:', this.userProfile.tag);

    this.izingaOrderManager.registerCustomer(this.userProfile)
    .pipe(
      map(user => {
      this.userProfile = user
      return user;
    })).subscribe(resp => {
      console.log(`customer ${this.userProfile.id} created or updated`)
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
      console.log(`customer ${this.userProfile.id} created or updated`)
      if (this.cardId) {
        this.linkCode()
      }
      this.analytics.logEvent('profile_updated', { role: this.userProfile.role });
      this.router.navigate(['../info'], {relativeTo: this.route }  )
    }, error => console.error(error))
  }

  get userExist(): boolean {
    return this.userProfile.id != null;
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

  loadUserConfig() {
    console.log("Loading user config...")
    this.izingaOrderManager.getUserConfig()
    .subscribe(config => {
      console.log("Loaded user config: ", config)
      this.userConfig = config
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

  getUserConfigFields(roleDescriptionLabel: string): Array<{name: string, label: string, dataType: DataType}> {
    this.config = this.userConfig.find(config => config.label === roleDescriptionLabel)
    console.log("Found config for role description ", roleDescriptionLabel, this.config)
    if (this.config) {
      return [...this.config.mandatoryFields, ...this.config.optionalFields]
      .sort((a, b) =>  b.label.localeCompare(a.label))
      .sort((a, b) => a.dataType === 'DOCUMENT_URL' ? -1 : 1)
    }

    return [] 
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
   * Handle profile picture upload from file
   * @param event File input change event
   */
  onProfilePictureSelect(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.uploadProfilePicture(file);
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
      alert('Unable to access camera. Please check your permissions or use file upload instead.');
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
