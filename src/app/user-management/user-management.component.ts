import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { StorageService } from '../service/storage-service.service';
import { UserProfile } from '../model/userProfile';
import { AnalyticsService } from '../service/analytics.service';

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

  constructor(
    private router: Router,
    private izingaOrderService: IzingaOrderManagementService,
    private storageService: StorageService,
    private analytics: AnalyticsService
  ) {}

  ngOnInit(): void {
    this.analytics.logScreenView('user_management');
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
