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

// Mutable stub — tests mutate .phoneNumber and .userProfile directly
// so there is only one TestBed/RouterTestingModule per describe block.
const storageStub: {
  userProfile: any;
  phoneNumber: string | undefined;
  errorMessage: any;
  infoMessage: any;
  userType: any;
} = {
  userProfile: undefined,
  phoneNumber: undefined,
  errorMessage: undefined,
  infoMessage: undefined,
  userType: undefined
};

describe('AppComponent', () => {
  beforeEach(() => {
    // Reset mutable stub before each test
    storageStub.userProfile = undefined;
    storageStub.phoneNumber = undefined;

    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [AppComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: FirebaseService, useValue: firebaseServiceStub },
        { provide: StorageService, useValue: storageStub }
      ]
    });
  });

  // ── Smoke tests ────────────────────────────────────────────────────────────

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it(`should have as title 'izinga business'`, () => {
    const app = TestBed.createComponent(AppComponent).componentInstance;
    expect(app.title).toEqual('izinga business');
  });

  it('should render the app root element', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('router-outlet')).toBeTruthy();
  });

  it('should render a footer anchor linking to /privacy-policy', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const nativeEl = fixture.nativeElement as HTMLElement;
    // RouterTestingModule processes routerLink="/privacy-policy" and sets href;
    // fall back to the raw routerLink attribute if href is not yet resolved.
    const link =
      nativeEl.querySelector('a[href="/privacy-policy"]') ??
      nativeEl.querySelector('a[routerLink="/privacy-policy"]');
    expect(link).withContext('Expected a footer anchor for /privacy-policy').toBeTruthy();
  });

  // ── getUserTypeFromHostname ────────────────────────────────────────────────

  it('getUserTypeFromHostname: refer.izinga.co.za → referral-partner', () => {
    const app = TestBed.createComponent(AppComponent).componentInstance;
    expect((app as any).getUserTypeFromHostname('refer.izinga.co.za')).toBe('referral-partner');
  });

  it('getUserTypeFromHostname: ambassador.izinga.co.za → ambassador', () => {
    const app = TestBed.createComponent(AppComponent).componentInstance;
    expect((app as any).getUserTypeFromHostname('ambassador.izinga.co.za')).toBe('ambassador');
  });

  it('getUserTypeFromHostname: driver.izinga.co.za → driver', () => {
    const app = TestBed.createComponent(AppComponent).componentInstance;
    expect((app as any).getUserTypeFromHostname('driver.izinga.co.za')).toBe('driver');
  });

  it('getUserTypeFromHostname: biz.izinga.co.za → shop', () => {
    const app = TestBed.createComponent(AppComponent).componentInstance;
    expect((app as any).getUserTypeFromHostname('biz.izinga.co.za')).toBe('shop');
  });

  it('getUserTypeFromHostname: earn.izinga.co.za → individual', () => {
    const app = TestBed.createComponent(AppComponent).componentInstance;
    expect((app as any).getUserTypeFromHostname('earn.izinga.co.za')).toBe('individual');
  });

  it('getUserTypeFromHostname: unknown hostname → undefined', () => {
    const app = TestBed.createComponent(AppComponent).componentInstance;
    expect((app as any).getUserTypeFromHostname('unknown.example.com')).toBeUndefined();
  });

  // ── normalizeUserType ─────────────────────────────────────────────────────

  it('normalizeUserType: referral-partner passes through unchanged', () => {
    const app = TestBed.createComponent(AppComponent).componentInstance;
    expect((app as any).normalizeUserType('referral-partner')).toBe('referral-partner');
  });

  it('normalizeUserType: ambassador passes through unchanged', () => {
    const app = TestBed.createComponent(AppComponent).componentInstance;
    expect((app as any).normalizeUserType('ambassador')).toBe('ambassador');
  });

  it('normalizeUserType: driver passes through unchanged', () => {
    const app = TestBed.createComponent(AppComponent).componentInstance;
    expect((app as any).normalizeUserType('driver')).toBe('driver');
  });

  it('normalizeUserType: shop passes through unchanged', () => {
    const app = TestBed.createComponent(AppComponent).componentInstance;
    expect((app as any).normalizeUserType('shop')).toBe('shop');
  });

  it('normalizeUserType: individual passes through unchanged', () => {
    const app = TestBed.createComponent(AppComponent).componentInstance;
    expect((app as any).normalizeUserType('individual')).toBe('individual');
  });

  it('normalizeUserType: unknown value falls back to a recognised UserType', () => {
    const app = TestBed.createComponent(AppComponent).componentInstance;
    const result = (app as any).normalizeUserType('completely-unknown');
    const valid = ['', 'shop', 'individual', 'driver', 'ambassador', 'referral-partner'];
    expect(valid).toContain(result);
  });

  // ── dashboardRoute — referral-partner ─────────────────────────────────────

  it('dashboardRoute: referral-partner with no phone → /', () => {
    storageStub.phoneNumber = undefined;
    storageStub.userProfile = undefined;
    const app = TestBed.createComponent(AppComponent).componentInstance;
    app.userType = 'referral-partner' as any;
    expect(app.dashboardRoute).toBe('/');
  });

  it('dashboardRoute: referral-partner with phone, icaAccepted false → /referral-partner/enroll', () => {
    storageStub.phoneNumber = '0821234567';
    storageStub.userProfile = { icaAccepted: false };
    const app = TestBed.createComponent(AppComponent).componentInstance;
    app.userType = 'referral-partner' as any;
    expect(app.dashboardRoute).toBe('/referral-partner/enroll');
  });

  it('dashboardRoute: referral-partner with phone, icaAccepted absent → /referral-partner/enroll', () => {
    storageStub.phoneNumber = '0821234567';
    storageStub.userProfile = {};
    const app = TestBed.createComponent(AppComponent).componentInstance;
    app.userType = 'referral-partner' as any;
    expect(app.dashboardRoute).toBe('/referral-partner/enroll');
  });

  it('dashboardRoute: referral-partner with phone, icaAccepted true → /indivisuals/rp-referral-code', () => {
    storageStub.phoneNumber = '0821234567';
    storageStub.userProfile = { icaAccepted: true };
    const app = TestBed.createComponent(AppComponent).componentInstance;
    app.userType = 'referral-partner' as any;
    expect(app.dashboardRoute).toBe('/indivisuals/rp-referral-code');
  });
});
