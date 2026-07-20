import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { AppComponent } from './app.component';
import { FirebaseService } from './service/firebase.service';
import { StorageService } from './service/storage-service.service';

// AppComponent injects FirebaseService directly. Providing a stub prevents the real
// service from initializing Firebase and scheduling its 5-second notification timer,
// which causes ChromeHeadless to disconnect mid-run.
const firebaseServiceStub = {
  createCapture: () => {},
  requestPermission: () => {},
  listen: () => {},
  getCurrentToken: () => null
};

describe('AppComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [RouterTestingModule],
    declarations: [AppComponent],
    schemas: [NO_ERRORS_SCHEMA],
    providers: [
      { provide: FirebaseService, useValue: firebaseServiceStub },
      { provide: StorageService, useValue: { userProfile: undefined, errorMessage: undefined, infoMessage: undefined } }
    ]
  }));

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have as title 'izinga business'`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('izinga business');
  });

  it('should render the app root element', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });
});
