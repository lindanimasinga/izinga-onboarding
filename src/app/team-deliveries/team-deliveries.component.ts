import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Order } from '../model/order';
import { UserProfile } from '../model/userProfile';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { StorageService } from '../service/storage-service.service';
import { AnalyticsService } from '../service/analytics.service';

@Component({
  selector: 'app-team-deliveries',
  templateUrl: './team-deliveries.component.html',
  styleUrls: ['./team-deliveries.component.css']
})
export class TeamDeliveriesComponent implements OnInit {
  orders: Order[] = [];
  isLoading = true;
  errorMessage = '';
  
  // Filtering
  filterStage = 'ALL';
  filterDriver = 'ALL';
  drivers: UserProfile[] = [];
  uniqueDrivers: Map<string, UserProfile> = new Map();

  private readonly orderedStages: string[] = [
    Order.StageEnum._0CUSTOMERNOTPAID,
    Order.StageEnum._1WAITINGSTORECONFIRM,
    Order.StageEnum._2STOREPROCESSING,
    Order.StageEnum._3READYFORCOLLECTION,
    Order.StageEnum._4ONTHEROAD,
    Order.StageEnum._5ARRIVED,
    Order.StageEnum._6WITHCUSTOMER,
    Order.StageEnum._7ALLPAID,
    Order.StageEnum._CANCELLED
  ];

  private readonly stageSortOrder: { [key: string]: number } = this.orderedStages.reduce((acc, stage, index) => {
    acc[stage] = index + 1;
    return acc;
  }, {} as { [key: string]: number });

  constructor(
    private router: Router,
    private izingaOrderService: IzingaOrderManagementService,
    private storageService: StorageService,
    private analytics: AnalyticsService
  ) { }

  ngOnInit(): void {
    this.analytics.logScreenView('team_deliveries');
    const user = this.storageService.userProfile;

    if (!user?.id || user.role !== UserProfile.RoleEnum.MESSENGERADMIN) {
      this.errorMessage = 'Only driver admins can view team deliveries.';
      this.isLoading = false;
      return;
    }

    this.loadTeamDeliveries();
    
    // Refresh every 30 seconds
    setInterval(() => {
      this.loadTeamDeliveries();
    }, 30000);
  }

  private loadTeamDeliveries(): void {
    const user = this.storageService.userProfile;
    
    if (!user?.id) {
      this.errorMessage = 'Admin ID not found.';
      this.isLoading = false;
      return;
    }

    const adminId = user.id;

    // Load all drivers first if not already loaded
    if (this.drivers.length === 0) {
      this.izingaOrderService.getAllMessengersForAdmin(adminId).subscribe({
        next: (drivers) => {
          this.drivers = drivers || [];
          this.drivers.forEach(d => {
            if (d.id) this.uniqueDrivers.set(d.id, d);
          });
          this.loadOrders(adminId);
        },
        error: () => {
          this.loadOrders(adminId);
        }
      });
    } else {
      this.loadOrders(adminId);
    }
  }

  private loadOrders(adminId: string): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.izingaOrderService.getAllMessengerAdminOrders(adminId).subscribe({
      next: (orders) => {
        this.orders = (orders || []).sort((a, b) => {
          const dateA = new Date(a.date || 0).getTime();
          const dateB = new Date(b.date || 0).getTime();
          return dateB - dateA; // Newest first
        });
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading team deliveries:', error);
        this.errorMessage = 'Failed to load team deliveries. Please try again.';
        this.isLoading = false;
      }
    });
  }

  getFilteredOrders(): Order[] {
    return this.orders
    .filter(order => {
      const matchStage = this.filterStage === 'ALL' || order.stage === this.filterStage;
      const orderDriverId = order.shippingData?.messengerId;
      const isUnassigned = !orderDriverId;
      const matchDriver = this.filterDriver === 'ALL'
        || (this.filterDriver === 'UNASSIGNED' && isUnassigned)
        || orderDriverId === this.filterDriver;
      return matchStage && matchDriver;
    })
    .sort((a, b) => {
      const stageA = this.stageSortOrder[(a.stage || '').toUpperCase()] || 99;
      const stageB = this.stageSortOrder[(b.stage || '').toUpperCase()] || 99;

      if (stageA !== stageB) {
        return stageA - stageB;
      }

      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      return dateB - dateA;
    });
  }

  getDriverName(order: Order | undefined): string {
    if (!order) return 'Unknown';
    const driverId = order.tag ? order.tag['messengerId'] : undefined;
    if (!driverId) return 'Unassigned';
    const driver = this.uniqueDrivers.get(driverId);
    return driver ? `${driver.name} ${driver.surname}` : 'Unknown';
  }

  getStageColor(stage: string | undefined): string {
    if (!stage) return 'bg-secondary';
    switch (stage.toUpperCase()) {
      case Order.StageEnum._0CUSTOMERNOTPAID:
      case Order.StageEnum._1WAITINGSTORECONFIRM:
      case Order.StageEnum._2STOREPROCESSING:
        return 'bg-warning';
      case Order.StageEnum._3READYFORCOLLECTION:
      case Order.StageEnum._4ONTHEROAD:
      case Order.StageEnum._5ARRIVED:
        return 'bg-info';
      case Order.StageEnum._6WITHCUSTOMER:
      case Order.StageEnum._7ALLPAID:
        return 'bg-success';
      case Order.StageEnum._CANCELLED:
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  }

  getStageText(stage: string | undefined): string {
    if (!stage) return 'Unknown';
    return Order.stageEnumText[stage as Order.StageEnum] || stage;
  }

  statusColor(stage: string | undefined): string {
    if (!stage) return '#6c757d';
    return Order.stageEnumColor[stage as Order.StageEnum] || '#6c757d';
  }

  viewOrderDetails(order: Order): void {
    if (order.id) {
      this.router.navigate(['/indivisuals/quote-approval', order.id]);
    }
  }

  goBack(): void {
    this.router.navigate(['/indivisuals/dashboard']);
  }

  getUniqueStages(): string[] {
    const stages = new Set(this.orders.map(o => o.stage).filter(Boolean) as string[]);
    return this.orderedStages.filter(stage => stages.has(stage));
  }

  getOrderDriver(order: Order | undefined): string {
    if (!order) return 'Unassigned';
    const driverId = order.shippingData?.messengerId;
    if (!driverId) return 'Unassigned';
    const driver = this.uniqueDrivers.get(driverId);
    return driver ? `${driver.name}` : 'Unknown';
  }
}
