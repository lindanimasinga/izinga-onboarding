import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { StorageService } from '../service/storage-service.service';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { UserProfile } from '../model/userProfile';
import { AnalyticsService } from '../service/analytics.service';

@Component({
  selector: 'app-terms-conditions',
  templateUrl: './terms-conditions.component.html',
  styleUrls: ['./terms-conditions.component.css']
})
export class TermsConditionsComponent implements OnInit {

  termsAccepted = false;
  acceptError = false;
  icaContent = '';
  userId?: string;
  user: UserProfile | undefined;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private storageService: StorageService,
    private izingaOrderManager: IzingaOrderManagementService,
    private analytics: AnalyticsService,
    private http: HttpClient,
    private sanitizer: DomSanitizer
  ) {}

  get isAmbassador(): boolean {
    return this.user?.role === UserProfile.RoleEnum.AMBASSADOR;
  }

  get icaHtml(): SafeHtml {
    const html = this.simpleMarkdownToHtml(this.icaContent);
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  ngOnInit() {
    this.analytics.logScreenView('terms_conditions');
    this.route.params.subscribe(params => {
      this.userId = params['id'];
    });
    this.user = this.storageService.userProfile!;

    if (this.isAmbassador) {
      this.http.get('/assets/legal/ambassador-ica-v1.md', { responseType: 'text' }).subscribe({
        next: (content) => { this.icaContent = content; },
        error: () => { this.icaContent = ''; }
      });
    }
  }

  acceptTerms() {
    this.acceptError = false;

    if (this.termsAccepted && this.userId && this.user) {
      if (this.isAmbassador) {
        this.user.icaAccepted = true;
        this.user.icaAcceptedDate = new Date();
        this.user.icaVersion = 'v1';

        this.izingaOrderManager.updateCustomer(this.user).subscribe({
          next: (updatedUser: UserProfile) => {
            this.storageService.userProfile = updatedUser;
            this.analytics.logEvent('ica_accepted', { userId: this.userId });
            this.router.navigate(['/indivisuals/dashboard']);
          },
          error: () => { this.acceptError = true; }
        });
      } else {
        this.user.termsAccepted = true;
        this.user.termsAcceptedDate = new Date();

        this.izingaOrderManager.updateCustomer(this.user).subscribe({
          next: (updatedUser: UserProfile) => {
            this.storageService.userProfile = updatedUser;
            this.analytics.logEvent('terms_accepted', { userId: this.userId });

            const currentUrl = this.router.url;
            if (currentUrl.includes('/indivisuals/')) {
              this.router.navigate(['/indivisuals/dashboard']);
            } else if (currentUrl.includes('/business/')) {
              this.router.navigate(['/business/dashboard']);
            } else {
              this.router.navigate(['/indivisuals/dashboard']);
            }
          },
          error: () => { this.acceptError = true; }
        });
      }
    }
  }

  private simpleMarkdownToHtml(md: string): string {
    if (!md) { return ''; }

    let html = md
      // Escape HTML entities first
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Tables: simple pipe tables — convert to Bootstrap table
      .replace(/^\|(.+)\|\s*$/gm, (line) => {
        const isSeparator = /^\|[\s\-|:]+\|$/.test(line.trim());
        if (isSeparator) { return ''; }
        const cells = line.split('|').filter((_, i, a) => i > 0 && i < a.length - 1);
        return '<tr>' + cells.map(c => `<td>${c.trim()}</td>`).join('') + '</tr>';
      })
      // Wrap table rows
      .replace(/((<tr>.*<\/tr>\n?)+)/g, '<table class="table table-sm table-bordered mt-2 mb-2">$1</table>')
      // ### headings
      .replace(/^### (.+)$/gm, '<h5 class="mt-4 mb-2 fw-bold">$1</h5>')
      // ## headings
      .replace(/^## (.+)$/gm, '<h4 class="mt-4 mb-2 fw-bold">$1</h4>')
      // # headings
      .replace(/^# (.+)$/gm, '<h3 class="mt-4 mb-2 fw-bold">$1</h3>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Horizontal rules
      .replace(/^---+$/gm, '<hr>')
      // Blank lines → paragraph breaks
      .replace(/\n\n/g, '</p><p>')
      // Wrap in paragraph
      ;

    return '<p>' + html + '</p>';
  }
}
