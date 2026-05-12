import { Component } from '@angular/core';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { StorageService } from '../service/storage-service.service';
import { Payout, PayoutStage, PayoutType } from '../payout/payout.component';
import { StoreSummary } from '../model/store-summary';
import { AnalyticsService } from '../service/analytics.service';

@Component({
  selector: 'app-messenger-payout',
  templateUrl: './messenger-payout.component.html',
  styleUrls: ['./messenger-payout.component.css']
})
export class MessengerPayoutComponent {

  payouts: Array<Payout> = [];

  constructor(
    private izingaService: IzingaOrderManagementService,
    private storageService: StorageService,
    private analytics: AnalyticsService
  ) {}

  get nominatedBank() {
    return this.storageService.userProfile?.bank;
  }

  get totalPending() {
    return Object.entries(this.payouts)
      .map(entry => entry[1])
      .flatMap(payts => payts)
      .filter(py => py.payoutStage == PayoutStage.PENDING)
      .map(py => py.total)
      .reduce((a, b) => a + b, 0);
  }

  get totalPaid() {
    return Object.entries(this.payouts)
      .map(entry => entry[1])
      .flatMap(payts => payts)
      .filter(py => py.payoutStage == PayoutStage.COMPLETED)
      .map(py => py.total)
      .reduce((a, b) => a + b, 0);
  }

  ngOnInit() {
    this.analytics.logScreenView('messenger_payouts_overview');
    const userProfile = this.storageService.userProfile;
    const userId = userProfile?.id;
    const toDate = new Date();
    const fromDate = new Date(toDate.getTime() - 60 * 24 * 60 * 30 * 1000); // 60 days

    this.izingaService.getPayouts(userId!, fromDate, toDate, PayoutType.MESSENGER)
      .subscribe(payouts => {
        payouts.forEach(payout => {
          payout.orders.forEach(order => {
            this.payouts = payouts;
          });
        });
      });
  }

    payoutsByStage(stage: string) {
    return this.payouts?.filter(py => py.payoutStage == stage)
  }

    get bankAccountLabel(): string {
      return this.nominatedBank?.type === 'EWALLET' ? 'Cellphone number' : 'Account number';
    }
}
