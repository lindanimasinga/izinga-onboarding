import { Component } from '@angular/core';
import { DatePipe } from '@angular/common';
import { UserProfile } from '../model/models';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { ActivatedRoute, Route, Router } from '@angular/router';

import { map, mergeMap, catchError, flatMap } from 'rxjs/operators';
import { from, Observable, of, throwError } from 'rxjs';
import { Category, StoreProfile } from '../model/storeProfile';
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

  previewVehicleType: 'BIKE' | 'CAR' | 'BAKKIE' | 'TRUCK' = 'CAR';
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
      standardDeliveryPriceBike: 0,
      standardDeliveryPriceCar: 0,
      standardDeliveryPriceBakkie: 0,
      standardDeliveryPriceTruck: 0,
      ratePerKmBike: 0,
      ratePerKmCar: 0,
      ratePerKmBakkie: 0,
      ratePerKmTruck: 0,
      ratePerKm: 0,
      ratePerVolumeCM2: 0,
      ratePerWeightKg: 0,
      labourRatePerFloor: 0
    }
  }

  stockList: Stock[] = [];
  storeId?: string| null;
  categories = new Set<string | undefined>()
  selectedFile: File | null = null;
  userId: string | undefined
  previewWeightKg = 2;
  previewFloors = 0;

  // --- Issue #11/#12: Delivery category management ---
  /** Working copy of the store's delivery categories. */
  deliveryCategories: Category[] = [];
  /** Tracks which category row is in add-field editing mode. */
  newCategoryName = '';
  categoryValidationError = '';
  /** Per-category upload state: maps category id to upload-in-progress flag. */
  categoryUploading: { [id: string]: boolean } = {};
  /** Per-category image load error flag for placeholder fallback. */
  categoryImageError: { [id: string]: boolean } = {};


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
        // Issue #11: initialise delivery categories — treat missing as empty
        this.deliveryCategories = this.shop.categories ? [...this.shop.categories] : [];
        console.log('Store details fetched successfully:', this.shop);
        if (this.shop.rates == undefined) {
          this.shop.rates = {
            standardDeliveryPrice: 0,
            standardDeliveryKm: 0,
            ratePerKmBike: 0,
            ratePerKmCar: 0,
            ratePerKmBakkie: 0,
            ratePerKmTruck: 0,
            ratePerKm: 0,
            ratePerVolumeCM2: 0,
            ratePerWeightKg: 0,
            labourRatePerFloor: 0,
            standardDeliveryPriceBike: 0,
            standardDeliveryPriceCar: 0,
            standardDeliveryPriceBakkie: 0,
            standardDeliveryPriceTruck: 0,
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

    // Issue #11: always send the full categories array to the backend
    this.syncCategoriesToShop();

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
      return this.izingaOrderManagementService.uploadFile(this.selectedFile!, false)
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
   * Calculate delivery rate based on distance, volume, weight, and floors.
   */
  calculateDeliveryRate(
    distance: number,
    volumeCM2: number,
    weightKg: number,
    floors: number = 0,
    vehicleType: 'BIKE' | 'CAR' | 'BAKKIE' | 'TRUCK' = 'CAR'
  ): number {
    if (!this.shop?.rates) {
      return 0;
    }

    const rates = this.shop.rates;
    let totalRate = 0;

    // Base delivery price for selected vehicle type with fallback
    const baseVehicleRate = this.getVehicleStandardRate(vehicleType);
    if (baseVehicleRate > 0) {
      totalRate += baseVehicleRate;
    } else if (rates.standardDeliveryPrice) {
      totalRate += rates.standardDeliveryPrice;
    }

    // Additional rate for distance beyond standard delivery km
    const selectedRatePerKm = this.getVehicleRatePerKm(vehicleType);
    if (rates.standardDeliveryKm && selectedRatePerKm && distance > rates.standardDeliveryKm) {
      const extraDistance = distance - rates.standardDeliveryKm;
      totalRate += extraDistance * selectedRatePerKm;
    }

    // Volume-based rate
    if (rates.ratePerVolumeCM2 && volumeCM2 > 0) {
      totalRate += volumeCM2 * rates.ratePerVolumeCM2;
    }

    // Weight-based rate
    if (rates.ratePerWeightKg && weightKg > 0) {
      totalRate += weightKg * rates.ratePerWeightKg;
    }

    // Labour-based rate for carrying items across floors
    if (rates.labourRatePerFloor && floors > 0) {
      totalRate += floors * rates.labourRatePerFloor * weightKg;
    }

    return Math.max(totalRate, 0); // Ensure rate is never negative
  }

  private getVehicleStandardRate(vehicleType: 'BIKE' | 'CAR' | 'BAKKIE' | 'TRUCK'): number {
    if (!this.shop?.rates) {
      return 0;
    }

    switch (vehicleType) {
      case 'BIKE':
        return this.shop.rates.standardDeliveryPriceBike || 0;
      case 'CAR':
        return this.shop.rates.standardDeliveryPriceCar || 0;
      case 'BAKKIE':
        return this.shop.rates.standardDeliveryPriceBakkie || 0;
      case 'TRUCK':
        return this.shop.rates.standardDeliveryPriceTruck || 0;
      default:
        return this.shop.rates.standardDeliveryPrice || 0;
    }
  }

  private getVehicleRatePerKm(vehicleType: 'BIKE' | 'CAR' | 'BAKKIE' | 'TRUCK'): number {
    if (!this.shop?.rates) {
      return 0;
    }

    switch (vehicleType) {
      case 'BIKE':
        return this.shop.rates.ratePerKmBike || this.shop.rates.ratePerKm || 0;
      case 'CAR':
        return this.shop.rates.ratePerKmCar || this.shop.rates.ratePerKm || 0;
      case 'BAKKIE':
        return this.shop.rates.ratePerKmBakkie || this.shop.rates.ratePerKm || 0;
      case 'TRUCK':
        return this.shop.rates.ratePerKmTruck || this.shop.rates.ratePerKm || 0;
      default:
        return this.shop.rates.ratePerKm || 0;
    }
  }

  getDistanceAdjustmentKm(distance: number): number {
    const standardKm = this.shop?.rates?.standardDeliveryKm || 0;
    return distance > standardKm ? distance - standardKm : 0;
  }

  getDistanceAdjustmentAmount(distance: number): number {
    const extraDistance = this.getDistanceAdjustmentKm(distance);
    const ratePerKm = this.getVehicleRatePerKm(this.previewVehicleType);
    return extraDistance * ratePerKm;
  }

  // -----------------------------------------------------------------------
  // Issue #11: Delivery category management
  // -----------------------------------------------------------------------

  /** Validate and add a new category to the working list. */
  addDeliveryCategory(): void {
    this.categoryValidationError = '';
    const name = this.newCategoryName.trim();
    if (!name) {
      this.categoryValidationError = 'Category name must not be empty.';
      return;
    }
    const duplicate = this.deliveryCategories.some(
      c => c.name.trim().toLowerCase() === name.toLowerCase()
    );
    if (duplicate) {
      this.categoryValidationError = `A category named "${name}" already exists.`;
      return;
    }
    const newCategory: Category = {
      id: this.generateTempId(),
      name,
      image: '',
      active: true
    };
    this.deliveryCategories = [...this.deliveryCategories, newCategory];
    this.newCategoryName = '';
  }

  /** Remove a category from the working list by id. */
  removeDeliveryCategory(category: Category): void {
    this.deliveryCategories = this.deliveryCategories.filter(c => c.id !== category.id);
  }

  /** Toggle active flag on a category. */
  toggleCategoryActive(category: Category): void {
    category.active = !category.active;
  }

  /**
   * Validate an edited category name inline.
   * Returns an error string, or empty string if valid.
   */
  validateCategoryName(category: Category): string {
    const name = category.name.trim();
    if (!name) {
      return 'Category name must not be empty.';
    }
    const duplicate = this.deliveryCategories.some(
      c => c.id !== category.id && c.name.trim().toLowerCase() === name.toLowerCase()
    );
    return duplicate ? `Another category named "${name}" already exists.` : '';
  }

  /** Returns true when any category has a validation error — blocks save. */
  hasCategoryErrors(): boolean {
    return this.deliveryCategories.some(c => !!this.validateCategoryName(c));
  }

  // -----------------------------------------------------------------------
  // Issue #12: Category image upload via existing S3 endpoint
  // -----------------------------------------------------------------------

  onCategoryImageSelected(event: Event, category: Category): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }
    const file = input.files[0];
    this.categoryUploading[category.id] = true;
    this.izingaOrderManagementService.uploadFile(file, false)
      .pipe(
        map((response: any) => response.url as string)
      )
      .subscribe({
        next: (url: string) => {
          category.image = url;
          this.categoryImageError[category.id] = false;
          this.categoryUploading[category.id] = false;
        },
        error: (_err: any) => {
          this.categoryUploading[category.id] = false;
          this.storageService.errorMessage = 'Image upload failed. Please try again.';
        }
      });
  }

  onCategoryImageError(category: Category): void {
    this.categoryImageError[category.id] = true;
  }

  /** Generate a temporary client-side id for newly created categories. */
  private generateTempId(): string {
    return 'tmp-' + Math.random().toString(36).slice(2, 10);
  }

  /**
   * Sync deliveryCategories back to shop.categories before saving.
   * Called inside registerBusinessAndStock so the full array is always sent.
   */
  private syncCategoriesToShop(): void {
    this.shop.categories = [...this.deliveryCategories];
  }

}
