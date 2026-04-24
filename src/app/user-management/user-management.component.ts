import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { StorageService } from '../service/storage-service.service';
import { UserProfile } from '../model/userProfile';
import { AnalyticsService } from '../service/analytics.service';
import { DataType, UserConfig } from '../model/user-config';
import { BankConfig } from '../model/bank-config';

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent {

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
