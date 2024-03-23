import { Component, Input } from '@angular/core';
import { StoreSummary } from '../model/store-summary';
import { Payout, PayoutStage } from '../payout/payout.component';
import { StorageService } from '../service/storage-service.service';

@Component({
  selector: 'payout-card',
  templateUrl: './payout-card.component.html',
  styleUrls: ['./payout-card.component.css']
})
export class PayoutCardComponent {

  @Input()
  payouts?: Payout[]

  @Input()
  store?: StoreSummary

  constructor(private storageService: StorageService) {

  }
  
  get pendingPayouts() {
    return this.payouts?.filter(payout => payout.payoutStage == PayoutStage.PENDING)
  }

  get completedPayouts() {
    return this.payouts?.filter(payout => payout.payoutStage == PayoutStage.COMPLETED)
  }

  get pendingPayoutTotal() {
    var pendingPayouts = this.pendingPayouts
    return pendingPayouts && pendingPayouts.length > 0 ? this.pendingPayouts
    ?.map(payout => payout.total!)
    ?.reduce((a, b) => a + b) : 0
  }

  get completedPayoutTotal() {
    var completedPayouts = this.completedPayouts
    return completedPayouts && completedPayouts.length > 0 ? this.completedPayouts
    ?.map(payout => payout.total!)
    ?.reduce((a, b) => a + b) : 0
  }

  selectedPayout() {
    this.storageService.payouts = this.payouts
    this.storageService.shopToPayout = this.store
  }
}
