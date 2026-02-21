import { Component, OnInit } from '@angular/core';
import { UserProfile } from '../model/models';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { StorageService } from '../service/storage-service.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-pending-approvals',
  templateUrl: './pending-approvals.component.html',
  styleUrls: ['./pending-approvals.component.css']
})
export class PendingApprovalsComponent implements OnInit {

  pendingUsers: UserProfile[] = [];
  selectedUser?: UserProfile;
  loading: boolean = false;
  approving: boolean = false;

  constructor(
    private izingaOrderManager: IzingaOrderManagementService,
    private storageService: StorageService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadPendingApprovals();
  }

  loadPendingApprovals(): void {
    this.loading = true;
    // This would need to be implemented in your API
    // For now, we'll use a placeholder method
    this.izingaOrderManager.getPendingApprovals()
      .subscribe(users => {
        this.pendingUsers = users.filter(user => !user.profileApproved);
        this.loading = false;
      }, error => {
        console.error('Error loading pending approvals:', error);
        this.loading = false;
      });
  }

  selectUser(user: UserProfile): void {
    this.selectedUser = user;
  }

  approveUser(): void {
    if (!this.selectedUser) return;
    
    this.approving = true;
    
    // Update user profile to approved
    this.selectedUser.profileApproved = true;
    this.selectedUser.profileApprovedDate = new Date();
    
    this.izingaOrderManager.updateCustomer(this.selectedUser)
      .subscribe(updatedUser => {
        console.log('User approved successfully:', updatedUser);
        
        // Remove from pending list
        this.pendingUsers = this.pendingUsers.filter(u => u.id !== this.selectedUser!.id);
        this.selectedUser = undefined;
        this.approving = false;
        
        // Show success message
        alert('User profile approved successfully!');
      }, error => {
        console.error('Error approving user:', error);
        this.approving = false;
        alert('Failed to approve user profile. Please try again.');
      });
  }

  rejectUser(): void {
    if (!this.selectedUser) return;
    
    this.approving = true;
    
    // You might want to add a rejection reason or delete the profile
    // For now, we'll just remove from the list
    this.pendingUsers = this.pendingUsers.filter(u => u.id !== this.selectedUser!.id);
    this.selectedUser = undefined;
    this.approving = false;
    
    alert('User profile rejected.');
  }

  closeUserDetails(): void {
    this.selectedUser = undefined;
  }

  getFieldDisplayValue(value: any): string {
    if (value === null || value === undefined) return 'Not provided';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (value instanceof Date) return value.toLocaleDateString();
    if (typeof value === 'string' && value.startsWith('http')) {
      return 'Document uploaded';
    }
    return value.toString();
  }

  isImageUrl(value: any): boolean {
    if (typeof value !== 'string') return false;
    return value.match(/\.(jpeg|jpg|gif|png)$/i) !== null;
  }

  isDocumentUrl(value: any): boolean {
    if (typeof value !== 'string') return false;
    return value.startsWith('http') && !this.isImageUrl(value);
  }

  getObjectKeys(obj: any): string[] {
    return Object.keys(obj || {});
  }
}