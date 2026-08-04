/**
 * ReconPayoutService — #62.
 *
 * Implements all 9 recon API endpoints. Every call attaches a Firebase Bearer
 * token following the same pattern used elsewhere in IzingaOrderManagementService
 * (no HTTP interceptor exists in this app — auth is added per-request).
 *
 * CSV endpoints (#8, #9) are DESTRUCTIVE — they advance all payouts in the
 * current bundle to PROCESSING stage as a side effect. They must only be
 * called on explicit user action (confirmed dialog), never on page load or
 * in any retry/polling logic.
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { FirebaseService } from './firebase.service';
import { PayoutBundle } from '../model/recon/payout-bundle';
import { ReconPayout, PayoutBundleResults, PayoutType } from '../model/recon/payout';

@Injectable({
  providedIn: 'root'
})
export class ReconPayoutService {

  private get baseUrl(): string {
    return environment.izingaUrl;
  }

  constructor(
    private http: HttpClient,
    private firebaseService: FirebaseService
  ) {}

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private baseHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'app-version': environment.appVersion
    };
  }

  /**
   * Returns an Observable that emits an HttpHeaders instance with the Firebase
   * Bearer token attached. Refreshes the token if needed (getIdToken(true) is
   * handled by FirebaseService when the token is close to expiry).
   */
  private authHeaders(): Observable<HttpHeaders> {
    return this.firebaseService.getFirebaseIdToken().pipe(
      switchMap(token => {
        const headers = new HttpHeaders({
          ...this.baseHeaders(),
          'Authorization': `Bearer ${token}`
        });
        return [headers];
      })
    );
  }

  // ---------------------------------------------------------------------------
  // Endpoint 1: GET /recon/shopPayoutBundle
  // ---------------------------------------------------------------------------

  getShopPayoutBundle(): Observable<PayoutBundle> {
    return this.authHeaders().pipe(
      switchMap(headers =>
        this.http.get<PayoutBundle>(`${this.baseUrl}/recon/shopPayoutBundle`, { headers })
      ),
      catchError(err => throwError(err))
    );
  }

  // ---------------------------------------------------------------------------
  // Endpoint 2: PATCH /recon/shopPayoutBundle
  // ---------------------------------------------------------------------------

  patchShopPayoutBundle(results: PayoutBundleResults): Observable<void> {
    return this.authHeaders().pipe(
      switchMap(headers =>
        this.http.patch<void>(`${this.baseUrl}/recon/shopPayoutBundle`, results, { headers })
      ),
      catchError(err => throwError(err))
    );
  }

  // ---------------------------------------------------------------------------
  // Endpoint 3: GET /recon/messengerPayoutBundle
  // ---------------------------------------------------------------------------

  getMessengerPayoutBundle(): Observable<PayoutBundle> {
    return this.authHeaders().pipe(
      switchMap(headers =>
        this.http.get<PayoutBundle>(`${this.baseUrl}/recon/messengerPayoutBundle`, { headers })
      ),
      catchError(err => throwError(err))
    );
  }

  // ---------------------------------------------------------------------------
  // Endpoint 4: PATCH /recon/messengerPayoutBundle
  // ---------------------------------------------------------------------------

  patchMessengerPayoutBundle(results: PayoutBundleResults): Observable<void> {
    return this.authHeaders().pipe(
      switchMap(headers =>
        this.http.patch<void>(`${this.baseUrl}/recon/messengerPayoutBundle`, results, { headers })
      ),
      catchError(err => throwError(err))
    );
  }

  // ---------------------------------------------------------------------------
  // Endpoint 5: GET /recon/payoutBundle?payoutType=&fromDate=&toDate=
  // Returns Payout[] (historical bundles flattened)
  // ---------------------------------------------------------------------------

  getPayoutBundles(
    payoutType: PayoutType,
    fromDate: Date,
    toDate: Date
  ): Observable<ReconPayout[]> {
    return this.authHeaders().pipe(
      switchMap(headers =>
        this.http.get<ReconPayout[]>(`${this.baseUrl}/recon/payoutBundle`, {
          headers,
          params: {
            payoutType,
            fromDate: fromDate.toISOString(),
            toDate: toDate.toISOString()
          }
        })
      ),
      catchError(err => throwError(err))
    );
  }

  // ---------------------------------------------------------------------------
  // Endpoint 6: GET /recon/payout?payoutType=&fromDate=&toDate=&toId=
  // For MESSENGER team queries: messengerAdminId + optional messengerId.
  // ---------------------------------------------------------------------------

  getPayoutsForUser(
    payoutType: PayoutType,
    fromDate: Date,
    toDate: Date,
    toId?: string,
    messengerAdminId?: string,
    messengerId?: string
  ): Observable<ReconPayout[]> {
    return this.authHeaders().pipe(
      switchMap(headers => {
        const params: Record<string, string> = {
          payoutType,
          fromDate: fromDate.toISOString(),
          toDate: toDate.toISOString()
        };
        if (toId) { params['toId'] = toId; }
        if (messengerAdminId) { params['messengerAdminId'] = messengerAdminId; }
        if (messengerId) { params['messengerId'] = messengerId; }
        return this.http.get<ReconPayout[]>(`${this.baseUrl}/recon/payout`, { headers, params });
      }),
      catchError(err => throwError(err))
    );
  }

  // ---------------------------------------------------------------------------
  // Endpoint 7: GET /recon/payoutBundle/{bundleId}/payout/{payoutId}
  // ---------------------------------------------------------------------------

  getPayoutByBundleAndId(bundleId: string, payoutId: string): Observable<ReconPayout | null> {
    return this.authHeaders().pipe(
      switchMap(headers =>
        this.http.get<ReconPayout | null>(
          `${this.baseUrl}/recon/payoutBundle/${bundleId}/payout/${payoutId}`,
          { headers }
        )
      ),
      catchError(err => throwError(err))
    );
  }

  // ---------------------------------------------------------------------------
  // Endpoint 8: GET /reconcsv/shop-payout-bundle  (DESTRUCTIVE)
  //
  // Side-effect: advances ALL payouts in the current bundle to PROCESSING.
  // Call ONLY on explicit confirmed user action. Never call on page load.
  // Returns a Blob that the caller should trigger as a file download.
  // ---------------------------------------------------------------------------

  downloadShopPayoutBundleCsv(): Observable<Blob> {
    return this.authHeaders().pipe(
      switchMap(headers =>
        this.http.get(`${this.baseUrl}/reconcsv/shop-payout-bundle`, {
          headers,
          responseType: 'blob'
        })
      ),
      catchError(err => throwError(err))
    );
  }

  /**
   * Convenience: triggers the browser file-save dialog for the shop CSV.
   * filename is static per the API contract.
   */
  triggerShopCsvDownload(): Observable<void> {
    return new Observable(observer => {
      this.downloadShopPayoutBundleCsv().subscribe({
        next: blob => {
          ReconPayoutService.saveBlobAsFile(blob, 'shop-payout-bundle.csv');
          observer.next();
          observer.complete();
        },
        error: err => observer.error(err)
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Endpoint 9: GET /reconcsv/messenger-payout-bundle  (DESTRUCTIVE)
  //
  // Same side-effect as #8. filename is dynamic: "messenger-payout-bundle-{createdDate}.csv"
  // where createdDate comes from the bundle. The caller must supply it.
  // ---------------------------------------------------------------------------

  downloadMessengerPayoutBundleCsv(): Observable<Blob> {
    return this.authHeaders().pipe(
      switchMap(headers =>
        this.http.get(`${this.baseUrl}/reconcsv/messenger-payout-bundle`, {
          headers,
          responseType: 'blob'
        })
      ),
      catchError(err => throwError(err))
    );
  }

  /**
   * Convenience: triggers the browser file-save dialog for the messenger CSV.
   * @param bundleCreatedDate - the `date` field from the loaded PayoutBundle,
   *   used to build the dynamic filename.
   */
  triggerMessengerCsvDownload(bundleCreatedDate: Date): Observable<void> {
    return new Observable(observer => {
      this.downloadMessengerPayoutBundleCsv().subscribe({
        next: blob => {
          const dateStr = new Date(bundleCreatedDate)
            .toISOString()
            .slice(0, 10); // YYYY-MM-DD
          ReconPayoutService.saveBlobAsFile(blob, `messenger-payout-bundle-${dateStr}.csv`);
          observer.next();
          observer.complete();
        },
        error: err => observer.error(err)
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Private utilities
  // ---------------------------------------------------------------------------

  private static saveBlobAsFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
