import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import {Device, UserProfile, UserConfig, DocType} from '../model/models'
import { BankConfig } from '../model/bank-config';
import { environment } from 'src/environments/environment';
import { catchError, switchMap } from 'rxjs/operators';
import { FirebaseService } from './firebase.service';
import { UserCardLink } from '../model/user-card-link';
import { StoreProfile } from '../model/storeProfile';
import { Order } from '../model/order';
import { StoreSummary } from '../model/store-summary';
import { Payout, PayoutType } from '../payout/payout.component';
import { QuoteApproval } from '../model/quoteApproval';
import {
  ReferralPartnerSummary,
  ReferralPage,
  ReferralPartnerCommissions,
  PayoutPage
} from '../model/referral-partner';

export interface Lead {
  id: string;
  phone?: string;
  items: { stockId: string; name: string; quantity: number }[];
  fromAddress: string;
  toAddress: string;
  estimatedPrice: number;
  storeType: string;
  storeId: string;
  status: 'CAPTURED' | 'CONTACTED' | 'CONVERTED' | 'CLOSED';
  anonymous: boolean;
  consentGiven: boolean;
  consentTimestamp?: string;
  createdDate: string;
}

@Injectable({
  providedIn: 'root'
})
export class IzingaOrderManagementService {


  constructor(private http: HttpClient, private firebaseService: FirebaseService) { }

  get headers(){ 
    return {
    "Content-type": "application/json",
    "app-version": environment.appVersion,
    };
  }

  acceptQuote(orderId: string, quoteApproval: QuoteApproval): Observable<Order> {
    return this.http
      .patch<Order>(`${environment.izingaUrl}/order/${orderId}/quote`, quoteApproval, {headers: this.headers})
      .pipe(
        catchError((error: HttpErrorResponse) => {
          return throwError(error)
        }))
  }

  getAllStores(userId: string): Observable<Array<StoreProfile>> {
    return this.http.get<Array<StoreProfile>>(`${environment.izingaUrl}/store?ownerId=${userId}`, {headers: this.headers})
    .pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(error)
      }));
  }

  getAllStoresSummary(userId: string): Observable<Array<StoreSummary>> {
    return this.http.get<Array<StoreProfile>>(`${environment.izingaUrl}/store/names?ownerId=${userId}`, {headers: this.headers})
    .pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(error)
      }));
  }

  getAllStoreOrders(storeId: string): Observable<Array<Order>> {
    return this.http.get<Array<Order>>(`${environment.izingaUrl}/order?storeId=${storeId}`, {headers: this.headers})
    .pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(error)
      }));
  }

    getAllMessengerOrders(messengerId: string): Observable<Array<Order>> {
    return this.http.get<Array<Order>>(`${environment.izingaUrl}/messenger/order?messengerId=${messengerId}&allStages=true`, {headers: this.headers})
    .pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(error)
      }));
  }

    getAllMessengerAdminOrders(messengerAdminId: string): Observable<Array<Order>> {
      return this.http.get<Array<Order>>(`${environment.izingaUrl}/messenger/order?messengerAdminId=${messengerAdminId}&allStages=true`, {headers: this.headers})
      .pipe(
        catchError((error: HttpErrorResponse) => {
          return throwError(error)
        }));
    }

    getAllMessengersForAdmin(messengerAdminId: string): Observable<Array<UserProfile>> {
      return this.http.get<Array<UserProfile>>(`${environment.izingaUrl}/user?role=MESSENGER&messengerAdminId=${messengerAdminId}&includePendingUsers=true`, {headers: this.headers})
      .pipe(
        catchError((error: HttpErrorResponse) => {
          return throwError(error)
        }));
    }

    /**
     * Fetch approved messengers within a bounding box centred on (latitude, longitude).
     * range is in degrees — 1° ≈ 111 km, so 0.1 ≈ 11 km.
     * Returns only profileApproved + termsAccepted users (includePendingUsers defaults to false).
     */
    getMessengersByArea(latitude: number, longitude: number, range: number): Observable<Array<UserProfile>> {
      const params = `role=MESSENGER&latitude=${latitude}&longitude=${longitude}&range=${range}`;
      return this.http.get<Array<UserProfile>>(`${environment.izingaUrl}/user?${params}`, {headers: this.headers})
        .pipe(catchError((error: HttpErrorResponse) => throwError(error)));
    }

  getOrderById(orderId: string): Observable<Order> {
    return this.http
        .get<Order>(`${environment.izingaUrl}/order/${orderId}`, {headers: this.headers})
        .pipe(
          catchError((error: HttpErrorResponse) => {
            return throwError(error)
          }))
  }

  getOrdersInProgress(): Observable<Array<Order>> {
    return this.http.get<Array<Order>>(`${environment.izingaUrl}/order?inProgress=true`, {headers: this.headers})
      .pipe(catchError((error: HttpErrorResponse) => throwError(error)));
  }

  getOrderByIdForMessenger(orderId: string): Observable<Order> {
    return this.http
        .get<Order>(`${environment.izingaUrl}/messenger/order/${orderId}`, {headers: this.headers})
        .pipe(
          catchError((error: HttpErrorResponse) => {
            return throwError(error)
          }))
  }

  messengerAcceptQuote(orderId: string, quoteApproval: QuoteApproval): Observable<Order> {
    return this.http
      .patch<Order>(`${environment.izingaUrl}/messenger/order/${orderId}/quote`, quoteApproval, {headers: this.headers})
      .pipe(
        catchError((error: HttpErrorResponse) => {
          return throwError(error)
        }))
  }

  messengerUpdateStage(orderId: string): Observable<Order> {
    return this.http
        .get<Order>(`${environment.izingaUrl}/messenger/order/${orderId}/nextstage`, {headers: this.headers})
        .pipe(
          catchError((error: HttpErrorResponse) => {
            return throwError(error)
          }))
  }

  updateStage(orderId: string): Observable<Order> {
    return this.http
        .get<Order>(`${environment.izingaUrl}/order/${orderId}/nextstage`, {headers: this.headers})
        .pipe(
          catchError((error: HttpErrorResponse) => {
            return throwError(error)
          }))
  }

  updateStageWithLocation(orderId: string, latitude: number, longitude: number): Observable<Order> {
    const params = { latitude: latitude.toString(), longitude: longitude.toString() };
    return this.http
        .get<Order>(`${environment.izingaUrl}/messenger/order/${orderId}/nextstage`, {headers: this.headers, params})
        .pipe(
          catchError((error: HttpErrorResponse) => {
            return throwError(error)
          }))
  }

  cancelOrder(orderId: string): Observable<Order> {
    return this.http
        .delete<Order>(`${environment.izingaUrl}/order/${orderId}`, {headers: this.headers})
        .pipe(
          catchError((error: HttpErrorResponse) => {
            return throwError(error)
          }))
  }

  getStoreById(id : string): Observable<StoreProfile> {
    return this.http.get<StoreProfile>(`${environment.izingaUrl}/store/${id}`, {headers: this.headers})
    .pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(error)
      }));
  }

  getPayouts(userId: string, fromDate: Date, toDate: Date, payoutType: PayoutType): Observable<Payout[]> {
    return this.http.get<Payout[]>(`${environment.izingaUrl}/recon/payout?fromDate=${fromDate.toISOString()}&toDate=${toDate.toISOString()}&toId=${userId}&payoutType=${payoutType}`, {headers: this.headers})
    .pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(error)
      }));
  }

  getTeamPayouts(messengerAdminId: string, fromDate: Date, toDate: Date): Observable<Payout[]> {
    return this.http.get<Payout[]>(`${environment.izingaUrl}/recon/payout?fromDate=${fromDate.toISOString()}&toDate=${toDate.toISOString()}&messengerAdminId=${messengerAdminId}&payoutType=${PayoutType.MESSENGER}`, {headers: this.headers})
    .pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(error)
      }));
  }

  updateStore(storeProfile : StoreProfile): Observable<StoreProfile> {
    return this.http.patch<StoreProfile>(`${environment.izingaUrl}/store/${storeProfile.id}`, storeProfile, {headers: this.headers})
    .pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(error)
      }));
  }

  createStore(storeProfile: StoreProfile): Observable<StoreProfile> {
    // FIX-01 (RP-005b): backend StoreController.create() reads referralCode via
    // @RequestParam (URL query param), NOT from the request body. Strip it from
    // the body and send as a query param so attribution is not silently dropped.
    const params: Record<string, string> = {};
    if (storeProfile.referralCode) {
      params['referralCode'] = storeProfile.referralCode;
    }
    const body = { ...storeProfile };
    delete body.referralCode;
    return this.http.post<StoreProfile>(`${environment.izingaUrl}/store`, body, {
      headers: this.headers,
      params
    })
    .pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(error)
      }));
  }

  updateDeviceToUser(device: Device, id: string)  : Observable<Device> {
    return this.http
        .patch<UserProfile>(`${environment.izingaUrl}/device/${id}`, device, {headers: this.headers})
        .pipe(
          catchError((error: HttpErrorResponse) => {
            return throwError(error)
          }))
  }

  registerDeviceToUser(device: Device)  : Observable<Device> {
    return this.http
        .post<UserProfile>(`${environment.izingaUrl}/device`, device, {headers: this.headers})
        .pipe(
          catchError((error: HttpErrorResponse) => {
            return throwError(error)
          }))
  }

  registerCustomer(userProfile: UserProfile) : Observable<UserProfile> {
    return this.http
        .post<UserProfile>(`${environment.izingaUrl}/user`, userProfile, {headers: this.headers})
        .pipe(
          catchError((error: HttpErrorResponse) => {
            return throwError(error)
          }))
  }

  updateCustomer(userProfile: UserProfile) : Observable<UserProfile> {
    return this.http
        .patch<UserProfile>(`${environment.izingaUrl}/user/${userProfile.id}`, userProfile, {headers: this.headers})
        .pipe(
          catchError((error: HttpErrorResponse) => {
            return throwError(error)
          }))
  }

  deleteUser(userId: string): Observable<any> {
    return this.http
        .delete<any>(`${environment.izingaUrl}/user/${userId}`, {headers: this.headers})
        .pipe(
          catchError((error: HttpErrorResponse) => {
            return throwError(error)
          }))
  }

  getPendingApprovals(): Observable<UserProfile[]> {
    return this.http
        .get<UserProfile[]>(`${environment.izingaUrl}/user/pending-approvals`, {headers: this.headers})
        .pipe(
          catchError((error: HttpErrorResponse) => {
            console.error('Error fetching pending approvals:', error);
            return throwError(error);
          }))
  }

  linkCard(userProfile: UserProfile, cardId: string) : Observable<UserCardLink> {
    var userCardLink = {
      "userId": userProfile.id,
      "linkCode": cardId.toUpperCase()
    }

    return this.http
        .post<UserCardLink>(`${environment.izingaUrl}/linkCode`, userCardLink, {headers: this.headers})
        .pipe(
          catchError((error: HttpErrorResponse) => {
            return throwError(error)
          }))
  }

  getCustomerByPhoneNumber(mobileNumber: string): Observable<UserProfile> {
    return this.http
        .get<UserProfile>(`${environment.izingaUrl}/user/${mobileNumber}`, {headers: this.headers})
        .pipe(
          catchError((error: HttpErrorResponse) => {
            return throwError(error)
          }))
  }

  getCustomerById(customerId: string): Observable<UserProfile> {
    return this.http
        .get<UserProfile>(`${environment.izingaUrl}/user/${customerId}`, {headers: this.headers})
        .pipe(
          catchError((error: HttpErrorResponse) => {
            return throwError(error)
          }))
  }

  getUserConfig(): Observable<Array<UserConfig>> {
    return this.http
        .get<Array<UserConfig>>(`${environment.izingaUrl}/user-config`, {headers: this.headers})
        .pipe(
          catchError((error: HttpErrorResponse) => {
            return throwError(error)
          }))
  }

  createUserConfig(userConfig: UserConfig): Observable<UserConfig> {
    return this.http
        .post<UserConfig>(`${environment.izingaUrl}/user-config`, userConfig, {headers: this.headers})
        .pipe(
          catchError((error: HttpErrorResponse) => {
            return throwError(error)
          }))
  }

  updateUserConfig(name: string, userConfig: UserConfig): Observable<UserConfig> {
    return this.http
        .patch<UserConfig>(`${environment.izingaUrl}/user-config/${name}`, userConfig, {headers: this.headers})
        .pipe(
          catchError((error: HttpErrorResponse) => {
            return throwError(error)
          }))
  }

  deleteUserConfig(name: string): Observable<any> {
    return this.http
        .delete<any>(`${environment.izingaUrl}/user-config/${name}`, {headers: this.headers})
        .pipe(
          catchError((error: HttpErrorResponse) => {
            return throwError(error)
          }))
  }

  getBankConfigs(): Observable<Array<BankConfig>> {
    return this.http
        .get<Array<BankConfig>>(`${environment.izingaUrl}/bank/config/all`, {headers: this.headers})
        .pipe(
          catchError((error: HttpErrorResponse) => {
            return throwError(error)
          }))
  }

    // New headers for file upload (multipart/form-data)
    get uploadHeaders(){
      return {
        "app-version": environment.appVersion,
      };
    }
  
    // New method to upload a file
    uploadFile(file: File, metaData: boolean, docType?: DocType | undefined, docMeta?: UserConfig | undefined): Observable<{[key: string]: any}> {
      const formData: FormData = new FormData();
      formData.append('file', file);
      
      // Build URL with metadata parameter and optional docType
      let url = `${environment.izingaUrl}/document?metadata=${metaData}`;
      if (docType) {
        url += `&docType=${docType}`;
      }

      if (docMeta) {
        var dataAsString = JSON.stringify(docMeta);
        //url encoding to handle special characters
        dataAsString = encodeURIComponent(dataAsString);
        url += `&docData=${dataAsString}`;
      }
      
      return this.http.post<{[key: string]: any}>(url, formData, {headers: this.uploadHeaders}).pipe(
        catchError((error: HttpErrorResponse) => {
          return throwError(error);
        })
      );
    }

    // Restricted Regions API methods
    getRestrictedRegions(): Observable<any[]> {
      return this.http.get<any[]>(`${environment.izingaUrl}/restricted-regions`, {headers: this.headers})
        .pipe(
          catchError((error: HttpErrorResponse) => {
            return throwError(error);
          })
        );
    }

    updateRestrictedRegionStatus(regionId: string, isActive: boolean): Observable<any> {
      return this.http.put<any>(`${environment.izingaUrl}/restricted-regions/${regionId}/status`, 
        { isActive }, 
        {headers: this.headers}
      ).pipe(
        catchError((error: HttpErrorResponse) => {
          return throwError(error);
        })
      );
    }

    deleteRestrictedRegion(regionId: string): Observable<any> {
      return this.http.delete<any>(`${environment.izingaUrl}/restricted-regions/${regionId}`, {headers: this.headers})
        .pipe(
          catchError((error: HttpErrorResponse) => {
            return throwError(error);
          })
        );
    }

    createRestrictedRegion(regionData: any): Observable<any> {
      return this.http.post<any>(`${environment.izingaUrl}/restricted-regions`, regionData, {headers: this.headers})
        .pipe(
          catchError((error: HttpErrorResponse) => {
            return throwError(error);
          })
        );
    }

    getRestrictedRegion(regionId: string): Observable<any> {
      return this.http.get<any>(`${environment.izingaUrl}/restricted-regions/${regionId}`, {headers: this.headers})
        .pipe(
          catchError((error: HttpErrorResponse) => {
            return throwError(error);
          })
        );
    }

    updateRestrictedRegion(regionId: string, regionData: any): Observable<any> {
      return this.http.patch<any>(`${environment.izingaUrl}/restricted-regions/${regionId}`, regionData, {headers: this.headers})
        .pipe(
          catchError((error: HttpErrorResponse) => {
            return throwError(error);
          })
        );
    }

    // RP-010: Referral Partner dashboard endpoints — all REFERRAL_PARTNER-scoped, auth via JWT.
    // Never pass a partnerId param — the backend derives it from the JWT subject.

    getReferralPartnerSummary(): Observable<ReferralPartnerSummary> {
      return this.http.get<ReferralPartnerSummary>(`${environment.izingaUrl}/referral-partner/me/summary`, {headers: this.headers})
        .pipe(catchError((error: HttpErrorResponse) => throwError(error)));
    }

    getReferralPartnerReferrals(page: number = 0, size: number = 20): Observable<ReferralPage> {
      return this.http.get<ReferralPage>(
        `${environment.izingaUrl}/referral-partner/me/referrals?page=${page}&size=${size}`,
        {headers: this.headers}
      ).pipe(catchError((error: HttpErrorResponse) => throwError(error)));
    }

    getReferralPartnerCommissions(): Observable<ReferralPartnerCommissions> {
      return this.http.get<ReferralPartnerCommissions>(`${environment.izingaUrl}/referral-partner/me/commissions`, {headers: this.headers})
        .pipe(catchError((error: HttpErrorResponse) => throwError(error)));
    }

    getReferralPartnerPayouts(page: number = 0, size: number = 20): Observable<PayoutPage> {
      return this.http.get<PayoutPage>(
        `${environment.izingaUrl}/recon/referral-partner/me/payouts?page=${page}&size=${size}`,
        {headers: this.headers}
      ).pipe(catchError((error: HttpErrorResponse) => throwError(error)));
    }

    notifyNewMessage(chatSessionId: string, messageId: string): Observable<any> {
      return this.http.get<any>(`${environment.izingaUrl}/forward/chatSession/${chatSessionId}/message/${messageId}`, {headers: this.headers})
        .pipe(
          catchError((error: HttpErrorResponse) => {
            return throwError(error);
          })
        );
    }

    getLeads(storeType: string = 'MOVERS'): Observable<Lead[]> {
      return this.firebaseService.getFirebaseIdToken().pipe(
        switchMap(token => {
          const headers = new HttpHeaders({
            ...this.headers,
            'Authorization': `Bearer ${token}`
          });
          return this.http.get<Lead[]>(`${environment.izingaUrl}/v2/leads?storeType=${storeType}`, { headers });
        }),
        catchError((error: HttpErrorResponse) => throwError(error))
      );
    }

    updateLeadStatus(id: string, status: string): Observable<Lead> {
      return this.firebaseService.getFirebaseIdToken().pipe(
        switchMap(token => {
          const headers = new HttpHeaders({
            ...this.headers,
            'Authorization': `Bearer ${token}`
          });
          return this.http.patch<Lead>(`${environment.izingaUrl}/v2/leads/${id}/status`, { status }, { headers });
        }),
        catchError((error: HttpErrorResponse) => throwError(error))
      );
    }


}
