import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as firebase from "firebase/app";
// Add the Firebase services that you want to use
import "firebase/auth";
import "firebase/firestore";
import "firebase/messaging";
import "firebase/analytics";
import { Observable, from, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {

  recaptchaVerifier: any;
  confirmResults?: firebase.default.auth.ConfirmationResult;
  firebaseApp
  storage = localStorage
  messaging: any

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
    this.firebaseApp = firebase.default.initializeApp(firebaseConfig);
    this.firebaseApp.analytics();
    if (this.isMessagingSupported()) {
      this.messaging = this.firebaseApp.messaging();
    }

    setTimeout(() => {
      this.requestPermission();
      this.listen();
    }, 5000)
  }

  createCapture() {
    this.recaptchaVerifier = new firebase.default.auth.RecaptchaVerifier('recaptcha-container');
    this.recaptchaVerifier.render()
  }


  requestVerification(phoneNumber: string): Observable<firebase.default.auth.ConfirmationResult> {
    const appVerifier = this.recaptchaVerifier;
    var promise = firebase.default.auth().signInWithPhoneNumber(phoneNumber, appVerifier)
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
    const messaging = this.firebaseApp.messaging();
    messaging.getToken({ vapidKey: environment.firebaseVapidKey}).then(
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
    this.messaging.onMessage((payload: any) => {
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
