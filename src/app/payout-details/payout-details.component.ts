import { Component } from '@angular/core';
import { StorageService } from '../service/storage-service.service';
import { StoreSummary } from '../model/store-summary';
import { Payout } from '../payout/payout.component';

@Component({
  selector: 'app-payout-details',
  templateUrl: './payout-details.component.html',
  styleUrls: ['./payout-details.component.css']
})
export class PayoutDetailsComponent {
  store: StoreSummary
  payouts?: Payout[]

  constructor(private storage: StorageService) {
    this.store = this.storage.shopToPayout!
    this.payouts = this.storage.payouts
  }

  payoutsByStage(stage: string) {
    return this.payouts?.filter(it => it.payoutStage == stage)
  }

}
