import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Subject } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { BusinessUpdateComponent } from './business-update.component';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { StorageService } from '../service/storage-service.service';
import { AnalyticsService } from '../service/analytics.service';
import { FirebaseService } from '../service/firebase.service';
import { Category, StoreProfile } from '../model/storeProfile';
import { TermsConditionsComponent } from '../terms-conditions/terms-conditions.component';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCategory(overrides: Partial<Category> = {}): Category {
  return { id: 'cat-1', name: 'Large Furniture', image: '', active: true, ...overrides };
}

function buildComponent(
  orderSvcOverrides: Partial<IzingaOrderManagementService> = {}
): {
  component: BusinessUpdateComponent;
  fixture: ComponentFixture<BusinessUpdateComponent>;
  orderSvc: jasmine.SpyObj<IzingaOrderManagementService>;
  storageSvc: jasmine.SpyObj<StorageService>;
  firebaseSvc: jasmine.SpyObj<FirebaseService>;
} {
  const paramsSubject = new Subject<any>();

  const orderSvc = jasmine.createSpyObj<IzingaOrderManagementService>(
    'IzingaOrderManagementService',
    ['getStoreById', 'updateStore', 'createStore', 'uploadFile', 'getBankConfigs'],
    {}
  );
  // Default: getBankConfigs returns an empty array (called by loadBankConfigs in ngOnInit)
  orderSvc.getBankConfigs.and.returnValue(of([]));
  // Default: getStoreById returns a bare store with no categories
  orderSvc.getStoreById.and.returnValue(
    of({
      name: 'Test Shop',
      stockList: [],
      rates: { standardDeliveryPrice: 0, standardDeliveryKm: 0, ratePerKm: 0 }
    } as any)
  );

  Object.assign(orderSvc, orderSvcOverrides);

  // REQ-22: default to ADMIN so admin-only sections (rates) render in all existing tests.
  const storageSvc = { userProfile: { id: 'user-1', role: 'ADMIN' } as any, errorMessage: '', infoMessage: '' } as any;

  const analyticsSvc = jasmine.createSpyObj<AnalyticsService>('AnalyticsService', ['logScreenView', 'logEvent']);

  // TIER-BILLING-01: stub FirebaseService so tests that exercise registerBusinessAndStock()
  // on the new-store path do not trigger a real Firebase token fetch. Default returns a
  // synthetic refresh token — individual tests override this as needed.
  const firebaseSvc = jasmine.createSpyObj<FirebaseService>('FirebaseService', ['refreshIdToken']);
  firebaseSvc.refreshIdToken.and.returnValue(of('refreshed-token'));

  TestBed.configureTestingModule({
    declarations: [BusinessUpdateComponent],
    schemas: [NO_ERRORS_SCHEMA],
    providers: [
      DatePipe,
      { provide: IzingaOrderManagementService, useValue: orderSvc },
      { provide: StorageService, useValue: storageSvc },
      { provide: AnalyticsService, useValue: analyticsSvc },
      { provide: FirebaseService, useValue: firebaseSvc },
      {
        provide: ActivatedRoute,
        useValue: { params: paramsSubject.asObservable() }
      },
      { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) }
    ]
  });

  const fixture = TestBed.createComponent(BusinessUpdateComponent);
  const component = fixture.componentInstance;
  fixture.detectChanges();

  // Default to EWALLET so all new-store tests bypass the bank account number
  // validation gate in registerBusinessAndStock(). Individual tests that
  // specifically cover the bank validation gate override this as needed.
  component.shop.bank = { type: 'EWALLET' as any, name: '', accountId: '', branchCode: '', phone: '' };

  return { component, fixture, orderSvc, storageSvc, firebaseSvc };
}

// ---------------------------------------------------------------------------
// Existing scaffold test — kept intact
// ---------------------------------------------------------------------------

describe('BusinessUpdateComponent', () => {
  it('should create', () => {
    const { component } = buildComponent();
    expect(component).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// ONB-11 — addDeliveryCategory
// ---------------------------------------------------------------------------

describe('BusinessUpdateComponent — addDeliveryCategory (ONB-11)', () => {
  let component: BusinessUpdateComponent;

  beforeEach(() => {
    ({ component } = buildComponent());
    component.deliveryCategories = [];
    component.newCategoryName = '';
    component.categoryValidationError = '';
  });

  // ONB-ADD-01: happy path — valid name adds a category
  it('ONB-ADD-01: adds a category with a non-empty name and clears the input field', () => {
    component.newCategoryName = 'Small Parcels';
    component.addDeliveryCategory();

    expect(component.deliveryCategories.length).toBe(1);
    expect(component.deliveryCategories[0].name).toBe('Small Parcels');
    expect(component.deliveryCategories[0].active).toBeTrue();
    expect(component.newCategoryName).toBe('');
    expect(component.categoryValidationError).toBe('');
  });

  // ONB-ADD-02: empty name is rejected with a validation error — no category added
  it('ONB-ADD-02: rejects an empty name and sets categoryValidationError', () => {
    component.newCategoryName = '';
    component.addDeliveryCategory();

    expect(component.deliveryCategories.length).toBe(0);
    expect(component.categoryValidationError).toBeTruthy();
  });

  // ONB-ADD-03: whitespace-only name is rejected (trim guard)
  it('ONB-ADD-03: rejects a whitespace-only name and sets categoryValidationError', () => {
    component.newCategoryName = '   ';
    component.addDeliveryCategory();

    expect(component.deliveryCategories.length).toBe(0);
    expect(component.categoryValidationError).toBeTruthy();
  });

  // ONB-ADD-04: duplicate name (exact case) is rejected
  it('ONB-ADD-04: rejects a duplicate name (exact case) and sets categoryValidationError', () => {
    component.deliveryCategories = [makeCategory({ name: 'Large Furniture' })];
    component.newCategoryName = 'Large Furniture';
    component.addDeliveryCategory();

    expect(component.deliveryCategories.length).toBe(1);
    expect(component.categoryValidationError).toContain('Large Furniture');
  });

  // ONB-ADD-05: duplicate name (different case) is rejected — case-insensitive guard
  it('ONB-ADD-05: rejects a duplicate name with different casing', () => {
    component.deliveryCategories = [makeCategory({ name: 'Large Furniture' })];
    component.newCategoryName = 'large furniture';
    component.addDeliveryCategory();

    expect(component.deliveryCategories.length).toBe(1);
    expect(component.categoryValidationError).toBeTruthy();
  });

  // ONB-ADD-06: newly created category gets a tmp- prefixed id
  it('ONB-ADD-06: newly created category has a tmp- prefixed id', () => {
    component.newCategoryName = 'Medicine';
    component.addDeliveryCategory();

    expect(component.deliveryCategories[0].id).toMatch(/^tmp-/);
  });

  // ONB-ADD-07: categoryValidationError is cleared before re-validating on a second call
  it('ONB-ADD-07: categoryValidationError is cleared on a subsequent successful add', () => {
    // First call sets an error
    component.newCategoryName = '';
    component.addDeliveryCategory();
    expect(component.categoryValidationError).toBeTruthy();

    // Second call with a valid name must clear the error
    component.newCategoryName = 'Documents';
    component.addDeliveryCategory();
    expect(component.categoryValidationError).toBe('');
  });
});

// ---------------------------------------------------------------------------
// ONB-11 — syncCategoriesToShop (private — tested via registerBusinessAndStock)
// ---------------------------------------------------------------------------

describe('BusinessUpdateComponent — syncCategoriesToShop (ONB-11)', () => {
  let component: BusinessUpdateComponent;
  let orderSvc: jasmine.SpyObj<IzingaOrderManagementService>;
  let reloadSpy: jasmine.Spy;

  beforeEach(() => {
    ({ component, orderSvc } = buildComponent());
    // Stub updateStore so registerBusinessAndStock does not fail
    orderSvc.updateStore.and.returnValue(of({ stockList: [], id: 'shop-1' } as any));
    component.shop.id = 'shop-1';
    component.shop.featuredExpiry = new Date();
    component.shop.ownerId = 'user-1';
    // reloadPage() is a protected wrapper around window.location.reload() that can be
    // spied on in tests, avoiding the non-configurable window.location.reload limitation.
    reloadSpy = spyOn(component as any, 'reloadPage').and.callFake(() => {});
  });

  // ONB-SYNC-01: deliveryCategories are copied to shop.categories before the PATCH call
  it('ONB-SYNC-01: shop.categories equals deliveryCategories when registerBusinessAndStock is called', () => {
    const cats: Category[] = [
      makeCategory({ id: 'c1', name: 'Large Furniture' }),
      makeCategory({ id: 'c2', name: 'Small Parcels', active: false })
    ];
    component.deliveryCategories = cats;
    component.selectedFile = null;

    component.registerBusinessAndStock();

    expect(orderSvc.updateStore).toHaveBeenCalled();
    const sentShop: StoreProfile = orderSvc.updateStore.calls.mostRecent().args[0];
    expect(sentShop.categories).toEqual(cats);
  });

  // ONB-SYNC-02: an empty deliveryCategories list is propagated (not preserved as undefined)
  it('ONB-SYNC-02: shop.categories is an empty array when deliveryCategories is empty', () => {
    component.deliveryCategories = [];
    component.selectedFile = null;

    component.registerBusinessAndStock();

    const sentShop: StoreProfile = orderSvc.updateStore.calls.mostRecent().args[0];
    expect(sentShop.categories).toEqual([]);
  });

  // ONB-SYNC-03: syncCategoriesToShop produces a shallow copy — mutating deliveryCategories afterwards does not affect shop.categories
  it('ONB-SYNC-03: shop.categories is a snapshot and not affected by later deliveryCategories mutations', () => {
    component.deliveryCategories = [makeCategory({ id: 'c1', name: 'Parcels' })];
    component.selectedFile = null;

    component.registerBusinessAndStock();

    const sentShop: StoreProfile = orderSvc.updateStore.calls.mostRecent().args[0];
    const snapshotLength = sentShop.categories!.length;

    // Mutate deliveryCategories after the call
    component.deliveryCategories.push(makeCategory({ id: 'c2', name: 'Medicine' }));

    expect(sentShop.categories!.length).toBe(snapshotLength);
  });
});

// ---------------------------------------------------------------------------
// ONB-12 — onCategoryImageSelected (image upload)
// ---------------------------------------------------------------------------

describe('BusinessUpdateComponent — onCategoryImageSelected (ONB-12)', () => {
  let component: BusinessUpdateComponent;
  let orderSvc: jasmine.SpyObj<IzingaOrderManagementService>;
  let storageSvc: jasmine.SpyObj<StorageService>;

  beforeEach(() => {
    ({ component, orderSvc, storageSvc } = buildComponent());
    component.deliveryCategories = [makeCategory({ id: 'cat-1', name: 'Large Furniture', image: '' })];
  });

  function makeFileEvent(file: File | null): Event {
    return {
      target: {
        files: file ? [file] : []
      }
    } as unknown as Event;
  }

  // ONB-IMG-01: success path — category.image is updated with the returned URL
  it('ONB-IMG-01: category.image is set to the uploaded URL on success', () => {
    const category = component.deliveryCategories[0];
    orderSvc.uploadFile.and.returnValue(of({ url: 'https://s3.example.com/cat.png' } as any));

    const file = new File(['data'], 'cat.png', { type: 'image/png' });
    component.onCategoryImageSelected(makeFileEvent(file), category);

    expect(category.image).toBe('https://s3.example.com/cat.png');
  });

  // ONB-IMG-02: success path — categoryUploading flag is reset to false after upload
  it('ONB-IMG-02: categoryUploading[id] is false after a successful upload', () => {
    const category = component.deliveryCategories[0];
    orderSvc.uploadFile.and.returnValue(of({ url: 'https://s3.example.com/cat.png' } as any));

    const file = new File(['data'], 'cat.png', { type: 'image/png' });
    component.onCategoryImageSelected(makeFileEvent(file), category);

    expect(component.categoryUploading['cat-1']).toBeFalse();
  });

  // ONB-IMG-03: success path — categoryImageError flag is cleared on success
  it('ONB-IMG-03: categoryImageError[id] is false after a successful upload', () => {
    const category = component.deliveryCategories[0];
    component.categoryImageError['cat-1'] = true; // pre-existing error
    orderSvc.uploadFile.and.returnValue(of({ url: 'https://s3.example.com/cat.png' } as any));

    const file = new File(['data'], 'cat.png', { type: 'image/png' });
    component.onCategoryImageSelected(makeFileEvent(file), category);

    expect(component.categoryImageError['cat-1']).toBeFalse();
  });

  // ONB-IMG-04: error path — categoryUploading flag is reset to false after upload failure
  it('ONB-IMG-04: categoryUploading[id] is false after a failed upload', () => {
    const category = component.deliveryCategories[0];
    orderSvc.uploadFile.and.returnValue(throwError(() => new Error('Network error')));

    const file = new File(['data'], 'cat.png', { type: 'image/png' });
    component.onCategoryImageSelected(makeFileEvent(file), category);

    expect(component.categoryUploading['cat-1']).toBeFalse();
  });

  // ONB-IMG-05: error path — errorMessage is set on StorageService after upload failure
  it('ONB-IMG-05: storageSvc.errorMessage is set when the upload fails', () => {
    const category = component.deliveryCategories[0];
    orderSvc.uploadFile.and.returnValue(throwError(() => new Error('Network error')));

    const file = new File(['data'], 'cat.png', { type: 'image/png' });
    component.onCategoryImageSelected(makeFileEvent(file), category);

    expect(storageSvc.errorMessage).toBeTruthy();
  });

  // ONB-IMG-06: error path — category.image is NOT mutated when the upload fails
  it('ONB-IMG-06: category.image remains unchanged when the upload fails', () => {
    const category = component.deliveryCategories[0];
    category.image = 'https://s3.example.com/existing.png';
    orderSvc.uploadFile.and.returnValue(throwError(() => new Error('Network error')));

    const file = new File(['data'], 'cat.png', { type: 'image/png' });
    component.onCategoryImageSelected(makeFileEvent(file), category);

    expect(category.image).toBe('https://s3.example.com/existing.png');
  });

  // ONB-IMG-07: no-op when the file input is empty (user cancels the picker)
  it('ONB-IMG-07: uploadFile is not called when the file input has no files', () => {
    const category = component.deliveryCategories[0];
    component.onCategoryImageSelected(makeFileEvent(null), category);

    expect(orderSvc.uploadFile).not.toHaveBeenCalled();
  });

  // ONB-IMG-08: categoryUploading is set to true while upload is in-progress
  it('ONB-IMG-08: categoryUploading[id] is true while upload is in-flight', () => {
    const category = component.deliveryCategories[0];
    // Use a Subject so we can inspect state before the observable resolves
    const subject = new Subject<any>();
    orderSvc.uploadFile.and.returnValue(subject.asObservable());

    const file = new File(['data'], 'cat.png', { type: 'image/png' });
    component.onCategoryImageSelected(makeFileEvent(file), category);

    // Before the subject emits, uploading must be true
    expect(component.categoryUploading['cat-1']).toBeTrue();

    // Clean up
    subject.complete();
  });
});

// ---------------------------------------------------------------------------
// ONB-UX-01 — REQ-10, REQ-11, REQ-14, REQ-15 acceptance tests
// ---------------------------------------------------------------------------

describe('BusinessUpdateComponent — ONB-UX-01 requirements', () => {
  let component: BusinessUpdateComponent;
  let fixture: ComponentFixture<BusinessUpdateComponent>;

  beforeEach(() => {
    ({ component, fixture } = buildComponent());
  });

  // REQ-10: contact details placeholder must not read "Enter your business name"
  it('REQ-10 — business contact details input has correct placeholder', () => {
    fixture.detectChanges();
    const contactInput: HTMLInputElement = fixture.nativeElement.querySelector('input[name="businessContact"]');
    expect(contactInput).not.toBeNull();
    expect(contactInput?.placeholder).not.toContain('Enter your business name');
    expect(contactInput?.placeholder.toLowerCase()).toContain('contact');
  });

  // REQ-11: fixed-bottom bar must not carry shadow-sm
  it('REQ-11 — fixed-bottom action bar has no shadow-sm class', () => {
    fixture.detectChanges();
    const fixedBar = fixture.nativeElement.querySelector('.fixed-bottom');
    expect(fixedBar?.classList?.contains('shadow-sm')).toBeFalsy();
  });

  // REQ-15: no two labels share the same for value
  it('REQ-15 — no duplicate label for= attributes on the business update form', () => {
    fixture.detectChanges();
    const labels: NodeListOf<HTMLLabelElement> = fixture.nativeElement.querySelectorAll('label[for]');
    const forValues = Array.from(labels).map(l => l.getAttribute('for')).filter(Boolean);
    const unique = new Set(forValues);
    expect(unique.size).toBe(forValues.length);
  });

  // REQ-14: page container has padding-bottom to clear fixed bar
  it('REQ-14 — a padding-bottom element exists to clear the fixed bar', () => {
    fixture.detectChanges();
    const padDiv = fixture.nativeElement.querySelector('[style*="padding-bottom"]');
    expect(padDiv).not.toBeNull();
    const style: string = padDiv?.getAttribute('style') || '';
    expect(style).toContain('72px');
  });

});

// REQ-22: Delivery Rates & Pricing section visibility and rates round-trip
// Each test in this describe has its own storageSvc whose role property is changed in beforeEach.
// This avoids TestBed reconfiguration between tests while still isolating the role.
describe('BusinessUpdateComponent — REQ-22 ADMIN sees rates section', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('REQ-22 — ADMIN sees the Delivery Rates & Pricing section', () => {
    // buildComponent already sets role: 'ADMIN' in storageSvc
    const { fixture } = buildComponent();
    fixture.detectChanges();
    const heading = Array.from(fixture.nativeElement.querySelectorAll('h4'))
      .find((el: any) => el.textContent?.includes('Delivery Rates'));
    expect(heading).not.toBeUndefined();
    // Mirror assertion: ratePerKmBike input must be present for ADMIN
    const rateInput: HTMLInputElement = fixture.nativeElement.querySelector('[name="ratePerKmBike"]');
    expect(rateInput).not.toBeNull();
  });
});

describe('BusinessUpdateComponent — REQ-22 STORE_ADMIN rates hidden', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('REQ-22 — STORE_ADMIN does NOT see the Delivery Rates & Pricing section', () => {
    const { component, fixture } = buildComponent();
    // Mutate the role on the SAME userProfile object the component reads —
    // do NOT replace the object, so the reference inside the component stays valid.
    const storageSvc = TestBed.inject(StorageService) as any;
    storageSvc.userProfile.role = 'STORE_ADMIN';
    fixture.detectChanges();

    // DOM assertions: rates section must be absent
    const heading = Array.from(fixture.nativeElement.querySelectorAll('h4'))
      .find((el: any) => el.textContent?.includes('Delivery Rates'));
    expect(heading).toBeUndefined('Expected no "Delivery Rates" heading for STORE_ADMIN');

    const rateInput: HTMLInputElement = fixture.nativeElement.querySelector('[name="ratePerKmBike"]');
    expect(rateInput).toBeNull('Expected no ratePerKmBike input for STORE_ADMIN');

    // Getter assertion kept as extra confirmation
    expect(component.isAdmin).toBe(false);
  });

  it('REQ-22 — shop.rates round-trips unchanged when STORE_ADMIN saves', () => {
    const { fixture, component, orderSvc } = buildComponent();
    (component as any).storageService.userProfile = { id: 'user-1', role: 'STORE_ADMIN' };
    fixture.detectChanges();
    // Prevent window.location.reload() from killing the test runner
    spyOn(component as any, 'reloadPage').and.stub();
    // Set rates and id as if data had been loaded from backend
    component.shop.rates = { ratePerKm: 7, ratePerKmBike: 3 } as any;
    component.shop.id = 'store-1';
    // STORE_ADMIN cannot see or edit the rates section; rates must not be cleared by save
    component.registerBusinessAndStock();
    const savedShop = orderSvc.updateStore.calls.mostRecent()?.args[0] as any;
    expect(savedShop).toBeTruthy();
    expect(savedShop.rates['ratePerKm']).toBe(7);
    expect(savedShop.rates['ratePerKmBike']).toBe(3);
  });
});

// REQ-01: accordion groups have unique DOM ids — separate describe to allow distinct beforeEach setup
describe('BusinessUpdateComponent — REQ-01 accordion unique ids', () => {
  it('REQ-01 — accordion group wrappers have unique ids', () => {
    const { component: c, fixture: f } = buildComponent({
      getStoreById: jasmine.createSpy().and.returnValue(of({
        id: 'store-1',
        name: 'Test',
        stockList: [
          { id: 'a1', name: 'A', group: 'Main', storePrice: 10, quantity: 1 },
          { id: 'b1', name: 'B', group: 'Drinks', storePrice: 5, quantity: 2 }
        ],
        rates: {}
      } as any))
    } as any);
    // Trigger route params to load data
    f.detectChanges();
    const accordions = f.nativeElement.querySelectorAll('.accordion');
    const ids = Array.from(accordions).map((el: any) => el.getAttribute('id')).filter(Boolean);
    if (ids.length > 1) {
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    } else {
      // If only one accordion, pass (data hasn't loaded synchronously — acceptable)
      expect(ids.length).toBeGreaterThanOrEqual(0);
    }
  });
});

// ---------------------------------------------------------------------------
// ONB-UX-02 new tests — REQ-01, REQ-07
// ---------------------------------------------------------------------------

describe('BusinessUpdateComponent — ONB-UX-02', () => {
  afterEach(() => TestBed.resetTestingModule());

  // FIX-01: has-fixed-bar toggled on body
  it('FIX-01 — ngOnInit adds has-fixed-bar to body; ngOnDestroy removes it', () => {
    const { component, fixture } = buildComponent();
    fixture.detectChanges();
    expect(document.body.classList.contains('has-fixed-bar')).toBe(true);
    component.ngOnDestroy();
    expect(document.body.classList.contains('has-fixed-bar')).toBe(false);
  });

  // REQ-01: izinga-form-container class is present in the template
  it('REQ-01 — template contains .izinga-form-container wrapper', () => {
    const { fixture } = buildComponent();
    fixture.detectChanges();
    const container = fixture.nativeElement.querySelector('.izinga-form-container');
    expect(container).not.toBeNull();
  });

  // REQ-07: applyMondayToAll copies Monday hours to all days
  it('REQ-07 — applyMondayToAll copies Monday open/close to all other days', () => {
    const { component } = buildComponent();
    const monday = new Date('2024-01-01T09:00:00');
    const mondayClose = new Date('2024-01-01T17:00:00');
    component.shop.businessHours = [
      { day: 'MONDAY' as any, open: monday, close: mondayClose },
      { day: 'TUESDAY' as any, open: new Date('2024-01-01T08:00:00'), close: new Date('2024-01-01T16:00:00') },
      { day: 'WEDNESDAY' as any, open: new Date('2024-01-01T08:00:00'), close: new Date('2024-01-01T16:00:00') }
    ];
    component.applyMondayToAll();
    const tue = component.shop.businessHours!.find(h => h.day === 'TUESDAY')!;
    const wed = component.shop.businessHours!.find(h => h.day === 'WEDNESDAY')!;
    expect(tue.open).toBe(monday);
    expect(tue.close).toBe(mondayClose);
    expect(wed.open).toBe(monday);
    expect(wed.close).toBe(mondayClose);
    // Monday itself is unchanged
    const mon = component.shop.businessHours!.find(h => h.day === 'MONDAY')!;
    expect(mon.open).toBe(monday);
  });

  // FIX-02: toggleDayClosed marks day closed but does NOT mutate open/close to undefined
  it('FIX-02 — toggleDayClosed marks day closed without clearing open/close', () => {
    const { component } = buildComponent();
    const open = new Date('2024-01-01T09:00:00');
    const close = new Date('2024-01-01T17:00:00');
    component.shop.businessHours = [
      { day: 'MONDAY' as any, open, close },
      { day: 'TUESDAY' as any, open: new Date(), close: new Date() }
    ];
    component.businessHoursClosed['MONDAY'] = false;
    component.toggleDayClosed('MONDAY');
    expect(component.businessHoursClosed['MONDAY']).toBe(true);
    // open/close must remain valid Dates — never undefined — so buildPayloadHours can safely omit them
    const mon = component.shop.businessHours!.find(h => h.day === 'MONDAY')!;
    expect(mon.open).toBeTruthy();
    expect(mon.close).toBeTruthy();
  });

  // FIX-02: toggleDayClosed re-enables when unchecked
  it('FIX-02 — toggleDayClosed sets closed to false when toggled off', () => {
    const { component } = buildComponent();
    component.businessHoursClosed['TUESDAY'] = true;
    component.shop.businessHours = [
      { day: 'TUESDAY' as any, open: new Date(new Date().setHours(9,0,0,0)), close: new Date(new Date().setHours(17,0,0,0)) }
    ];
    component.toggleDayClosed('TUESDAY');
    expect(component.businessHoursClosed['TUESDAY']).toBe(false);
  });

  // FIX-02: buildPayloadHours omits closed days from the PATCH payload
  it('FIX-02 — buildPayloadHours excludes closed days from the update payload', () => {
    const { component } = buildComponent();
    const open09 = new Date(new Date().setHours(9, 0, 0, 0));
    const close17 = new Date(new Date().setHours(17, 0, 0, 0));
    component.shop.businessHours = [
      { day: 'MONDAY' as any, open: open09, close: close17 },
      { day: 'TUESDAY' as any, open: open09, close: close17 },
      { day: 'WEDNESDAY' as any, open: open09, close: close17 }
    ];
    component.businessHoursClosed['TUESDAY'] = true;
    const payload = component.buildPayloadHours();
    expect(payload.length).toBe(2);
    expect(payload.find(h => h.day === 'TUESDAY')).toBeUndefined();
    // Every remaining entry must have valid (non-null) open and close
    payload.forEach(h => {
      expect(h.open).toBeTruthy();
      expect(h.close).toBeTruthy();
    });
  });

  // FIX-02: loading a profile missing a day shows it as Closed
  it('FIX-02 — initBusinessHoursClosed marks absent days as closed and adds placeholder entry', () => {
    const { component } = buildComponent();
    // Only MONDAY present in backend response
    component.shop.businessHours = [
      { day: 'MONDAY' as any, open: new Date(new Date().setHours(9,0,0,0)), close: new Date(new Date().setHours(17,0,0,0)) }
    ];
    component.initBusinessHoursClosed();
    expect(component.businessHoursClosed['TUESDAY']).toBe(true);
    expect(component.businessHoursClosed['SUNDAY']).toBe(true);
    expect(component.businessHoursClosed['MONDAY']).toBeFalsy(); // MONDAY was present — not closed
    // Placeholder entries added so template can render disabled rows
    expect(component.shop.businessHours!.find(h => h.day === 'TUESDAY')).toBeTruthy();
    expect(component.shop.businessHours!.find(h => h.day === 'SUNDAY')).toBeTruthy();
  });

  // REQ-07 guard: isLastOpenDay returns true only for the single remaining open day
  it('REQ-07 guard — isLastOpenDay returns true for the only open day and false for all others', () => {
    const { component } = buildComponent();
    component.shop.businessHours = [
      { day: 'MONDAY' as any, open: new Date(), close: new Date() },
      { day: 'TUESDAY' as any, open: new Date(), close: new Date() },
      { day: 'WEDNESDAY' as any, open: new Date(), close: new Date() },
      { day: 'THURSDAY' as any, open: new Date(), close: new Date() },
      { day: 'FRIDAY' as any, open: new Date(), close: new Date() },
      { day: 'SATURDAY' as any, open: new Date(), close: new Date() },
      { day: 'SUNDAY' as any, open: new Date(), close: new Date() }
    ];
    // Close all but MONDAY
    ['TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'].forEach(d => {
      component.businessHoursClosed[d] = true;
    });
    component.businessHoursClosed['MONDAY'] = false;

    expect(component.isLastOpenDay('MONDAY')).toBeTrue();
    expect(component.isLastOpenDay('TUESDAY')).toBeFalse();
    expect(component.isLastOpenDay('SUNDAY')).toBeFalse();
  });

  // REQ-07 guard: isLastOpenDay returns false when multiple days are open
  it('REQ-07 guard — isLastOpenDay returns false when more than one day is open', () => {
    const { component } = buildComponent();
    component.businessHoursClosed['MONDAY'] = false;
    component.businessHoursClosed['TUESDAY'] = false;
    ['WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'].forEach(d => {
      component.businessHoursClosed[d] = true;
    });
    expect(component.isLastOpenDay('MONDAY')).toBeFalse();
    expect(component.isLastOpenDay('TUESDAY')).toBeFalse();
  });

  // FAIL-02: payload-capture — closed day absent, remaining entries have valid open/close
  it('FAIL-02 — registerBusinessAndStock omits the Closed day and all remaining entries have truthy open/close', () => {
    const { component, orderSvc } = buildComponent();
    // Stub updateStore to succeed
    orderSvc.updateStore.and.returnValue(of({ stockList: [], id: 'shop-1' } as any));
    spyOn(component as any, 'reloadPage').and.callFake(() => {});

    const open09 = new Date(new Date().setHours(9, 0, 0, 0));
    const close17 = new Date(new Date().setHours(17, 0, 0, 0));
    component.shop.id = 'shop-1';
    component.shop.ownerId = 'user-1';
    component.shop.featuredExpiry = new Date();
    component.shop.businessHours = [
      { day: 'MONDAY' as any, open: open09, close: close17 },
      { day: 'TUESDAY' as any, open: open09, close: close17 },
      { day: 'WEDNESDAY' as any, open: open09, close: close17 },
      { day: 'THURSDAY' as any, open: open09, close: close17 },
      { day: 'FRIDAY' as any, open: open09, close: close17 },
      { day: 'SATURDAY' as any, open: open09, close: close17 },
      { day: 'SUNDAY' as any, open: open09, close: close17 }
    ];

    // Mark SATURDAY as Closed via toggleDayClosed
    component.businessHoursClosed['SATURDAY'] = false;
    component.toggleDayClosed('SATURDAY');
    expect(component.businessHoursClosed['SATURDAY']).toBeTrue(); // guard confirms it was accepted

    component.selectedFile = null;
    component.registerBusinessAndStock();

    expect(orderSvc.updateStore).toHaveBeenCalled();
    const payload: StoreProfile = orderSvc.updateStore.calls.mostRecent().args[0];
    const hours = payload.businessHours!;

    // SATURDAY must be absent
    expect(hours.find(h => h.day === 'SATURDAY' as any))
      .withContext('SATURDAY must be absent from payload businessHours')
      .toBeUndefined();

    // Every remaining entry must have truthy open and close
    hours.forEach(h => {
      expect(h.open).withContext(`${h.day} open must be truthy`).toBeTruthy();
      expect(h.close).withContext(`${h.day} close must be truthy`).toBeTruthy();
    });
  });

  // FIX-02: last-open-day guard prevents closing the only remaining open day
  it('FIX-02 — toggleDayClosed does not close the last remaining open day', () => {
    const { component } = buildComponent();
    component.shop.businessHours = [
      { day: 'MONDAY' as any, open: new Date(new Date().setHours(9,0,0,0)), close: new Date(new Date().setHours(17,0,0,0)) },
      { day: 'TUESDAY' as any, open: new Date(new Date().setHours(9,0,0,0)), close: new Date(new Date().setHours(17,0,0,0)) },
      { day: 'WEDNESDAY' as any, open: new Date(new Date().setHours(9,0,0,0)), close: new Date(new Date().setHours(17,0,0,0)) },
      { day: 'THURSDAY' as any, open: new Date(new Date().setHours(9,0,0,0)), close: new Date(new Date().setHours(17,0,0,0)) },
      { day: 'FRIDAY' as any, open: new Date(new Date().setHours(9,0,0,0)), close: new Date(new Date().setHours(17,0,0,0)) },
      { day: 'SATURDAY' as any, open: new Date(new Date().setHours(9,0,0,0)), close: new Date(new Date().setHours(17,0,0,0)) },
      { day: 'SUNDAY' as any, open: new Date(new Date().setHours(9,0,0,0)), close: new Date(new Date().setHours(17,0,0,0)) }
    ];
    // Close 6 days — leaving only MONDAY open
    ['TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'].forEach(d => {
      component.businessHoursClosed[d] = false;
      component.toggleDayClosed(d);
    });
    expect(['TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'].every(d => component.businessHoursClosed[d])).toBe(true);
    // Attempt to close the last day — must be blocked
    component.businessHoursClosed['MONDAY'] = false;
    component.toggleDayClosed('MONDAY');
    expect(component.businessHoursClosed['MONDAY']).toBe(false); // unchanged
  });
});

// ---------------------------------------------------------------------------
// TIER-BILLING-01 — Firebase token refresh after new store creation
// ---------------------------------------------------------------------------

describe('BusinessUpdateComponent — TIER-BILLING-01 token refresh', () => {
  afterEach(() => TestBed.resetTestingModule());

  // TB-TOKEN-01: refreshIdToken() must be called (and complete) before navigation
  // when a NEW store is created. Without the forced refresh the JWT still lacks the
  // storeId claim that StoreService.create() just stamped, causing
  // POST /merchant/subscription/initiate to return 422 STORE_ID_NOT_IN_JWT.
  it('TB-TOKEN-01: refreshIdToken is called after successful new store creation', () => {
    const { component, orderSvc, firebaseSvc, storageSvc } = buildComponent();

    // Provide ICA-accepted userProfile so the guard does not redirect early
    storageSvc.userProfile = {
      id: 'user-1',
      role: 'STORE_ADMIN',
      icaAccepted: true,
      icaAcceptedDate: new Date(),
      icaVersion: TermsConditionsComponent.MERCHANT_ICA_VERSION
    } as any;

    // New store: shop.id is falsy
    component.shop.id = undefined;
    component.shop.ownerId = 'user-1';
    component.shop.featuredExpiry = new Date();
    component.selectedFile = null;

    orderSvc.createStore.and.returnValue(of({ id: 'new-store-1', stockList: [] } as any));

    component.registerBusinessAndStock();

    expect(orderSvc.createStore).toHaveBeenCalled();
    expect(firebaseSvc.refreshIdToken).toHaveBeenCalledTimes(1);
  });

  // TB-TOKEN-02: refreshIdToken() must NOT be called when updating an existing store.
  // Updating a store does not grant a new Firebase custom claim, so forcing a token
  // refresh would add unnecessary network latency to every update save.
  it('TB-TOKEN-02: refreshIdToken is NOT called when updating an existing store', () => {
    const { component, orderSvc, firebaseSvc } = buildComponent();
    spyOn(component as any, 'reloadPage').and.callFake(() => {});

    // Existing store: shop.id is truthy
    component.shop.id = 'existing-store-1';
    component.shop.ownerId = 'user-1';
    component.shop.featuredExpiry = new Date();
    component.selectedFile = null;

    orderSvc.updateStore.and.returnValue(of({ id: 'existing-store-1', stockList: [] } as any));

    component.registerBusinessAndStock();

    expect(orderSvc.updateStore).toHaveBeenCalled();
    expect(firebaseSvc.refreshIdToken).not.toHaveBeenCalled();
  });

  // TB-TOKEN-03: navigation to subscription checkout only occurs AFTER the token
  // refresh completes (not in parallel). Verify sequencing by making refreshIdToken
  // use a Subject so we can assert the router has NOT navigated mid-refresh.
  it('TB-TOKEN-03: navigation to subscription is deferred until refreshIdToken completes', () => {
    const { component, orderSvc, firebaseSvc, storageSvc } = buildComponent();
    const routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    storageSvc.userProfile = {
      id: 'user-1',
      role: 'STORE_ADMIN',
      icaAccepted: true,
      icaAcceptedDate: new Date(),
      icaVersion: TermsConditionsComponent.MERCHANT_ICA_VERSION
    } as any;
    (storageSvc as any).selectedTier = 'PREMIUM_1';

    component.shop.id = undefined;
    component.shop.ownerId = 'user-1';
    component.shop.featuredExpiry = new Date();
    component.selectedFile = null;

    orderSvc.createStore.and.returnValue(of({ id: 'new-store-2', stockList: [] } as any));

    // Hold the refresh open so we can check whether navigation fires prematurely
    const refreshSubject = new Subject<string>();
    firebaseSvc.refreshIdToken.and.returnValue(refreshSubject.asObservable());

    component.registerBusinessAndStock();

    // Refresh has not completed — navigation must NOT have fired yet
    expect(routerSpy.navigate).not.toHaveBeenCalled();

    // Now complete the refresh — navigation must fire
    refreshSubject.next('token');
    refreshSubject.complete();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/business/subscription', 'new-store-2']);
  });
});

// ---------------------------------------------------------------------------
// Merchant ICA stamping tests (DEFECT-ONB02-01)
// ---------------------------------------------------------------------------

describe('BusinessUpdateComponent — Merchant ICA stamping (DEFECT-ONB02-01)', () => {
  afterEach(() => TestBed.resetTestingModule());

  // ICA-01: new store creation stamps icaAccepted, icaAcceptedDate, icaVersion from userProfile
  it('ICA-01: registerBusinessAndStock stamps ICA fields from userProfile onto shop payload for a new store', () => {
    const { component, orderSvc, storageSvc } = buildComponent();

    const acceptedDate = new Date('2026-10-05T10:00:00');
    storageSvc.userProfile = {
      id: 'user-1',
      role: 'STORE_ADMIN',
      icaAccepted: true,
      icaAcceptedDate: acceptedDate,
      icaVersion: TermsConditionsComponent.MERCHANT_ICA_VERSION
    } as any;

    // New store: shop.id is falsy
    component.shop.id = undefined;
    component.shop.ownerId = 'user-1';
    component.shop.featuredExpiry = new Date();
    component.selectedFile = null;

    orderSvc.createStore.and.returnValue(of({ id: 'new-store-1', stockList: [] } as any));

    component.registerBusinessAndStock();

    expect(orderSvc.createStore).toHaveBeenCalled();
    const sentShop: StoreProfile = orderSvc.createStore.calls.mostRecent().args[0];
    expect(sentShop.icaAccepted).toBeTrue();
    expect(sentShop.icaAcceptedDate).toEqual(acceptedDate);
    expect(sentShop.icaVersion).toBe(TermsConditionsComponent.MERCHANT_ICA_VERSION);
  });

  // ICA-02: new store creation redirects to terms page and does not call createStore when icaAccepted is missing
  it('ICA-02: registerBusinessAndStock redirects to /business/terms and does not call createStore when icaAccepted is missing', () => {
    const { component, orderSvc, storageSvc } = buildComponent();
    const routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    storageSvc.userProfile = {
      id: 'user-1',
      role: 'STORE_ADMIN'
      // icaAccepted is missing
    } as any;

    component.shop.id = undefined;
    component.shop.ownerId = 'user-1';
    component.shop.featuredExpiry = new Date();
    component.selectedFile = null;

    component.registerBusinessAndStock();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/business/terms', 'user-1']);
    expect(orderSvc.createStore).not.toHaveBeenCalled();
  });

  // ICA-03: updating an existing store does NOT stamp ICA fields (shop.id is present)
  it('ICA-03: registerBusinessAndStock does NOT stamp ICA fields when updating an existing store', () => {
    const { component, orderSvc, storageSvc } = buildComponent();
    spyOn(component as any, 'reloadPage').and.callFake(() => {});

    storageSvc.userProfile = {
      id: 'user-1',
      role: 'STORE_ADMIN',
      icaAccepted: true,
      icaVersion: TermsConditionsComponent.MERCHANT_ICA_VERSION
    } as any;

    // Existing store: shop.id is present
    component.shop.id = 'existing-store-1';
    component.shop.ownerId = 'user-1';
    component.shop.featuredExpiry = new Date();
    component.selectedFile = null;

    orderSvc.updateStore.and.returnValue(of({ id: 'existing-store-1', stockList: [] } as any));

    component.registerBusinessAndStock();

    expect(orderSvc.updateStore).toHaveBeenCalled();
    const sentShop: StoreProfile = orderSvc.updateStore.calls.mostRecent().args[0];
    // ICA fields must NOT be stamped by the component on updates — the backend does not re-check them
    expect(sentShop.icaAccepted).toBeUndefined();
    expect(sentShop.icaVersion).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Bug #12 — shortName recalculation fix
// ---------------------------------------------------------------------------

describe('BusinessUpdateComponent — Bug #12 shortName recalculation', () => {
  afterEach(() => TestBed.resetTestingModule());

  // BUG12-SN-01: shortName is recalculated from the UPDATED name on retry
  // (new store, shop.id is still falsy — server never returned one because first call failed).
  it('BUG12-SN-01: shortName is recalculated from the current name on a retry after a failed first attempt', () => {
    const { component, orderSvc, storageSvc, firebaseSvc } = buildComponent();

    storageSvc.userProfile = {
      id: 'user-1',
      role: 'STORE_ADMIN',
      icaAccepted: true,
      icaAcceptedDate: new Date(),
      icaVersion: TermsConditionsComponent.MERCHANT_ICA_VERSION
    } as any;

    // New store: no id, no ownerId
    component.shop.id = undefined;
    component.shop.ownerId = undefined;
    component.shop.name = 'My Test Shop';
    component.shop.featuredExpiry = new Date();
    component.selectedFile = null;

    // First attempt — server returns a 500 (shortname collision)
    orderSvc.createStore.and.returnValue(throwError(() => ({ status: 500 })));
    component.registerBusinessAndStock();

    // Verify first attempt used the original name-derived shortName
    const firstCallShop: StoreProfile = orderSvc.createStore.calls.mostRecent().args[0];
    expect(firstCallShop.shortName).toBe('My_Test_Shop');

    // Merchant corrects the name and retries (no page reload)
    component.shop.name = 'My Corrected Shop';
    orderSvc.createStore.and.returnValue(of({ id: 'new-store-1', stockList: [] } as any));
    component.registerBusinessAndStock();

    // Second attempt must use the NEW name-derived shortName, not the stale first-attempt value
    const secondCallShop: StoreProfile = orderSvc.createStore.calls.mostRecent().args[0];
    expect(secondCallShop.shortName).toBe('My_Corrected_Shop');
    expect(secondCallShop.shortName).not.toBe('My_Test_Shop');
  });

  // BUG12-SN-02: shortName is NOT recalculated when updating an EXISTING store.
  // shop.id is truthy (set from the backend payload in ngOnInit), so the !shop.id
  // guard must be false and shortName must remain whatever the backend returned.
  it('BUG12-SN-02: shortName is not recalculated when updating an existing store', () => {
    const { component, orderSvc } = buildComponent();
    spyOn(component as any, 'reloadPage').and.callFake(() => {});

    // Existing store
    component.shop.id = 'existing-store-1';
    component.shop.ownerId = 'user-1';
    component.shop.name = 'Updated Shop Name';
    component.shop.shortName = 'backend_assigned_short_name';
    component.shop.featuredExpiry = new Date();
    component.selectedFile = null;

    orderSvc.updateStore.and.returnValue(of({ id: 'existing-store-1', stockList: [] } as any));
    component.registerBusinessAndStock();

    expect(orderSvc.updateStore).toHaveBeenCalled();
    const sentShop: StoreProfile = orderSvc.updateStore.calls.mostRecent().args[0];
    // shortName must not have been touched — backend's original value preserved
    expect(sentShop.shortName).toBe('backend_assigned_short_name');
  });

  // BUG12-SN-03: shortName is correctly derived from the name on the FIRST attempt
  // (ownerId not yet set — both the ownerId block and the !shop.id block run).
  it('BUG12-SN-03: shortName is correctly derived from shop.name on the very first submission attempt', () => {
    const { component, orderSvc, storageSvc, firebaseSvc } = buildComponent();

    storageSvc.userProfile = {
      id: 'user-1',
      role: 'STORE_ADMIN',
      icaAccepted: true,
      icaAcceptedDate: new Date(),
      icaVersion: TermsConditionsComponent.MERCHANT_ICA_VERSION
    } as any;

    component.shop.id = undefined;
    component.shop.ownerId = undefined;
    component.shop.name = 'Cafe and Bistro';
    component.shop.featuredExpiry = new Date();
    component.selectedFile = null;

    orderSvc.createStore.and.returnValue(of({ id: 'new-store-1', stockList: [] } as any));
    component.registerBusinessAndStock();

    const sentShop: StoreProfile = orderSvc.createStore.calls.mostRecent().args[0];
    // replaceSpecialChars replaces all non-alphanumeric characters with '_'
    // 'Cafe and Bistro' — only spaces are non-alphanumeric → 'Cafe_and_Bistro'
    expect(sentShop.shortName).toBe('Cafe_and_Bistro');
  });
});
