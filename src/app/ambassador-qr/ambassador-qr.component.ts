import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { StorageService } from '../service/storage-service.service';
import { AnalyticsService } from '../service/analytics.service';
import { FirebaseService } from '../service/firebase.service';
import { environment } from '../../environments/environment';

interface AmbassadorDriver {
  id: string;
  name: string;
  mobileNumber: string;
  profileApproved: boolean;
  role: string;
}

interface AmbassadorPayout {
  id: string;
  commissionAmount: number;
  triggerDriverId: string;
  payoutStage: string;
  toName: string;
  createdDate: string;
}

@Component({
  selector: 'app-ambassador-qr',
  templateUrl: './ambassador-qr.component.html',
  styleUrls: ['./ambassador-qr.component.css']
})
export class AmbassadorQrComponent implements OnInit, OnDestroy {

  loading = true;
  error: string | null = null;
  activeTab: 'qr' | 'payouts' | 'drivers' = 'qr';

  // QR tab
  qrImageUrl: string | null = null;
  referralUrl: string | null = null;
  linkCopied = false;
  private copyTimeout: any;

  // Drivers tab
  drivers: AmbassadorDriver[] = [];
  driversLoading = false;
  driversLoaded = false;

  // Payouts tab
  payouts: AmbassadorPayout[] = [];
  payoutsLoading = false;
  payoutsLoaded = false;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private storageService: StorageService,
    private analytics: AnalyticsService,
    private firebaseService: FirebaseService
  ) {}

  ngOnInit(): void {
    this.analytics.logScreenView('ambassador_qr');
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab === 'drivers' || tab === 'payouts' || tab === 'qr') {
      this.activeTab = tab;
    }
    const user = this.storageService.userProfile;

    if (!user || !user.id) {
      this.error = 'Your profile could not be loaded. Please log in again.';
      this.loading = false;
      return;
    }

    if (user.role !== 'AMBASSADOR') {
      this.error = 'This page is only available to iZinga Ambassadors.';
      this.loading = false;
      return;
    }

    this.referralUrl = `https://driver.izinga.co.za/indivisuals?ref=${user.id}`;
    this.loadQrCode(user.id);
  }

  selectTab(tab: 'qr' | 'payouts' | 'drivers'): void {
    this.activeTab = tab;
    const user = this.storageService.userProfile;
    if (!user?.id) return;

    if (tab === 'drivers' && !this.driversLoaded) {
      this.loadDrivers(user.id);
    }
    if (tab === 'payouts' && !this.payoutsLoaded) {
      this.loadPayouts(user.id);
    }
  }

  private loadQrCode(userId: string): void {
    this.firebaseService.getFirebaseIdToken().pipe(
      switchMap(token => {
        const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
        return this.http.get(
          `${environment.izingaUrl}/user/${userId}/ambassador-qr`,
          { responseType: 'blob', headers }
        );
      })
    ).subscribe({
      next: (blob: Blob) => {
        this.qrImageUrl = URL.createObjectURL(blob);
        this.loading = false;
      },
      error: (err) => {
        if (err.status === 401) {
          this.error = 'Your session has expired. Please sign in again.';
          this.router.navigate(['/']);
        } else if (err.status === 403) {
          this.error = 'Your account is not yet approved as an Ambassador. Please wait for approval before accessing this page.';
        } else if (err.status === 404) {
          this.error = 'Ambassador QR code not found. Please contact support.';
        } else {
          this.error = 'Could not load your QR code. Please try again later.';
        }
        this.loading = false;
      }
    });
  }

  private loadDrivers(userId: string): void {
    this.driversLoading = true;
    this.firebaseService.getFirebaseIdToken().pipe(
      switchMap(token => {
        const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
        return this.http.get<AmbassadorDriver[]>(
          `${environment.izingaUrl}/user/${userId}/ambassador-drivers`,
          { headers }
        );
      })
    ).subscribe({
      next: (drivers) => {
        this.drivers = drivers;
        this.driversLoading = false;
        this.driversLoaded = true;
      },
      error: (err) => {
        if (err.status === 401) {
          this.error = 'Your session has expired. Please sign in again.';
          this.router.navigate(['/']);
        }
        this.driversLoading = false;
        this.driversLoaded = true;
      }
    });
  }

  private loadPayouts(userId: string): void {
    this.payoutsLoading = true;
    this.firebaseService.getFirebaseIdToken().pipe(
      switchMap(token => {
        const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
        return this.http.get<AmbassadorPayout[]>(
          `${environment.izingaUrl}/user/${userId}/ambassador-payouts`,
          { headers }
        );
      })
    ).subscribe({
      next: (payouts) => {
        this.payouts = payouts.sort((a, b) =>
          new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
        );
        this.payoutsLoading = false;
        this.payoutsLoaded = true;
      },
      error: (err) => {
        if (err.status === 401) {
          this.error = 'Your session has expired. Please sign in again.';
          this.router.navigate(['/']);
        }
        this.payoutsLoading = false;
        this.payoutsLoaded = true;
      }
    });
  }

  get totalEarnings(): number {
    return this.payouts
      .filter(p => p.payoutStage === 'COMPLETED')
      .reduce((sum, p) => sum + (p.commissionAmount || 0), 0);
  }

  get pendingEarnings(): number {
    return this.payouts
      .filter(p => p.payoutStage === 'PENDING' || p.payoutStage === 'PROCESSING')
      .reduce((sum, p) => sum + (p.commissionAmount || 0), 0);
  }

  get approvedDriverCount(): number {
    return this.drivers.filter(d => d.profileApproved).length;
  }

  downloadQr(): void {
    if (!this.qrImageUrl) return;
    const user = this.storageService.userProfile;
    const a = document.createElement('a');
    a.href = this.qrImageUrl;
    a.download = `izinga-ambassador-qr-${user?.id ?? 'code'}.png`;
    a.click();
  }

  copyReferralLink(): void {
    if (!this.referralUrl) return;
    navigator.clipboard.writeText(this.referralUrl).then(() => {
      this.linkCopied = true;
      clearTimeout(this.copyTimeout);
      this.copyTimeout = setTimeout(() => { this.linkCopied = false; }, 3000);
    }).catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = this.referralUrl!;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      this.linkCopied = true;
      clearTimeout(this.copyTimeout);
      this.copyTimeout = setTimeout(() => { this.linkCopied = false; }, 3000);
    });
  }

  stageLabel(stage: string): string {
    const map: Record<string, string> = {
      PENDING: 'Pending', PROCESSING: 'Processing',
      COMPLETED: 'Paid', VOIDED: 'Voided'
    };
    return map[stage] ?? stage;
  }

  stageBadgeClass(stage: string): string {
    const map: Record<string, string> = {
      PENDING: 'badge-pending', PROCESSING: 'badge-processing',
      COMPLETED: 'badge-completed', VOIDED: 'badge-voided'
    };
    return map[stage] ?? '';
  }

  ngOnDestroy(): void {
    if (this.qrImageUrl) URL.revokeObjectURL(this.qrImageUrl);
    clearTimeout(this.copyTimeout);
  }
}
