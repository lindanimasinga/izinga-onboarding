import { Injectable } from '@angular/core';
import { logEvent } from 'firebase/analytics';
import { FirebaseService } from './firebase.service';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {

  constructor(private firebaseService: FirebaseService) {}

  /**
   * Log a screen view event.
   * Maps to Firebase's recommended `screen_view` event.
   */
  logScreenView(screenName: string, params?: { [key: string]: any }): void {
    logEvent(this.firebaseService.analytics, 'screen_view', {
      firebase_screen: screenName,
      firebase_screen_class: screenName,
      ...params
    });
  }

  /**
   * Log a custom event with optional parameters.
   */
  logEvent(eventName: string, params?: { [key: string]: any }): void {
    logEvent(this.firebaseService.analytics, eventName, params);
  }
}
