import { Component } from '@angular/core';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { StorageService } from '../service/storage-service.service';
import { Order } from '../model/order';
import { filter, from, map, mergeMap, Observable } from 'rxjs';
import { StoreProfile } from '../model/storeProfile';
import { StoreSummary } from '../model/store-summary';

@Component({
  selector: 'app-payout',
  templateUrl: './payout.component.html',
  styleUrls: ['./payout.component.css']
})
export class PayoutComponent {
  
  payouts: {[key: string]: Payout[] } = {};
  stores: {[key: string]: StoreSummary } = {};

  constructor(private izingaService: IzingaOrderManagementService, private storageService: StorageService) {
  }

  get storeEntries() {
    return Object.entries(this.stores)
    .map( entry => entry[1])
    .sort((a, b) => {
      return this.payouts[a.id!]?.filter(p => p.payoutStage == PayoutStage.PENDING)?.length > 0 ? -1 : 1
    })
  }

  get totalPending() {
    return Object.entries(this.payouts)
    .map( entry => entry[1])
    .flatMap(payts => payts)
    .filter(py => py.payoutStage == PayoutStage.PENDING)
    .map(py => py.total)
    .reduce((a,b) => a+b, 0)
  }

  get totalPaid() {
    return Object.entries(this.payouts)
    .map( entry => entry[1])
    .flatMap(payts => payts)
    .filter(py => py.payoutStage == PayoutStage.COMPLETED)
    .map(py => py.total)
    .reduce((a,b) => a+b, 0) 
  }

  ngOnInit() {
    var userProfile = this.storageService.userProfile
    var userId = userProfile?.id
    var toDate = new Date()
    var fromDate = new Date(toDate.getTime() - 60 * 24 * 60 * 30 * 1000);  //60 days

    if((userProfile?.role == 'ADMIN' || userProfile?.role == 'STORE_ADMIN')) {
      this.izingaService.getAllStoresSummary(userId!)
      .pipe(
          mergeMap(stores => from(stores)),
          mergeMap(store => {
            this.stores[store.id!] = store
            return this.izingaService.getPayouts(store.id!, fromDate, toDate, PayoutType.SHOP)
          }),
          filter(payouts => payouts != null && payouts.length > 0)
      ).subscribe(payouts => {
        var storeId = payouts[0].toId
        this.payouts[storeId] = payouts
      })
    } else {
      this.izingaService.getPayouts(userId!, fromDate, toDate, PayoutType.MESSENGER)
      .subscribe(payouts => {
        payouts.forEach(payout => {
          payout.orders.forEach(order => {
            this.payouts[order.shopId!] = payouts
            this.stores[order.shopId!] = {
              id: order.shopId,
              name: order.shippingData?.fromAddress,
              rates: {}
            }
          })
        })
      })
    }
  }
}

export interface Payout {
  toId: string,
  bundleId: string,
  toName: string,
  toType: BankAccType,
  toBankName: string,
  toAccountNumber: string,
  toBranchCode: string,
  fromReference: string,
  toReference: string,
  emailNotify: string,
  emailAddress: string,
  emailSubject: string,
  orders: Order[],
  payoutStage: PayoutStage
  total: number
  modifiedDate: Date
}

export enum BankAccType {
  CHEQUE = "CHEQUE",
  EWALLET = "EWALLET",
  SAVINGS = "SAVINGS",
  TRANSMISSION = "TRANSMISSION",
  WALLET = "",
  STRING = ""
}

export enum PayoutStage {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED"
}

export enum PayoutType {
  SHOP = "SHOP",
  MESSENGER = "MESSENGER",
}
