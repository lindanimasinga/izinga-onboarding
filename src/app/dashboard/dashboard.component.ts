import { Component } from '@angular/core';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { StorageService } from '../service/storage-service.service';
import { UserProfile } from '../model/userProfile';
import { Router } from '@angular/router';
import { FirebaseService } from '../service/firebase.service';
import { Device } from '../model/device';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {

  isStoreAdmin: boolean = false
  deferredPrompt: any;
  user?: UserProfile | null

  constructor(
    private izingaOrderManagementService: IzingaOrderManagementService,
    private storageService: StorageService, private router: Router, 
    private firebaseService: FirebaseService
  ) {}
  
  ngOnInit(): void {
    // Get the store ID from the route parameters
    this.izingaOrderManagementService.getCustomerByPhoneNumber(this.storageService.phoneNumber!)
    .subscribe(user => {
      this.isStoreAdmin = user.role == UserProfile.RoleEnum.STOREADMIN || user.role == UserProfile.RoleEnum.ADMIN
      this.user = user
      this.storageService.userProfile = user
      this.updateDevice()
    })
  }

  registerDevice() {
    var token = this.firebaseService.getCurrentToken()
    if (token) {
      var device: Device = {
        userId: this.user?.id,
        token: token
      }
      this.izingaOrderManagementService.registerDeviceToUser(device).subscribe(device => this.storageService.device = device)
    }
  }

  updateDevice() {
    var device = this.storageService.device
    if(device) {
      this.izingaOrderManagementService.updateDeviceToUser(
        { 
          token: device?.token, 
          userId: this.user?.id
        }, 
        this.user?.id!
      ).subscribe(device => this.storageService.device = device)
    } else {
      this.registerDevice()
    }
    
  }

  logout() {
    this.storageService.logout()
    location.reload()
  }

  initPWAInstaller() {
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      this.deferredPrompt = e;
      // Optionally, prompt the user to install
      // You can show a button or prompt here
      this.showInstallPrompt();
    });
  }

  showInstallPrompt() {
    // When ready to show the prompt
    this.deferredPrompt.prompt();

    this.deferredPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      this.deferredPrompt = undefined;
    });
  }


}
