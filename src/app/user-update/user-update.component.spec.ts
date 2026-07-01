import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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
    const fakeEvent = { target: { files: [fakeFile] } };
    component.onProfilePictureSelect(fakeEvent);
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
    const fakeEvent = { target: { files: [fakeFile] } };
    component.onProfilePictureSelect(fakeEvent);
    tick();

    expect(component.profilePictureUploaded).toBeFalse();
  }));

  // TC-09: file too large — no upload attempted
  it('TC-09: rejects file larger than 5MB without calling uploadFile', () => {
    spyOn(window, 'alert');
    const largeFile = new File([new ArrayBuffer(6 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' });
    const fakeEvent = { target: { files: [largeFile] } };
    component.onProfilePictureSelect(fakeEvent);

    expect(mockOrderService.uploadFile).not.toHaveBeenCalled();
  });

  // TC-10: non-image file — no upload attempted
  it('TC-10: rejects non-image files without calling uploadFile', () => {
    spyOn(window, 'alert');
    const pdfFile = new File(['data'], 'document.pdf', { type: 'application/pdf' });
    const fakeEvent = { target: { files: [pdfFile] } };
    component.onProfilePictureSelect(fakeEvent);

    expect(mockOrderService.uploadFile).not.toHaveBeenCalled();
  });
});
