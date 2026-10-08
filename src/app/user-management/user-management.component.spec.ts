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

// ---------------------------------------------------------------------------
// Bug 9 — bank.phone field in admin user-management flows
//
// TC-UM-BANK-PHONE-01  EWALLET creation sets bank.phone to mobileNumber
// TC-UM-BANK-PHONE-02  ewalletSelectedForNewUser sets bank.phone to mobileNumber
// TC-UM-BANK-PHONE-03  onBankSelectedForNewUser defaults bank.phone to mobileNumber when blank
// TC-UM-BANK-PHONE-04  onBankSelectedForNewUser preserves bank.phone when already set
// TC-UM-BANK-PHONE-05  BANK_ACC creation validation requires bank.phone
// ---------------------------------------------------------------------------
describe('UserManagementComponent — bank.phone field (Bug 9)', () => {
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

  // TC-UM-BANK-PHONE-01: EWALLET path in createUserOnBehalf sets bank.phone to mobileNumber
  it('TC-UM-BANK-PHONE-01: createUserOnBehalf sets bank.phone = mobileNumber when payment type is EWALLET', () => {
    component.newUser.mobileNumber = '+27811000001';
    component.newUser.name = 'Test User';
    component.roleDescription = 'Bike Delivery Driver';
    component.createPaymentType = 'EWALLET';
    mockOrderService.registerCustomer.and.returnValue(of(buildUser()));

    component.createUserOnBehalf();

    const payload = mockOrderService.registerCustomer.calls.mostRecent().args[0];
    expect(payload.bank.phone).toBe('+27811000001');
  });

  // TC-UM-BANK-PHONE-02: ewalletSelectedForNewUser sets bank.phone to mobileNumber
  it('TC-UM-BANK-PHONE-02: ewalletSelectedForNewUser sets bank.phone to mobileNumber', () => {
    component.newUser.mobileNumber = '+27811000002';

    component.ewalletSelectedForNewUser();

    expect(component.newUser.bank.phone).toBe('+27811000002');
  });

  // TC-UM-BANK-PHONE-03: onBankSelectedForNewUser defaults bank.phone to mobileNumber when blank
  it('TC-UM-BANK-PHONE-03: onBankSelectedForNewUser defaults bank.phone to mobileNumber when blank', () => {
    component.newUser.mobileNumber = '+27811000003';
    component.newUser.bank.phone = '';
    const bankConfig = { bankName: 'FNB', branchCode: '250655', bankCode: '250655' };

    component.onBankSelectedForNewUser(bankConfig as any);

    expect(component.newUser.bank.phone).toBe('+27811000003');
  });

  // TC-UM-BANK-PHONE-04: onBankSelectedForNewUser preserves existing bank.phone
  it('TC-UM-BANK-PHONE-04: onBankSelectedForNewUser preserves bank.phone when already set', () => {
    component.newUser.mobileNumber = '+27811000004';
    component.newUser.bank.phone = '+27811000099';
    const bankConfig = { bankName: 'Nedbank', branchCode: '198765', bankCode: '198765' };

    component.onBankSelectedForNewUser(bankConfig as any);

    expect(component.newUser.bank.phone).toBe('+27811000099');
  });

  // TC-UM-BANK-PHONE-05: BANK_ACC validation blocks createUserOnBehalf when bank.phone is missing
  it('TC-UM-BANK-PHONE-05: createUserOnBehalf blocks with error when BANK_ACC is selected but bank.phone is empty', () => {
    component.newUser.mobileNumber = '+27811000005';
    component.newUser.name = 'Test User';
    component.roleDescription = 'Bike Delivery Driver';
    component.createPaymentType = 'BANK_ACC';
    component.newUser.bank.name = 'FNB';
    component.newUser.bank.accountId = '12345';
    component.newUser.bank.branchCode = '250655';
    component.newUser.bank.phone = '';  // missing phone

    component.createUserOnBehalf();

    expect(mockOrderService.registerCustomer).not.toHaveBeenCalled();
    expect(component.errorMessage).toContain('bank phone');
  });
});
