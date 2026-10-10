import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { PendingApprovalsComponent } from './pending-approvals.component';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { StorageService } from '../service/storage-service.service';
import { ChatService } from '../service/chat.service';
import { UserProfile } from '../model/models';
import { Bank } from '../model/bank';

function makeOrderSvc(pendingUsers: UserProfile[] = []): any {
  return {
    getPendingApprovals: jasmine.createSpy('getPendingApprovals').and.returnValue(of(pendingUsers)),
    getUserConfig: jasmine.createSpy('getUserConfig').and.returnValue(of([])),
    updateCustomer: jasmine.createSpy('updateCustomer').and.returnValue(of({}))
  } as any;
}

function makeStorageSvc(): any {
  return { userProfile: { id: 'admin-1', role: 'ADMIN' } } as any;
}

function makeChatSvc(): any {
  return {
    getChatSessionsForCustomer: jasmine.createSpy('getChatSessionsForCustomer').and.returnValue(of([]))
  } as any;
}

describe('PendingApprovalsComponent', () => {
  let component: PendingApprovalsComponent;
  let fixture: ComponentFixture<PendingApprovalsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PendingApprovalsComponent],
      imports: [RouterTestingModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: IzingaOrderManagementService, useValue: makeOrderSvc() },
        { provide: StorageService, useValue: makeStorageSvc() },
        { provide: ChatService, useValue: makeChatSvc() }
      ]
    });
    fixture = TestBed.createComponent(PendingApprovalsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // ISSUE-1 fix: trackByUserId — prevents DOM thrash on loadPendingApprovals() reload
  // ---------------------------------------------------------------------------
  describe('trackByUserId (ISSUE-1 fix)', () => {
    it('returns the user id', () => {
      const user: UserProfile = { id: 'user-001' } as UserProfile;
      expect(component.trackByUserId(0, user)).toBe('user-001');
    });

    it('falls back to mobileNumber when id is absent', () => {
      const user: UserProfile = { mobileNumber: '+27831234567' } as UserProfile;
      expect(component.trackByUserId(0, user)).toBe('+27831234567');
    });

    it('falls back to index string when both id and mobileNumber are absent', () => {
      const user: UserProfile = {} as UserProfile;
      expect(component.trackByUserId(5, user)).toBe('5');
    });

    it('uses the id regardless of index', () => {
      const user: UserProfile = { id: 'user-999' } as UserProfile;
      expect(component.trackByUserId(12, user)).toBe('user-999');
    });
  });

  // ---------------------------------------------------------------------------
  // filteredPendingUsers — service and filter integration
  // ---------------------------------------------------------------------------
  describe('filteredPendingUsers', () => {
    it('returns only unapproved users on load', () => {
      const users: UserProfile[] = [
        { id: 'u1', profileApproved: false } as UserProfile,
        { id: 'u2', profileApproved: true } as UserProfile
      ];
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        declarations: [PendingApprovalsComponent],
        imports: [RouterTestingModule],
        schemas: [NO_ERRORS_SCHEMA],
        providers: [
          { provide: IzingaOrderManagementService, useValue: makeOrderSvc(users) },
          { provide: StorageService, useValue: makeStorageSvc() },
          { provide: ChatService, useValue: makeChatSvc() }
        ]
      });
      const f = TestBed.createComponent(PendingApprovalsComponent);
      f.detectChanges();
      expect(f.componentInstance.filteredPendingUsers.length).toBe(1);
      expect(f.componentInstance.filteredPendingUsers[0].id).toBe('u1');
    });
  });

  // ---------------------------------------------------------------------------
  // hasMissingFields / getMissingFields — returns empty when no config matches
  // ---------------------------------------------------------------------------
  describe('hasMissingFields', () => {
    it('returns false when no userConfig matches the user description', () => {
      const user: UserProfile = { id: 'u1', description: 'unknown-type' } as UserProfile;
      expect(component.hasMissingFields(user)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // setActiveTab — updates activeTab correctly
  // ---------------------------------------------------------------------------
  describe('setActiveTab', () => {
    it('switches to map tab', () => {
      component.setActiveTab('map');
      expect(component.activeTab).toBe('map');
    });

    it('switches to criminal-check tab', () => {
      component.setActiveTab('criminal-check');
      expect(component.activeTab).toBe('criminal-check');
    });
  });

  // ---------------------------------------------------------------------------
  // getFieldDisplayValue — type coercions
  // ---------------------------------------------------------------------------
  describe('getFieldDisplayValue', () => {
    it('returns "Not provided" for null', () => {
      expect(component.getFieldDisplayValue(null)).toBe('Not provided');
    });

    it('returns "Yes" for boolean true', () => {
      expect(component.getFieldDisplayValue(true)).toBe('Yes');
    });

    it('returns "No" for boolean false', () => {
      expect(component.getFieldDisplayValue(false)).toBe('No');
    });

    it('returns "Document uploaded" for a URL string', () => {
      expect(component.getFieldDisplayValue('https://example.com/doc.pdf')).toBe('Document uploaded');
    });
  });

  // ---------------------------------------------------------------------------
  // getInitials / getAvatarColor — PENDING-AVATAR iz-* design-alignment pass
  // ---------------------------------------------------------------------------
  describe('getInitials — delegates to avatar.util', () => {
    it('returns ? for undefined', () => {
      expect(component.getInitials(undefined)).toBe('?');
    });

    it('returns single initial for one-word name', () => {
      expect(component.getInitials('Sipho')).toBe('S');
    });

    it('returns first+last initials for two-word name', () => {
      expect(component.getInitials('Sipho Nkosi')).toBe('SN');
    });

    it('returns ? for whitespace-only string', () => {
      expect(component.getInitials('   ')).toBe('?');
    });
  });

  describe('getAvatarColor — delegates to avatar.util', () => {
    it('returns muted grey fallback for undefined', () => {
      expect(component.getAvatarColor(undefined)).toBe('#6c757d');
    });

    it('returns muted grey fallback for empty string', () => {
      expect(component.getAvatarColor('')).toBe('#6c757d');
    });

    it('is deterministic for the same input', () => {
      const name = 'Hloniphani';
      expect(component.getAvatarColor(name)).toBe(component.getAvatarColor(name));
    });

    it('returns a non-grey colour for a valid name', () => {
      expect(component.getAvatarColor('TestDriver')).not.toBe('#6c757d');
    });
  });

  // ---------------------------------------------------------------------------
  // selectUser — EWALLET accountId/phone autofill (bugfix/ewallet-pending-approval-autofill)
  // ---------------------------------------------------------------------------
  describe('selectUser — EWALLET autofill', () => {
    function makeEwalletUser(overrides: Partial<UserProfile> = {}): UserProfile {
      return {
        id: 'driver-1',
        mobileNumber: '+27831112222',
        imageUrl: '',
        tag: {},
        bank: {
          type: 'EWALLET',
          name: 'FNB eWallet',
          accountId: '',
          branchCode: '',
          phone: ''
        } as Bank,
        ...overrides
      } as UserProfile;
    }

    it('fills accountId from mobileNumber when type is EWALLET and accountId is empty', () => {
      const user = makeEwalletUser();
      component.selectUser(user);
      expect(user.bank.accountId).toBe('+27831112222');
    });

    it('fills bank.phone from mobileNumber when type is EWALLET and phone is empty', () => {
      const user = makeEwalletUser();
      component.selectUser(user);
      expect(user.bank.phone).toBe('+27831112222');
    });

    it('does NOT overwrite accountId when already populated', () => {
      const user = makeEwalletUser();
      user.bank.accountId = '0831112222';
      component.selectUser(user);
      expect(user.bank.accountId).toBe('0831112222');
    });

    it('does NOT overwrite bank.phone when already populated', () => {
      const user = makeEwalletUser();
      user.bank.phone = '0831112222';
      component.selectUser(user);
      expect(user.bank.phone).toBe('0831112222');
    });

    it('does NOT autofill when type is SAVINGS (non-EWALLET)', () => {
      const user = makeEwalletUser();
      user.bank.type = 'SAVINGS';
      user.bank.accountId = '';
      component.selectUser(user);
      expect(user.bank.accountId).toBe('');
    });

    it('does NOT autofill when type is CHEQUE (non-EWALLET)', () => {
      const user = makeEwalletUser();
      user.bank.type = 'CHEQUE';
      user.bank.accountId = '';
      component.selectUser(user);
      expect(user.bank.accountId).toBe('');
    });

    it('does NOT throw when user has no bank object', () => {
      const user = makeEwalletUser();
      (user as any).bank = undefined;
      expect(() => component.selectUser(user)).not.toThrow();
    });

    it('does NOT autofill when mobileNumber is empty', () => {
      const user = makeEwalletUser({ mobileNumber: '' });
      component.selectUser(user);
      expect(user.bank.accountId).toBe('');
      expect(user.bank.phone).toBe('');
    });

    it('does NOT autofill when mobileNumber is undefined', () => {
      const user = makeEwalletUser({ mobileNumber: undefined });
      component.selectUser(user);
      expect(user.bank.accountId).toBe('');
      expect(user.bank.phone).toBe('');
    });

    it('sets selectedUser to the supplied user', () => {
      const user = makeEwalletUser();
      component.selectUser(user);
      expect(component.selectedUser).toBe(user);
    });

    it('mutates the same object reference that approvePendingUser would spread', () => {
      // Verifies the bank object identity is preserved so the autofill
      // reaches updateCustomer() in approvePendingUser().
      const user = makeEwalletUser();
      const originalBankRef = user.bank;
      component.selectUser(user);
      expect(user.bank).toBe(originalBankRef);
      expect(originalBankRef.accountId).toBe('+27831112222');
    });
  });
});
