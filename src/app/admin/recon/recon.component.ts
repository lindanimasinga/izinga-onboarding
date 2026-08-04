/**
 * ReconComponent — #64.
 *
 * Route: /admin/recon/detail
 *
 * Shows the current shop and messenger payout bundles in full, with sortable
 * tables (plain TypeScript sort — no Angular Material dependency). Allows
 * bulk-mark and submit for each bundle.
 *
 * Ported from web-ui src/app/recon/recon.component.ts.
 * Uses fetchAllStores() from IzingaOrderManagementService (added in #64)
 * and the corrected ReconPayoutService / recon models.
 */

import { Component, OnInit } from '@angular/core';
import { ReconPayoutService } from '../../service/recon-payout.service';
import { IzingaOrderManagementService } from '../../service/izinga-order-management.service';
import { StoreProfile } from '../../model/storeProfile';
import { PayoutBundle } from '../../model/recon/payout-bundle';
import { ReconPayout, PayoutType } from '../../model/recon/payout';

type SortDirection = 'asc' | 'desc';

interface SortState {
  column: string;
  direction: SortDirection;
}

@Component({
  selector: 'app-recon',
  templateUrl: './recon.component.html',
  styleUrls: ['./recon.component.css']
})
export class ReconComponent implements OnInit {

  shopBundle?: PayoutBundle;
  messengerBundle?: PayoutBundle;
  shops: StoreProfile[] = [];

  shopSortedPayouts: ReconPayout[] = [];
  messengerSortedPayouts: ReconPayout[] = [];

  shopSort: SortState = { column: 'toName', direction: 'asc' };
  messengerSort: SortState = { column: 'toName', direction: 'asc' };

  isLoadingShop = false;
  isLoadingMessenger = false;
  shopError = '';
  messengerError = '';

  shopSubmitInProgress = false;
  messengerSubmitInProgress = false;

  /** Pending CSV confirmation state. */
  pendingCsvType: 'shop' | 'messenger' | null = null;
  shopCsvInProgress = false;
  messengerCsvInProgress = false;

  constructor(
    private reconService: ReconPayoutService,
    private orderService: IzingaOrderManagementService
  ) {}

  ngOnInit(): void {
    this.loadShopBundle();
    this.loadMessengerBundle();
    this.orderService.fetchAllStores().subscribe({
      next: stores => this.shops = stores,
      error: err => console.error('Store load error:', err)
    });
  }

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  loadShopBundle(): void {
    this.isLoadingShop = true;
    this.shopError = '';
    this.reconService.getShopPayoutBundle().subscribe({
      next: bundle => {
        this.shopBundle = bundle;
        this.shopSortedPayouts = [...bundle.payouts];
        this.applySort(this.shopSortedPayouts, this.shopSort);
        this.isLoadingShop = false;
      },
      error: err => {
        this.shopError = 'Failed to load shop payout bundle. Please try again.';
        this.isLoadingShop = false;
        console.error('Shop bundle load error:', err);
      }
    });
  }

  loadMessengerBundle(): void {
    this.isLoadingMessenger = true;
    this.messengerError = '';
    this.reconService.getMessengerPayoutBundle().subscribe({
      next: bundle => {
        this.messengerBundle = bundle;
        this.messengerSortedPayouts = [...bundle.payouts];
        this.applySort(this.messengerSortedPayouts, this.messengerSort);
        this.isLoadingMessenger = false;
      },
      error: err => {
        this.messengerError = 'Failed to load messenger payout bundle. Please try again.';
        this.isLoadingMessenger = false;
        console.error('Messenger bundle load error:', err);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Sorting — plain TypeScript, no Angular Material
  // ---------------------------------------------------------------------------

  sortShop(column: string): void {
    if (this.shopSort.column === column) {
      this.shopSort.direction = this.shopSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.shopSort = { column, direction: 'asc' };
    }
    this.applySort(this.shopSortedPayouts, this.shopSort);
  }

  sortMessenger(column: string): void {
    if (this.messengerSort.column === column) {
      this.messengerSort.direction = this.messengerSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.messengerSort = { column, direction: 'asc' };
    }
    this.applySort(this.messengerSortedPayouts, this.messengerSort);
  }

  private applySort(payouts: ReconPayout[], state: SortState): void {
    payouts.sort((a, b) => {
      const aVal = (a as any)[state.column] ?? '';
      const bVal = (b as any)[state.column] ?? '';
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return state.direction === 'asc' ? cmp : -cmp;
    });
  }

  sortIcon(active: SortState, column: string): string {
    if (active.column !== column) { return '↕'; } // ↕
    return active.direction === 'asc' ? '↑' : '↓'; // ↑ / ↓
  }

  // ---------------------------------------------------------------------------
  // Mark all + PATCH submit
  // ---------------------------------------------------------------------------

  markAllPayments(payouts: ReconPayout[]): void {
    payouts.forEach(p => p.paid = !p.paid);
  }

  updateShopPayouts(): void {
    if (!this.shopBundle || this.shopSubmitInProgress) { return; }
    this.shopSubmitInProgress = true;
    const results = {
      bundleId: this.shopBundle.id ?? '',
      payoutItemResults: this.shopSortedPayouts.map(p => ({
        toId: p.toId,
        paid: p.paid,
        type: 'SHOP' as PayoutType
      }))
    };
    this.reconService.patchShopPayoutBundle(results).subscribe({
      next: () => { this.shopSubmitInProgress = false; this.loadShopBundle(); },
      error: err => {
        this.shopSubmitInProgress = false;
        alert('Failed to submit shop results. Please try again.');
        console.error(err);
      }
    });
  }

  updateMessengerPayouts(): void {
    if (!this.messengerBundle || this.messengerSubmitInProgress) { return; }
    this.messengerSubmitInProgress = true;
    const results = {
      bundleId: this.messengerBundle.id ?? '',
      payoutItemResults: this.messengerSortedPayouts.map(p => ({
        toId: p.toId,
        paid: p.paid,
        type: 'MESSENGER' as PayoutType
      }))
    };
    this.reconService.patchMessengerPayoutBundle(results).subscribe({
      next: () => { this.messengerSubmitInProgress = false; this.loadMessengerBundle(); },
      error: err => {
        this.messengerSubmitInProgress = false;
        alert('Failed to submit messenger results. Please try again.');
        console.error(err);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // CSV download — DESTRUCTIVE
  // ---------------------------------------------------------------------------

  requestCsvDownload(type: 'shop' | 'messenger'): void {
    this.pendingCsvType = type;
  }

  cancelCsvDownload(): void {
    this.pendingCsvType = null;
  }

  confirmCsvDownload(): void {
    const type = this.pendingCsvType;
    this.pendingCsvType = null;
    if (type === 'shop') {
      this.shopCsvInProgress = true;
      this.reconService.triggerShopCsvDownload().subscribe({
        next: () => { this.shopCsvInProgress = false; this.loadShopBundle(); },
        error: err => { this.shopCsvInProgress = false; alert('CSV download failed.'); console.error(err); }
      });
    } else if (type === 'messenger') {
      this.messengerCsvInProgress = true;
      const bundleDate = this.messengerBundle?.date ? new Date(this.messengerBundle.date) : new Date();
      this.reconService.triggerMessengerCsvDownload(bundleDate).subscribe({
        next: () => { this.messengerCsvInProgress = false; this.loadMessengerBundle(); },
        error: err => { this.messengerCsvInProgress = false; alert('CSV download failed.'); console.error(err); }
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  getShopName(shopId: string): string {
    const shop = this.shops.find(s => s.id === shopId);
    return shop?.name ?? shopId;
  }
}
