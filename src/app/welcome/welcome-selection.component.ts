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
    if (this.storageService.phoneNumber) {
      this.router.navigate(['/business/dashboard'])
    }
  }

}
