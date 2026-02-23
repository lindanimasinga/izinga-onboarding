import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Order } from '../model/order';
import { UserProfile } from '../model/userProfile';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { StorageService } from '../service/storage-service.service';

@Component({
  selector: 'app-messanger-orders',
  templateUrl: './messanger-orders.component.html',
  styleUrls: ['./messanger-orders.component.css']
})
export class MessangerOrdersComponent implements OnInit {

  user?: UserProfile;
  orders: Order[] = [];
  isLoading = true;
  errorMessage = '';

  constructor(
    private router: Router,
    private izingaOrderService: IzingaOrderManagementService,
    private storageService: StorageService
  ) { }

  ngOnInit(): void {
    this.user = this.storageService.userProfile;
    if (!this.user) {
      this.router.navigate(['/welcome']);
      return;
    }
    this.loadUserOrders();
    setInterval(() => {
    this.loadUserOrders();
    }, 30000); // Refresh every 30 seconds
  }

  loadUserOrders(): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    if (this.user?.mobileNumber) {
      this.izingaOrderService.getAllMessengerOrders(this.user?.id!)
        .subscribe(
          (orders: Order[]) => {
            this.orders = (orders || []).sort((a, b) => {
              const dateA = new Date(a.date || 0).getTime();
              const dateB = new Date(b.date || 0).getTime();
              return dateB - dateA; // Sort descending (newest first)
            });
            this.isLoading = false;
          },
          (error: any) => {
            console.error('Error loading orders:', error);
            this.errorMessage = 'Failed to load orders. Please try again.';
            this.isLoading = false;
          }
        );
    } else {
      this.errorMessage = 'User mobile number not found';
      this.isLoading = false;
    }
  }

  viewOrderDetails(order: Order): void {
    if (order.id) {
      this.router.navigate(['indivisuals/quote-approval', order.id]);
    }
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  getOrderStatusClass(status?: string): string {
    switch (status) {
      case 'PLACED': return 'badge bg-primary';
      case 'STAGE_1_INPROGRESS': return 'badge bg-info';
      case 'STAGE_2_INPROGRESS': return 'badge bg-warning';
      case 'COMPLETED': return 'badge bg-success';
      case 'CANCELLED': return 'badge bg-danger';
      default: return 'badge bg-secondary';
    }
  }

  formatOrderStatus(status?: string): string {
    switch (status) {
      case 'PLACED': return 'Placed';
      case 'STAGE_1_INPROGRESS': return 'In Progress';
      case 'STAGE_2_INPROGRESS': return 'In Progress';
      case 'COMPLETED': return 'Completed';
      case 'CANCELLED': return 'Cancelled';
      default: return 'Unknown';
    }
  }

  refreshOrders(): void {
    this.loadUserOrders();
  }

  trackByOrderId(index: number, order: Order): string {
    return order.id || index.toString();
  }

  getFloorLevel(order: Order): string {
    return order.shippingData?.floorLevel ? `, Floor ${order.shippingData.floorLevel}` : '';
  }

  getShippingAddress(order: Order): string {
    let address = '';
    
    if (order.shippingData?.buildingType) {
      address += order.shippingData.buildingType;
      
      if (order.shippingData.unitNumber) {
        address += `, Unit ${order.shippingData.unitNumber}`;
      }
      
      address += this.getFloorLevel(order);
    }
    
    return address;
  }

  statusText(stage?: string): string {
    if (!stage) return 'Unknown';
    return Order.stageEnumText[stage as keyof typeof Order.stageEnumText] || 'Unknown';
  }

  statusColor(stage?: string): string {
    if (!stage) return '#6c757d';
    return Order.stageEnumColor[stage as keyof typeof Order.stageEnumColor] || '#6c757d';
  }
}