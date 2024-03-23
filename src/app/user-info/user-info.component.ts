import { Component, ElementRef, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { UserProfile } from '../model/userProfile';
import { catchError, of, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import jsPDF, { jsPDFOptions } from 'jspdf';
import { StoreProfile } from '../model/storeProfile';
import { StorageService } from '../service/storage-service.service';

@Component({
  selector: 'app-user-info',
  templateUrl: './user-info.component.html',
  styleUrls: ['./user-info.component.css']
})
export class UserInfoComponent {

  userProfile?: UserProfile
  mobileNumber?: string
  @ViewChild('exportPdf', { static: false }) 
  exportPdf?: ElementRef;
  @ViewChild('logoImage', { static: false }) 
  logoImage?: ElementRef;
  isStoreAdmin?: boolean

  constructor(private izingaOrderManager: IzingaOrderManagementService,
    private router: Router,
    private route: ActivatedRoute, 
    private storageService: StorageService) {
  }

  ngOnInit() {
    var userObservable = this.storageService.userProfile != null ? of(this.storageService.userProfile!) : this.izingaOrderManager.getCustomerByPhoneNumber(this.storageService.phoneNumber!)
    userObservable.subscribe(user => {
      this.userProfile = user
      this.isStoreAdmin = user?.role == StoreProfile.RoleEnum.STOREADMIN
    })
  }

  findCustomer() {
    this.izingaOrderManager.getCustomerByPhoneNumber(this.mobileNumber!)
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
      this.userProfile = user
      this.isStoreAdmin = user?.role == StoreProfile.RoleEnum.STOREADMIN
    })
  }

  get appleWalletUrl(): String {
    var deviceType = this.isAndroid() ? "ANDROID" : "APPLE";
    return `${environment.izingaUrl}/walletpass/${this.userProfile!.id}/${deviceType}`
  }

  isAndroid(): boolean {
    return /Android/i.test(navigator.userAgent);
  }

  isIOS(): boolean {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  downloadPdf() {
    console.log("downloading qrcode as pdf")
    const width = this.exportPdf?.nativeElement.clientWidth;
    const height = this.exportPdf?.nativeElement.clientWidth;
    let jsPdfOptions: jsPDFOptions = {
      orientation: "p",
      unit: 'px',
      format: [430-32, 575]
    };

    const pdf = new jsPDF(jsPdfOptions);
    pdf.setFillColor(0, 0, 0);

    //QR Code
    
    pdf.html(this.exportPdf?.nativeElement, {
      callback: pdf => pdf.save(`iZinga_TipCard_${this.userProfile?.name}_${this.userProfile?.mobileNumber}.pdf`)
    });
  }

}
