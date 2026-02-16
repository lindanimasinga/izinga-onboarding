import { Component, OnInit, Input } from '@angular/core';
import { Stock } from '../model/stock';
import { StoreProfile } from '../model/storeProfile';

declare var ScrollMagic: any;

@Component({
  selector: 'app-stock-item',
  templateUrl: './stock-item.component.html',
  styleUrls: ['./stock-item.component.css']
})
export class StockItemComponent implements OnInit {

  @Input()
  shopItem: Stock = {}
  @Input()
  themeDark = false;
  @Input()
  shop: StoreProfile = {
    rates: {}
  }

  constructor() { }

  ngOnInit(): void {
  }

  get stockImage() {
    return this.shopItem.images != null && this.shopItem.images[0] != null && this.shopItem.images[0].trim().length != 0 && this.shopItem.images[0] != "https:null" ?
    this.shopItem.images[0] : this.shop.imageUrl
  }

}
