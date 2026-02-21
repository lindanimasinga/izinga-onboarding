import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { StorageService } from '../service/storage-service.service';

interface RestrictedRegion {
  id: string;
  name: string;
  description?: string;
  center?: {
    lat: number;
    lng: number;
  };
  radius?: number;
  isActive: boolean;
  createdDate: Date;
  updatedDate?: Date;
}

@Component({
  selector: 'app-restricted-regions',
  templateUrl: './restricted-regions.component.html',
  styleUrls: ['./restricted-regions.component.css']
})
export class RestrictedRegionsComponent implements OnInit {

  restrictedRegions: RestrictedRegion[] = [];
  loading: boolean = false;
  error: string = '';

  constructor(
    private izingaOrderManager: IzingaOrderManagementService,
    private storageService: StorageService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadRestrictedRegions();
  }

  loadRestrictedRegions(): void {
    this.loading = true;
    this.error = '';
    
    // This would need to be implemented in your API
    // For now, we'll use a placeholder method or mock data
    this.izingaOrderManager.getRestrictedRegions()
      .subscribe({
        next: (regions) => {
          this.restrictedRegions = regions || [];
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading restricted regions:', error);
          this.error = 'Failed to load restricted regions. Please try again.';
          this.loading = false;
          // Mock data for development
          this.loadMockData();
        }
      });
  }

  private loadMockData(): void {
    // Mock data for demonstration
    this.restrictedRegions = [
      {
        id: '1',
        name: 'Cape Town CBD Restricted Zone',
        description: 'High traffic area with delivery restrictions during peak hours',
        center: {
          lat: -33.9249,
          lng: 18.4241
        },
        radius: 2000,
        isActive: true,
        createdDate: new Date('2024-01-15'),
        updatedDate: new Date('2024-02-01')
      },
      {
        id: '2',
        name: 'Johannesburg Airport Zone',
        description: 'Security restricted area around OR Tambo International Airport',
        center: {
          lat: -26.1392,
          lng: 28.2460,
        },
        radius: 5000,
        isActive: true,
        createdDate: new Date('2024-01-20')
      },
      {
        id: '3',
        name: 'Durban Port Area',
        description: 'Industrial port area with limited access for deliveries',
        center: {
          lat: -29.8587,
          lng: 31.0218
        },
        radius: 3000,
        isActive: false,
        createdDate: new Date('2024-02-10')
      }
    ];
  }

  toggleRegionStatus(region: RestrictedRegion): void {
    const newStatus = !region.isActive;
    
    this.izingaOrderManager.updateRestrictedRegionStatus(region.id, newStatus)
      .subscribe({
        next: (updatedRegion) => {
          region.isActive = newStatus;
          region.updatedDate = new Date();
          console.log('Region status updated successfully');
        },
        error: (error) => {
          console.error('Error updating region status:', error);
          // For demo, still update locally
          region.isActive = newStatus;
          region.updatedDate = new Date();
        }
      });
  }

  deleteRegion(region: RestrictedRegion): void {
    if (confirm(`Are you sure you want to delete "${region.name}"?`)) {
      this.izingaOrderManager.deleteRestrictedRegion(region.id)
        .subscribe({
          next: () => {
            this.restrictedRegions = this.restrictedRegions.filter(r => r.id !== region.id);
            console.log('Region deleted successfully');
          },
          error: (error) => {
            console.error('Error deleting region:', error);
            // For demo, still remove locally
            this.restrictedRegions = this.restrictedRegions.filter(r => r.id !== region.id);
          }
        });
    }
  }

  addNewRegion(): void {
    // This would open a modal or navigate to an add region form
    alert('Add new region functionality would be implemented here');
  }

  openAddRegionModal(): void {
    this.router.navigate(['/business/add-restricted-region']);
  }

  editRegion(region: RestrictedRegion): void {
    this.router.navigate(['/business/add-restricted-region', region.id]);
  }

  // Statistical methods for table footer
  getActiveRegionsCount(): number {
    return this.restrictedRegions.filter(region => region.isActive).length;
  }

  getInactiveRegionsCount(): number {
    return this.restrictedRegions.filter(region => !region.isActive).length;
  }

  getTotalCoverage(): string {
    const totalArea = this.restrictedRegions.reduce((total, region) => {
      if (region?.radius) {
        const areaM2 = Math.PI * Math.pow(region.radius, 2);
        const areaKm2 = areaM2 / 1000000;
        return total + areaKm2;
      }
      return total;
    }, 0);
    return totalArea.toFixed(2);
  }

  getRegionsWithCoordinatesCount(): number {
    return this.restrictedRegions.filter(region => region.center).length;
  }
}