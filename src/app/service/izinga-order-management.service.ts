import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {Device, UserProfile, UserConfig, DocType} from '../model/models'
import { environment } from 'src/environments/environment';
import { catchError } from 'rxjs/operators';
import { UserCardLink } from '../model/user-card-link';
import { StoreProfile } from '../model/storeProfile';
import { Order } from '../model/order';
import { StoreSummary } from '../model/store-summary';
import { Payout, PayoutType } from '../payout/payout.component';

@Injectable({
  providedIn: 'root'
})
export class IzingaOrderManagementService {


  constructor(private http: HttpClient) { }

  get headers(){ 
    return {
    "Content-type": "application/json",
    "app-version": environment.appVersion,
    };
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

  getOrderById(orderId: string): Observable<Order> {
    return this.http
        .get<Order>(`${environment.izingaUrl}/order/${orderId}`, {headers: this.headers})
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

  updateStore(storeProfile : StoreProfile): Observable<StoreProfile> {
    return this.http.patch<StoreProfile>(`${environment.izingaUrl}/store/${storeProfile.id}`, storeProfile, {headers: this.headers})
    .pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(error)
      }));
  }

  createStore(storeProfile : StoreProfile): Observable<StoreProfile> {
    return this.http.post<StoreProfile>(`${environment.izingaUrl}/store`, storeProfile, {headers: this.headers})
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

    // New headers for file upload (multipart/form-data)
    get uploadHeaders(){
      return {
        "app-version": environment.appVersion,
      };
    }
  
    // New method to upload a file
    uploadFile(file: File, docType?: DocType | undefined, docMeta?: UserConfig | undefined): Observable<{[key: string]: any}> {
      const formData: FormData = new FormData();
      formData.append('file', file);
      
      // Build URL with metadata parameter and optional docType
      let url = `${environment.izingaUrl}/document?metadata=true`;
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


}
