import { Component, OnInit } from '@angular/core';
import { UserProfile } from '../model/userProfile';
import { IzingaOrderManagementService, DriverInviteRequest } from '../service/izinga-order-management.service';
import { StorageService } from '../service/storage-service.service';
import { AnalyticsService } from '../service/analytics.service';

/**
 * INVITE-DRV-01 / T-04: replaced the two-phase "Check & Add / Create" form with a single
 * "Invite Driver" form that calls POST /messenger-admin/{adminId}/invite (ADR-018).
 * One HTTP call only; all five invite outcomes surfaced.
 */
@Component({
  selector: 'app-team-messengers',
  templateUrl: './team-messengers.component.html',
  styleUrls: ['./team-messengers.component.css']
})
export class TeamMessengersComponent implements OnInit {
  drivers: UserProfile[] = [];
  isLoading = true;
  errorMessage = '';
  successMessage = '';

  // Invite driver form
  showAddForm = false;
  newDriverMobileNumber = '';
  newDriverName = '';
  newDriverSurname = '';
  isSendingInvite = false;
  inviteResultMessage = '';
  inviteResultType: 'success' | 'info' | 'warning' | 'danger' = 'info';

  // Remove driver
  isRemovingDriver: { [key: string]: boolean } = {};
  removeConfirmation: { [key: string]: boolean } = {};

  constructor(
    private izingaService: IzingaOrderManagementService,
    private storageService: StorageService,
    private analytics: AnalyticsService
  ) {}

  ngOnInit(): void {
    this.analytics.logScreenView('team_drivers');
    this.loadDrivers();
  }

  private loadDrivers(): void {
    const user = this.storageService.userProfile;

    if (!user?.id || user.role !== UserProfile.RoleEnum.MESSENGERADMIN) {
      this.errorMessage = 'Only driver admins can view this page.';
      this.isLoading = false;
      return;
    }

    this.izingaService.getAllMessengersForAdmin(user.id).subscribe({
      next: (data) => {
        this.drivers = data || [];
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load drivers at the moment.';
        this.isLoading = false;
      }
    });
  }

  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    this.resetInviteForm();
  }

  sendInvite(): void {
    if (!this.newDriverMobileNumber.trim()) {
      this.inviteResultMessage = 'Please enter a mobile number.';
      this.inviteResultType = 'danger';
      return;
    }

    const adminUser = this.storageService.userProfile;
    if (!adminUser?.id) {
      this.inviteResultMessage = 'Admin user not found. Please refresh and try again.';
      this.inviteResultType = 'danger';
      return;
    }

    this.isSendingInvite = true;
    this.inviteResultMessage = '';

    const request: DriverInviteRequest = {
      mobileNumber: this.newDriverMobileNumber.trim(),
      name: this.newDriverName.trim() || undefined,
      surname: this.newDriverSurname.trim() || undefined
    };

    this.izingaService.inviteDriverToMessengerAdmin(adminUser.id, request).subscribe({
      next: (response) => {
        this.isSendingInvite = false;
        switch (response.outcome) {
          case 'CREATED':
            this.inviteResultMessage = 'Driver added to your team.';
            this.inviteResultType = 'success';
            this.loadDrivers();
            break;
          case 'ALREADY_LINKED':
            this.inviteResultMessage = 'This driver is already on your team.';
            this.inviteResultType = 'info';
            break;
          case 'INVITED':
            this.inviteResultMessage = 'Invite created. A WhatsApp message will be sent once our messaging is active. They have 5 days to accept.';
            this.inviteResultType = 'success';
            break;
          default:
            this.inviteResultMessage = 'Invite sent.';
            this.inviteResultType = 'success';
        }
      },
      error: (error) => {
        this.isSendingInvite = false;
        if (error?.status === 409) {
          this.inviteResultMessage = 'This driver is already working with another team.';
          this.inviteResultType = 'warning';
        } else {
          this.inviteResultMessage = 'Failed to send invite. Please try again.';
          this.inviteResultType = 'danger';
          console.error('Error inviting driver:', error);
        }
      }
    });
  }

  cancelAddDriver(): void {
    this.showAddForm = false;
    this.resetInviteForm();
  }

  private resetInviteForm(): void {
    this.newDriverMobileNumber = '';
    this.newDriverName = '';
    this.newDriverSurname = '';
    this.isSendingInvite = false;
    this.inviteResultMessage = '';
    this.inviteResultType = 'info';
  }

  getApprovalStatusBadge(approved: boolean | undefined): string {
    if (approved === true) return 'badge bg-success';
    if (approved === false) return 'badge bg-warning';
    return 'badge bg-secondary';
  }

  getApprovalStatusText(approved: boolean | undefined): string {
    if (approved === true) return 'Approved';
    if (approved === false) return 'Pending';
    return 'Not Started';
  }

  getConsentStatusBadge(consented: boolean | undefined): string {
    if (consented === true) return 'badge bg-success';
    if (consented === false) return 'badge bg-warning';
    return 'badge bg-secondary';
  }

  getConsentStatusText(consented: boolean | undefined): string {
    if (consented === true) return 'Accepted';
    if (consented === false) return 'Pending';
    return 'Not Started';
  }

  getBackgroundCheckBadge(checkData: any): string {
    if (!checkData) return 'badge bg-secondary';
    if (checkData.criminalRecordCheckAccepted === true) return 'badge bg-success';
    if (checkData.criminalCheckPass === true) return 'badge bg-success';
    if (checkData.criminalCheckMessageSent === true) return 'badge bg-warning';
    return 'badge bg-secondary';
  }

  getBackgroundCheckText(checkData: any): string {
    if (!checkData) return 'Not Started';
    if (checkData.criminalCheckPass === true) return 'Passed';
    if (checkData.criminalRecordCheckAccepted === true) return 'Accepted';
    if (checkData.criminalCheckMessageSent === true) return 'Pending';
    return 'Not Started';
  }

  getAvailabilityBadge(availability: string | undefined): string {
    if (availability === 'ONLINE') return 'badge bg-info';
    if (availability === 'AWAY') return 'badge bg-warning';
    return 'badge bg-secondary';
  }

  getVehicleInfo(driver: UserProfile): any {
    if (!driver.tag) return null;
    return {
      vehicleMake: driver.tag['vehicleMake'],
      vehicleModel: driver.tag['vehicleModel'],
      vehicleRegistration: driver.tag['vehicleRegistration'],
      loadCapacity: driver.tag['loadCapacity'] || driver.tag['cargoCapacity']
    };
  }

  hasVehicleInfo(driver: UserProfile): boolean {
    const vehicle = this.getVehicleInfo(driver);
    if (!vehicle) return false;
    return !!(vehicle.vehicleMake || vehicle.vehicleModel || vehicle.vehicleRegistration || vehicle.loadCapacity);
  }

  getVehicleDisplayText(driver: UserProfile): string {
    const vehicle = this.getVehicleInfo(driver);
    if (!vehicle) return 'Not provided';
    
    const parts: string[] = [];
    if (vehicle.vehicleMake) parts.push(vehicle.vehicleMake);
    if (vehicle.vehicleModel) parts.push(vehicle.vehicleModel);
    
    const makeModel = parts.length > 0 ? parts.join(' ') : null;
    const registration = vehicle.vehicleRegistration ? `(${vehicle.vehicleRegistration})` : null;
    
    const result = [makeModel, registration].filter(Boolean).join(' ');
    return result || 'Not provided';
  }

  getLoadCapacityText(driver: UserProfile): string {
    const vehicle = this.getVehicleInfo(driver);
    if (!vehicle || !vehicle.loadCapacity) return 'Not specified';
    return `${vehicle.loadCapacity} kg`;
  }

  toggleRemoveConfirmation(driverId: string | undefined): void {
    if (!driverId) return;
    this.removeConfirmation[driverId] = !this.removeConfirmation[driverId];
  }

  removeDriver(driver: UserProfile): void {
    if (!driver?.id) {
      this.errorMessage = 'Unable to remove driver: ID not found.';
      return;
    }

    const driverId = driver.id;
    this.isRemovingDriver[driverId] = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Call the service to remove the user from the system
    this.izingaService.deleteUser(driverId).subscribe({
      next: () => {
        this.successMessage = `Successfully removed ${driver.name} from your team.`;
        this.isRemovingDriver[driverId] = false;
        this.removeConfirmation[driverId] = false;
        
        // Remove from local list
        this.drivers = this.drivers.filter(m => m.id !== driverId);
        
        // Clear message after 3 seconds
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        this.errorMessage = `Failed to remove driver: ${error?.error?.message || 'Unknown error'}`;
        this.isRemovingDriver[driverId] = false;
        console.error('Error removing driver:', error);
      }
    });
  }
}
