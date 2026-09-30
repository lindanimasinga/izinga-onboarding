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
    bank: { type: 'EWALLET', name: 'FNB', accountId: '', branchCode: '250655' },
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

  it('non-shop flow: all account types are offered and nothing is pre-selected', async () => {
    await setup('driver');

    expect(component.isShopFlow()).toBeFalse();
    expect(component.userConfig.length).toBe(3);
    expect(component.roleDescription).toBeUndefined();
    expect(fixture.nativeElement.innerHTML).toContain('Tell us about your hustle');
  });
});
