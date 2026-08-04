/**
 * PayoutOrdersComponent — #64.
 *
 * Route: /admin/recon/payout?bundle=<bundleId>&payout=<payoutId>
 *
 * Shows order-level detail for a single payout, plus the historical payout
 * list for the same recipient. Sortable order table (plain TypeScript sort —
 * no Angular Material dependency).
 *
 * Ported from web-ui src/app/recon/payout-orders/payout-orders.component.ts.
 * Uses getCustomerById from IzingaOrderManagementService (already exists)
 * instead of web-ui's UserControllerService.findUser.
 */

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ReconPayoutService } from '../../../service/recon-payout.service';
import { IzingaOrderManagementService } from '../../../service/izinga-order-management.service';
import { ReconPayout } from '../../../model/recon/payout';
import { Order } from '../../../model/order';
import { UserProfile } from '../../../model/userProfile';

type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-payout-orders',
  templateUrl: './payout-orders.component.html',
  styleUrls: ['./payout-orders.component.css']
})
export class PayoutOrdersComponent implements OnInit {

  payout?: ReconPayout;
  pastPayouts: ReconPayout[] = [];
  sortedOrders: Order[] = [];
  customers: UserProfile[] = [];

  sortColumn = 'date';
  sortDirection: SortDirection = 'desc';

  isLoadingPayout = false;
  isLoadingPast = false;
  payoutError = '';
  pastError = '';

  constructor(
    private activeRoute: ActivatedRoute,
    private reconService: ReconPayoutService,
    private orderService: IzingaOrderManagementService
  ) {}

  ngOnInit(): void {
    this.activeRoute.queryParams.subscribe(params => {
      const bundleId: string = params['bundle'];
      const payoutId: string = params['payout'];
      if (bundleId && payoutId) {
        this.loadPayout(bundleId, payoutId);
      }
    });
  }

  private loadPayout(bundleId: string, payoutId: string): void {
    this.isLoadingPayout = true;
    this.payoutError = '';
    this.reconService.getPayoutByBundleAndId(bundleId, payoutId).subscribe({
      next: payout => {
        this.isLoadingPayout = false;
        if (!payout) {
          this.payoutError = 'Payout not found.';
          return;
        }
        this.payout = payout;
        this.sortedOrders = [...(payout.orders ?? [])];
        this.applySort();
        this.loadCustomers((payout.orders ?? []).map(o => o.customerId).filter((id): id is string => !!id));
        this.loadPastPayouts(payout.toId);
      },
      error: err => {
        this.isLoadingPayout = false;
        this.payoutError = 'Failed to load payout. Please try again.';
        console.error('Payout load error:', err);
      }
    });
  }

  private loadPastPayouts(toId: string): void {
    this.isLoadingPast = true;
    this.pastError = '';
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - 3);
    // Determine type from payout context — default MESSENGER for individual payees
    this.reconService.getPayoutsForUser('MESSENGER', fromDate, toDate, toId).subscribe({
      next: payouts => {
        this.pastPayouts = payouts;
        this.isLoadingPast = false;
      },
      error: err => {
        this.pastError = 'Failed to load payout history.';
        this.isLoadingPast = false;
        console.error('Past payouts error:', err);
      }
    });
  }

  private loadCustomers(ids: string[]): void {
    const unique = [...new Set(ids)];
    unique.forEach(id => {
      this.orderService.getCustomerById(id).subscribe({
        next: user => this.customers.push(user),
        error: () => { /* non-fatal — table will show id fallback */ }
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Sorting
  // ---------------------------------------------------------------------------

  sortBy(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.applySort();
  }

  private applySort(): void {
    this.sortedOrders.sort((a, b) => {
      let aVal: any;
      let bVal: any;
      switch (this.sortColumn) {
        case 'fromAddress':
          aVal = a.shippingData?.fromAddress ?? '';
          bVal = b.shippingData?.fromAddress ?? '';
          break;
        case 'basketAmount':
          aVal = a.basketAmount ?? 0;
          bVal = b.basketAmount ?? 0;
          break;
        case 'fee':
          aVal = a.shippingData?.fee ?? 0;
          bVal = b.shippingData?.fee ?? 0;
          break;
        default:
          aVal = (a as any)[this.sortColumn] ?? '';
          bVal = (b as any)[this.sortColumn] ?? '';
      }
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return this.sortDirection === 'asc' ? cmp : -cmp;
    });
  }

  sortIcon(column: string): string {
    if (this.sortColumn !== column) { return '↕'; }
    return this.sortDirection === 'asc' ? '↑' : '↓';
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  getUser(customerId: string): UserProfile | undefined {
    return this.customers.find(c => c.id === customerId || c.mobileNumber === customerId);
  }
}
