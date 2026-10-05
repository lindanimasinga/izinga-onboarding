import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { initializeApp, FirebaseApp } from "firebase/app";
// Add the Firebase services that you want to use
import { getAuth, Auth, RecaptchaVerifier, ConfirmationResult, signInWithPhoneNumber, signInWithCustomToken, UserCredential } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging, getToken, onMessage, Messaging } from "firebase/messaging";
import { Analytics, getAnalytics } from "firebase/analytics";
import { RemoteConfig, getRemoteConfig, fetchAndActivate, getValue } from "firebase/remote-config";
import { Observable, from, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { StorageService } from './storage-service.service';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {

  recaptchaVerifier: any;
  confirmResults?: ConfirmationResult;
  firebaseApp: FirebaseApp;
  auth: Auth;
  analytics: Analytics;
  remoteConfig: RemoteConfig;
  storage = localStorage;
  messaging: Messaging | null = null;

  constructor(private router: Router, private storageService: StorageService) {
    var firebaseConfig = {
      apiKey: environment.firebase_apiKey,
      authDomain: environment.authDomain,
      databaseURL: environment.databaseURL,
      projectId: environment.projectId,
      messagingSenderId: environment.messagingSenderId,
      appId: environment.appId,
      measurementId: environment.measurementId
    };

    // Initialize Firebase
    this.firebaseApp = initializeApp(firebaseConfig);
    this.auth = getAuth(this.firebaseApp);
    this.analytics = getAnalytics(this.firebaseApp);
    if (this.isMessagingSupported()) {
      this.messaging = getMessaging(this.firebaseApp);
    }

    // Remote Config — defaults ensure the app behaves correctly before
    // the first successful fetch. fetchAndActivate runs once per session;
    // on failure the defaults stay in place so no gate is ever blocked.
    this.remoteConfig = getRemoteConfig(this.firebaseApp);
    this.remoteConfig.settings.minimumFetchIntervalMillis = 3600000; // 1 hour
    this.remoteConfig.defaultConfig = {
      business_landing_tier_preview_enabled: true
    };
    fetchAndActivate(this.remoteConfig).catch(err => {
      console.warn('[RemoteConfig] fetch failed, using defaults:', err);
    });

    setTimeout(() => {
      this.requestPermission();
      this.listen();
    }, 5000)
  }

  /**
   * Read a boolean value from Remote Config.
   * Returns the in-memory cached value (populated by fetchAndActivate above, or
   * the defaultConfig if the fetch has not yet completed or failed).
   * Never throws — falls back to false for unknown keys.
   */
  getRemoteConfigBoolean(key: string): boolean {
    try {
      return getValue(this.remoteConfig, key).asBoolean();
    } catch {
      return false;
    }
  }

  createCapture() {
    this.recaptchaVerifier = new RecaptchaVerifier(this.auth, 'recaptcha-container', {} );
    this.recaptchaVerifier.render()
  }


  requestVerification(phoneNumber: string): Observable<ConfirmationResult> {
    const appVerifier = this.recaptchaVerifier;
    var promise = signInWithPhoneNumber(this.auth, phoneNumber, appVerifier)
    return from(promise)
      .pipe(
        map(resp => this.confirmResults = resp)
      )
  }

  confirmCode(code: string) {
    return from(this.confirmResults!.confirm(code))
      .pipe(
        catchError((error: HttpErrorResponse) => {
          return throwError(error)
        })
      )
  }

  signInWithWhatsAppToken(token: string): Observable<UserCredential> {
    return from(signInWithCustomToken(this.auth, token))
      .pipe(
        catchError((error: HttpErrorResponse) => {
          return throwError(error)
        })
      )
  }

  ngOnInit(): void {
    this.requestPermission();
    this.listen();
  }

  requestPermission() {
    if(this.storage.getItem("fcmToken") != null) return
    if (!this.messaging) return;
    getToken(this.messaging, { vapidKey: environment.firebaseVapidKey}).then(
       (currentToken: string) => {
         if (currentToken) {
           console.log("Hurraaa!!! we got the token.....");
           console.log(currentToken);
           this.storage.setItem("fcmToken",currentToken)
         } else {
           console.log('No registration token available. Request permission to generate one.');
         }
     }).catch((err: any) => {
        console.log('An error occurred while retrieving token. ', err);
    });
  }

  isMessagingSupported(): boolean {
    return !this.isIOS() && !this.isSafari()
  }

  getCurrentToken(): string | null {
    return this.storage.getItem("fcmToken")
  }

  /**
   * The app's own "logged in" flag (StorageService.phoneNumber) and Firebase's own Auth
   * session are only ever synchronized once, at login — nothing re-checks them against each
   * other afterward. If the Firebase session is lost independently (cleared, revoked, never
   * restored on this device) while the app-level flag survives, PhoneVerifiedGuard still lets
   * the user through, and they only find out here, on the first call that actually needs a
   * token. Route them back to verify instead of leaving the caller with a silent/console-only
   * failure and no way to recover other than a manual reload.
   */
  getFirebaseIdToken(): Observable<string> {
    const user = this.auth.currentUser;
    if (!user) {
      this.storageService.sessionExpired(this.router.url);
      return throwError(() => new Error('Your session has expired. Please verify your phone number again.'));
    }
    return from(user.getIdToken());
  }

  /**
   * Force-refresh the Firebase ID token, bypassing the SDK cache.
   *
   * Call this immediately after a backend operation that grants a new Firebase custom
   * claim — specifically, after a new store is created via POST /store, because
   * StoreService.create() calls FirebaseAuth.setCustomUserClaims() to stamp the new
   * storeId onto the owner's account. Without a forced refresh the SDK continues to
   * serve the pre-creation token (which lacks storeId), causing
   * POST /merchant/subscription/initiate to return 422 STORE_ID_NOT_IN_JWT.
   *
   * getFirebaseIdToken() MUST NOT be changed to force-refresh on every call — that
   * would add a server round-trip to every authenticated request in the app. This
   * method is the targeted, one-time alternative for the exact moment a new claim
   * has just been granted.
   *
   * Null-user guard mirrors getFirebaseIdToken(): routes to session-expired flow
   * rather than emitting a silent error the caller cannot handle.
   */
  refreshIdToken(): Observable<string> {
    const user = this.auth.currentUser;
    if (!user) {
      this.storageService.sessionExpired(this.router.url);
      return throwError(() => new Error('Your session has expired. Please verify your phone number again.'));
    }
    return from(user.getIdToken(true));
  }

  listen() {
    if (!this.messaging) return;
    onMessage(this.messaging, (payload: any) => {
      console.log('Message received. ', payload);
    });
  }

  isIOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }
  
  // Utility function to check if it's Safari on macOS or iOS
  isSafari(): boolean {
    const ua = navigator.userAgent.toLowerCase();
    return ua.includes('safari') && !ua.includes('chrome') && !ua.includes('android');
  }
}
