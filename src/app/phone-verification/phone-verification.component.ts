import { Component } from '@angular/core';
import { UserProfile } from '../model/models';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { ActivatedRoute, Route, Router } from '@angular/router';

import { map, mergeMap, catchError } from 'rxjs/operators';
import { from, Observable, of, throwError } from 'rxjs';
import { FirebaseService } from '../service/firebase.service';
import { StorageService } from '../service/storage-service.service';
import { AnalyticsService } from '../service/analytics.service';

@Component({
  selector: 'app-phone-verification',
  templateUrl: './phone-verification.component.html',
  styleUrls: ['./phone-verification.component.css']
})
export class PhoneVerificationComponent {

  isPhoneNumberVerified = false
  isVerificationRequested = false
  code?: string
  phoneNumber?: string

  userAlreadyRegistered?: boolean;
  hasError?: boolean;
  errorMessage?: string;
  messegers?: UserProfile[];

  constructor(private izingaOrderManager: IzingaOrderManagementService,
    private storageService: StorageService,
    private firebaseService: FirebaseService,
    private router: Router,
    private route: ActivatedRoute,
    private analytics: AnalyticsService) {

    }

  ngOnInit(): void {
    this.analytics.logScreenView('phone_verification');
  }

  ngAfterViewInit() {
    console.log("Capture created")
    this.firebaseService.createCapture();
  }

  resend() {
    this.isVerificationRequested = false
  }

  verify() {
    this.phoneNumber = this.phoneNumber?.startsWith("+27")? this.phoneNumber : this.phoneNumber?.startsWith("0") ? 
      this.phoneNumber.replace("0", "+27") : this.phoneNumber?.startsWith("27") ? "+" + this.phoneNumber : "+27" +this.phoneNumber;
    this.firebaseService.requestVerification(this.phoneNumber)
      .subscribe(() => {
        this.isVerificationRequested = true
        this.hasError = false;
        this.analytics.logEvent('verification_code_sent');
      }, (error) => {
        this.hasError = true;
        this.errorMessage = error.message;
      })
  }

  confirmCode() {
    this.firebaseService.confirmCode(this.code!)
      .subscribe(cred => {
        this.isPhoneNumberVerified = true
        this.storageService.phoneNumber = this.phoneNumber!!;
        this.analytics.logEvent('phone_verified');
        this.router.navigate(["../dashboard"], { relativeTo: this.route }  )
      }, (error) => {
        console.log(error)
      })
  }

}
