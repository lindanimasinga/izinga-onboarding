import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { UserProfile } from '../model/userProfile';
import { ProfileAvailabilityStatus } from '../model/userProfile';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { AnalyticsService } from '../service/analytics.service';

/**
 * Store-scoped counterpart to TeamMessengersComponent (MESSENGER_ADMIN's "My Drivers" page).
 * Embedded inside business-update.component.html via [storeId]="shop.id" rather than reading
 * the logged-in user's own id — the page's STORE_ADMIN role gate already applies upstream.
 */
@Component({
  selector: 'app-store-messengers',
  templateUrl: './store-messengers.component.html',
  styleUrls: ['./store-messengers.component.css']
})
export class StoreMessengersComponent implements OnInit, OnChanges {
  @Input() storeId: string | undefined;

  drivers: UserProfile[] = [];
  isLoading = true;
  errorMessage = '';
  successMessage = '';

  // Add driver form - Phase 1: Check/Lookup
  showAddForm = false;
  newDriverMobileNumber = '';
  isCheckingDriver = false;
  addErrorMessage = '';
  duplicateFoundMessage = '';

  // Add driver form - Phase 2: Create new
  showCreateForm = false;
  newDriverName = '';
  newDriverSurname = '';
  isCreatingDriver = false;
  createErrorMessage = '';

  // Remove driver
  isRemovingDriver: { [key: string]: boolean } = {};
  removeConfirmation: { [key: string]: boolean } = {};

  constructor(
    private izingaService: IzingaOrderManagementService,
    private analytics: AnalyticsService
  ) {}

  ngOnInit(): void {
    this.analytics.logScreenView('store_drivers');
    this.loadDrivers();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['storeId'] && this.storeId) {
      this.loadDrivers();
    }
  }

  private loadDrivers(): void {
    if (!this.storeId) {
      this.errorMessage = 'Save your business profile first to manage drivers.';
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.izingaService.getAllMessengersForStore(this.storeId).subscribe({
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
    this.newDriverMobileNumber = '';
    this.addErrorMessage = '';
    this.duplicateFoundMessage = '';
  }

  checkAndAddDriver(): void {
    if (!this.newDriverMobileNumber.trim()) {
      this.addErrorMessage = 'Please enter a mobile number.';
      return;
    }

    this.isCheckingDriver = true;
    this.addErrorMessage = '';
    this.duplicateFoundMessage = '';
    this.createErrorMessage = '';

    // Check if driver already exists
    this.izingaService.getCustomerByPhoneNumber(this.newDriverMobileNumber).subscribe({
      next: (existingUser) => {
        if (existingUser && existingUser.id) {
          // Driver already exists — info-only, never auto-linked to this store
          this.duplicateFoundMessage = `Profile exists. Role: ${existingUser.role}. Mobile: ${existingUser.mobileNumber}`;
          this.isCheckingDriver = false;
          return;
        }
        // Profile does not exist, show form to create one
        this.showCreateForm = true;
        this.isCheckingDriver = false;
      },
      error: () => {
        // 404 or error means user doesn't exist, show form to create one
        this.showCreateForm = true;
        this.isCheckingDriver = false;
      }
    });
  }

  createNewDriver(): void {
    if (!this.newDriverName.trim() || !this.newDriverSurname.trim()) {
      this.createErrorMessage = 'Please enter both first and last name.';
      return;
    }

    const storeId = this.storeId;
    if (!storeId) {
      this.createErrorMessage = 'Store not found. Please save your business profile and try again.';
      return;
    }

    this.isCreatingDriver = true;
    this.createErrorMessage = '';

    // Create new driver profile linked to this store
    const newDriver: UserProfile = {
      name: this.newDriverName.trim(),
      surname: this.newDriverSurname.trim(),
      mobileNumber: this.newDriverMobileNumber.trim(),
      role: UserProfile.RoleEnum.MESSENGER,
      imageUrl: '',
      bank: {} as any,
      tag: {
        storeId: storeId
      },
      availabilityStatus: ProfileAvailabilityStatus.Availability.OFFLINE
    };

    this.izingaService.registerCustomer(newDriver).subscribe({
      next: (createdDriver) => {
        this.successMessage = `Successfully created and added ${createdDriver.name} to this store!. They will receive a WhatsApp message with instructions to complete their profile and start accepting deliveries.`;
        this.isCreatingDriver = false;

        // Reset form
        this.resetForm();

        // Reload drivers list
        setTimeout(() => {
          this.loadDrivers();
          this.toggleAddForm();
        }, 1500);
      },
      error: (error) => {
        this.createErrorMessage = 'Failed to create driver profile. Please try again.';
        this.isCreatingDriver = false;
        console.error('Error creating driver:', error);
      }
    });
  }

  cancelCreateDriver(): void {
    this.showCreateForm = false;
    this.newDriverName = '';
    this.newDriverSurname = '';
    this.createErrorMessage = '';
  }

  private resetForm(): void {
    this.showAddForm = false;
    this.showCreateForm = false;
    this.newDriverMobileNumber = '';
    this.newDriverName = '';
    this.newDriverSurname = '';
    this.addErrorMessage = '';
    this.duplicateFoundMessage = '';
    this.createErrorMessage = '';
  }

  cancelAddDriver(): void {
    this.resetForm();
  }

  backToPhaseOne(): void {
    this.cancelCreateDriver();
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

    this.izingaService.deleteUser(driverId).subscribe({
      next: () => {
        this.successMessage = `Successfully removed ${driver.name} from this store.`;
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
