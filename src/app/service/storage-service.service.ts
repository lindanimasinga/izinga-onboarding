import { Injectable } from '@angular/core';
import { StoreProfile } from '../model/storeProfile';
import { UserProfile } from '../model/userProfile';
import { Device } from '../model/device';
import { StoreSummary } from '../model/store-summary';
import { Payout } from '../payout/payout.component';

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  USER_PROFILE_KEY = "sdfwefdsfsd";
  PHONE_KEY = "alsfnadfwefsdfn"
  STORE_TO_PAY = "nvcaseuhfdkfs"
  PAYOUT = "we434dfsdfsdf"
  shop?: StoreProfile;
  cache: Storage = window.localStorage
  _userProfile?: UserProfile
  _phoneNumber?: string | undefined
  errorMessage: string | undefined;
  infoMessage: string | undefined;
  DEVICE_KEY = "skjda287nndfsd";
  _payouts: Payout[] | undefined;
  _shopToPayout: StoreSummary| undefined;

  constructor() { }

  get payouts():  Payout[] | undefined {
    var data = this.cache.getItem(this.PAYOUT)
    return data != null ? JSON.parse(data) : []
  }

  set payouts(payouts: Payout[] | undefined) {
    if(payouts == undefined) {
      payouts = []
    }
    this.cache.setItem(this.PAYOUT, JSON.stringify(payouts))
  }

  get shopToPayout():  StoreSummary | undefined {
    return JSON.parse(this.cache.getItem(this.STORE_TO_PAY)!)
  }

  set shopToPayout(shopToPayout: StoreSummary | undefined) {
    this.cache.setItem(this.STORE_TO_PAY, JSON.stringify(shopToPayout))
  }

  logout() {
    this.cache.clear()
  }

  get phoneNumber():  string | undefined {
    if (this._phoneNumber == null) {
      this._phoneNumber = JSON.parse(this.cache.getItem(this.PHONE_KEY)!)
    }
    return this._phoneNumber;
  }

  set phoneNumber(phoneNumber: string | undefined) {
    this._phoneNumber = phoneNumber
    this.cache.setItem(this.PHONE_KEY, JSON.stringify(this.phoneNumber))
  }

  get device():  Device | undefined {
    return JSON.parse(this.cache.getItem(this.DEVICE_KEY)!)
  }

  set device(device: Device | undefined) {
    this.cache.setItem(this.DEVICE_KEY, JSON.stringify(device))
  }

  get userProfile():  UserProfile | undefined {
    if(!this._userProfile && this.cache.getItem(this.USER_PROFILE_KEY)) {
      this._userProfile = JSON.parse(this.cache.getItem(this.USER_PROFILE_KEY)!)
    }
    return this._userProfile;
  }

  set userProfile(userProfile: UserProfile | undefined) {
    this._userProfile = userProfile
    this.cache.setItem(this.USER_PROFILE_KEY, JSON.stringify(this._userProfile))
  }

}
