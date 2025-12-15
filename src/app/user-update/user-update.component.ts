import { Component } from '@angular/core';
import { UserProfile } from '../model/models';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { ActivatedRoute, Route, Router } from '@angular/router';

import { map, mergeMap, catchError } from 'rxjs/operators';
import { from, Observable, of, throwError } from 'rxjs';
import { StoreProfile } from '../model/storeProfile';
import { StorageService } from '../service/storage-service.service';

@Component({
  selector: 'app-user-update',
  templateUrl: './user-update.component.html',
  styleUrls: ['./user-update.component.css']
})
export class UserUpdateComponent {

  shippingBuildingUnitNumber?: string
  shippingBuildingName?: string
  additionalInstructions?: string
  _newAddressLatitude?: number
  _newAddressLongitude?: number
  roleDescription?: string
  city?: string
  ewallet?: string
  paymentType = "EWALLET"
  hasTipCard = false
  dateOfBirth?: string
  cardId?: string
  wantsToAddBusiness = false
  shopLogo?: string
  businessName?: string
  businessHours?: string
  storeType?: StoreProfile.StoreTypeEnum

  userProfile: UserProfile = {
    imageUrl: "https://pbs.twimg.com/media/C1OKE9QXgAAArDp.jpg",
    role: UserProfile.RoleEnum.CUSTOMER,
    bank: {
      type: "EWALLET",
      name: "FNB",
      accountId: "",
      branchCode: "250655"
    }
  }

  constructor(private izingaOrderManager: IzingaOrderManagementService,
    private router: Router,
    private route: ActivatedRoute, 
    private storageService: StorageService) {
      console.log(`bank is ${JSON.stringify(this.userProfile.bank)}`)
      this.userProfile.mobileNumber = this.storageService.phoneNumber
  }

  ngOnInit() {

    var userObservable = this.storageService.userProfile != null ? of(this.storageService.userProfile!) : this.izingaOrderManager.getCustomerByPhoneNumber(this.storageService.phoneNumber!)

    userObservable.subscribe(user => {
      this.userProfile = user
      this.storageService.userProfile = user
      if(!user.bank) user.bank = this.userProfile.bank
      this.roleDescription = user.description
      this.city = user.address
      this.ewallet = user.mobileNumber
      this.paymentType = user.bank.type == 'EWALLET' ? "EWALLET" : "BANK_ACC"
    })
  }

  isStoreAdmin(): boolean {
    return this.userProfile.role == UserProfile.RoleEnum.STOREADMIN
  }

  createCustomer() {
    this.userProfile.address = this.city
    this.userProfile.description = this.roleDescription

    this.userProfile.role = !this.isStoreAdmin() && this.wantsToAddBusiness ? UserProfile.RoleEnum.STOREADMIN : this.userProfile.role

    console.log(`creating customer ${this.userProfile.id} ${this.userProfile.address} ${this.userProfile.description}`)

    this.izingaOrderManager.registerCustomer(this.userProfile)
    .pipe(
      map(user => {
      this.userProfile = user
      return user;
    })).subscribe(resp => {
      console.log(`customer ${this.userProfile.id} created or updated`)
      if (this.cardId) {
        this.linkCode()
      }
      this.router.navigate(['./terms', resp.id], {relativeTo: this.route }  )
    }, error => console.error(error))
  }

  updateCustomer() {
    this.userProfile.address = this.city
    this.userProfile.description = this.roleDescription
    this.userProfile.role = !this.isStoreAdmin() && this.wantsToAddBusiness ? UserProfile.RoleEnum.STOREADMIN : this.userProfile.role
    console.log(`creating customer ${this.userProfile.id} ${this.userProfile.address} ${this.userProfile.description}`)

    this.izingaOrderManager.updateCustomer(this.userProfile)
    .pipe(
      map(user => {
      this.userProfile = user
      return user;
    })).subscribe(resp => {
      console.log(`customer ${this.userProfile.id} created or updated`)
      if (this.cardId) {
        this.linkCode()
      }
      this.router.navigate(['../info'], {relativeTo: this.route }  )
    }, error => console.error(error))
  }

  get userExist(): boolean {
    return this.userProfile.id != null;
  }

  get phoneNumber(): string | undefined {
    return this.userProfile.mobileNumber
  }

  set phoneNumber(phoneNumber: string | undefined) {
    this.userProfile.mobileNumber =  phoneNumber
  }

  get emailAddress(): string | undefined {
    return this.userProfile.emailAddress
  }

  set emailAddress(emailAddress: string | undefined) {
    this.userProfile.emailAddress =  emailAddress
  }

  set newAddressLatitude(latitude: number| undefined) {
    this._newAddressLatitude = latitude;
  }

  get newAddressLatitude(): number | undefined {
    return this._newAddressLatitude;
  } 

  set newAddressLongitude(longitude: number | undefined) {
    this._newAddressLongitude = longitude;
  }

  get newAddressLongitude(): number | undefined {
    return this._newAddressLongitude;
  } 

  get bankName(): string {
    return this.userProfile.bank.name
  }

  set bankName(name: string) {
    this.userProfile.bank.name = name
  }

  get accountNumber(): string {
    return this.userProfile.bank.accountId
  }

  set accountNumber(name: string) {
    this.userProfile.bank.accountId = name
  }

  findCustomer() {
    this.izingaOrderManager.getCustomerByPhoneNumber(this.userProfile.mobileNumber!)
    .pipe(
      catchError(error => {
        if(error.status === 404) {
          console.log("Not found user")
          return of(this.userProfile)
        } else {
          return throwError(error); 
        }
      }),
    )
    .subscribe(user => {
      if(!user.bank) user.bank = this.userProfile.bank
      this.userProfile = user
      this.roleDescription = user.description
      this.city = user.address
      this.ewallet = user.mobileNumber
      this.paymentType = user.bank.type == 'EWALLET' ? "EWALLET" : "BANK_ACC"
    })
  }

  ewalletSelected() {
    this.paymentType = 'EWALLET'
    this.userProfile.bank.type = 'EWALLET'
    this.userProfile.bank.accountId = this.userProfile.mobileNumber!
    this.userProfile.bank.name = 'fnb'
    this.userProfile.bank.branchCode = '250655'
  }

  linkCode() {
    this.userProfile.address = this.city
    this.userProfile.description = this.roleDescription
    console.log(`creating customer ${this.userProfile.id} ${this.userProfile.address} ${this.userProfile.description}`)

    this.izingaOrderManager.linkCard(this.userProfile, this.cardId!!).subscribe(resp => {
      console.log(`customer ${this.userProfile.id} has linked the code ${this.cardId}`)
    }, error => console.error(error))
  }

  logout() {
    this.storageService.logout()
    this.router.navigate(['/'])
  }

}
