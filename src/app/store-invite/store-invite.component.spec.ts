import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { StoreInviteComponent } from './store-invite.component';
import { IzingaOrderManagementService, InviteCodeResponse } from '../service/izinga-order-management.service';
import { StorageService } from '../service/storage-service.service';
import { FirebaseService } from '../service/firebase.service';
import { AnalyticsService } from '../service/analytics.service';

describe('StoreInviteComponent', () => {
  let component: StoreInviteComponent;
  let fixture: ComponentFixture<StoreInviteComponent>;
  let izingaServiceSpy: jasmine.SpyObj<IzingaOrderManagementService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let firebaseServiceStub: any;
  let analyticsStub: any;
  let storageStub: any;

  const pendingInvite: InviteCodeResponse = {
    storeId: 'store-abc',
    storeName: 'Test Store',
    storeImageUrl: null,
    status: 'PENDING',
    expiresAt: new Date(Date.now() + 86400000).toISOString(), // tomorrow
    driverMobileNumber: '****1234',
    contextType: 'STORE'
  };

  beforeEach(async () => {
    izingaServiceSpy = jasmine.createSpyObj('IzingaOrderManagementService', [
      'getInviteByCode',
      'acceptStoreInvite',
      'rejectStoreInvite',
      'acceptMessengerAdminInvite',
      'rejectMessengerAdminInvite'
    ]);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    firebaseServiceStub = { auth: { currentUser: null } };
    analyticsStub = { logScreenView: jasmine.createSpy(), logEvent: jasmine.createSpy() };
    storageStub = {};

    await TestBed.configureTestingModule({
      declarations: [StoreInviteComponent],
      providers: [
        { provide: IzingaOrderManagementService, useValue: izingaServiceSpy },
        { provide: Router, useValue: routerSpy },
        {
          provide: ActivatedRoute,
          useValue: { queryParams: of({ code: 'test-code-123' }) }
        },
        { provide: StorageService, useValue: storageStub },
        { provide: FirebaseService, useValue: firebaseServiceStub },
        { provide: AnalyticsService, useValue: analyticsStub }
      ]
    }).compileComponents();

    izingaServiceSpy.getInviteByCode.and.returnValue(of(pendingInvite));

    fixture = TestBed.createComponent(StoreInviteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and start in loading state before data arrives', () => {
    expect(component).toBeTruthy();
  });

  it('should resolve to pending state for a valid PENDING invite not yet expired', () => {
    expect(component.state).toBe('pending');
    expect(component.invite).toEqual(pendingInvite);
  });

  it('should resolve to not-found state on 404', () => {
    izingaServiceSpy.getInviteByCode.and.returnValue(throwError(() => ({ status: 404 })));
    component.ngOnInit();
    expect(component.state).toBe('not-found');
  });

  it('should resolve to already-responded for ACCEPTED status', () => {
    izingaServiceSpy.getInviteByCode.and.returnValue(of({ ...pendingInvite, status: 'ACCEPTED' }));
    component.ngOnInit();
    expect(component.state).toBe('already-responded');
  });

  it('should resolve to already-responded for REJECTED status', () => {
    izingaServiceSpy.getInviteByCode.and.returnValue(of({ ...pendingInvite, status: 'REJECTED' }));
    component.ngOnInit();
    expect(component.state).toBe('already-responded');
  });

  it('should resolve to expired for EXPIRED status', () => {
    izingaServiceSpy.getInviteByCode.and.returnValue(of({ ...pendingInvite, status: 'EXPIRED' }));
    component.ngOnInit();
    expect(component.state).toBe('expired');
  });

  it('should resolve to expired when expiresAt is in the past with PENDING status', () => {
    const pastExpiry = new Date(Date.now() - 86400000).toISOString(); // yesterday
    izingaServiceSpy.getInviteByCode.and.returnValue(of({ ...pendingInvite, expiresAt: pastExpiry }));
    component.ngOnInit();
    expect(component.state).toBe('expired');
  });

  it('should redirect unauthenticated user to verify when Accept is clicked', () => {
    firebaseServiceStub.auth.currentUser = null;
    component.acceptInvite();
    expect(routerSpy.navigate).toHaveBeenCalledWith(
      ['/indivisuals/verify'],
      jasmine.objectContaining({ queryParams: jasmine.objectContaining({ returnUrl: jasmine.stringContaining('/indivisuals/store-invite') }) })
    );
  });

  it('should redirect unauthenticated user to verify when Reject is clicked', () => {
    firebaseServiceStub.auth.currentUser = null;
    component.rejectInvite();
    expect(routerSpy.navigate).toHaveBeenCalledWith(
      ['/indivisuals/verify'],
      jasmine.objectContaining({ queryParams: jasmine.objectContaining({ returnUrl: jasmine.stringContaining('/indivisuals/store-invite') }) })
    );
  });

  it('should call acceptStoreInvite for STORE contextType when authenticated', () => {
    firebaseServiceStub.auth.currentUser = { uid: 'user-1' };
    izingaServiceSpy.acceptStoreInvite.and.returnValue(of(undefined as any));
    component.acceptInvite();
    expect(izingaServiceSpy.acceptStoreInvite).toHaveBeenCalledWith('store-abc', 'test-code-123');
    expect(component.state).toBe('accepted');
  });

  it('should call acceptMessengerAdminInvite for MESSENGER_ADMIN contextType when authenticated', () => {
    firebaseServiceStub.auth.currentUser = { uid: 'user-1' };
    izingaServiceSpy.acceptMessengerAdminInvite.and.returnValue(of(undefined as any));
    const adminInvite: InviteCodeResponse = { ...pendingInvite, contextType: 'MESSENGER_ADMIN', storeId: 'admin-xyz' };
    izingaServiceSpy.getInviteByCode.and.returnValue(of(adminInvite));
    component.ngOnInit();
    component.acceptInvite();
    expect(izingaServiceSpy.acceptMessengerAdminInvite).toHaveBeenCalledWith('admin-xyz', 'test-code-123');
  });

  it('should show 403 error message on phone mismatch', () => {
    firebaseServiceStub.auth.currentUser = { uid: 'user-1' };
    izingaServiceSpy.acceptStoreInvite.and.returnValue(throwError(() => ({ status: 403 })));
    component.acceptInvite();
    expect(component.actionError).toContain('different phone number');
    expect(component.state).toBe('pending');
  });

  it('should transition to expired state on 410 at accept time', () => {
    firebaseServiceStub.auth.currentUser = { uid: 'user-1' };
    izingaServiceSpy.acceptStoreInvite.and.returnValue(throwError(() => ({ status: 410 })));
    component.acceptInvite();
    expect(component.state).toBe('expired');
  });

  it('should show 409 error message when already linked to another team', () => {
    firebaseServiceStub.auth.currentUser = { uid: 'user-1' };
    izingaServiceSpy.acceptStoreInvite.and.returnValue(throwError(() => ({ status: 409 })));
    component.acceptInvite();
    expect(component.actionError).toContain('already linked to another team');
  });

  it('contextName should return storeName for STORE contextType', () => {
    expect(component.contextName).toBe('Test Store');
  });

  it('contextName should return "iZinga Team" for MESSENGER_ADMIN contextType', () => {
    component.invite = { ...pendingInvite, contextType: 'MESSENGER_ADMIN' };
    expect(component.contextName).toBe('iZinga Team');
  });

  it('contextName should return "iZinga Team" when storeName is null', () => {
    component.invite = { ...pendingInvite, storeName: null };
    expect(component.contextName).toBe('iZinga Team');
  });

  it('goToDashboard should navigate to /indivisuals/dashboard', () => {
    component.goToDashboard();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/indivisuals/dashboard']);
  });
});
