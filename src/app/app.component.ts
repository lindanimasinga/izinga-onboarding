import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs/operators';
import { StorageService } from './service/storage-service.service';
import { FirebaseService } from './service/firebase.service';

const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");
document.body.classList.toggle('dark-theme', prefersDarkScheme.matches);

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent {
  title = 'izinga business';

  constructor(private router: Router, private storageService: StorageService, 
    private firebaseService: FirebaseService, private activatedRoute: ActivatedRoute) {}

  ngOnInit(): void {

    // Scroll to top on route change
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      setTimeout(() => {
        window.scrollTo(0, 0); 
        this.storageService.infoMessage = undefined
        this.storageService.infoMessage = undefined
      }, 1) // Scroll to top
    });

    this.firebaseService.requestPermission();

    // Start listening for messages
    this.firebaseService.listen();
  }

  get errorMessage() {
    return this.storageService.errorMessage
  }

  get infoMessage() {
    return this.storageService.infoMessage
  }
}
