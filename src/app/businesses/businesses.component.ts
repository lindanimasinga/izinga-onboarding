import { Component, OnDestroy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { UserProfile } from '../model/models';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { ActivatedRoute, Route, Router } from '@angular/router';

import { map, mergeMap, catchError, flatMap } from 'rxjs/operators';
import { from, Observable, of, throwError } from 'rxjs';
import { StorageService } from '../service/storage-service.service';
import { StoreSummary } from '../model/store-summary';
import { AnalyticsService } from '../service/analytics.service';

@Component({
  selector: 'app-businesses',
  templateUrl: './businesses.component.html',
  styleUrls: ['./businesses.component.css']
})
export class BusinessesComponent implements OnDestroy {

  stores: StoreSummary[] = [];
  filteredStores: StoreSummary[] = [];
  searchTerm: string = '';
  isLoaded: boolean = false;
  // REQ-04: loading state to prevent footer appearing above empty grid
  isLoadingShops: boolean = true;


  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private izingaOrderManagementService: IzingaOrderManagementService,
    private datePipe: DatePipe,
    private storageService: StorageService,
    private analytics: AnalyticsService
  ) {}

  ngOnInit(): void {
    // FIX-01: gate bottom padding only while this page's fixed bar is present
    document.body.classList.add('has-fixed-bar');
    this.analytics.logScreenView('store_list');
    // Get the store ID from the route parameters
    this.izingaOrderManagementService.getCustomerByPhoneNumber(this.storageService.phoneNumber!)
    .pipe( 
        mergeMap(user => this.izingaOrderManagementService.getAllStoresSummary(user.id!))
    ).subscribe(
      stores => {
        this.stores = stores;
        this.filteredStores = stores; // Initialize filtered stores
        this.isLoaded = true;
        this.isLoadingShops = false;
        console.log('Stores fetched successfully');
      },
      () => {
        this.isLoaded = true;
        this.isLoadingShops = false;
      }
    )
  }

  // Filter businesses based on search term
  filterBusinesses(): void {
    if (!this.searchTerm || this.searchTerm.trim() === '') {
      this.filteredStores = this.stores;
    } else {
      this.filteredStores = this.stores.filter(store => 
        store.name?.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
  }

  // Clear search and reset filter
  clearSearch(): void {
    this.searchTerm = '';
    this.filteredStores = this.stores;
  }

  ngOnDestroy(): void {
    // FIX-01: remove bottom-padding gate when leaving this page
    document.body.classList.remove('has-fixed-bar');
  }

  // Add a new stock item to the list
  addNewStore() {

  }

}
