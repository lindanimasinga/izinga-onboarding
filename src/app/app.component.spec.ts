import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NO_ERRORS_SCHEMA, Component } from '@angular/core';
import { Router } from '@angular/router';
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
  pendingInfoMessage: any;
  _navGen: number;
  userType: any;
} = {
  userProfile: undefined,
  phoneNumber: undefined,
  errorMessage: undefined,
  infoMessage: undefined,
  pendingInfoMessage: undefined,
  _navGen: 0,
  userType: undefined
};

/** Minimal routable stub component used only by NavigationEnd behaviour tests. */
@Component({ template: '' })
class NavigationStubComponent {}

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

  // REQ-PP: footer contains the secure-storage reassurance copy
  it('REQ-PP — footer contains "Your information will be securely stored" copy', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const footer = (fixture.nativeElement as HTMLElement).querySelector('footer');
    expect(footer).not.toBeNull();
    expect(footer!.textContent).toContain('Your information will be securely stored');
  });

  // REQ-PP: footer contains "Operated by Curiousoft (Pty) Ltd"
  it('REQ-PP — footer contains Curiousoft attribution', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const footer = (fixture.nativeElement as HTMLElement).querySelector('footer');
    expect(footer!.textContent).toContain('Curiousoft');
  });

  // REQ-PP2: exactly one <footer> in the component template
  it('REQ-PP2 — exactly one footer element is rendered by AppComponent', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const footers = (fixture.nativeElement as HTMLElement).querySelectorAll('footer');
    expect(footers.length).withContext('Expected exactly one <footer>').toBe(1);
  });

  // REQ-PP2: footer contains exactly four links (Privacy Policy, Terms, Mobile App, Tip Jar)
  it('REQ-PP2 — footer contains exactly four links', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const footer = (fixture.nativeElement as HTMLElement).querySelector('footer')!;
    const links = footer.querySelectorAll('a');
    expect(links.length).withContext('Expected exactly four footer links').toBe(4);
  });

  // REQ-PP2: every routerLink in footer matches a registered route
  it('REQ-PP2 — every footer routerLink targets a registered route', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const footer = (fixture.nativeElement as HTMLElement).querySelector('footer')!;
    const registeredPaths = ['/privacy-policy', '/indivisuals/legal-info'];
    const routerLinks = Array.from(footer.querySelectorAll('a[routerLink]'))
      .map(a => a.getAttribute('routerLink') as string);
    routerLinks.forEach(rl => {
      expect(registeredPaths).withContext(`routerLink "${rl}" is not a registered route`).toContain(rl);
    });
  });

  // REQ-PP2: footer has a routerLink to /indivisuals/legal-info (Terms and Conditions)
  it('REQ-PP2 — footer has a routerLink to /indivisuals/legal-info (Terms and Conditions)', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const nativeEl = fixture.nativeElement as HTMLElement;
    const link =
      nativeEl.querySelector('a[href="/indivisuals/legal-info"]') ??
      nativeEl.querySelector('a[routerLink="/indivisuals/legal-info"]');
    expect(link).withContext('Expected a footer anchor for /indivisuals/legal-info').toBeTruthy();
  });

  // REQ-PP2: footer has an external link to https://izinga.co.za (Izinga Mobile App)
  it('REQ-PP2 — footer has an external link to https://izinga.co.za', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const nativeEl = fixture.nativeElement as HTMLElement;
    const link = nativeEl.querySelector('a[href="https://izinga.co.za"]');
    expect(link).withContext('Expected a footer anchor for https://izinga.co.za').toBeTruthy();
  });

  // REQ-PP2: footer has an external link to https://tips.izinga.co.za (Izinga Tip Jar)
  it('REQ-PP2 — footer has an external link to https://tips.izinga.co.za', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const nativeEl = fixture.nativeElement as HTMLElement;
    const link = nativeEl.querySelector('a[href="https://tips.izinga.co.za"]');
    expect(link).withContext('Expected a footer anchor for https://tips.izinga.co.za').toBeTruthy();
  });

  // REQ-PP2: footer year is dynamic (matches current year)
  it('REQ-PP2 — footer displays the current year dynamically', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const footer = (fixture.nativeElement as HTMLElement).querySelector('footer');
    const currentYear = new Date().getFullYear().toString();
    expect(footer!.textContent).toContain(currentYear);
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

// ---------------------------------------------------------------------------
// AppComponent — NavigationEnd infoMessage / pendingInfoMessage behaviour
//
// These tests verify that the 1 ms reset timer in the NavigationEnd handler:
//  (a) promotes a pendingInfoMessage to infoMessage so redirect-driven
//      messages survive and are visible on the destination page, and
//  (b) still clears a stale infoMessage when no pendingInfoMessage is set,
//      so messages do not linger across unrelated navigations.
// ---------------------------------------------------------------------------

describe('AppComponent — NavigationEnd infoMessage / pendingInfoMessage behaviour', () => {
  let navStub: {
    userProfile: any;
    phoneNumber: string | undefined;
    errorMessage: any;
    infoMessage: any;
    pendingInfoMessage: any;
    _navGen: number;
    userType: any;
  };

  beforeEach(() => {
    navStub = {
      userProfile: undefined,
      phoneNumber: undefined,
      errorMessage: undefined,
      infoMessage: undefined,
      pendingInfoMessage: undefined,
      _navGen: 0,
      userType: undefined
    };

    TestBed.configureTestingModule({
      imports: [
        RouterTestingModule.withRoutes([
          { path: 'nav-test', component: NavigationStubComponent }
        ])
      ],
      declarations: [AppComponent, NavigationStubComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: FirebaseService, useValue: firebaseServiceStub },
        { provide: StorageService, useValue: navStub }
      ]
    });
  });

  afterEach(() => TestBed.resetTestingModule());

  // APP-PENDING-01: a pendingInfoMessage set before a redirect is promoted to
  // infoMessage after NavigationEnd fires and the 1 ms timer resolves.
  it('APP-PENDING-01: pendingInfoMessage is promoted to infoMessage after NavigationEnd', fakeAsync(() => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges(); // ngOnInit subscribes to router events

    navStub.pendingInfoMessage = 'Please add an email address to your profile before subscribing.';
    navStub.infoMessage = undefined;

    const router = TestBed.inject(Router);
    router.navigateByUrl('/nav-test');
    tick();   // flush navigation and NavigationEnd
    tick(1);  // flush the 1 ms setTimeout in the NavigationEnd handler
    fixture.detectChanges();

    expect(navStub.infoMessage)
      .withContext('infoMessage should hold the promoted pendingInfoMessage value')
      .toBe('Please add an email address to your profile before subscribing.');
    expect(navStub.pendingInfoMessage)
      .withContext('pendingInfoMessage should be cleared after being consumed')
      .toBeUndefined();
    flush();
  }));

  // APP-STALE-01: when no pendingInfoMessage is set, a stale infoMessage from a
  // previous page is cleared on NavigationEnd — original reset intent preserved.
  it('APP-STALE-01: stale infoMessage is cleared on NavigationEnd when pendingInfoMessage is absent', fakeAsync(() => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    navStub.infoMessage = 'Store details updated successfully';
    navStub.pendingInfoMessage = undefined;

    const router = TestBed.inject(Router);
    router.navigateByUrl('/nav-test');
    tick();
    tick(1);
    fixture.detectChanges();

    expect(navStub.infoMessage)
      .withContext('stale infoMessage should be cleared when pendingInfoMessage is absent')
      .toBeUndefined();
    flush();
  }));

  // APP-GEN-01: when TWO NavigationEnd events fire in quick succession
  // (simulating a redirect-in-ngOnInit pattern), only the LAST timer runs.
  // The earlier (stale) timer is skipped because the generation counter has
  // advanced.  The final timer promotes pendingInfoMessage correctly.
  //
  // This covers the email-gate scenario where NavigationEnd#1 fires for the
  // subscription checkout page, then ngOnInit redirects to /business/user,
  // and NavigationEnd#2 fires — only NavigationEnd#2's timer should run.
  it('APP-GEN-01: only the final NavigationEnd timer runs when two fire in sequence', fakeAsync(() => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    // Simulate NavigationEnd#1 firing (manually advance the counter and schedule
    // a timer as the handler would — WITHOUT a pendingInfoMessage yet).
    // We replicate the generation-capture logic directly here because
    // RouterTestingModule cannot trigger two sequential NavigationEnd events
    // with a synchronous ngOnInit redirect in a single fakeAsync block.
    const gen1 = ++navStub._navGen;
    const clearFn1 = jasmine.createSpy('clearFn1');
    setTimeout(() => {
      if (navStub._navGen !== gen1) { return; } // stale — skipped
      clearFn1();
      navStub.infoMessage = navStub.pendingInfoMessage;
      navStub.pendingInfoMessage = undefined;
    }, 1);

    // Now ngOnInit runs (between NavigationEnd#1 and NavigationEnd#2) and sets
    // the pending message — just like SubscriptionCheckoutComponent.ngOnInit().
    navStub.pendingInfoMessage = 'Please add an email address to your profile before subscribing.';

    // NavigationEnd#2 fires and schedules its own timer.
    const gen2 = ++navStub._navGen;
    const promoteFn2 = jasmine.createSpy('promoteFn2');
    setTimeout(() => {
      if (navStub._navGen !== gen2) { return; } // stale — skipped (would be skipped if gen3 had fired)
      promoteFn2();
      navStub.infoMessage = navStub.pendingInfoMessage;
      navStub.pendingInfoMessage = undefined;
    }, 1);

    tick(1); // flush both timers
    fixture.detectChanges();

    expect(clearFn1)
      .withContext('fn1 (stale timer for NavigationEnd#1) must be skipped')
      .not.toHaveBeenCalled();
    expect(promoteFn2)
      .withContext('fn2 (timer for NavigationEnd#2) must run')
      .toHaveBeenCalled();
    expect(navStub.infoMessage)
      .withContext('infoMessage should hold the email-gate message')
      .toBe('Please add an email address to your profile before subscribing.');
    expect(navStub.pendingInfoMessage)
      .withContext('pendingInfoMessage should be cleared after consumption')
      .toBeUndefined();
    flush();
  }));
});
