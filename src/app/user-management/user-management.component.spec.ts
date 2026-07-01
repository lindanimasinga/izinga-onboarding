import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';

import { UserManagementComponent } from './user-management.component';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { StorageService } from '../service/storage-service.service';
import { AnalyticsService } from '../service/analytics.service';
import { UserProfile } from '../model/userProfile';

function buildUser(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'user-1',
    imageUrl: 'https://cdn.example.com/photo.jpg',
    role: UserProfile.RoleEnum.MESSENGER,
    bank: { type: 'EWALLET', name: 'FNB', accountId: '+27820000000', branchCode: '250655' },
    tag: {},
    mobileNumber: '+27820000000',
    name: 'Test Driver',
    ...overrides
  };
}

describe('UserManagementComponent — resetMissingDocumentsReminder', () => {
  let component: UserManagementComponent;
  let fixture: ComponentFixture<UserManagementComponent>;
  let mockOrderService: jasmine.SpyObj<IzingaOrderManagementService>;
  let mockAnalytics: jasmine.SpyObj<AnalyticsService>;

  beforeEach(async () => {
    mockOrderService = jasmine.createSpyObj('IzingaOrderManagementService', [
      'updateCustomer',
      'getUserConfig',
      'getBankConfigs',
      'getCustomerByPhoneNumber',
      'registerCustomer',
      'getMessengersByArea',
      'uploadFile'
    ]);
    mockAnalytics = jasmine.createSpyObj('AnalyticsService', ['logScreenView', 'logEvent']);

    mockOrderService.getUserConfig.and.returnValue(of([]));
    mockOrderService.getBankConfigs.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, FormsModule],
      declarations: [UserManagementComponent],
      providers: [
        { provide: IzingaOrderManagementService, useValue: mockOrderService },
        { provide: StorageService, useValue: {} },
        { provide: AnalyticsService, useValue: mockAnalytics }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // TC-11: happy path — reminder flag reset, selectedUser updated from server response
  it('TC-11: resets missingDocumentsReminderSent and updates selectedUser on success', fakeAsync(() => {
    const user = buildUser({ missingDocumentsReminderSent: true });
    const updatedUser = buildUser({ missingDocumentsReminderSent: false });
    component.selectedUser = user;
    mockOrderService.updateCustomer.and.returnValue(of(updatedUser));

    component.resetMissingDocumentsReminder(user);

    expect(user.missingDocumentsReminderSent).toBeFalse();
    expect(mockOrderService.updateCustomer).toHaveBeenCalledOnceWith(
      jasmine.objectContaining({ id: 'user-1', missingDocumentsReminderSent: false })
    );
    expect(component.selectedUser).toEqual(updatedUser);
    expect(component.successMessage).toContain('reminder');
    expect(mockAnalytics.logEvent).toHaveBeenCalledWith(
      'missing_docs_reminder_reset',
      jasmine.objectContaining({ userId: 'user-1' })
    );

    tick(4000);
    expect(component.successMessage).toBe('');
  }));

  // TC-12: API error — flag is reverted to true
  it('TC-12: reverts missingDocumentsReminderSent to true on API error', () => {
    const user = buildUser({ missingDocumentsReminderSent: true });
    mockOrderService.updateCustomer.and.returnValue(throwError(() => new Error('server error')));

    component.resetMissingDocumentsReminder(user);

    expect(user.missingDocumentsReminderSent).toBeTrue();
    expect(component.errorMessage).toContain('Failed');
  });

  // TC-13: user with no id — API must not be called
  it('TC-13: does nothing when user has no id', () => {
    const user = buildUser({ id: undefined, missingDocumentsReminderSent: true });

    component.resetMissingDocumentsReminder(user);

    expect(mockOrderService.updateCustomer).not.toHaveBeenCalled();
  });

  // TC-14: flag already false — API must not be called (defensive guard)
  it('TC-14: does nothing when missingDocumentsReminderSent is already false', () => {
    const user = buildUser({ missingDocumentsReminderSent: false });

    component.resetMissingDocumentsReminder(user);

    expect(mockOrderService.updateCustomer).not.toHaveBeenCalled();
  });

  // TC-15: flag undefined (never set) — API must not be called
  it('TC-15: does nothing when missingDocumentsReminderSent is undefined', () => {
    const user = buildUser({ missingDocumentsReminderSent: undefined });

    component.resetMissingDocumentsReminder(user);

    expect(mockOrderService.updateCustomer).not.toHaveBeenCalled();
  });
});

describe('UserManagementComponent — API call pattern consistency', () => {
  let component: UserManagementComponent;
  let fixture: ComponentFixture<UserManagementComponent>;
  let mockOrderService: jasmine.SpyObj<IzingaOrderManagementService>;
  let mockAnalytics: jasmine.SpyObj<AnalyticsService>;

  beforeEach(async () => {
    mockOrderService = jasmine.createSpyObj('IzingaOrderManagementService', [
      'updateCustomer', 'getUserConfig', 'getBankConfigs', 'getCustomerByPhoneNumber',
      'registerCustomer', 'getMessengersByArea', 'uploadFile'
    ]);
    mockAnalytics = jasmine.createSpyObj('AnalyticsService', ['logScreenView', 'logEvent']);
    mockOrderService.getUserConfig.and.returnValue(of([]));
    mockOrderService.getBankConfigs.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, FormsModule],
      declarations: [UserManagementComponent],
      providers: [
        { provide: IzingaOrderManagementService, useValue: mockOrderService },
        { provide: StorageService, useValue: {} },
        { provide: AnalyticsService, useValue: mockAnalytics }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // TC-16: toggleTermsAccepted — verify it uses the same updateCustomer pattern
  it('TC-16: toggleTermsAccepted calls updateCustomer with the full user object', () => {
    const user = buildUser({ termsAccepted: true });
    mockOrderService.updateCustomer.and.returnValue(of(buildUser({ termsAccepted: false })));

    component.toggleTermsAccepted(user);

    expect(user.termsAccepted).toBeFalse();
    expect(mockOrderService.updateCustomer).toHaveBeenCalledOnceWith(
      jasmine.objectContaining({ id: 'user-1', termsAccepted: false })
    );
  });

  // TC-17: toggleTermsAccepted reverts on error
  it('TC-17: toggleTermsAccepted reverts termsAccepted on API error', () => {
    const user = buildUser({ termsAccepted: true });
    mockOrderService.updateCustomer.and.returnValue(throwError(() => new Error('error')));

    component.toggleTermsAccepted(user);

    expect(user.termsAccepted).toBeTrue();
  });
});
