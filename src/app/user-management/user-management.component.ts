// For Google Maps JS API
declare var google: any;
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { StorageService } from '../service/storage-service.service';
import { UserProfile } from '../model/userProfile';
import { AnalyticsService } from '../service/analytics.service';
import { DataType, UserConfig } from '../model/user-config';
import { DocType } from '../model/doc-types';
import { BankConfig } from '../model/bank-config';

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent {
      // Tab and map state
      activeTab: 'list' | 'map' = 'list';
      mapLoading = false;
      mapError = '';
      driversInView: UserProfile[] = [];
      mapServiceFilter: string = '';
      mapAvailabilityFilter: string = '';
      private mapRawResults: UserProfile[] = [];
      private map: any;
      private mapMarkers: any[] = [];
      private mapInfoWindow: any;

      setActiveTab(tab: 'list' | 'map') {
        this.activeTab = tab;
        if (tab === 'map') {
          setTimeout(() => this.initMap(), 100);
        }
      }

      initMap() {
        if (typeof google === 'undefined' || !google.maps || !google.maps.Map) {
          this.mapError = 'Google Maps not loaded.';
          return;
        }
        const mapEl = document.getElementById('drivers-map');
        if (!mapEl) return;

        if (!this.map) {
          this.map = new google.maps.Map(mapEl, {
            center: { lat: -29.8587, lng: 31.0218 },
            zoom: 11,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
          });
          this.mapInfoWindow = new google.maps.InfoWindow();
          // On every pan/zoom, fetch messengers for the visible viewport from the backend
          this.map.addListener('idle', () => this.fetchAndPlotMessengersInView());
        }
      }

      fetchAndPlotMessengersInView() {
        if (!this.map) return;
        const bounds = this.map.getBounds();
        if (!bounds) return;

        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        const centerLat = (ne.lat() + sw.lat()) / 2;
        const centerLng = (ne.lng() + sw.lng()) / 2;
        const range = Math.max((ne.lat() - sw.lat()) / 2, (ne.lng() - sw.lng()) / 2);

        this.mapLoading = false;
        this.mapError = '';
        this.izingaOrderService.getMessengersByArea(centerLat, centerLng, range).subscribe({
          next: (users) => {
            this.mapLoading = false;
            this.mapRawResults = users;
            this.applyMapFilters();
          },
          error: () => {
            this.mapLoading = false;
            this.mapError = 'Failed to load drivers for this area.';
          }
        });
      }

      onMapFilterChange() {
        this.applyMapFilters();
      }

      private applyMapFilters() {
        let results = this.mapRawResults;
        if (this.mapServiceFilter) {
          results = results.filter(d =>
            (d.description || '').trim().toLowerCase() === this.mapServiceFilter.trim().toLowerCase()
          );
        }
        if (this.mapAvailabilityFilter) {
          results = results.filter(d => d.availabilityStatus === this.mapAvailabilityFilter);
        }
        this.driversInView = results;
        this.renderDriverMarkers(results);
      }

      private renderDriverMarkers(drivers: UserProfile[]) {
        // Clear old markers
        this.mapMarkers.forEach((m: any) => m.setMap(null));
        this.mapMarkers = [];

        drivers.forEach(driver => {
          const pos = { lat: Number(driver.latitude), lng: Number(driver.longitude) };
          if (!Number.isFinite(pos.lat) || !Number.isFinite(pos.lng)) return;

          const icon = (driver.imageUrl || '').trim()
            ? {
                url: driver.imageUrl,
                scaledSize: new google.maps.Size(42, 42),
                anchor: new google.maps.Point(21, 42),
              }
            : { url: 'https://maps.google.com/mapfiles/ms/icons/teal-dot.png' };

          const marker = new google.maps.Marker({
            position: pos,
            map: this.map,
            title: driver.name || driver.mobileNumber,
            icon,
          });

          marker.addListener('click', () => {
            if (!this.mapInfoWindow) return;
            this.mapInfoWindow.setContent(this.buildDriverPopup(driver));
            this.mapInfoWindow.open(this.map, marker);
          });

          this.mapMarkers.push(marker);
        });
      }

      private buildDriverPopup(driver: UserProfile): string {
        const name = this.escapeHtml(driver.name || 'Unknown');
        const phone = this.escapeHtml(driver.mobileNumber || '');
        const desc = this.escapeHtml(driver.description || 'Not provided');
        const addr = this.escapeHtml(driver.address || 'Not provided');
        const approved = driver.profileApproved;
        const statusColor = approved ? '#198754' : '#fd7e14';
        const statusLabel = approved ? '&#10003; Approved' : '&#9679; Pending Approval';
        const availColor = driver.availabilityStatus === 'ONLINE' ? '#198754'
          : driver.availabilityStatus === 'AWAY' ? '#fd7e14' : '#6c757d';
        const availLabel = this.escapeHtml(driver.availabilityStatus || 'OFFLINE');

        const avatarHtml = (driver.imageUrl || '').trim()
          ? `<img src="${this.escapeHtml(driver.imageUrl)}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;margin-right:10px;">`
          : `<div style="width:48px;height:48px;border-radius:50%;background:#e9ecef;display:flex;align-items:center;justify-content:center;margin-right:10px;font-size:20px;">&#128100;</div>`;

        return `
          <div style="min-width:240px;font-family:Arial,sans-serif;color:#333;">
            <div style="display:flex;align-items:center;margin-bottom:10px;">
              ${avatarHtml}
              <div>
                <strong style="font-size:15px;">${name}</strong><br>
                <span style="color:#6c757d;font-size:12px;">${phone}</span>
              </div>
            </div>
            <table style="width:100%;font-size:13px;border-collapse:collapse;">
              <tr><td style="padding:3px 0;"><strong>Service:</strong></td><td style="padding:3px 4px;">${desc}</td></tr>
              <tr><td style="padding:3px 0;"><strong>Address:</strong></td><td style="padding:3px 4px;">${addr}</td></tr>
              <tr><td style="padding:3px 0;"><strong>Status:</strong></td>
                  <td style="padding:3px 4px;">
                    <span style="color:${statusColor};font-weight:700;">${statusLabel}</span>
                  </td>
              </tr>
              <tr><td style="padding:3px 0;"><strong>Availability:</strong></td>
                  <td style="padding:3px 4px;">
                    <span style="display:inline-block;padding:2px 8px;border-radius:999px;background:${availColor}1a;color:${availColor};font-size:12px;font-weight:700;">${availLabel}</span>
                  </td>
              </tr>
            </table>
          </div>`;
      }

      private escapeHtml(value: string): string {
        return (value || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }
    // Track upload progress for each field
    uploadProgress: { [key: string]: number } = {};

    // Handle profile picture upload for selectedUser
    onProfilePictureSelect(event: any): void {
      const file = event.target.files && event.target.files[0];
      if (!file || !this.selectedUser) return;
      this.uploadProgress['profilePicture'] = 1;
      this.izingaOrderService.uploadFile(file, true, DocType.ID).subscribe({
        next: (result) => {
          if (result && result['url']) this.selectedUser!.imageUrl = result['url'];
          this.uploadProgress['profilePicture'] = 100;
          setTimeout(() => this.uploadProgress['profilePicture'] = 0, 1000);
        },
        error: () => {
          this.uploadProgress['profilePicture'] = 0;
          this.errorMessage = 'Failed to upload profile picture.';
        }
      });
    }

    // Handle file upload for dynamic fields (DOCUMENT_URL)
    onFileSelect(event: any, fieldName: string, user: UserProfile): void {
      const file = event.target.files && event.target.files[0];
      if (!file || !user) return;
      this.uploadProgress[fieldName] = 1;
      // Use DocType.DPD as a generic doc type for uploads, or customize as needed
      this.izingaOrderService.uploadFile(file, true, DocType.DPD).subscribe({
        next: (result) => {
          if (result && result['url']) user.tag[fieldName] = result['url'];
          this.uploadProgress[fieldName] = 100;
          setTimeout(() => this.uploadProgress[fieldName] = 0, 1000);
        },
        error: () => {
          this.uploadProgress[fieldName] = 0;
          this.errorMessage = 'Failed to upload file.';
        }
      });
    }
  updateUserTagsAndFields(): void {
    if (!this.selectedUser || !this.selectedUser.id) return;
    this.izingaOrderService.updateCustomer(this.selectedUser).subscribe({
      next: (updatedUser) => {
        this.successMessage = 'User tags and fields updated successfully.';
        this.selectedUser = updatedUser;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: () => {
        this.errorMessage = 'Failed to update user tags and fields.';
      }
    });
  }

  searchPhone: string = '';
  searchResults: UserProfile[] = [];
    selectedUser: UserProfile | null = null;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  showCreateUserForm = false;
  isCreatingUser = false;
  createPaymentType = 'EWALLET';
  userConfig: Array<UserConfig> = [];
  roleDescription?: string;
  bankConfigs: BankConfig[] = [];
  selectedBankConfigForNewUser?: BankConfig;

  newUser: UserProfile = {
    imageUrl: 'https://pbs.twimg.com/media/C1OKE9QXgAAArDp.jpg',
    role: UserProfile.RoleEnum.MESSENGER,
    bank: {
      type: 'EWALLET',
      name: 'FNB',
      accountId: '',
      branchCode: '250655'
    },
    tag: {}
  };

  constructor(
    private router: Router,
    private izingaOrderService: IzingaOrderManagementService,
    private storageService: StorageService,
    private analytics: AnalyticsService
  ) {}

  ngOnInit(): void {
    this.analytics.logScreenView('user_management');
    this.loadUserConfig();
    this.loadBankConfigsForCreate();
  }

  toggleCreateUserForm(): void {
    this.showCreateUserForm = !this.showCreateUserForm;
    this.errorMessage = '';
    this.successMessage = '';
  }

  createUserOnBehalf(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.newUser.name || !this.newUser.mobileNumber || !this.roleDescription) {
      this.errorMessage = 'Name, mobile number, and service type are required';
      return;
    }

    this.newUser.mobileNumber = this.formatPhoneNumber(this.newUser.mobileNumber);
    this.newUser.description = this.roleDescription;
    this.newUser.role = UserProfile.RoleEnum.MESSENGER;
    this.newUser.termsAccepted = false;
    this.newUser.profileApproved = false;

    if (!this.newUser.tag) {
      this.newUser.tag = {};
    }

    if (this.createPaymentType === 'EWALLET') {
      this.newUser.bank.type = 'EWALLET';
      this.newUser.bank.name = 'FNB';
      this.newUser.bank.branchCode = '250655';
      this.newUser.bank.accountId = this.newUser.mobileNumber;
    }

    if (this.createPaymentType === 'BANK_ACC' && (!this.newUser.bank.name || !this.newUser.bank.accountId || !this.newUser.bank.branchCode)) {
      this.errorMessage = 'Bank name, account number, and branch code are required for bank payouts';
      return;
    }

    this.isCreatingUser = true;

    this.izingaOrderService.registerCustomer(this.newUser).subscribe({
      next: (createdUser) => {
        this.isCreatingUser = false;
        this.successMessage = `User ${createdUser.name || createdUser.mobileNumber} created successfully`;
        this.searchResults = [createdUser, ...this.searchResults.filter(user => user.id !== createdUser.id)];
        this.selectedUser = createdUser;
        this.analytics.logEvent('user_created_on_behalf', { userId: createdUser.id, role: createdUser.role });
        this.resetNewUserForm();
        this.showCreateUserForm = false;
      },
      error: () => {
        this.isCreatingUser = false;
        this.errorMessage = 'Failed to create user. Please check the details and try again.';
      }
    });
  }

  ewalletSelectedForNewUser(): void {
    this.createPaymentType = 'EWALLET';
    this.newUser.bank.type = 'EWALLET';
    this.newUser.bank.accountId = this.newUser.mobileNumber ? this.formatPhoneNumber(this.newUser.mobileNumber) : '';
    this.newUser.bank.name = 'FNB';
    this.newUser.bank.branchCode = '250655';
  }

  onBankSelectedForNewUser(bankConfig: BankConfig): void {
    this.newUser.bank.name = bankConfig.bankName;
    this.newUser.bank.branchCode = bankConfig.branchCode;
  }

  getInputType(dataType: DataType): string {
    switch (dataType) {
      case DataType.STRING:
        return 'text';
      case DataType.NUMBER:
        return 'number';
      case DataType.DATE:
        return 'date';
      case DataType.BOOLEAN:
        return 'checkbox';
      case DataType.DOCUMENT_URL:
        return 'text';
      default:
        return 'text';
    }
  }

  getUserConfigFields(roleDescriptionLabel: string): Array<{name: string, label: string, dataType: DataType}> {
    const config = this.userConfig.find(item => item.label === roleDescriptionLabel);
    if (!config) {
      return [];
    }

    return [...config.mandatoryFields, ...config.optionalFields]
      .sort((a, b) => b.label.localeCompare(a.label))
      .sort((a, b) => a.dataType === DataType.DOCUMENT_URL ? -1 : 1);
  }

  onCreatePaymentTypeChange(): void {
    if (this.createPaymentType === 'EWALLET') {
      this.ewalletSelectedForNewUser();
      return;
    }

    if (this.newUser.bank.type === 'EWALLET') {
      this.newUser.bank.type = 'CHEQUE';
    }
    this.newUser.bank.accountId = this.newUser.bank.accountId || '';
    this.newUser.bank.name = this.newUser.bank.name || '';
    this.newUser.bank.branchCode = this.newUser.bank.branchCode || '';
  }

  searchUser(): void {
    this.errorMessage = '';
    this.successMessage = '';
      this.selectedUser = null;

    if (!this.searchPhone || this.searchPhone.trim().length === 0) {
      this.errorMessage = 'Please enter a mobile number';
      return;
    }

    const formattedPhone = this.formatPhoneNumber(this.searchPhone);
    this.isLoading = true;

    this.izingaOrderService.getCustomerByPhoneNumber(formattedPhone).subscribe({
      next: (user) => {
        this.searchResults = [user];
        this.isLoading = false;
        this.analytics.logEvent('user_search', { phone: formattedPhone });
      },
      error: (error) => {
        this.isLoading = false;
        if (error.status === 404) {
          this.errorMessage = 'User not found with this mobile number';
        } else {
          this.errorMessage = 'Error searching for user. Please try again.';
        }
      }
    });
  }

  resetMissingDocumentsReminder(user: UserProfile): void {
    if (!user.id) return;
    user.missingDocumentsReminderSent = false;
    this.izingaOrderService.updateCustomer(user).subscribe({
      next: (updatedUser) => {
        this.selectedUser = updatedUser;
        this.successMessage = 'Missing documents reminder flag reset. The reminder can now be re-sent.';
        this.analytics.logEvent('missing_docs_reminder_reset', { userId: user.id });
        setTimeout(() => this.successMessage = '', 4000);
      },
      error: () => {
        this.errorMessage = 'Failed to reset the missing documents reminder flag.';
        user.missingDocumentsReminderSent = true; // revert optimistic update
      }
    });
  }

  toggleTermsAccepted(user: UserProfile): void {
    if (!user.id) return;

    const newTermsAcceptedStatus = !user.termsAccepted;
    user.termsAccepted = newTermsAcceptedStatus;

    this.izingaOrderService.updateCustomer(user).subscribe({
      next: (updatedUser) => {
        this.successMessage = `Terms acceptance status updated to: ${newTermsAcceptedStatus ? 'Accepted' : 'Not Accepted'}`;
        this.analytics.logEvent('terms_status_updated', { userId: user.id, status: newTermsAcceptedStatus });
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error) => {
        this.errorMessage = 'Failed to update terms status';
        user.termsAccepted = !newTermsAcceptedStatus; // Revert on error
      }
    });
  }

  blockUser(user: UserProfile): void {
    if (!user.id) return;

    if (confirm(`Are you sure you want to block this user (${user.name})? They will not be able to access their account.`)) {
      user.termsAccepted = false;
      if (!user.tag) user.tag = {};
      user.tag['blocked'] = true;

      this.izingaOrderService.updateCustomer(user).subscribe({
        next: (updatedUser) => {
          this.successMessage = `User ${updatedUser.name} has been blocked`;
          this.analytics.logEvent('user_blocked', { userId: user.id, userName: user.name });
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (error) => {
          this.errorMessage = 'Failed to block user';
          user.tag['blocked'] = false;
          user.termsAccepted = true;
        }
      });
    }
  }

  unblockUser(user: UserProfile): void {
    if (!user.id) return;

    if (confirm(`Are you sure you want to unblock this user (${user.name})?`)) {
      if (!user.tag) user.tag = {};
      user.tag['blocked'] = false;

      this.izingaOrderService.updateCustomer(user).subscribe({
        next: (updatedUser) => {
          this.successMessage = `User ${updatedUser.name} has been unblocked`;
          this.analytics.logEvent('user_unblocked', { userId: user.id, userName: user.name });
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (error) => {
          this.errorMessage = 'Failed to unblock user';
          user.tag['blocked'] = true;
        }
      });
    }
  }

    selectUser(user: UserProfile): void {
      this.selectedUser = user;
    }

    resetSearch(): void {
      this.searchPhone = '';
      this.searchResults = [];
      this.selectedUser = null;
      this.errorMessage = '';
      this.successMessage = '';
    }

    private loadUserConfig(): void {
      this.izingaOrderService.getUserConfig().subscribe({
        next: (config) => {
          this.userConfig = config;
        },
        error: () => {
          this.userConfig = [];
        }
      });
    }

    private loadBankConfigsForCreate(): void {
      this.izingaOrderService.getBankConfigs().subscribe({
        next: (banks) => { this.bankConfigs = banks; },
        error: () => { /* non-critical */ }
      });
    }

    private resetNewUserForm(): void {
      this.createPaymentType = 'EWALLET';
      this.roleDescription = undefined;
      this.newUser = {
        imageUrl: 'https://pbs.twimg.com/media/C1OKE9QXgAAArDp.jpg',
        role: UserProfile.RoleEnum.MESSENGER,
        bank: {
          type: 'EWALLET',
          name: 'FNB',
          accountId: '',
          branchCode: '250655'
        },
        tag: {}
      };
    }

    getObjectKeys(obj: any): string[] {
      return obj ? Object.keys(obj).filter(key => key !== 'blocked') : [];
    }

    isImageUrl(url: string): boolean {
      if (!url) return false;
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
      return imageExtensions.some(ext => url.toLowerCase().includes(ext));
    }

    isDocumentUrl(url: string): boolean {
      if (!url) return false;
      const docExtensions = ['.pdf', '.doc', '.docx', '.xlsx', '.xls', '.ppt', '.pptx'];
      return docExtensions.some(ext => url.toLowerCase().includes(ext));
    }

    getFieldDisplayValue(value: any): string {
      if (typeof value === 'boolean') return value ? 'Yes' : 'No';
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value || '');
    }

  private formatPhoneNumber(phone: string): string {
    phone = phone.replace(/\s/g, '');
    if (phone.startsWith('+27')) return phone;
    if (phone.startsWith('27')) return '+' + phone;
    if (phone.startsWith('0')) return '+27' + phone.substring(1);
    return '+27' + phone;
  }

  goBack(): void {
    window.history.back();
  }
}
