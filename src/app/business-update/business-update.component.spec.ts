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
import { Category, StoreProfile } from '../model/storeProfile';

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
} {
  const paramsSubject = new Subject<any>();

  const orderSvc = jasmine.createSpyObj<IzingaOrderManagementService>(
    'IzingaOrderManagementService',
    ['getStoreById', 'updateStore', 'createStore', 'uploadFile'],
    {}
  );
  // Default: getStoreById returns a bare store with no categories
  orderSvc.getStoreById.and.returnValue(
    of({
      name: 'Test Shop',
      stockList: [],
      rates: { standardDeliveryPrice: 0, standardDeliveryKm: 0, ratePerKm: 0 }
    } as any)
  );

  Object.assign(orderSvc, orderSvcOverrides);

  const storageSvc = { userProfile: { id: 'user-1' } as any, errorMessage: '', infoMessage: '' } as any;

  const analyticsSvc = jasmine.createSpyObj<AnalyticsService>('AnalyticsService', ['logScreenView', 'logEvent']);

  TestBed.configureTestingModule({
    declarations: [BusinessUpdateComponent],
    schemas: [NO_ERRORS_SCHEMA],
    providers: [
      DatePipe,
      { provide: IzingaOrderManagementService, useValue: orderSvc },
      { provide: StorageService, useValue: storageSvc },
      { provide: AnalyticsService, useValue: analyticsSvc },
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

  return { component, fixture, orderSvc, storageSvc };
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
