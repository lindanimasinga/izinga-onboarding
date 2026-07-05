import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IzingaOrderManagementService, Lead } from '../service/izinga-order-management.service';
import { StorageService } from '../service/storage-service.service';

@Component({
  selector: 'app-quotes',
  templateUrl: './quotes.component.html',
  styleUrls: ['./quotes.component.css']
})
export class QuotesComponent implements OnInit {

  leads: Lead[] = [];
  isLoading = true;
  errorMessage = '';
  isAdmin = false;

  constructor(
    private router: Router,
    private izingaOrderService: IzingaOrderManagementService,
    private storageService: StorageService
  ) {}

  ngOnInit(): void {
    const profile = this.storageService.userProfile;
    this.isAdmin = profile?.role === 'ADMIN';
    if (!this.isAdmin) {
      this.isLoading = false;
      return;
    }
    this.loadLeads();
  }

  loadLeads(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.izingaOrderService.getLeads('MOVERS').subscribe({
      next: (leads) => {
        this.leads = leads || [];
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load quotes. Please try again.';
        this.isLoading = false;
      }
    });
  }

  onStatusChange(lead: Lead, newStatus: string): void {
    this.izingaOrderService.updateLeadStatus(lead.id, newStatus).subscribe({
      next: () => {
        this.loadLeads();
      },
      error: () => {
        this.errorMessage = 'Failed to update lead status. Please try again.';
      }
    });
  }

  isConverted(lead: Lead): boolean {
    return lead.status === 'CONVERTED';
  }

  statusBadgeClass(status: string): string {
    switch (status) {
      case 'CAPTURED': return 'badge-captured';
      case 'CONTACTED': return 'badge-contacted';
      case 'CONVERTED': return 'badge-converted';
      case 'CLOSED': return 'badge-closed';
      default: return '';
    }
  }

  trackById(_: number, lead: Lead): string {
    return lead.id;
  }

  goBack(): void {
    const userType = this.storageService.userType;
    const base = userType === 'business' ? '/business' : '/indivisuals';
    this.router.navigate([`${base}/dashboard`]);
  }
}
