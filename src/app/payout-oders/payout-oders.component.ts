import { Component } from '@angular/core';
import { Order } from '../model/order';
import { ActivatedRoute } from '@angular/router';
import { StorageService } from '../service/storage-service.service';
import { AnalyticsService } from '../service/analytics.service';

@Component({
  selector: 'app-payout-oders',
  templateUrl: './payout-oders.component.html',
  styleUrls: ['./payout-oders.component.css']
})
export class PayoutOdersComponent {
  
  orders?: Order[] = [];
  stage: string = ""

  constructor(
    private storageService: StorageService,
    private activeRoute: ActivatedRoute,
    private analytics: AnalyticsService
  ) {}

  ngOnInit(): void {
    this.analytics.logScreenView('payout_orders');
    this.activeRoute.queryParams.subscribe(params => {
      this.stage = params['stage']
      const stageOrders = this.storageService.payouts
        ?.filter(it => it.payoutStage == this.stage)
        ?.flatMap(py => py.orders) || []

      // Newest first for a better payout reconciliation flow.
      this.orders = stageOrders.sort((a, b) => this.getOrderTimestamp(b) - this.getOrderTimestamp(a))
    })
  }

  getStageLabel(): string {
    return this.stage ? this.stage.replace('_', ' ') : 'Payout Deliveries'
  }

  getStageClass(): string {
    if (this.stage === 'PENDING') {
      return 'payout-stage-pending'
    }

    if (this.stage === 'PROCESSING') {
      return 'payout-stage-processing'
    }

    if (this.stage === 'COMPLETED') {
      return 'payout-stage-completed'
    }

    return 'payout-stage-default'
  }

  trackByOrderId(index: number, order: Order): string {
    return order.id || `${index}`
  }

  private getOrderTimestamp(order: Order): number {
    const primaryDate = order.date ? new Date(order.date).getTime() : 0
    const fallbackDate = order.modifiedDate ? new Date(order.modifiedDate).getTime() : 0
    return Number.isNaN(primaryDate) ? fallbackDate : primaryDate
  }

  isDriver() : boolean {
    return this.storageService.userProfile?.role == 'MESSENGER' || this.storageService.userProfile?.role == 'MESSENGER_ADMIN'
  }

  getOrderAmount(order: Order) : number {
    if(this.isDriver() && order.shippingData?.fee) {
      return order.shippingData?.fee || 0
    } else if(!this.isDriver() && order.tip) {
      return order.tip || 0
    } else {
      return order.basketAmount || 0
    }
  }

}
