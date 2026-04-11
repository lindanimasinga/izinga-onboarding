import { Component } from '@angular/core';
import { DatePipe } from '@angular/common';
import { UserProfile } from '../model/models';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { ActivatedRoute, Route, Router } from '@angular/router';

import { map, mergeMap, catchError, flatMap } from 'rxjs/operators';
import { from, Observable, of, throwError } from 'rxjs';
import { StoreProfile } from '../model/storeProfile';
import { Stock } from '../model/stock';
import { StorageService } from '../service/storage-service.service';
import { Order } from '../model/order';
import { AnalyticsService } from '../service/analytics.service';

@Component({
  selector: 'app-orders',
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.css']
})
export class OrdersComponent {

  orders: Order[] = [];

  constructor(
    private izingaOrderManagementService: IzingaOrderManagementService,
    private storageService: StorageService,
    private activeRoute: ActivatedRoute,
    private analytics: AnalyticsService
  ) {}

  ngOnInit(): void {
    this.analytics.logScreenView('store_orders');
    // Get the store ID from the route parameters
    this.activeRoute.params.subscribe(params => {
      var storeId = params['businessId']
      this.izingaOrderManagementService.getCustomerByPhoneNumber(this.storageService.phoneNumber!)
      .pipe( 
          mergeMap(user => this.izingaOrderManagementService.getAllMessengerOrders(user.id!))
      ).subscribe(orders => {
        this.orders = orders.sort( (a, b) => {
          const dateA = new Date(a.date!).getTime();
          const dateB = new Date(b.date!).getTime();
          return dateB - dateA; // Sort in descending order (most recent first)
        });
        console.log('orders fetched successfully');
      })
    })
  }

}
