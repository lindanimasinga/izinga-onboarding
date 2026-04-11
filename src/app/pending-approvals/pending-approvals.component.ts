import { Component, OnInit } from '@angular/core';
import { UserConfig, UserProfile } from '../model/models';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { StorageService } from '../service/storage-service.service';
import { ChatService } from '../service/chat.service';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { ChatSession } from '../model/chatSession';
import { of } from 'rxjs';

declare var google: any;

@Component({
  selector: 'app-pending-approvals',
  templateUrl: './pending-approvals.component.html',
  styleUrls: ['./pending-approvals.component.css']
})
export class PendingApprovalsComponent implements OnInit {

  activeTab: 'list' | 'map' | 'criminal-check' = 'list';
  selectedUserConfigLabel: string = '';
  userConfigOptions: UserConfig[] = [];
  pendingUsers: UserProfile[] = [];
  selectedUser?: UserProfile;
  loading: boolean = false;
  approving: boolean = false;
  coordinateLookupInProgress: boolean = false;
  coordinateLookupError: string = '';
  mapLoading: boolean = false;
  mapError: string = '';

  private pendingUsersMap?: any;
  private mapInfoWindow?: any;
  private mapMarkers: any[] = [];

  constructor(
    private izingaOrderManager: IzingaOrderManagementService,
    private storageService: StorageService,
    private chatService: ChatService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadPendingApprovals();
    this.loadUserConfig();
  }

  loadPendingApprovals(): void {
    this.loading = true;
    // This would need to be implemented in your API
    // For now, we'll use a placeholder method
    this.izingaOrderManager.getPendingApprovals()
      .subscribe(users => {
        this.pendingUsers = users.filter(user => !user.profileApproved);

        if (this.selectedUser && !this.filteredPendingUsers.some(user => user.id === this.selectedUser!.id)) {
          this.selectedUser = undefined;
        }

        this.loading = false;

        if (this.activeTab === 'map') {
          this.loadMapView();
        }
      }, error => {
        console.error('Error loading pending approvals:', error);
        this.loading = false;
      });
  }

  get criminalCheckPendingUsers(): UserProfile[] {
    return this.pendingUsers.filter(user => this.isCriminalCheckPending(user));
  }

  get filteredPendingUsers(): UserProfile[] {
    const visibleUsers = this.activeTab === 'criminal-check'
      ? this.criminalCheckPendingUsers
      : this.pendingUsers;

    const selectedLabel = this.selectedUserConfigLabel.trim().toLowerCase();
    if (!selectedLabel) {
      return visibleUsers;
    }

    return visibleUsers.filter(user =>
      (user.description || '').trim().toLowerCase() === selectedLabel
    );
  }

  onUserConfigFilterChange(): void {
    if (this.selectedUser && !this.filteredPendingUsers.some(user => user.id === this.selectedUser!.id)) {
      this.selectedUser = undefined;
    }

    if (this.activeTab === 'map') {
      this.loadMapView();
    }
  }

  isCriminalCheckPending(user: UserProfile): boolean {
    return user.crminalCheckData?.criminalRecordCheckAccepted == true
      && user.crminalCheckData?.criminalCheckPass == undefined;
  }

  getMissingFields(user: UserProfile): string[] {
    const config = this.userConfigOptions.find(cfg => cfg.label === user.description);
    if (!config) {
      return [];
    }

    return config.mandatoryFields
      .filter(field => !this.hasTagValue(user, field.name))
      .map(field => field.label || field.name);
  }

  hasMissingFields(user: UserProfile): boolean {
    return this.getMissingFields(user).length > 0;
  }

  formatMissingFieldName(fieldName: string): string {
    return fieldName
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private hasTagValue(user: UserProfile, fieldName: string): boolean {
    const value = user.tag?.[fieldName];

    if (value === null || value === undefined) {
      return false;
    }

    if (typeof value === 'string') {
      return value.trim().length > 0;
    }

    return true;
  }

  private loadUserConfig(): void {
    this.izingaOrderManager.getUserConfig().subscribe({
      next: config => {
        this.userConfigOptions = [...config].sort((a, b) => a.label.localeCompare(b.label));
      },
      error: error => {
        console.error('Error loading user config options:', error);
        this.userConfigOptions = [];
      }
    });
  }

  setActiveTab(tab: 'list' | 'map' | 'criminal-check'): void {
    this.activeTab = tab;

    if (this.selectedUser && !this.filteredPendingUsers.some(user => user.id === this.selectedUser!.id)) {
      this.selectedUser = undefined;
    }

    if (tab === 'map') {
      this.loadMapView();
    }
  }

  selectUser(user: UserProfile): void {
    this.selectedUser = user;
    this.coordinateLookupError = '';

    if (this.shouldLookupCoordinates(user)) {
      this.lookupCoordinatesFromAddress(user);
    }
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

  startChat(): void {
    if (!this.selectedUser || !this.selectedUser.id) return;

    // Get the current admin/approver's store or profile
    const adminId = this.storageService.userProfile?.id;
    if (!adminId) {
      alert('Admin profile not found. Please log in again.');
      return;
    }

    // Check for existing active chat session with this user
    this.chatService.getChatSessionsForCustomer(this.selectedUser.id).pipe(
      catchError(error => {
        console.error('Error checking existing sessions:', error);
        return of([]);
      })
    ).subscribe(existingSessions => {
      const activeSession = existingSessions.find(s => s.status === 'ACTIVE');
      
      if (activeSession) {
        // Navigate to existing session
        this.router.navigate(['/business/chat-sessions'], {
          queryParams: { sessionId: activeSession.id }
        });
      } else {
        // Create new chat session
        const sessionId = `session_${this.selectedUser!.id}_${adminId}_${Date.now()}`;
        const newSession: Omit<ChatSession, 'id' | 'createdAt' | 'updatedAt'> = {
          sessionId: sessionId,
          customerId: this.selectedUser!.id!,
          customerMobileNumber: this.selectedUser!.mobileNumber || '',
          customerName: this.selectedUser!.name,
          storeId: adminId,
          storeName: this.storageService.userProfile?.name || 'Admin',
          status: 'ACTIVE' as const,
          lastMessageTimestamp: new Date(),
          unreadMessagesCount: 0
        };

        this.chatService.createChatSession(newSession).subscribe(
          sessionId => {
            // Navigate to the new chat session
            this.router.navigate(['/business/chat-sessions'], {
              queryParams: { sessionId: sessionId }
            });
          },
          error => {
            console.error('Error creating chat session:', error);
            alert('Failed to start chat. Please try again.');
          }
        );
      }
    });
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

  private shouldLookupCoordinates(user: UserProfile): boolean {
    const hasAddress = typeof user.address === 'string' && user.address.trim().length > 0;
    const latitude = Number(user.latitude);
    const longitude = Number(user.longitude);
    const coordinatesMissing = !Number.isFinite(latitude) || !Number.isFinite(longitude);
    const coordinatesAreZero = latitude === 0 && longitude === 0;

    return hasAddress && (coordinatesMissing || coordinatesAreZero);
  }

  private lookupCoordinatesFromAddress(user: UserProfile): void {
    console.log('Looking up coordinates for user:', user);
    if (typeof google === 'undefined' || !google.maps || !google.maps.Geocoder) {
      this.coordinateLookupError = 'Google Maps geocoder is not available.';
      console.error('Google Maps geocoder is not available.');
      return;
    }

    this.coordinateLookupInProgress = true;

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: user.address }, (results: any[], status: string) => {
      this.coordinateLookupInProgress = false;

      if (!this.selectedUser || this.selectedUser.id !== user.id) {
        return;
      }

      if (status !== 'OK' || !results || results.length === 0) {
        this.coordinateLookupError = 'Unable to resolve GPS coordinates from the address.';
        console.error('Unable to resolve GPS coordinates from the address.');
        return;
      }

      const location = results[0].geometry?.location;
      if (!location) {
        this.coordinateLookupError = 'Unable to resolve GPS coordinates from the address.';
        return;
      }

      console.log('Geocoding result for user:', user, 'Coordinates:', location.lat(), location.lng());
      const latitude = typeof location.lat === 'function' ? location.lat() : location.lat;
      const longitude = typeof location.lng === 'function' ? location.lng() : location.lng;

      this.selectedUser.latitude = latitude;
      this.selectedUser.longitude = longitude;
      this.coordinateLookupError = '';
      this.updatePendingUserCoordinates(user.id, latitude, longitude);
      this.persistResolvedCoordinates(user, latitude, longitude);
    });
  }

  private updatePendingUserCoordinates(userId: string | undefined, latitude: number, longitude: number): void {
    if (!userId) {
      return;
    }

    this.pendingUsers = this.pendingUsers.map(user =>
      user.id === userId ? { ...user, latitude, longitude } : user
    );
  }

  private persistResolvedCoordinates(user: UserProfile, latitude: number, longitude: number): void {
    const updatedUser: UserProfile = {
      ...user,
      latitude,
      longitude
    };

    this.izingaOrderManager.updateCustomer(updatedUser).subscribe({
      next: persistedUser => {
        const persistedLatitude = Number(persistedUser?.latitude);
        const persistedLongitude = Number(persistedUser?.longitude);
        const finalLatitude = Number.isFinite(persistedLatitude) ? persistedLatitude : latitude;
        const finalLongitude = Number.isFinite(persistedLongitude) ? persistedLongitude : longitude;

        const currentSelectedUser = this.selectedUser;
        if (currentSelectedUser && currentSelectedUser.id === user.id) {
          currentSelectedUser.latitude = finalLatitude;
          currentSelectedUser.longitude = finalLongitude;
        }

        this.updatePendingUserCoordinates(user.id, finalLatitude, finalLongitude);
      },
      error: error => {
        console.error('Failed to persist resolved user coordinates:', error);
      }
    });
  }

  private async loadMapView(): Promise<void> {
    this.mapError = '';

    if (typeof google === 'undefined' || !google.maps || !google.maps.Map) {
      this.mapError = 'Google Maps is not available.';
      return;
    }

    this.mapLoading = true;

    // Wait for the map container to be rendered after tab switch.
    await new Promise(resolve => setTimeout(resolve, 0));
    const mapElement = document.getElementById('pending-users-map');

    if (!mapElement) {
      this.mapLoading = false;
      this.mapError = 'Map container is not ready yet. Please try again.';
      return;
    }

    if (!this.pendingUsersMap) {
      this.pendingUsersMap = new google.maps.Map(mapElement, {
        center: { lat: -26.2041, lng: 28.0473 },
        zoom: 8,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true
      });
      this.mapInfoWindow = new google.maps.InfoWindow();
    }

    await this.renderPendingUsersOnMap();
    this.mapLoading = false;
  }

  private async renderPendingUsersOnMap(): Promise<void> {
    if (!this.pendingUsersMap) {
      return;
    }

    this.clearMapMarkers();

    const bounds = new google.maps.LatLngBounds();
    const locations = await Promise.all(
      this.filteredPendingUsers.map(async user => ({
        user,
        coords: await this.resolveCoordinatesForMap(user)
      }))
    );

    let plottedCount = 0;

    locations.forEach(({ user, coords }) => {
      if (!coords) {
        return;
      }

      plottedCount += 1;
      const markerIcon = this.getMarkerIcon(user);
      const marker = new google.maps.Marker({
        position: coords,
        map: this.pendingUsersMap,
        title: user.name || user.mobileNumber || 'Pending User',
        icon: markerIcon
      });

      marker.addListener('click', () => {
        if (!this.mapInfoWindow) {
          return;
        }

        this.mapInfoWindow.setContent(this.buildMarkerPopup(user));
        this.mapInfoWindow.open(this.pendingUsersMap, marker);
      });

      this.mapMarkers.push(marker);
      bounds.extend(coords);
    });

    if (plottedCount === 0) {
      this.mapError = 'No pending users have a mappable location yet.';
      return;
    }

    if (plottedCount === 1) {
      this.pendingUsersMap.setCenter(bounds.getCenter());
      this.pendingUsersMap.setZoom(13);
      return;
    }

    this.pendingUsersMap.fitBounds(bounds);
  }

  private clearMapMarkers(): void {
    this.mapMarkers.forEach(marker => marker.setMap(null));
    this.mapMarkers = [];
  }

  private async resolveCoordinatesForMap(user: UserProfile): Promise<{ lat: number; lng: number } | null> {
    const latitude = Number(user.latitude);
    const longitude = Number(user.longitude);
    const hasValidCoordinates = Number.isFinite(latitude)
      && Number.isFinite(longitude)
      && !(latitude === 0 && longitude === 0);

    if (hasValidCoordinates) {
      return { lat: latitude, lng: longitude };
    }

    const address = (user.address || '').trim();
    if (!address) {
      return null;
    }

    const geocodedCoordinates = await this.geocodeAddress(address);
    if (!geocodedCoordinates) {
      return null;
    }

    this.updatePendingUserCoordinates(user.id, geocodedCoordinates.lat, geocodedCoordinates.lng);
    const currentSelectedUser = this.selectedUser;
    if (currentSelectedUser && currentSelectedUser.id === user.id) {
      currentSelectedUser.latitude = geocodedCoordinates.lat;
      currentSelectedUser.longitude = geocodedCoordinates.lng;
    }
    this.persistResolvedCoordinates(user, geocodedCoordinates.lat, geocodedCoordinates.lng);

    return geocodedCoordinates;
  }

  private geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    return new Promise(resolve => {
      if (typeof google === 'undefined' || !google.maps || !google.maps.Geocoder) {
        resolve(null);
        return;
      }

      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address }, (results: any[], status: string) => {
        if (status !== 'OK' || !results || results.length === 0) {
          resolve(null);
          return;
        }

        const location = results[0].geometry?.location;
        if (!location) {
          resolve(null);
          return;
        }

        const lat = typeof location.lat === 'function' ? location.lat() : location.lat;
        const lng = typeof location.lng === 'function' ? location.lng() : location.lng;
        resolve({ lat, lng });
      });
    });
  }

  private buildMarkerPopup(user: UserProfile): string {
    const name = this.escapeHtml(user.name || 'Unknown User');
    const customerType = this.escapeHtml(this.getCustomerType(user));
    const vehicleMake = this.escapeHtml(this.getVehicleMake(user));
    const vehicleModel = this.escapeHtml(this.getVehicleModel(user));

    return `
      <div style="min-width: 220px; color: #333; font-family: Arial, sans-serif;">
        <h6 style="margin: 0 0 8px 0;">${name}</h6>
        <p style="margin: 0 0 4px 0;"><strong>Customer Type:</strong> ${customerType}</p>
        <p style="margin: 0 0 4px 0;"><strong>Vehicle Make:</strong> ${vehicleMake}</p>
        <p style="margin: 0;"><strong>Vehicle Model:</strong> ${vehicleModel}</p>
      </div>
    `;
  }

  private getMarkerIcon(user: UserProfile): any {
    const imageUrl = (user.imageUrl || '').trim();
    if (!imageUrl) {
      return undefined;
    }

    return {
      url: imageUrl,
      scaledSize: new google.maps.Size(42, 42),
      anchor: new google.maps.Point(21, 42),
      labelOrigin: new google.maps.Point(21, 52)
    };
  }

  private getCustomerType(user: UserProfile): string {
    return this.getUserTagValue(user, ['customerType', 'customer_type', 'customer type', 'type'])
      || user.description
      || 'Not provided';
  }

  private getVehicleMake(user: UserProfile): string {
    return this.getUserTagValue(user, ['vehicleMake', 'vehicle_make', 'vehicle make', 'make']) || 'Not provided';
  }

  private getVehicleModel(user: UserProfile): string {
    return this.getUserTagValue(user, ['vehicleModel', 'vehicle_model', 'vehicle model', 'model']) || 'Not provided';
  }

  private getUserTagValue(user: UserProfile, candidateKeys: string[]): string | undefined {
    if (!user.tag) {
      return undefined;
    }

    const tags = user.tag as { [key: string]: any };
    const normalizedCandidateKeys = candidateKeys.map(key => this.normalizeTagKey(key));
    const matchedTagKey = Object.keys(tags).find(key =>
      normalizedCandidateKeys.includes(this.normalizeTagKey(key))
    );

    if (!matchedTagKey) {
      return undefined;
    }

    const value = tags[matchedTagKey];
    if (value === null || value === undefined || value === '') {
      return undefined;
    }

    return String(value);
  }

  private normalizeTagKey(key: string): string {
    return key.toLowerCase().replace(/[\s_-]/g, '');
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}