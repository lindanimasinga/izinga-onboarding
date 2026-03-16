import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp } from "firebase/app";
// Add the Firebase services that you want to use
import { getAuth, Auth, RecaptchaVerifier, ConfirmationResult, signInWithPhoneNumber } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging, getToken, onMessage, Messaging } from "firebase/messaging";
import { Analytics, getAnalytics } from "firebase/analytics";
import { Observable, from, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {

  recaptchaVerifier: any;
  confirmResults?: ConfirmationResult;
  firebaseApp: FirebaseApp;
  auth: Auth;
  analytics: Analytics;
  storage = localStorage;
  messaging: Messaging | null = null;

  constructor() {
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

    setTimeout(() => {
      this.requestPermission();
      this.listen();
    }, 5000)
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
