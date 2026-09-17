import { Component, OnInit, OnDestroy } from '@angular/core';
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
import { FixedBarService } from '../service/fixed-bar.service';

@Component({
  selector: 'app-stock-update',
  templateUrl: './stock-update.component.html',
  styleUrls: ['./stock-update.component.css']
})
export class StockUpdateComponent implements OnInit, OnDestroy {

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
  // REQ-03: image preview URL (null = hidden)
  imagePreviewUrl: string | null = null;

  // REQ-03: save/load feedback state
  isSaving: boolean = false;
  saveSuccess: boolean = false;
  saveError: string | null = null;
  isLoading: boolean = false;
  loadError: string | null = null;

  // REQ-02: removed item notice
  itemRemoved: boolean = false;


  constructor(
    private route: ActivatedRoute,
    private izingaOrderManagementService: IzingaOrderManagementService,
    private datePipe: DatePipe,
    private storageService: StorageService,
    private analytics: AnalyticsService,
    private fixedBarService: FixedBarService
  ) {}

  ngOnInit(): void {
    // FAIL-01: use FixedBarService counter so router-transition order does not strip the class.
    this.fixedBarService.acquire();
    this.analytics.logScreenView('stock_item_edit');
    this.isLoading = true;
    this.loadError = null;
    // Get the store ID from the route parameters
      this.route.params.subscribe(params => {
        var businessId = params['businessId']
        var stockId = params['stockId']
        this.izingaOrderManagementService.getStoreById(businessId).subscribe(
          store => {
            this.isLoading = false;
            console.log('store details loaded successfully');
            this.storeProfile = store!
            this.stockItem = stockId ? this.storeProfile.stockList?.filter(stk => stk.id == stockId)[0]! : this.addStockItem()!
            this.initTagEntries();
            // REQ-03: show existing saved image as initial preview
            if (this.stockItem.images && this.stockItem.images.length > 0) {
              this.imagePreviewUrl = this.stockItem.images[0];
            }
            console.log('stock details loaded successfully');
          },
          (error) => {
            this.isLoading = false;
            this.loadError = 'Could not load stock. Please refresh the page.';
            console.error('Error loading store details:', error);
          }
        )
      })

  }

  ngOnDestroy(): void {
    this.fixedBarService.release();
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

  // REQ-02: confirmation + inline notice before splice
  removeStockItem(stockItem: Stock) {
    const itemName = stockItem.name || 'this item';
    const confirmed = confirm(`Remove ${itemName}? Press Update to save the change.`);
    if (!confirmed) {
      return;
    }
    console.log('Removing stock item:', stockItem);
    const index = this.storeProfile?.stockList?.indexOf(stockItem)!;
    if (index > -1) {
      this.storeProfile?.stockList?.splice(index, 1);
    }
    this.itemRemoved = true;
  }

  // Register the business and stock items
  registerBusinessAndStock() {
    this.syncTagObject();
    this.isSaving = true;
    this.saveSuccess = false;
    this.saveError = null;
    this.itemRemoved = false;

    var call = this.selectedFile ? this.uploadImage() : of("")
    call.pipe(
      mergeMap(() => this.izingaOrderManagementService.updateStore(this.storeProfile))
    ).subscribe(
      data => {
        this.isSaving = false;
        this.storageService.shop = data;
        this.analytics.logEvent('stock_item_saved', { storeId: this.storeProfile.id });
        console.log('stock details saved successfully:', data);
        this.saveSuccess = true;
        setTimeout(() => { this.saveSuccess = false; }, 4000);
      },
      (error) => {
        this.isSaving = false;
        this.saveError = 'Could not save stock. Please try again.';
        console.error('Error saving stock details:', error);
      }
    );
  }

  onFileSelected(event: any): void {
    this.selectedFile = event.target.files[0];  // Capture the file
    // REQ-03: local FileReader preview — no upload until Update is pressed
    if (this.selectedFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreviewUrl = e.target?.result as string;
      };
      reader.readAsDataURL(this.selectedFile);
    } else {
      this.imagePreviewUrl = null;
    }
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
