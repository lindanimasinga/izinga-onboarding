import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Order } from '../model/order';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { StorageService } from '../service/storage-service.service';

@Component({
  selector: 'app-admin-orders',
  templateUrl: './admin-orders.component.html',
  styleUrls: ['./admin-orders.component.css']
})
export class AdminOrdersComponent implements OnInit {

  allOrders: Order[] = [];
  isLoading = true;
  errorMessage = '';
  activeTab: 'inProgress' | 'scheduled' = 'inProgress';

  constructor(
    private router: Router,
    private izingaOrderService: IzingaOrderManagementService,
    private storageService: StorageService
  ) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.izingaOrderService.getOrdersInProgress().subscribe({
      next: (orders) => {
        this.allOrders = orders || [];
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load orders. Please try again.';
        this.isLoading = false;
      }
    });
  }

  get scheduledOrders(): Order[] {
    const now = new Date();
    return this.allOrders.filter(o =>
      o.shippingData?.type === 'SCHEDULED_DELIVERY' &&
      !!o.shippingData?.pickUpTime &&
      new Date(o.shippingData.pickUpTime) > now
    );
  }

  get inProgressOrders(): Order[] {
    const now = new Date();
    return this.allOrders.filter(o => {
      if (o.shippingData?.type !== 'SCHEDULED_DELIVERY') return true;
      // Scheduled orders past their pickup time move to in-progress
      return !o.shippingData?.pickUpTime || new Date(o.shippingData.pickUpTime) <= now;
    });
  }

  get displayedOrders(): Order[] {
    return this.activeTab === 'scheduled' ? this.scheduledOrders : this.inProgressOrders;
  }

  setTab(tab: 'inProgress' | 'scheduled'): void {
    this.activeTab = tab;
  }

  statusText(stage: Order.StageEnum | undefined): string {
    return stage ? Order.stageEnumText[stage] : 'Unknown';
  }

  statusColor(stage: Order.StageEnum | undefined): string {
    return stage ? Order.stageEnumColor[stage] : '#adb5bd';
  }

  viewOrder(order: Order): void {
    const userType = this.storageService.userType;
    const base = userType === 'business' ? '/business' : '/indivisuals';
    this.router.navigate([`${base}/quote-approval/${order.id}`]);
  }

  trackById(_: number, order: Order): string {
    return order.id || '';
  }

  goBack(): void {
    const userType = this.storageService.userType;
    const base = userType === 'business' ? '/business' : '/indivisuals';
    this.router.navigate([`${base}/dashboard`]);
  }
}
