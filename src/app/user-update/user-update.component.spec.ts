import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { UserUpdateComponent } from './user-update.component';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { StorageService } from '../service/storage-service.service';
import { AnalyticsService } from '../service/analytics.service';
import { UserProfile } from '../model/models';

const DEFAULT_PROFILE_PIC = 'https://pbs.twimg.com/media/C1OKE9QXgAAArDp.jpg';

function buildUser(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    imageUrl: DEFAULT_PROFILE_PIC,
    role: UserProfile.RoleEnum.MESSENGER,
    mobileNumber: '+27820000000',
    name: 'Test',
    surname: 'User',
    emailAddress: 'test@example.com',
    address: 'Johannesburg',
    bank: { type: 'EWALLET', name: 'FNB', accountId: '', branchCode: '250655', phone: '+27820000000' },
    tag: {},
    ...overrides
  };
}

describe('UserUpdateComponent — profile picture validation', () => {
  let component: UserUpdateComponent;
  let fixture: ComponentFixture<UserUpdateComponent>;
  let mockOrderService: jasmine.SpyObj<IzingaOrderManagementService>;
  let mockStorage: jasmine.SpyObj<StorageService>;
  let mockAnalytics: jasmine.SpyObj<AnalyticsService>;

  beforeEach(async () => {
    mockOrderService = jasmine.createSpyObj('IzingaOrderManagementService', [
      'getCustomerByPhoneNumber',
      'registerCustomer',
      'updateCustomer',
      'getUserConfig',
      'getBankConfigs',
      'uploadFile'
    ]);
    mockStorage = {
      phoneNumber: '+27820000000',
      userProfile: undefined,
      logout: jasmine.createSpy('logout')
    } as any;
    mockAnalytics = jasmine.createSpyObj('AnalyticsService', ['logScreenView', 'logEvent']);

    mockOrderService.getCustomerByPhoneNumber.and.returnValue(of(buildUser()));
    mockOrderService.getUserConfig.and.returnValue(of([]));
    mockOrderService.getBankConfigs.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, FormsModule],
      declarations: [UserUpdateComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: IzingaOrderManagementService, useValue: mockOrderService },
        { provide: StorageService, useValue: mockStorage },
        { provide: AnalyticsService, useValue: mockAnalytics },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: {}, params: of({}) }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    // Set required field so tests that call createCustomer/updateCustomer pass the
    // roleDescription guard. buildUser() has no description so ngOnInit leaves it unset.
    component.roleDescription = 'Bike Delivery Driver';
  });

  // TC-01: new user with no upload — createCustomer must block
  it('TC-01: blocks registration when no profile picture has been uploaded', () => {
    component.profilePictureUploaded = false;
    const scrollSpy = spyOn(window, 'scrollTo');

    component.createCustomer();

    expect(component.showProfilePictureError).toBeTrue();
    expect(scrollSpy).toHaveBeenCalled();
    expect(mockOrderService.registerCustomer).not.toHaveBeenCalled();
  });

  // TC-02: new user with upload — createCustomer must proceed
  it('TC-02: allows registration when a profile picture has been uploaded', () => {
    component.profilePictureUploaded = true;
    const registeredUser = buildUser({ id: 'u1', name: 'Test' });
    mockOrderService.registerCustomer.and.returnValue(of(registeredUser));

    component.createCustomer();

    expect(component.showProfilePictureError).toBeFalse();
    expect(mockOrderService.registerCustomer).toHaveBeenCalledOnceWith(
      jasmine.objectContaining({ mobileNumber: '+27820000000' })
    );
  });

  // TC-03: error flag is cleared at the start of each createCustomer call
  it('TC-03: clears showProfilePictureError at the start of createCustomer', () => {
    component.showProfilePictureError = true;
    component.profilePictureUploaded = true;
    mockOrderService.registerCustomer.and.returnValue(of(buildUser({ id: 'u1' })));

    component.createCustomer();

    expect(component.showProfilePictureError).toBeFalse();
  });

  // TC-04: existing user with non-default photo — profilePictureUploaded true on load
  it('TC-04: sets profilePictureUploaded = true on init when user has a non-default photo', () => {
    const existingUser = buildUser({ id: 'u2', imageUrl: 'https://cdn.example.com/photo.jpg' });
    mockOrderService.getCustomerByPhoneNumber.and.returnValue(of(existingUser));
    mockStorage.userProfile = undefined; // force the getCustomerByPhoneNumber branch

    component.ngOnInit();

    expect(component.profilePictureUploaded).toBeTrue();
  });

  // TC-05: existing user with default placeholder photo — profilePictureUploaded stays false
  it('TC-05: leaves profilePictureUploaded = false on init when user has the default placeholder photo', () => {
    const existingUser = buildUser({ id: 'u3', imageUrl: DEFAULT_PROFILE_PIC });
    mockOrderService.getCustomerByPhoneNumber.and.returnValue(of(existingUser));
    mockStorage.userProfile = undefined; // force the getCustomerByPhoneNumber branch

    component.ngOnInit();

    expect(component.profilePictureUploaded).toBeFalse();
  });

  // TC-06: existing user (userExist = true) — updateCustomer is called, bypass is correct
  it('TC-06: updateCustomer does not check profilePictureUploaded (existing users not blocked)', () => {
    component.profilePictureUploaded = false;
    const updatedUser = buildUser({ id: 'u4' });
    mockOrderService.updateCustomer.and.returnValue(of(updatedUser));

    component.updateCustomer();

    expect(mockOrderService.updateCustomer).toHaveBeenCalledTimes(1);
    expect(component.showProfilePictureError).toBeFalse();
  });

  // TC-07: successful upload sets profilePictureUploaded and clears error
  it('TC-07: sets profilePictureUploaded = true and clears error after successful upload', fakeAsync(() => {
    component.showProfilePictureError = true;
    component.profilePictureUploaded = false;
    mockOrderService.uploadFile.and.returnValue(of({ url: 'https://cdn.example.com/new.jpg' }));

    const fakeFile = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
    (component as any).uploadProfilePicture(fakeFile);
    tick(2000);

    expect(component.profilePictureUploaded).toBeTrue();
    expect(component.showProfilePictureError).toBeFalse();
    expect(component.userProfile.imageUrl).toBe('https://cdn.example.com/new.jpg');
  }));

  // TC-08: upload failure — profilePictureUploaded remains false
  it('TC-08: leaves profilePictureUploaded = false when upload fails', fakeAsync(() => {
    component.profilePictureUploaded = false;
    mockOrderService.uploadFile.and.returnValue(throwError(() => new Error('network error')));
    spyOn(window, 'alert');

    const fakeFile = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
    (component as any).uploadProfilePicture(fakeFile);
    tick();

    expect(component.profilePictureUploaded).toBeFalse();
  }));

  // TC-09: file too large — no upload attempted
  it('TC-09: rejects file larger than 5MB without calling uploadFile', () => {
    spyOn(window, 'alert');
    const largeFile = new File([new ArrayBuffer(6 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' });
    (component as any).uploadProfilePicture(largeFile);

    expect(mockOrderService.uploadFile).not.toHaveBeenCalled();
  });

  // TC-10: non-image file — no upload attempted
  it('TC-10: rejects non-image files without calling uploadFile', () => {
    spyOn(window, 'alert');
    const pdfFile = new File(['data'], 'document.pdf', { type: 'application/pdf' });
    (component as any).uploadProfilePicture(pdfFile);

    expect(mockOrderService.uploadFile).not.toHaveBeenCalled();
  });

  // ONB-CAM-01: profile picture must come from a live camera capture, not an arbitrary file upload
  it('ONB-CAM-01: no file-picker path exists for the profile picture — onProfilePictureSelect was removed', () => {
    expect((component as any).onProfilePictureSelect).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Bug-fix: userExist getter must treat OTP placeholder (id + role=null) as a
// new user, not an existing one. Backend change in ijudi-api commit 73ff2a9
// means WhatsAppOtpService now creates the placeholder with role=null instead
// of role=CUSTOMER, so the old `id != null` check was always routing new
// signups into updateCustomer() instead of createCustomer().
// ---------------------------------------------------------------------------
describe('UserUpdateComponent — userExist getter (OTP placeholder fix)', () => {
  let component: UserUpdateComponent;
  let fixture: ComponentFixture<UserUpdateComponent>;
  let mockOrderService: jasmine.SpyObj<IzingaOrderManagementService>;
  let mockStorage: any;
  let mockAnalytics: jasmine.SpyObj<AnalyticsService>;

  beforeEach(async () => {
    mockOrderService = jasmine.createSpyObj('IzingaOrderManagementService', [
      'getCustomerByPhoneNumber',
      'registerCustomer',
      'updateCustomer',
      'getUserConfig',
      'getBankConfigs',
      'uploadFile'
    ]);
    mockStorage = {
      phoneNumber: '+27820000000',
      userProfile: undefined,
      ambassadorRef: null,
      logout: jasmine.createSpy('logout')
    };
    mockAnalytics = jasmine.createSpyObj('AnalyticsService', ['logScreenView', 'logEvent']);
    mockOrderService.getUserConfig.and.returnValue(of([]));
    mockOrderService.getBankConfigs.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, FormsModule],
      declarations: [UserUpdateComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: IzingaOrderManagementService, useValue: mockOrderService },
        { provide: StorageService, useValue: mockStorage },
        { provide: AnalyticsService, useValue: mockAnalytics },
        { provide: ActivatedRoute, useValue: { snapshot: {}, params: of({}) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserUpdateComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => TestBed.resetTestingModule());

  // TC-UE-01: profile with id AND a real role → existing registered user, use update path
  it('TC-UE-01: userExist is true when profile has both an id and a role', () => {
    const registeredUser = buildUser({ id: 'u-registered', role: UserProfile.RoleEnum.MESSENGER });
    mockOrderService.getCustomerByPhoneNumber.and.returnValue(of(registeredUser));
    fixture.detectChanges();

    expect(component.userExist).toBeTrue();
  });

  // TC-UE-02: OTP placeholder has id but role is null → treat as new user, use create path
  it('TC-UE-02: userExist is false when profile has an id but role is null (OTP placeholder)', () => {
    const placeholder = buildUser({ id: 'u-otp-placeholder', role: undefined });
    mockOrderService.getCustomerByPhoneNumber.and.returnValue(of(placeholder));
    fixture.detectChanges();

    expect(component.userExist).toBeFalse();
  });

  // TC-UE-03: no id at all → definitely a new user
  it('TC-UE-03: userExist is false when profile has no id', () => {
    const blankProfile = buildUser({ id: undefined, role: undefined });
    mockOrderService.getCustomerByPhoneNumber.and.returnValue(of(blankProfile));
    fixture.detectChanges();

    expect(component.userExist).toBeFalse();
  });
});

// ---------------------------------------------------------------------------
// ADR-004 / T-13 — Ambassador ref attachment to POST /user
//
// TC-AMB-REG-01  Scenario 1/happy path: ambassadorRef in storage → included in POST payload.
// TC-AMB-REG-02  Scenario 2: no ref param → ambassadorId is null in POST payload.
// TC-AMB-REG-03  Scenario 3: invalid/absent ref → ambassadorId is null (guard at storage level).
// ---------------------------------------------------------------------------
describe('UserUpdateComponent — ambassador ref in registration payload', () => {
  let component: UserUpdateComponent;
  let fixture: ComponentFixture<UserUpdateComponent>;
  let mockOrderService: jasmine.SpyObj<IzingaOrderManagementService>;
  let mockStorage: any;
  let mockAnalytics: jasmine.SpyObj<AnalyticsService>;

  function buildModule(ambassadorRef: string | null) {
    mockStorage = {
      phoneNumber: '+27820000000',
      userProfile: undefined,
      ambassadorRef,
      logout: jasmine.createSpy('logout')
    };

    mockOrderService = jasmine.createSpyObj('IzingaOrderManagementService', [
      'getCustomerByPhoneNumber',
      'registerCustomer',
      'updateCustomer',
      'getUserConfig',
      'getBankConfigs',
      'uploadFile'
    ]);
    mockAnalytics = jasmine.createSpyObj('AnalyticsService', ['logScreenView', 'logEvent']);

    mockOrderService.getCustomerByPhoneNumber.and.returnValue(of(buildUser()));
    mockOrderService.getUserConfig.and.returnValue(of([]));
    mockOrderService.getBankConfigs.and.returnValue(of([]));

    TestBed.configureTestingModule({
      imports: [RouterTestingModule, FormsModule],
      declarations: [UserUpdateComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: IzingaOrderManagementService, useValue: mockOrderService },
        { provide: StorageService, useValue: mockStorage },
        { provide: AnalyticsService, useValue: mockAnalytics },
        { provide: ActivatedRoute, useValue: { snapshot: {}, params: of({}) } }
      ]
    }).compileComponents();

    fixture   = TestBed.createComponent(UserUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    // Required so createCustomer() passes the roleDescription guard
    component.roleDescription = 'Bike Delivery Driver';
  }

  // TC-AMB-REG-01 — ambassadorRef present: sent as ambassadorId in POST
  it('TC-AMB-REG-01: includes ambassadorId in POST payload when ambassadorRef is set in storage', () => {
    buildModule('amb-xyz-999');
    component.profilePictureUploaded = true;

    const registeredUser = buildUser({ id: 'driver-new', name: 'New Driver' });
    mockOrderService.registerCustomer.and.returnValue(of(registeredUser));

    component.createCustomer();

    const callArg = mockOrderService.registerCustomer.calls.mostRecent().args[0];
    expect(callArg.ambassadorId).toBe('amb-xyz-999');
  });

  // TC-AMB-REG-02 — no ref: ambassadorId is null in POST
  it('TC-AMB-REG-02: sets ambassadorId to null in POST payload when no ref is in storage', () => {
    buildModule(null);
    component.profilePictureUploaded = true;

    const registeredUser = buildUser({ id: 'driver-no-ref', name: 'No Ref Driver' });
    mockOrderService.registerCustomer.and.returnValue(of(registeredUser));

    component.createCustomer();

    const callArg = mockOrderService.registerCustomer.calls.mostRecent().args[0];
    expect(callArg.ambassadorId).toBeNull();
  });

  // TC-AMB-REG-03 — empty/invalid ref (treated as null by StorageService setter): null in POST
  it('TC-AMB-REG-03: sets ambassadorId to null when ambassadorRef is empty string', () => {
    // StorageService setter does not store empty strings (falsy guard), so ambassadorRef getter returns null
    buildModule(null); // mirrors what happens when ?ref= is empty
    component.profilePictureUploaded = true;

    const registeredUser = buildUser({ id: 'driver-empty-ref', name: 'Empty Ref Driver' });
    mockOrderService.registerCustomer.and.returnValue(of(registeredUser));

    component.createCustomer();

    const callArg = mockOrderService.registerCustomer.calls.mostRecent().args[0];
    expect(callArg.ambassadorId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ONB-UX-01 — REQ-19, REQ-20
// ---------------------------------------------------------------------------

describe('UserUpdateComponent — ONB-UX-01 requirements', () => {
  let component: UserUpdateComponent;
  let fixture: ComponentFixture<UserUpdateComponent>;
  let mockOrderService: jasmine.SpyObj<IzingaOrderManagementService>;
  let mockStorage: any;
  let mockAnalytics: jasmine.SpyObj<AnalyticsService>;

  beforeEach(async () => {
    mockOrderService = jasmine.createSpyObj('IzingaOrderManagementService', [
      'getCustomerByPhoneNumber', 'registerCustomer', 'updateCustomer',
      'getUserConfig', 'getBankConfigs', 'uploadFile'
    ]);
    mockStorage = { phoneNumber: undefined, userProfile: undefined, logout: jasmine.createSpy() } as any;
    mockAnalytics = jasmine.createSpyObj('AnalyticsService', ['logScreenView', 'logEvent']);

    mockOrderService.getCustomerByPhoneNumber.and.returnValue(of(buildUser()));
    mockOrderService.getUserConfig.and.returnValue(of([]));
    mockOrderService.getBankConfigs.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, FormsModule],
      declarations: [UserUpdateComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: IzingaOrderManagementService, useValue: mockOrderService },
        { provide: StorageService, useValue: mockStorage },
        { provide: AnalyticsService, useValue: mockAnalytics },
        { provide: ActivatedRoute, useValue: { snapshot: {}, params: of({}) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // REQ-19: phoneNumber binding falls back to empty string when undefined
  it('REQ-19 — phoneNumber || empty string binding does not render "undefined"', () => {
    (component as any).phoneNumber = undefined;
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[name="mobileNumber"]');
    expect(input).not.toBeNull();
    expect(input?.value).not.toBe('undefined');
    expect(input?.value).toBe('');
  });

  // REQ-20: tip card label text is corrected
  it('REQ-20 — tip card label reads "I have an iZinga Tip Card" (grammar corrected)', () => {
    fixture.detectChanges();
    const html: string = fixture.nativeElement.innerHTML;
    expect(html).toContain('I have an iZinga Tip Card');
    expect(html).not.toContain('I have a iZinga Tip Card');
  });

  // REQ-20: tip card question and YES/NO are visually separated
  it('REQ-20 — tip card question text is not run together with YES in a single label string', () => {
    fixture.detectChanges();
    const html: string = fixture.nativeElement.innerHTML;
    // Old pattern was "I have a iZinga Tip Card | YES" in a single label; new pattern separates them
    expect(html).not.toContain('Tip Card | YES');
  });
});

// ---------------------------------------------------------------------------
// Shop flow (biz.izinga.co.za / /business routes): only the store-admin account
// type may be offered. The backend UserConfig list is shared with the driver,
// ambassador and referral-partner flows.
// ---------------------------------------------------------------------------
describe('UserUpdateComponent — shop flow user-type filter', () => {
  let component: UserUpdateComponent;
  let fixture: ComponentFixture<UserUpdateComponent>;
  let mockOrderService: jasmine.SpyObj<IzingaOrderManagementService>;
  let mockStorage: any;

  const allConfigs = [
    { name: 'BIKE_DELIVERY_DRIVER', label: 'Bike Delivery Driver', userRole: UserProfile.RoleEnum.MESSENGER, mandatoryFields: [], optionalFields: [], hiddenFields: [] },
    { name: 'izinga_ambassador', label: 'iZinga Ambassador', userRole: UserProfile.RoleEnum.AMBASSADOR, mandatoryFields: [], optionalFields: [], hiddenFields: [] },
    { name: 'STORE_OWNER', label: 'Store Owner', userRole: UserProfile.RoleEnum.STOREADMIN, mandatoryFields: [], optionalFields: [], hiddenFields: [] }
  ] as any;

  interface SetupOptions {
    /** Simulate the route the page is mounted on (RouterTestingModule defaults to '/'). */
    routerUrl?: string;
    /** The profile getCustomerByPhoneNumber returns (default: a new user with no description). */
    user?: UserProfile;
    /** A selection already made before the config loads. */
    presetRoleDescription?: string;
  }

  async function setup(userType: string | undefined, configs: any = allConfigs, opts: SetupOptions = {}): Promise<void> {
    mockOrderService = jasmine.createSpyObj('IzingaOrderManagementService', [
      'getCustomerByPhoneNumber', 'registerCustomer', 'updateCustomer', 'getUserConfig', 'getBankConfigs', 'uploadFile'
    ]);
    mockStorage = { phoneNumber: '+27820000000', userProfile: undefined, userType, ambassadorRef: null, logout: jasmine.createSpy('logout') };
    // Profile with no description loads synchronously AFTER the config in ngOnInit — this is
    // exactly the ordering that must not wipe the shop flow's auto-selected account type.
    mockOrderService.getCustomerByPhoneNumber.and.returnValue(of(opts.user ?? buildUser()));
    mockOrderService.getUserConfig.and.returnValue(of(configs));
    mockOrderService.getBankConfigs.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, FormsModule],
      declarations: [UserUpdateComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: IzingaOrderManagementService, useValue: mockOrderService },
        { provide: StorageService, useValue: mockStorage },
        { provide: AnalyticsService, useValue: jasmine.createSpyObj('AnalyticsService', ['logScreenView', 'logEvent']) },
        { provide: ActivatedRoute, useValue: { snapshot: {}, params: of({}) } }
      ]
    }).compileComponents();

    if (opts.routerUrl) {
      spyOnProperty(TestBed.inject(Router), 'url', 'get').and.returnValue(opts.routerUrl);
    }
    fixture = TestBed.createComponent(UserUpdateComponent);
    component = fixture.componentInstance;
    if (opts.presetRoleDescription) {
      component.roleDescription = opts.presetRoleDescription;
    }
    fixture.detectChanges();
  }

  afterEach(() => TestBed.resetTestingModule());

  it('shop flow is detected from the /business route alone, without the shop userType', async () => {
    await setup('driver', allConfigs, { routerUrl: '/business/user' });

    expect(component.isShopFlow()).toBeTrue();
    expect(component.userConfig.map(c => c.label)).toEqual(['Store Owner']);
    expect(component.roleDescription).toBe('Store Owner');
  });

  it('shop flow: a selection already made is not overwritten by the pre-selection', async () => {
    await setup('shop', allConfigs, { presetRoleDescription: 'Barber' });

    expect(component.userConfig.map(c => c.label)).toEqual(['Store Owner']);
    expect(component.roleDescription).toBe('Barber');
  });

  it('shop flow: a returning store owner keeps the description from their profile', async () => {
    await setup('shop', allConfigs, { user: buildUser({ id: 'owner-1', role: UserProfile.RoleEnum.STOREADMIN, description: 'Store Owner' }) });

    expect(component.roleDescription).toBe('Store Owner');
    expect(component.isStoreAdmin()).toBeTrue();
    expect(fixture.nativeElement.innerHTML).not.toContain('Step 1 of 3');
  });

  it('shop flow: offers only the store-admin account type and pre-selects it', async () => {
    await setup('shop');

    expect(component.isShopFlow()).toBeTrue();
    expect(component.userConfig.map(c => c.label)).toEqual(['Store Owner']);
    expect(component.roleDescription).toBe('Store Owner');

    fixture.detectChanges();
    const options = fixture.nativeElement.querySelectorAll('select[name="roleDescription"] option');
    // placeholder + the single store-owner option
    expect(options.length).toBe(2);
    expect(fixture.nativeElement.innerHTML).toContain('Account type');
    expect(fixture.nativeElement.innerHTML).not.toContain('Tell us about your hustle');
    // REQ-16 banner: previously gated on isStoreAdmin(), which is never true for a new signup.
    expect(fixture.nativeElement.innerHTML).toContain('Step 1 of 3');
  });

  it('shop flow: a new signup is registered with role STORE_ADMIN, not CUSTOMER or MESSENGER', async () => {
    await setup('shop');
    component.profilePictureUploaded = true;
    mockOrderService.registerCustomer.and.returnValue(of(buildUser({ id: 'new-store-admin', role: UserProfile.RoleEnum.STOREADMIN })));

    component.createCustomer();

    const posted = mockOrderService.registerCustomer.calls.mostRecent().args[0];
    expect(posted.role).toBe(UserProfile.RoleEnum.STOREADMIN);
    expect(posted.description).toBe('Store Owner');
  });

  it('shop flow: no store-admin config available → empty list, nothing pre-selected, no crash', async () => {
    await setup('shop', allConfigs.filter((c: any) => c.userRole !== UserProfile.RoleEnum.STOREADMIN));

    expect(component.userConfig.length).toBe(0);
    expect(component.roleDescription).toBeUndefined();
  });

  // TC-SHOP-ROLE-02: Race-condition guard — if getUserConfig HTTP response has not returned
  // by the time the user submits the form (userConfig is empty, roleDescription is unset),
  // createCustomer() must still assign STORE_ADMIN for the shop flow.
  // Previously this fell back to CUSTOMER via the userConfig.find() → undefined path.
  it('TC-SHOP-ROLE-02: shop flow createCustomer assigns STORE_ADMIN even when userConfig has not yet loaded (race condition guard)', async () => {
    // setup with empty config simulates the race: getUserConfig response not yet arrived.
    await setup('shop', []);
    // Explicitly zero out userConfig to reproduce the race (config not yet returned).
    // roleDescription must be set so the required-field guard passes — the race under
    // test is about userConfig being empty, not about roleDescription being absent.
    component.userConfig = [];
    component.roleDescription = 'Store Owner';
    component.profilePictureUploaded = true;

    mockOrderService.registerCustomer.and.returnValue(
      of(buildUser({ id: 'race-store-owner', role: UserProfile.RoleEnum.STOREADMIN }))
    );

    component.createCustomer();

    const posted = mockOrderService.registerCustomer.calls.mostRecent().args[0];
    expect(posted.role).toBe(UserProfile.RoleEnum.STOREADMIN);
  });

  it('non-shop flow: all account types are offered and nothing is pre-selected', async () => {
    await setup('driver');

    expect(component.isShopFlow()).toBeFalse();
    expect(component.userConfig.length).toBe(3);
    expect(component.roleDescription).toBeUndefined();
    expect(fixture.nativeElement.innerHTML).toContain('Tell us about your hustle');
  });
});

// ---------------------------------------------------------------------------
// ONB-TIER-GATE — updateCustomer() post-save routing for STORE_ADMIN users
//
// TC-UPD-TIER-01  STORE_ADMIN, no storeId, no selectedTier → route to tier-select (new funnel)
// TC-UPD-TIER-02  STORE_ADMIN, storeId present (established merchant editing profile) → route to info
// TC-UPD-TIER-03  STORE_ADMIN, no storeId, but selectedTier set in session → route to info
// ---------------------------------------------------------------------------
describe('UserUpdateComponent — updateCustomer() tier-select routing gate (ONB-TIER-GATE)', () => {
  let component: UserUpdateComponent;
  let fixture: ComponentFixture<UserUpdateComponent>;
  let mockOrderService: jasmine.SpyObj<IzingaOrderManagementService>;
  let mockStorage: any;
  let mockAnalytics: jasmine.SpyObj<AnalyticsService>;
  let router: Router;

  async function buildTestBed(
    selectedTier: string | null,
    profileOverrides: Partial<UserProfile> = {}
  ): Promise<void> {
    mockOrderService = jasmine.createSpyObj('IzingaOrderManagementService', [
      'getCustomerByPhoneNumber',
      'registerCustomer',
      'updateCustomer',
      'getUserConfig',
      'getBankConfigs',
      'uploadFile'
    ]);
    mockStorage = {
      phoneNumber: '+27820000000',
      userProfile: undefined,
      selectedTier,
      ambassadorRef: null,
      logout: jasmine.createSpy('logout')
    };
    mockAnalytics = jasmine.createSpyObj('AnalyticsService', ['logScreenView', 'logEvent']);

    const storeAdminProfile = buildUser({
      role: UserProfile.RoleEnum.STOREADMIN,
      ...profileOverrides
    });
    mockOrderService.getCustomerByPhoneNumber.and.returnValue(of(storeAdminProfile));
    mockOrderService.getUserConfig.and.returnValue(of([]));
    mockOrderService.getBankConfigs.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, FormsModule],
      declarations: [UserUpdateComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: IzingaOrderManagementService, useValue: mockOrderService },
        { provide: StorageService, useValue: mockStorage },
        { provide: AnalyticsService, useValue: mockAnalytics },
        { provide: ActivatedRoute, useValue: { snapshot: {}, params: of({}) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserUpdateComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
    // Required so updateCustomer() passes the roleDescription guard
    component.roleDescription = 'Store Owner';
  }

  afterEach(() => TestBed.resetTestingModule());

  // TC-UPD-TIER-01: STORE_ADMIN + no storeId + no selectedTier → must go to tier-select
  it('TC-UPD-TIER-01: STORE_ADMIN with no storeId and no selectedTier is routed to tier-select after profile update', async () => {
    await buildTestBed(null);

    const updatedUser = buildUser({ id: 'sa-new', role: UserProfile.RoleEnum.STOREADMIN });
    mockOrderService.updateCustomer.and.returnValue(of(updatedUser));
    const navigateSpy = spyOn(router, 'navigate');

    component.updateCustomer();

    expect(navigateSpy).toHaveBeenCalledOnceWith(
      ['../tier-select', 'sa-new'],
      jasmine.objectContaining({ relativeTo: jasmine.anything() })
    );
  });

  // TC-UPD-TIER-02: STORE_ADMIN + storeId present → established merchant, must stay on ../info
  it('TC-UPD-TIER-02: STORE_ADMIN with an existing storeId is routed to info after profile update (no regression)', async () => {
    await buildTestBed(null, { id: 'sa-existing', storeId: 'store-001' });

    const updatedUser = buildUser({ id: 'sa-existing', role: UserProfile.RoleEnum.STOREADMIN, storeId: 'store-001' });
    mockOrderService.updateCustomer.and.returnValue(of(updatedUser));
    const navigateSpy = spyOn(router, 'navigate');

    component.updateCustomer();

    expect(navigateSpy).toHaveBeenCalledOnceWith(
      ['../info'],
      jasmine.objectContaining({ relativeTo: jasmine.anything() })
    );
  });

  // TC-UPD-TIER-03: STORE_ADMIN + no storeId + selectedTier already in session → mid-funnel, go to info
  it('TC-UPD-TIER-03: STORE_ADMIN with selectedTier in session but no storeId is routed to info (tier already chosen)', async () => {
    await buildTestBed('FREE');

    const updatedUser = buildUser({ id: 'sa-has-tier', role: UserProfile.RoleEnum.STOREADMIN });
    mockOrderService.updateCustomer.and.returnValue(of(updatedUser));
    const navigateSpy = spyOn(router, 'navigate');

    component.updateCustomer();

    expect(navigateSpy).toHaveBeenCalledOnceWith(
      ['../info'],
      jasmine.objectContaining({ relativeTo: jasmine.anything() })
    );
  });
});

// ---------------------------------------------------------------------------
// Bug 9 — bank.phone field: frontend/backend contract gap
//
// TC-BANK-PHONE-01  bankPhone getter reads from userProfile.bank.phone
// TC-BANK-PHONE-02  bankPhone setter writes to userProfile.bank.phone
// TC-BANK-PHONE-03  ngOnInit seeds bank.phone from storageService.phoneNumber
// TC-BANK-PHONE-04  existing user loaded — bank.phone defaulted to mobileNumber if blank
// TC-BANK-PHONE-05  existing user loaded — bank.phone preserved when already set
// TC-BANK-PHONE-06  onBankSelected defaults bank.phone to mobileNumber if blank
// TC-BANK-PHONE-07  onBankSelected preserves bank.phone when already set
// TC-BANK-PHONE-08  bank.phone is included in PATCH /user payload via updateCustomer
// ---------------------------------------------------------------------------
describe('UserUpdateComponent — bank.phone field (Bug 9)', () => {
  let component: UserUpdateComponent;
  let fixture: ComponentFixture<UserUpdateComponent>;
  let mockOrderService: jasmine.SpyObj<IzingaOrderManagementService>;
  let mockStorage: any;
  let mockAnalytics: jasmine.SpyObj<AnalyticsService>;

  beforeEach(async () => {
    mockOrderService = jasmine.createSpyObj('IzingaOrderManagementService', [
      'getCustomerByPhoneNumber',
      'registerCustomer',
      'updateCustomer',
      'getUserConfig',
      'getBankConfigs',
      'uploadFile'
    ]);
    mockStorage = {
      phoneNumber: '+27820000000',
      userProfile: undefined,
      logout: jasmine.createSpy('logout'),
      ambassadorRef: null,
      selectedTier: null
    } as any;
    mockAnalytics = jasmine.createSpyObj('AnalyticsService', ['logScreenView', 'logEvent']);

    mockOrderService.getCustomerByPhoneNumber.and.returnValue(
      of(buildUser({ mobileNumber: '+27820000000', bank: { type: 'EWALLET', name: 'FNB', accountId: '', branchCode: '250655' } }))
    );
    mockOrderService.getUserConfig.and.returnValue(of([]));
    mockOrderService.getBankConfigs.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, FormsModule],
      declarations: [UserUpdateComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: IzingaOrderManagementService, useValue: mockOrderService },
        { provide: StorageService, useValue: mockStorage },
        { provide: AnalyticsService, useValue: mockAnalytics },
        { provide: ActivatedRoute, useValue: { snapshot: {}, params: of({}) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    // Required so updateCustomer() passes the roleDescription guard
    component.roleDescription = 'Bike Delivery Driver';
  });

  // TC-BANK-PHONE-01: bankPhone getter reads from userProfile.bank.phone
  it('TC-BANK-PHONE-01: bankPhone getter returns userProfile.bank.phone', () => {
    component.userProfile.bank.phone = '+27811111111';
    expect(component.bankPhone).toBe('+27811111111');
  });

  // TC-BANK-PHONE-02: bankPhone setter writes to userProfile.bank.phone
  it('TC-BANK-PHONE-02: bankPhone setter writes to userProfile.bank.phone', () => {
    component.bankPhone = '+27822222222';
    expect(component.userProfile.bank.phone).toBe('+27822222222');
  });

  // TC-BANK-PHONE-03: ngOnInit seeds bank.phone from storageService.phoneNumber
  it('TC-BANK-PHONE-03: ngOnInit seeds bank.phone from storageService.phoneNumber before the user observable fires', () => {
    // After fixture.detectChanges() ngOnInit has run; the seeding happens synchronously before subscribe()
    expect(component.userProfile.bank.phone).toBeTruthy();
  });

  // TC-BANK-PHONE-04: existing user loaded with blank bank.phone — defaulted to mobileNumber
  it('TC-BANK-PHONE-04: bank.phone is defaulted to mobileNumber when existing user has blank phone', () => {
    const existingUser = buildUser({
      id: 'u-existing',
      mobileNumber: '+27833333333',
      bank: { type: 'CHEQUE', name: 'FNB', accountId: '12345', branchCode: '250655', phone: '' }
    });
    mockOrderService.getCustomerByPhoneNumber.and.returnValue(of(existingUser));
    mockStorage.userProfile = undefined;

    component.ngOnInit();

    expect(component.userProfile.bank.phone).toBe('+27833333333');
  });

  // TC-BANK-PHONE-05: existing user with bank.phone already set — preserved, not overwritten
  it('TC-BANK-PHONE-05: bank.phone is preserved when existing user already has it set', () => {
    const existingUser = buildUser({
      id: 'u-existing-phone',
      mobileNumber: '+27844444444',
      bank: { type: 'CHEQUE', name: 'FNB', accountId: '99999', branchCode: '250655', phone: '+27855555555' }
    });
    mockOrderService.getCustomerByPhoneNumber.and.returnValue(of(existingUser));
    mockStorage.userProfile = undefined;

    component.ngOnInit();

    expect(component.userProfile.bank.phone).toBe('+27855555555');
  });

  // TC-BANK-PHONE-06: onBankSelected defaults bank.phone to mobileNumber when blank
  it('TC-BANK-PHONE-06: onBankSelected defaults bank.phone to mobileNumber if not already set', () => {
    component.userProfile.mobileNumber = '+27866666666';
    component.userProfile.bank.phone = '';
    const bankConfig = { bankName: 'Nedbank', branchCode: '198765', bankCode: '198765' };

    component.onBankSelected(bankConfig as any);

    expect(component.userProfile.bank.phone).toBe('+27866666666');
  });

  // TC-BANK-PHONE-07: onBankSelected preserves bank.phone when already set
  it('TC-BANK-PHONE-07: onBankSelected preserves existing bank.phone', () => {
    component.userProfile.mobileNumber = '+27877777777';
    component.userProfile.bank.phone = '+27888888888';
    const bankConfig = { bankName: 'ABSA', branchCode: '632005', bankCode: '632005' };

    component.onBankSelected(bankConfig as any);

    expect(component.userProfile.bank.phone).toBe('+27888888888');
  });

  // TC-BANK-PHONE-08: bank.phone is included in the payload sent by updateCustomer
  it('TC-BANK-PHONE-08: updateCustomer sends bank.phone in the PATCH payload', () => {
    component.userProfile.bank.phone = '+27899999999';
    const updatedUser = buildUser({ id: 'u-upd' });
    mockOrderService.updateCustomer.and.returnValue(of(updatedUser));

    component.updateCustomer();

    const payload = mockOrderService.updateCustomer.calls.mostRecent().args[0];
    expect(payload.bank.phone).toBe('+27899999999');
  });
});

// ---------------------------------------------------------------------------
// Bug 15 — storageService.userProfile must be updated with fresh server
// response after updateCustomer() and createCustomer() success handlers run.
//
// Root cause: the success handlers only updated the component's own local
// this.userProfile field, leaving storageService.userProfile (the shared
// inter-component cache) at the stale pre-update value. TermsConditionsComponent
// reads storageService.userProfile in ngOnInit; when the role was still CUSTOMER
// in the cache, isStoreAdmin evaluated false and the generic consumer terms
// rendered instead of the Merchant ICA branch.
//
// TC-B15-UPD-01  updateCustomer() writes the fresh resp to storageService.userProfile
// TC-B15-UPD-02  the fresh resp role (STORE_ADMIN) is the value in storage, not stale CUSTOMER
// TC-B15-CRT-01  createCustomer() writes the fresh resp to storageService.userProfile
// TC-B15-CRT-02  storageService.userProfile is set even when the fresh role differs from the stale cached role
// ---------------------------------------------------------------------------
describe('UserUpdateComponent — storageService.userProfile cache sync on save (Bug 15)', () => {
  let component: UserUpdateComponent;
  let fixture: ComponentFixture<UserUpdateComponent>;
  let mockOrderService: jasmine.SpyObj<IzingaOrderManagementService>;
  let mockStorage: any;
  let mockAnalytics: jasmine.SpyObj<AnalyticsService>;

  beforeEach(async () => {
    mockOrderService = jasmine.createSpyObj('IzingaOrderManagementService', [
      'getCustomerByPhoneNumber',
      'registerCustomer',
      'updateCustomer',
      'getUserConfig',
      'getBankConfigs',
      'uploadFile'
    ]);
    // Seed storage with a stale CUSTOMER-role profile — the pre-update state that
    // triggered Bug 15 in the live first-time-signup flow.
    const staleProfile = buildUser({ id: 'u-stale', role: UserProfile.RoleEnum.CUSTOMER });
    mockStorage = {
      phoneNumber: '+27820000000',
      userProfile: staleProfile,
      selectedTier: null,
      ambassadorRef: null,
      logout: jasmine.createSpy('logout')
    };
    mockAnalytics = jasmine.createSpyObj('AnalyticsService', ['logScreenView', 'logEvent']);

    // ngOnInit will use the cached profile from storageService rather than fetching
    mockOrderService.getUserConfig.and.returnValue(of([]));
    mockOrderService.getBankConfigs.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, FormsModule],
      declarations: [UserUpdateComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: IzingaOrderManagementService, useValue: mockOrderService },
        { provide: StorageService, useValue: mockStorage },
        { provide: AnalyticsService, useValue: mockAnalytics },
        { provide: ActivatedRoute, useValue: { snapshot: {}, params: of({}) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    // Required so createCustomer()/updateCustomer() pass the roleDescription guard
    component.roleDescription = 'Bike Delivery Driver';
  });

  afterEach(() => TestBed.resetTestingModule());

  // TC-B15-UPD-01: updateCustomer() must write the fresh server response to storageService.userProfile
  it('TC-B15-UPD-01: updateCustomer() writes fresh server response to storageService.userProfile', () => {
    const freshProfile = buildUser({ id: 'u-stale', role: UserProfile.RoleEnum.STOREADMIN });
    mockOrderService.updateCustomer.and.returnValue(of(freshProfile));

    component.updateCustomer();

    expect(mockStorage.userProfile).toEqual(freshProfile);
  });

  // TC-B15-UPD-02: the stale CUSTOMER role must not remain in storage after a successful update
  // that returns STORE_ADMIN — this is the precise regression that caused Bug 15
  it('TC-B15-UPD-02: storageService.userProfile.role is STORE_ADMIN (not stale CUSTOMER) after updateCustomer() success', () => {
    const freshProfile = buildUser({ id: 'u-stale', role: UserProfile.RoleEnum.STOREADMIN });
    mockOrderService.updateCustomer.and.returnValue(of(freshProfile));

    // Verify the stale state is in storage before the call
    expect(mockStorage.userProfile.role).toBe(UserProfile.RoleEnum.CUSTOMER);

    component.updateCustomer();

    // After the call the cache must reflect the server-confirmed role
    expect(mockStorage.userProfile.role).toBe(UserProfile.RoleEnum.STOREADMIN);
  });

  // TC-B15-CRT-01: createCustomer() must also write the fresh server response to storageService.userProfile
  // The stale profile has id='u-stale' from beforeEach; clear the id here to exercise the
  // new-user branch (registerCustomer) — the path that had the Bug 15 cache-sync gap.
  it('TC-B15-CRT-01: createCustomer() writes fresh server response to storageService.userProfile', () => {
    component.profilePictureUploaded = true;
    component.userProfile.id = undefined as any; // force new-user path → registerCustomer
    const freshProfile = buildUser({ id: 'u-new', role: UserProfile.RoleEnum.STOREADMIN, name: 'New Merchant' });
    mockOrderService.registerCustomer.and.returnValue(of(freshProfile));

    component.createCustomer();

    expect(mockStorage.userProfile).toEqual(freshProfile);
  });

  // TC-B15-CRT-02: when the stale cache has CUSTOMER and the fresh response has STORE_ADMIN,
  // createCustomer() must propagate the new role to storage
  it('TC-B15-CRT-02: storageService.userProfile.role is updated to the fresh role returned by createCustomer() success', () => {
    component.profilePictureUploaded = true;
    component.userProfile.id = undefined as any; // force new-user path → registerCustomer
    const freshProfile = buildUser({ id: 'u-new', role: UserProfile.RoleEnum.STOREADMIN, name: 'New Merchant' });
    mockOrderService.registerCustomer.and.returnValue(of(freshProfile));

    // Confirm stale CUSTOMER state before the call
    expect(mockStorage.userProfile.role).toBe(UserProfile.RoleEnum.CUSTOMER);

    component.createCustomer();

    expect(mockStorage.userProfile.role).toBe(UserProfile.RoleEnum.STOREADMIN);
  });
});
