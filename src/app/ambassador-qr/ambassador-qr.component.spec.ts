import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { AmbassadorQrComponent } from './ambassador-qr.component';
import { StorageService } from '../service/storage-service.service';
import { AnalyticsService } from '../service/analytics.service';
import { FirebaseService } from '../service/firebase.service';
import { environment } from '../../environments/environment';

/**
 * ADR-004 / T-13 — Scenario 6 & 7
 *
 * TC-AMB-01  Non-AMBASSADOR user: error message shown, no HTTP call made.
 * TC-AMB-02  No user in storage: error message shown, no HTTP call made.
 * TC-AMB-03  Approved AMBASSADOR: HTTP GET hits correct endpoint with Authorization header, qrImageUrl set.
 * TC-AMB-04  HTTP 403 response: approval-pending error message shown.
 * TC-AMB-05  HTTP 404 response: not-found error message shown.
 * TC-AMB-06  HTTP 500 response: generic retry error message shown.
 * TC-AMB-07  downloadQr: anchor click triggered when qrImageUrl is set.
 * TC-AMB-08  downloadQr: no-op when qrImageUrl is null.
 * TC-AMB-09  copyReferralLink: linkCopied becomes true after clipboard write.
 * TC-AMB-10  copyReferralLink: no-op when referralUrl is null.
 * TC-AMB-11  referralUrl built from user.id after successful load.
 * TC-AMB-12  HTTP 401 response: session-expired error message shown and router navigates to /.
 * TC-AMB-13  loadDrivers: HTTP GET hits correct endpoint with Authorization header.
 * TC-AMB-14  loadPayouts: HTTP GET hits correct endpoint with Authorization header.
 * TC-AMB-15  loadDrivers HTTP 401: session-expired error and router navigates to /.
 * TC-AMB-16  loadPayouts HTTP 401: session-expired error and router navigates to /.
 */
describe('AmbassadorQrComponent', () => {
  let component: AmbassadorQrComponent;
  let fixture: ComponentFixture<AmbassadorQrComponent>;
  let httpMock: HttpTestingController;
  let mockStorage: Partial<StorageService>;
  let mockAnalytics: jasmine.SpyObj<AnalyticsService>;
  let mockFirebase: jasmine.SpyObj<FirebaseService>;
  let mockRouter: jasmine.SpyObj<Router>;

  const ambassadorUser = { id: 'amb-001', role: 'AMBASSADOR', mobileNumber: '+27821234567' };
  const messengerUser  = { id: 'msg-001', role: 'MESSENGER',  mobileNumber: '+27820000000' };

  beforeEach(async () => {
    mockStorage = {
      userProfile: undefined as any,
      phoneNumber: '+27821234567'
    };
    mockAnalytics = jasmine.createSpyObj('AnalyticsService', ['logScreenView']);
    mockFirebase = jasmine.createSpyObj('FirebaseService', ['getFirebaseIdToken']);
    mockFirebase.getFirebaseIdToken.and.returnValue(of('fake-firebase-token'));
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      declarations: [AmbassadorQrComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: StorageService, useValue: mockStorage },
        { provide: AnalyticsService, useValue: mockAnalytics },
        { provide: FirebaseService, useValue: mockFirebase },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AmbassadorQrComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  // -----------------------------------------------------------------------
  // TC-AMB-01 — Non-AMBASSADOR role: Scenario 7 guard
  // -----------------------------------------------------------------------
  it('TC-AMB-01: shows error and makes no HTTP call when user is not AMBASSADOR', () => {
    mockStorage.userProfile = messengerUser as any;

    fixture.detectChanges(); // triggers ngOnInit

    expect(component.error).toContain('only available to iZinga Ambassadors');
    expect(component.loading).toBeFalse();
    httpMock.expectNone(`${environment.izingaUrl}/user/${messengerUser.id}/ambassador-qr`);
  });

  // -----------------------------------------------------------------------
  // TC-AMB-02 — No user in storage
  // -----------------------------------------------------------------------
  it('TC-AMB-02: shows error and makes no HTTP call when user profile is missing', () => {
    mockStorage.userProfile = undefined as any;

    fixture.detectChanges();

    expect(component.error).toContain('could not be loaded');
    expect(component.loading).toBeFalse();
    httpMock.expectNone(`${environment.izingaUrl}/user/undefined/ambassador-qr`);
  });

  // -----------------------------------------------------------------------
  // TC-AMB-03 — Approved AMBASSADOR: happy path (Scenario 6)
  // -----------------------------------------------------------------------
  it('TC-AMB-03: sets qrImageUrl and clears loading when QR fetch succeeds', fakeAsync(() => {
    mockStorage.userProfile = ambassadorUser as any;
    fixture.detectChanges();

    const req = httpMock.expectOne(`${environment.izingaUrl}/user/amb-001/ambassador-qr`);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    expect(req.request.headers.get('Authorization')).toBe('Bearer fake-firebase-token');

    const fakeBlob = new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' });
    req.flush(fakeBlob);
    tick();

    expect(component.loading).toBeFalse();
    expect(component.error).toBeNull();
    expect(component.qrImageUrl).toBeTruthy();
  }));

  // -----------------------------------------------------------------------
  // TC-AMB-04 — HTTP 403: not-approved message
  // -----------------------------------------------------------------------
  it('TC-AMB-04: shows approval-pending message on 403 from backend', fakeAsync(() => {
    mockStorage.userProfile = ambassadorUser as any;
    fixture.detectChanges();

    const req = httpMock.expectOne(`${environment.izingaUrl}/user/amb-001/ambassador-qr`);
    req.flush(null, { status: 403, statusText: 'Forbidden' });
    tick();

    expect(component.error).toContain('not yet approved');
    expect(component.loading).toBeFalse();
  }));

  // -----------------------------------------------------------------------
  // TC-AMB-05 — HTTP 404: not-found message
  // -----------------------------------------------------------------------
  it('TC-AMB-05: shows not-found message on 404 from backend', fakeAsync(() => {
    mockStorage.userProfile = ambassadorUser as any;
    fixture.detectChanges();

    const req = httpMock.expectOne(`${environment.izingaUrl}/user/amb-001/ambassador-qr`);
    req.flush(null, { status: 404, statusText: 'Not Found' });
    tick();

    expect(component.error).toContain('not found');
    expect(component.loading).toBeFalse();
  }));

  // -----------------------------------------------------------------------
  // TC-AMB-06 — HTTP 500: generic error message
  // -----------------------------------------------------------------------
  it('TC-AMB-06: shows generic retry message on 500 from backend', fakeAsync(() => {
    mockStorage.userProfile = ambassadorUser as any;
    fixture.detectChanges();

    const req = httpMock.expectOne(`${environment.izingaUrl}/user/amb-001/ambassador-qr`);
    req.flush(null, { status: 500, statusText: 'Server Error' });
    tick();

    expect(component.error).toContain('try again later');
    expect(component.loading).toBeFalse();
  }));

  // -----------------------------------------------------------------------
  // TC-AMB-12 — HTTP 401: session-expired message shown, router navigates to /
  // -----------------------------------------------------------------------
  it('TC-AMB-12: shows session-expired message and navigates to / on 401 from backend', fakeAsync(() => {
    mockStorage.userProfile = ambassadorUser as any;
    fixture.detectChanges();

    const req = httpMock.expectOne(`${environment.izingaUrl}/user/amb-001/ambassador-qr`);
    req.flush(null, { status: 401, statusText: 'Unauthorized' });
    tick();

    expect(component.error).toContain('session has expired');
    expect(component.error).toContain('sign in again');
    expect(component.loading).toBeFalse();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
  }));

  // -----------------------------------------------------------------------
  // TC-AMB-07 — downloadQr: anchor click triggered (Scenario 6 download)
  // -----------------------------------------------------------------------
  it('TC-AMB-07: downloadQr triggers anchor click when qrImageUrl is set', () => {
    component.qrImageUrl = 'blob:http://localhost/fake-url';
    mockStorage.userProfile = ambassadorUser as any;

    const fakeAnchor: Partial<HTMLAnchorElement> = { href: '', download: '', click: jasmine.createSpy('click') };
    spyOn(document, 'createElement').and.returnValue(fakeAnchor as HTMLAnchorElement);

    component.downloadQr();

    expect((fakeAnchor.click as jasmine.Spy)).toHaveBeenCalledTimes(1);
    expect(fakeAnchor.download).toContain('izinga-ambassador-qr-amb-001.png');
  });

  // -----------------------------------------------------------------------
  // TC-AMB-08 — downloadQr: no-op when qrImageUrl is null
  // -----------------------------------------------------------------------
  it('TC-AMB-08: downloadQr does nothing when qrImageUrl is null', () => {
    component.qrImageUrl = null;
    const createSpy = spyOn(document, 'createElement');

    component.downloadQr();

    expect(createSpy).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // TC-AMB-09 — copyReferralLink: linkCopied true after clipboard write
  // navigator.clipboard is undefined in ChromeHeadless (no secure context);
  // stub the property explicitly before creating the spy.
  // -----------------------------------------------------------------------
  it('TC-AMB-09: sets linkCopied = true after successful clipboard write', fakeAsync(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: jasmine.createSpy().and.returnValue(Promise.resolve()) },
      configurable: true
    });

    component.referralUrl = 'https://onboarding.izinga.co.za/indivisuals?ref=amb-001';

    component.copyReferralLink();
    tick();

    expect(component.linkCopied).toBeTrue();

    tick(3000);
    expect(component.linkCopied).toBeFalse();
  }));

  // -----------------------------------------------------------------------
  // TC-AMB-10 — copyReferralLink: no-op when referralUrl is null
  // navigator.clipboard is undefined in ChromeHeadless (no secure context);
  // stub the property explicitly before creating the spy.
  // -----------------------------------------------------------------------
  it('TC-AMB-10: copyReferralLink does nothing when referralUrl is null', () => {
    const writeTextSpy = jasmine.createSpy('writeText').and.returnValue(Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextSpy },
      configurable: true
    });

    component.referralUrl = null;

    component.copyReferralLink();

    expect(writeTextSpy).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // TC-AMB-11 — referralUrl built from user.id
  // -----------------------------------------------------------------------
  it('TC-AMB-11: referralUrl encodes correct onboarding URL with user id', fakeAsync(() => {
    mockStorage.userProfile = ambassadorUser as any;
    fixture.detectChanges();

    const req = httpMock.expectOne(`${environment.izingaUrl}/user/amb-001/ambassador-qr`);
    req.flush(new Blob(), { status: 200, statusText: 'OK' });
    tick();

    expect(component.referralUrl).toBe('https://onboarding.izinga.co.za/indivisuals?ref=amb-001');
  }));

  // -----------------------------------------------------------------------
  // TC-AMB-13 — loadDrivers: Authorization header attached (mirrors TC-AMB-03)
  // -----------------------------------------------------------------------
  it('TC-AMB-13: loadDrivers sends Authorization header and loads drivers', fakeAsync(() => {
    mockStorage.userProfile = ambassadorUser as any;
    fixture.detectChanges();

    // flush the QR code request triggered by ngOnInit
    const qrReq = httpMock.expectOne(`${environment.izingaUrl}/user/amb-001/ambassador-qr`);
    qrReq.flush(new Blob(), { status: 200, statusText: 'OK' });
    tick();

    component.selectTab('drivers');

    const driversReq = httpMock.expectOne(`${environment.izingaUrl}/user/amb-001/ambassador-drivers`);
    expect(driversReq.request.method).toBe('GET');
    expect(driversReq.request.headers.get('Authorization')).toBe('Bearer fake-firebase-token');

    const fakeDrivers: any[] = [{ id: 'd-1', name: 'Driver One', mobileNumber: '+27831111111', profileApproved: true, role: 'MESSENGER' }];
    driversReq.flush(fakeDrivers);
    tick();

    expect(component.driversLoaded).toBeTrue();
    expect(component.drivers.length).toBe(1);
  }));

  // -----------------------------------------------------------------------
  // TC-AMB-14 — loadPayouts: Authorization header attached (mirrors TC-AMB-03)
  // -----------------------------------------------------------------------
  it('TC-AMB-14: loadPayouts sends Authorization header and loads payouts', fakeAsync(() => {
    mockStorage.userProfile = ambassadorUser as any;
    fixture.detectChanges();

    // flush the QR code request triggered by ngOnInit
    const qrReq = httpMock.expectOne(`${environment.izingaUrl}/user/amb-001/ambassador-qr`);
    qrReq.flush(new Blob(), { status: 200, statusText: 'OK' });
    tick();

    component.selectTab('payouts');

    const payoutsReq = httpMock.expectOne(`${environment.izingaUrl}/user/amb-001/ambassador-payouts`);
    expect(payoutsReq.request.method).toBe('GET');
    expect(payoutsReq.request.headers.get('Authorization')).toBe('Bearer fake-firebase-token');

    const fakePayouts: any[] = [{ id: 'p-1', commissionAmount: 50, triggerDriverId: 'd-1', payoutStage: 'COMPLETED', toName: 'Test', createdDate: '2026-07-01T10:00:00+02:00' }];
    payoutsReq.flush(fakePayouts);
    tick();

    expect(component.payoutsLoaded).toBeTrue();
    expect(component.payouts.length).toBe(1);
  }));

  // -----------------------------------------------------------------------
  // TC-AMB-15 — loadDrivers HTTP 401: session-expired error, router navigates to /
  // -----------------------------------------------------------------------
  it('TC-AMB-15: loadDrivers shows session-expired error and navigates to / on 401', fakeAsync(() => {
    mockStorage.userProfile = ambassadorUser as any;
    fixture.detectChanges();

    const qrReq = httpMock.expectOne(`${environment.izingaUrl}/user/amb-001/ambassador-qr`);
    qrReq.flush(new Blob(), { status: 200, statusText: 'OK' });
    tick();

    component.selectTab('drivers');

    const driversReq = httpMock.expectOne(`${environment.izingaUrl}/user/amb-001/ambassador-drivers`);
    driversReq.flush(null, { status: 401, statusText: 'Unauthorized' });
    tick();

    expect(component.error).toContain('session has expired');
    expect(component.error).toContain('sign in again');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
    expect(component.driversLoaded).toBeTrue();
    expect(component.driversLoading).toBeFalse();
  }));

  // -----------------------------------------------------------------------
  // TC-AMB-16 — loadPayouts HTTP 401: session-expired error, router navigates to /
  // -----------------------------------------------------------------------
  it('TC-AMB-16: loadPayouts shows session-expired error and navigates to / on 401', fakeAsync(() => {
    mockStorage.userProfile = ambassadorUser as any;
    fixture.detectChanges();

    const qrReq = httpMock.expectOne(`${environment.izingaUrl}/user/amb-001/ambassador-qr`);
    qrReq.flush(new Blob(), { status: 200, statusText: 'OK' });
    tick();

    component.selectTab('payouts');

    const payoutsReq = httpMock.expectOne(`${environment.izingaUrl}/user/amb-001/ambassador-payouts`);
    payoutsReq.flush(null, { status: 401, statusText: 'Unauthorized' });
    tick();

    expect(component.error).toContain('session has expired');
    expect(component.error).toContain('sign in again');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
    expect(component.payoutsLoaded).toBeTrue();
    expect(component.payoutsLoading).toBeFalse();
  }));
});
