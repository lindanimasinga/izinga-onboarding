import { Component } from '@angular/core';
import { StorageService } from '../service/storage-service.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css']
})
export class WelcomeSelectionComponent {

  constructor(private storageService: StorageService, private router: Router) {
  }

  ngOnInit(): void {
    // Scroll to top on route change
    if (this.storageService.userProfile?.role == 'ADMIN' || this.storageService.userProfile?.role == 'STORE_ADMIN') {
      this.router.navigate(['/business/dashboard'])
    } else if(this.storageService.userProfile?.role == 'MESSENGER' || this.storageService.userProfile?.role == 'CUSTOMER') {
      this.router.navigate(['/indivisuals/dashboard'])
    }
  }

}
