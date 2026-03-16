import { Component } from '@angular/core';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { StorageService } from '../service/storage-service.service';
import { UserProfile } from '../model/userProfile';
import { Router } from '@angular/router';
import { FirebaseService } from '../service/firebase.service';
import { Device } from '../model/device';
import { AnalyticsService } from '../service/analytics.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {

  isStoreAdmin: boolean = false
  isAdmin: boolean = false
  isMessenger: boolean = false
  deferredPrompt: any;
  user?: UserProfile | null

  constructor(
    private izingaOrderManagementService: IzingaOrderManagementService,
    private storageService: StorageService, private router: Router, 
    private firebaseService: FirebaseService,
    private analytics: AnalyticsService
  ) {}
  
  ngOnInit(): void {
    // Get the store ID from the route parameters
    this.izingaOrderManagementService.getCustomerByPhoneNumber(this.storageService.phoneNumber!)
    .subscribe(user => {
      this.isStoreAdmin = user.role == UserProfile.RoleEnum.STOREADMIN || user.role == UserProfile.RoleEnum.ADMIN
      this.isMessenger = user.role == UserProfile.RoleEnum.MESSENGER || user.role == UserProfile.RoleEnum.CUSTOMER
      this.isAdmin = user.role == UserProfile.RoleEnum.ADMIN
      this.user = user
      this.storageService.userProfile = user
      this.analytics.logScreenView('dashboard', { user_role: user.role });
      
      // Check if user has accepted terms and conditions  
      if (!user.termsAccepted) {
        // Redirect to terms page with user ID, maintaining current route context
        const currentUrl = this.router.url;
        if (currentUrl.includes('/indivisuals/')) {
          this.router.navigate(['/indivisuals/terms', user.id]);
        } else if (currentUrl.includes('/business/')) {
          this.router.navigate(['/business/terms', user.id]);
        } else {
          // Default fallback
          this.router.navigate(['/indivisuals/terms', user.id]);
        }
        return;
      }
      
      this.updateDevice()
    }, error => { 
      //if error is 404 navigate to user update
      console.log("Error fetching user:", error)
      if (error.status == 404) {
        // User not found, redirect to user registration flow
        const currentUrl = this.router.url;
        if (currentUrl.includes('/indivisuals/')) {
          this.router.navigate(['/indivisuals/user']);
        } else if (currentUrl.includes('/business/')) {
          this.router.navigate(['/business/user']);
        } else {
          // Default fallback
          this.router.navigate(['/indivisuals/user']);
        }
      }
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

  setAvailabilityStatus(status: 'ONLINE' | 'AWAY' | 'OFFLINE') {
    if (this.user) {
      this.user.availabilityStatus = status;
      this.izingaOrderManagementService.updateCustomer(this.user)
      .subscribe(resp => {
        console.log("Updated availability status to ", status)
        alert(`Your availability status has been set to ${status}`);
      });
    }
  }

}
