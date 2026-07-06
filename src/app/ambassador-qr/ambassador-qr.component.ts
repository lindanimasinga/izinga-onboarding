import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { StorageService } from '../service/storage-service.service';
import { AnalyticsService } from '../service/analytics.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-ambassador-qr',
  templateUrl: './ambassador-qr.component.html',
  styleUrls: ['./ambassador-qr.component.css']
})
export class AmbassadorQrComponent implements OnInit {

  loading = true;
  error: string | null = null;
  qrImageUrl: string | null = null;
  referralUrl: string | null = null;
  linkCopied = false;
  private copyTimeout: any;

  constructor(
    private http: HttpClient,
    private storageService: StorageService,
    private analytics: AnalyticsService
  ) {}

  ngOnInit(): void {
    this.analytics.logScreenView('ambassador_qr');
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

    this.referralUrl = `https://onboarding.izinga.co.za/indivisuals?ref=${user.id}`;
    this.loadQrCode(user.id);
  }

  private loadQrCode(userId: string): void {
    const headers = new HttpHeaders({
      'api-key': this.storageService.phoneNumber || ''
    });

    this.http
      .get(`${environment.izingaUrl}/user/${userId}/ambassador-qr`, {
        headers,
        responseType: 'blob'
      })
      .subscribe({
        next: (blob: Blob) => {
          this.qrImageUrl = URL.createObjectURL(blob);
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load ambassador QR code:', err);
          if (err.status === 403 || err.status === 401) {
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
      this.copyTimeout = setTimeout(() => {
        this.linkCopied = false;
      }, 3000);
    }).catch((err) => {
      console.error('Clipboard write failed:', err);
      // Fallback for older browsers
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
      this.copyTimeout = setTimeout(() => {
        this.linkCopied = false;
      }, 3000);
    });
  }

  ngOnDestroy(): void {
    if (this.qrImageUrl) {
      URL.revokeObjectURL(this.qrImageUrl);
    }
    clearTimeout(this.copyTimeout);
  }
}
