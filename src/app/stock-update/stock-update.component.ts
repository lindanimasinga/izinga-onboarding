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
  selector: 'app-stock-update',
  templateUrl: './stock-update.component.html',
  styleUrls: ['./stock-update.component.html']
})
export class StockUpdateComponent {

  storeProfile: StoreProfile = {
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
      
    }
  }

  stockItem: Stock = {};
  selectedFile: File | null = null;
  tagEntries: Array<string> = [];
  newTag = '';


  constructor(
    private route: ActivatedRoute,
    private izingaOrderManagementService: IzingaOrderManagementService,
    private datePipe: DatePipe,
    private storageService: StorageService,
    private analytics: AnalyticsService
  ) {}

  ngOnInit(): void {
    this.analytics.logScreenView('stock_item_edit');
    // Get the store ID from the route parameters
      this.route.params.subscribe(params => {
        var businessId = params['businessId']
        var stockId = params['stockId']
        this.izingaOrderManagementService.getStoreById(businessId).subscribe(store => {
          console.log('store details loaded successfully');
          this.storeProfile = store!
          this.stockItem = stockId ? this.storeProfile.stockList?.filter(stk => stk.id == stockId)[0]! : this.addStockItem()!
          this.initTagEntries();
          console.log('stock details loaded successfully');
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
        this.storeProfile = data;
        console.log('Store details fetched successfully:', data);
      },
      (error) => {
        console.error('Error fetching store details:', error);
      }
    );
  }

  // Add a new stock item to the list
  addStockItem() {
    var stockItem = {
      name: '',
      description: '',
      detailedDescription: '',
      price: 0,
      quantity: 0,
      images: [],
      mandatorySelection: [],
      optionalSelection: [],
      group: 'Main' // Default group if none is specified
    };
    this.storeProfile?.stockList?.push(stockItem);
    return stockItem
  }

  removeStockItem(stockItem: Stock) {
    console.log('Removing stock item:', stockItem);
    const index = this.storeProfile?.stockList?.indexOf(stockItem)!;
    if (index > -1) {
      this.storeProfile?.stockList?.splice(index, 1);
    }
  }

  // Register the business and stock items
  registerBusinessAndStock() {
    this.syncTagObject();

    var call = this.selectedFile ? this.uploadImage() : of("")
    call.pipe(
      mergeMap(() => this.izingaOrderManagementService.updateStore(this.storeProfile))
    ).subscribe(
      data => {
        this.storageService.shop = data;
        this.analytics.logEvent('stock_item_saved', { storeId: this.storeProfile.id });
        console.log('stock details fetched successfully:', data);
        location.reload()
      },
      (error) => {
        console.error('Error fetching store details:', error);
      }
    );
  }

  onFileSelected(event: any): void {
    this.selectedFile = event.target.files[0];  // Capture the file
  }

  uploadImage(): Observable<string> {
    return this.izingaOrderManagementService.uploadFile(this.selectedFile!, false)
      .pipe(
        map (response => {
          console.log('File uploaded successfully:', response);
          this.stockItem.images![0]=response["url"]
          return response["url"]
        })
      );
    
  }

  private initTagEntries(): void {
    const tags = this.stockItem?.tags || [];
    this.tagEntries = [...tags];
    if (this.tagEntries.length === 0) {
      this.tagEntries.push('');
    }
  }

  addTagRow(): void {
    this.tagEntries.push(this.newTag);
    this.newTag = '';
  }

  removeTagRow(index: number): void {
    this.tagEntries.splice(index, 1);
    if (this.tagEntries.length === 0) {
      this.tagEntries.push('');
    }
  }

  private syncTagObject(): void {
    this.stockItem.tags = this.tagEntries.filter(tag => tag.trim() !== '');
  }

}
