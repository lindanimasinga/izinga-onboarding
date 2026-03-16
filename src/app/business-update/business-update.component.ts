import { Component } from '@angular/core';
import { DatePipe } from '@angular/common';
import { UserProfile } from '../model/models';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { ActivatedRoute, Route, Router } from '@angular/router';

import { map, mergeMap, catchError, flatMap } from 'rxjs/operators';
import { from, Observable, of, throwError } from 'rxjs';
import { StoreProfile } from '../model/storeProfile';
import { Stock } from '../model/stock';
import { BusinessHours } from '../model/businessHours';
import { StorageService } from '../service/storage-service.service';
import { AnalyticsService } from '../service/analytics.service';

@Component({
  selector: 'app-business-update',
  templateUrl: './business-update.component.html',
  styleUrls: ['./business-update.component.css']
})
export class BusinessUpdateComponent {

  shop: StoreProfile = {
    name: '',
    description: '',
    businessHours: [
      { day: 'MONDAY', open: new Date(), close: new Date() },
      { day: 'TUESDAY', open: new Date(), close: new Date() },
      { day: 'WEDNESDAY', open: new Date(), close: new Date() },
      { day: 'THURSDAY', open: new Date(), close: new Date() },
      { day: 'FRIDAY', open: new Date(), close: new Date() },
      { day: 'SATURDAY', open: new Date(), close: new Date() },
      { day: 'SUNDAY', open: new Date(), close: new Date() }
    ] as BusinessHours[],
    rates: {
      standardDeliveryPrice: 0,
      standardDeliveryKm: 0,
      ratePerKm: 0,
      ratePerVolumeCM2: 0,
      ratePerWeightKg: 0
    }
  }

  stockList: Stock[] = [];
  storeId?: string| null;
  categories = new Set<string | undefined>()
  selectedFile: File | null = null;
  userId: string | undefined


  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private izingaOrderManagementService: IzingaOrderManagementService,
    private datePipe: DatePipe,
    private storageService: StorageService,
    private analytics: AnalyticsService
  ) {}

  ngOnInit(): void {
    this.analytics.logScreenView('store_menu');
    // Get the store ID from the route parameters
    this.route.params.subscribe(params => {
      this.izingaOrderManagementService.getStoreById(params['id'])
      .subscribe(store => {
        this.shop = store
        this.categories = new Set(this.shop?.stockList?.sort((a, b) => this.isPromotion(a) ? -1 : 1).map(stk => stk.group))
        this.stockList = this.shop.stockList!
        console.log('Store details fetched successfully:', this.shop);
        if (this.shop.rates == undefined) {
          this.shop.rates = {
            standardDeliveryPrice: 0,
            standardDeliveryKm: 0,
            ratePerKm: 0,
            ratePerVolumeCM2: 0,
            ratePerWeightKg: 0
          }
        }
      })
    })
  }

  formatTime(date?: Date): string | null {
    // Convert Date object to a time string in the format of "HH:MM"
    return date ? this.datePipe.transform(date, 'HH:mm') : '';
  }

  updateTime(hours: BusinessHours, event: string, type: 'open' | 'close'): void {
    // Update the open or close time in the BusinessHours array with the selected time
    const timeParts = event.split(':');
    const updatedDate = new Date();
    updatedDate.setHours(+timeParts[0], +timeParts[1], 0); // Set hours, minutes, and reset seconds
    hours[type] = updatedDate;
  }

  // Fetch store details using the store ID
  fetchStoreDetails(storeId: string): void {
    this.izingaOrderManagementService.getStoreById(storeId).
    subscribe(
      data => {
        this.shop = data;
        this.stockList = data.stockList!
        console.log('Store details fetched successfully:', data);
      },
      (error) => {
        console.error('Error fetching store details:', error);
      }
    );
  }

  // Add a new stock item to the list
  addStockItem() {
    const newStockItem: Stock = {
      name: '',
      description: '',
      detailedDescription: '',
      price: 0,
      quantity: 0,
      images: [],
      mandatorySelection: [],
      optionalSelection: [],
      group: 'Items' // Default group if none is specified
    };
    this.stockList.push(newStockItem);
  }

  removeStockItem(stockItem: Stock) {
    const index = this.stockList.indexOf(stockItem);
    if (index > -1) {
      this.stockList.splice(index, 1);
    }
  }

  // Register the business and stock items
  registerBusinessAndStock() {

    if (this.shop.featuredExpiry == undefined) {
      this.shop.featuredExpiry = new Date()
    }

    if (!this.shop.ownerId) {
      console.log(`setting store owner id to ${this.storageService?.userProfile?.id}`);
      this.shop.ownerId = this.storageService.userProfile?.id
      this.shop.shortName = this.replaceSpecialChars(this.shop.name)
    }

    var call = this.selectedFile ? this.uploadImage() : of("")
      call.pipe(
        mergeMap(() => this.shop.id ? this.izingaOrderManagementService.updateStore(this.shop) : this.izingaOrderManagementService.createStore(this.shop))
      ).subscribe(
      data => {
        this.stockList = data.stockList!
        console.log('Store details updated successfully:', data);
        this.storageService.infoMessage = "Store details updated successfully"
        if(this.shop.id) {
          window.location.reload()
        } else {
          this.router.navigate([data.id], {relativeTo: this.route})
        }
        
      },
      (error) => {
        //console.error('Error fetching store details:');
        this.storageService.errorMessage = "Updated store details failed"
      }
    );
  }
  
    onFileSelected(event: any): void {
      this.selectedFile = event.target.files[0];  // Capture the file
    }
  
    uploadImage(): Observable<string> {
      return this.izingaOrderManagementService.uploadFile(this.selectedFile!)
        .pipe(
          map ((response: any) => {
            console.log('File uploaded successfully:', response);
            this.shop.imageUrl=response.url
            return response.url
          })
        );
      
    }

    replaceSpecialChars(input?: string): string| undefined {
      return input?.replace(/[^a-zA-Z0-9]/g, '_');
    }


  shopItems(category?: string): Stock[] | undefined {
    return this.shop?.stockList?.filter(item => item.group?.toLowerCase() == category?.toLowerCase())
  }

  isPromotion(stock: Stock): boolean {
    return this.isPromotionCategory(stock.group!)
  }

  isPromotionCategory(category: string): boolean {
    var promoTags = ["deal", "special", "promotion", "promotions", "deals", "specials", "family meals", "featured items"]
    return promoTags.includes(category?.toLowerCase())
  }

  setAvailabilityStatus(status: 'ONLINE' | 'AWAY' | 'OFFLINE') {
    if (this.shop) {
      this.shop.availabilityStatus = status;
      this.izingaOrderManagementService.updateStore(this.shop)
      .subscribe(resp => {
        console.log("Updated availability status to ", status)
        alert(`Your availability status has been set to ${status}`);
      });
    }
  }

  /**
   * Calculate delivery rate based on distance, volume, and weight
   * @param distance Distance in kilometers
   * @param volumeCM2 Volume in square centimeters
   * @param weightKg Weight in kilograms
   * @returns Total delivery rate
   */
  calculateDeliveryRate(distance: number, volumeCM2: number, weightKg: number): number {
    if (!this.shop?.rates) {
      return 0;
    }

    const rates = this.shop.rates;
    let totalRate = 0;

    // Base delivery price for standard distance
    if (rates.standardDeliveryPrice) {
      totalRate += rates.standardDeliveryPrice;
    }

    // Additional rate for distance beyond standard delivery km
    if (rates.standardDeliveryKm && rates.ratePerKm && distance > rates.standardDeliveryKm) {
      const extraDistance = distance - rates.standardDeliveryKm;
      totalRate += extraDistance * rates.ratePerKm;
    }

    // Volume-based rate
    if (rates.ratePerVolumeCM2 && volumeCM2 > 0) {
      totalRate += volumeCM2 * rates.ratePerVolumeCM2;
    }

    // Weight-based rate
    if (rates.ratePerWeightKg && weightKg > 0) {
      totalRate += weightKg * rates.ratePerWeightKg;
    }

    return Math.max(totalRate, 0); // Ensure rate is never negative
  }

}
