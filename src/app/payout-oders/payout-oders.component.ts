import { Component } from '@angular/core';
import { Order } from '../model/order';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { ActivatedRoute } from '@angular/router';
import { mergeMap } from 'rxjs';
import { StorageService } from '../service/storage-service.service';

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
    private activeRoute: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Get the store ID from the route parameters
    this.activeRoute.queryParams.subscribe(params => {
      this.stage = params['stage']
      console.log(`stage is ${this.stage}`)
      this.orders = this.storageService.payouts?.filter(it => it.payoutStage == this.stage)?.flatMap(py => py.orders)
    })
  }

}
