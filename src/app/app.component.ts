import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs/operators';
import { StorageService } from './service/storage-service.service';
import { FirebaseService } from './service/firebase.service';
import { Title, Meta } from '@angular/platform-browser';
import { environment } from 'src/environments/environment';

const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");
document.body.classList.toggle('dark-theme', prefersDarkScheme.matches);
type UserType = '' | 'shop' | 'individual' | 'driver';

interface WelcomeHeroCopy {
  heading: string;
  description: string;
}

interface SignupCardCopy {
  title: string;
  description: string;
  cta: string;
  route: string;
}

interface SeoConfig {
  title: string;
  description: string;
  keywords: string;
  ogTitle: string;
  ogDescription: string;
  twitterTitle: string;
  twitterDescription: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'izinga business';
  userType: UserType = environment.userTypeConfig.defaultUserType as UserType;

  constructor(private router: Router, private storageService: StorageService,
    private firebaseService: FirebaseService, private activatedRoute: ActivatedRoute,
    private titleService: Title,
    private metaService: Meta) { }

  ngOnInit(): void {

    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const hostUserType = this.getUserTypeFromHostname(hostname);
    console.log('Hostname:', hostname, 'Mapped user type:', hostUserType);
    if (hostUserType) {
      this.setUserType(hostUserType);
      console.log('User type from hostname:', this.userType);
    } else {
      this.updateBodyClass();
      this.updateManifest();
      this.updateSeo();
    }

    this.activatedRoute.queryParams.subscribe(params => {
      console.log("User profile on welcome page:", params);
      if (!hostUserType && params['type']) {
        this.setUserType(params['type']);
        console.log("User type from query params: " + this.userType);
      }
    });

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

  private getUserTypeFromHostname(hostname: string): string | undefined {
    const normalizedHostname = hostname.toLowerCase();
    return environment.userTypeConfig.hostnameToUserType[normalizedHostname as keyof typeof environment.userTypeConfig.hostnameToUserType];
  }

  private normalizeUserType(userType?: string): UserType {
    if (userType === '' || userType === 'shop' || userType === 'individual' || userType === 'driver') {
      return userType;
    }

    return environment.userTypeConfig.defaultUserType as UserType;
  }

  private setUserType(userType?: string): void {
    this.userType = this.normalizeUserType(userType);
    this.storageService.userType = this.userType;
    this.updateBodyClass();
    this.updateManifest();
    this.updateSeo();
  }

  private updateBodyClass(): void {
    if (typeof document === 'undefined') {
      return;
    }

    if (this.userType === 'shop' || this.userType === 'driver' || this.userType === 'individual') {
      document.body.classList.add(environment.userTypeConfig.bodyClassByUserType[this.userType]);
    }
  }

  private updateManifest(): void {
    if (typeof document === 'undefined') {
      return;
    }

    const manifestLink = document.getElementById('app-manifest-link') as HTMLLinkElement | null;
    if (!manifestLink) {
      return;
    }

    if (this.userType === 'shop' || this.userType === 'driver' || this.userType === 'individual') {
      manifestLink.href = environment.userTypeConfig.manifestByUserType[this.userType];
    }
  }

  private updateSeo(): void {
    if (this.userType !== 'shop' && this.userType !== 'driver' && this.userType !== 'individual') {
      return;
    }

    const seo = environment.userTypeConfig.seo[this.userType] as SeoConfig;

    this.titleService.setTitle(seo.title);
    this.metaService.updateTag({ name: 'description', content: seo.description });
    this.metaService.updateTag({ name: 'keywords', content: seo.keywords });

    this.metaService.updateTag({ property: 'og:title', content: seo.ogTitle });
    this.metaService.updateTag({ property: 'og:description', content: seo.ogDescription });

    this.metaService.updateTag({ name: 'twitter:title', content: seo.twitterTitle });
    this.metaService.updateTag({ name: 'twitter:description', content: seo.twitterDescription });
  }
}
