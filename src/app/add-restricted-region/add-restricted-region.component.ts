import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';

declare var google: any;

interface NewRegionData {
  name: string;
  description: string;
  center: {
    latitude: number;
    longitude: number;
  };
  radius?: number;
  isActive: boolean;
}

@Component({
  selector: 'app-add-restricted-region',
  templateUrl: './add-restricted-region.component.html',
  styleUrls: ['./add-restricted-region.component.css']
})
export class AddRestrictedRegionComponent implements OnInit {

  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;
  @ViewChild('searchInput', { static: false }) searchInput!: ElementRef;

  map: any;
  marker: any;
  circle: any;
  autocomplete: any;
  
  newRegion: NewRegionData = {
    name: '',
    description: '',
    center: {
      latitude: -29.835102349346453, // Default to Johannesburg
      longitude: 30.9085516,
    },
    radius: 1000,
    isActive: true
  };

  saving: boolean = false;
  isEditMode: boolean = false;
  regionId: string | null = null;

  constructor(
    private izingaOrderManager: IzingaOrderManagementService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    // Check if we're in edit mode
    this.regionId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.regionId;
    
    if (this.isEditMode) {
      this.loadRegionForEdit();
    }
    
    // Initialize map when component loads
    setTimeout(() => {
      this.initializeMap();
    }, 100);
  }

  private loadRegionForEdit(): void {
    if (!this.regionId) return;
    
    // Get region data from API or service
    this.izingaOrderManager.getRestrictedRegion(this.regionId)
      .subscribe({
        next: (region) => {
          if (region) {
            this.newRegion.name = region.name;
            this.newRegion.description = region.description || '';
            
            if (region.center) {
              this.newRegion.center = {
                latitude: region.center.latitude,
                longitude: region.center.longitude
              };
              this.newRegion.radius = region.radius;
            }
            
            this.newRegion.isActive = region.isActive;
            
            // Update map after data loads
            setTimeout(() => {
              this.updateMapDisplay();
            }, 200);
          }
        },
        error: (error) => {
          console.error('Error loading region:', error);
          alert('Failed to load region data. Redirecting to create mode.');
          this.router.navigate(['/business/add-restricted-region']);
        }
      });
  }

  private resetForm(): void {
    this.newRegion = {
      name: '',
      description: '',
      center: {
        latitude: -26.2041,
        longitude: 28.0473
      },
      radius: 1000,
      isActive: true
    };
  }

  private initializeMap(): void {
    if (!this.mapContainer) return;

    // Initialize map
    this.map = new google.maps.Map(this.mapContainer.nativeElement, {
      center: { lat: this.newRegion.center.latitude, lng: this.newRegion.center.longitude },
      zoom: 12,
      restriction: {
        latLngBounds: {
          north: -22.0,
          south: -35.0,
          west: 16.0,
          east: 33.0
        }
      }
    });

    // Initialize autocomplete for search
    if (this.searchInput) {
      this.autocomplete = new google.maps.places.Autocomplete(
        this.searchInput.nativeElement,
        {
          componentRestrictions: { country: ['ZA'] },
          fields: ['geometry', 'name', 'formatted_address']
        }
      );

      this.autocomplete.addListener('place_changed', () => {
        const place = this.autocomplete.getPlace();
        if (place.geometry) {
          const location = place.geometry.location;
          this.updateLocation(location.lat(), location.lng());
          this.newRegion.name = place.name || place.formatted_address || '';
        }
      });
    }

    // Add click listener to map
    this.map.addListener('click', (event: any) => {
      this.updateLocation(event.latLng.lat(), event.latLng.lng());
    });

    // Initialize marker and circle
    this.updateMapDisplay();
  }

  private updateLocation(lat: number, lng: number): void {
    this.newRegion.center.latitude = lat;
    this.newRegion.center.longitude = lng;
    this.updateMapDisplay();
  }

  private updateMapDisplay(): void {
    if (!this.map) return;

    const position = {
      lat: this.newRegion.center.latitude,
      lng: this.newRegion.center.longitude
    };

    // Update map center
    this.map.setCenter(position);

    // Update marker
    if (this.marker) {
      this.marker.setPosition(position);
    } else {
      this.marker = new google.maps.Marker({
        position: position,
        map: this.map,
        draggable: true,
        title: 'Restricted Region Center'
      });

      this.marker.addListener('dragend', (event: any) => {
        this.updateLocation(event.latLng.lat(), event.latLng.lng());
      });
    }

    // Update circle
    if (this.circle) {
      this.circle.setCenter(position);
      this.circle.setRadius(this.newRegion.radius);
    } else {
      this.circle = new google.maps.Circle({
        strokeColor: '#e74c3c',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#e74c3c',
        fillOpacity: 0.15,
        map: this.map,
        center: position,
        radius: this.newRegion.radius,
        editable: false
      });
    }
  }

  onRadiusChange(): void {
    this.updateMapDisplay();
  }

  onCoordinateChange(): void {
    this.updateMapDisplay();
  }

  saveRegion(): void {
    if (!this.isFormValid()) return;

    this.saving = true;

    const regionData = {
      ...this.newRegion,
      id: this.regionId || this.generateId(),
      createdDate: this.isEditMode ? undefined : new Date(),
      updatedDate: this.isEditMode ? new Date() : undefined
    };

    const operation = this.isEditMode 
      ? this.izingaOrderManager.updateRestrictedRegion(this.regionId!, regionData)
      : this.izingaOrderManager.createRestrictedRegion(regionData);

    operation.subscribe({
        next: (response) => {
          console.log(`Region ${this.isEditMode ? 'updated' : 'created'} successfully:`, response);
          this.saving = false;
          alert(`Restricted region ${this.isEditMode ? 'updated' : 'created'} successfully!`);
          this.router.navigate(['/business/restricted-regions']);
        },
        error: (error) => {
          console.error('Error creating region:', error);
          this.saving = false;
          alert('Failed to create region. Please try again.');
        }
      });
  }

  isFormValid(): boolean {
    return !!(this.newRegion.name && 
             this.newRegion.center.latitude && 
             this.newRegion.center.longitude && 
             (this.newRegion.radius || 0) > 0);
  }

  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  getCurrentLocationName(): string {
    if (!this.newRegion.center.latitude || !this.newRegion.center.longitude) {
      return 'No location selected';
    }
    return `${this.newRegion.center.latitude.toFixed(4)}, ${this.newRegion.center.longitude.toFixed(4)}`;
  }

  cancel(): void {
    this.router.navigate(['/business/restricted-regions']);
  }
}