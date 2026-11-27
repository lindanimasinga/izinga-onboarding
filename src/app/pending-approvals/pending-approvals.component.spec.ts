import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { PendingApprovalsComponent } from './pending-approvals.component';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { StorageService } from '../service/storage-service.service';
import { ChatService } from '../service/chat.service';
import { UserProfile } from '../model/models';
import { UserConfig, DataType } from '../model/models';
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
  // getMissingFieldLabels — REQ-06 (all 4 branches + formatMissingFieldName)
  // ---------------------------------------------------------------------------
  describe('getMissingFieldLabels — REQ-06', () => {
    function makeConfig(
      label: string,
      fields: Array<{ name: string; label: string }>
    ): UserConfig {
      return {
        name: label,
        label,
        userRole: UserProfile.RoleEnum.MESSENGER,
        mandatoryFields: fields.map(f => ({
          name: f.name,
          label: f.label,
          dataType: DataType.STRING
        })),
        optionalFields: [],
        hiddenFields: []
      };
    }

    // REQ-06(d): description does not match any UserConfig — returns '' and throws nothing.
    // The default fixture has userConfigOptions = [] (getUserConfig mock returns of([])).
    it('REQ-06(d): returns "" when description matches no UserConfig', () => {
      const user = { id: 'u-d', description: 'no-such-type', tag: {} } as UserProfile;
      expect(() => component.getMissingFieldLabels(user)).not.toThrow();
      expect(component.getMissingFieldLabels(user)).toBe('');
    });

    it('REQ-06(d): returns "" when user description is undefined', () => {
      const user = { id: 'u-undef', tag: {} } as UserProfile;
      expect(() => component.getMissingFieldLabels(user)).not.toThrow();
      expect(component.getMissingFieldLabels(user)).toBe('');
    });

    // REQ-06(a): all mandatory fields present — count is 0, joined result is ''
    it('REQ-06(a): returns "" and getMissingFields count 0 when all mandatory fields present', () => {
      component.userConfigOptions = [
        makeConfig('Bike Driver', [
          { name: 'vehicleReg', label: 'Vehicle Registration' },
          { name: 'idNumber', label: 'ID Number' }
        ])
      ];
      const user = {
        id: 'u-a',
        description: 'Bike Driver',
        tag: { vehicleReg: 'CA123456', idNumber: '8001015009087' } as { [key: string]: any }
      } as unknown as UserProfile;
      expect(component.getMissingFieldLabels(user)).toBe('');
      expect(component.getMissingFields(user).length).toBe(0);
    });

    // REQ-06(b): exactly 1 field missing — returns single formatted label
    it('REQ-06(b): returns single formatted label when exactly 1 field is missing', () => {
      component.userConfigOptions = [
        makeConfig('Bike Driver', [
          { name: 'vehicleReg', label: 'Vehicle Registration' },
          { name: 'idNumber', label: 'ID Number' }
        ])
      ];
      const user = {
        id: 'u-b',
        description: 'Bike Driver',
        tag: { idNumber: '8001015009087' } as { [key: string]: any }  // vehicleReg is missing
      } as unknown as UserProfile;
      expect(component.getMissingFieldLabels(user)).toBe('Vehicle Registration');
      expect(component.getMissingFields(user).length).toBe(1);
    });

    // REQ-06(c): 3 missing fields — comma-separated labels (this is the iz-badge--coral boundary)
    it('REQ-06(c): returns comma-separated labels for 3 missing fields', () => {
      component.userConfigOptions = [
        makeConfig('Bakkie Driver', [
          { name: 'vehicleReg', label: 'Vehicle Registration' },
          { name: 'idNumber', label: 'ID Number' },
          { name: 'driverLicense', label: "Driver's License" }
        ])
      ];
      const user = {
        id: 'u-c',
        description: 'Bakkie Driver',
        tag: {}  // all 3 fields missing
      } as UserProfile;
      expect(component.getMissingFieldLabels(user))
        .toBe("Vehicle Registration, ID Number, Driver's License");
      expect(component.getMissingFields(user).length).toBe(3);
    });

    // REQ-06(c): getMissingFields().length >= 3 triggers the coral branch in ngClass
    it('REQ-06(c): getMissingFields().length is >= 3 for the coral ngClass branch', () => {
      component.userConfigOptions = [
        makeConfig('Truck Driver', [
          { name: 'f1', label: 'Field One' },
          { name: 'f2', label: 'Field Two' },
          { name: 'f3', label: 'Field Three' }
        ])
      ];
      const user = { id: 'u-coral', description: 'Truck Driver', tag: {} } as UserProfile;
      expect(component.getMissingFields(user).length).toBeGreaterThanOrEqual(3);
    });

    // formatMissingFieldName integration: empty label falls through to field.name, camelCase is split
    it('applies formatMissingFieldName to camelCase field names when label is absent', () => {
      component.userConfigOptions = [
        makeConfig('Car Driver', [
          { name: 'vehicleRegNumber', label: '' },  // empty label → field.name used by getMissingFields
          { name: 'proofOfAddress', label: '' }
        ])
      ];
      const user = { id: 'u-fmt', description: 'Car Driver', tag: {} } as UserProfile;
      // getMissingFields returns ['vehicleRegNumber', 'proofOfAddress'] ('' is falsy, so field.name is used)
      // formatMissingFieldName splits camelCase with a space between each lower→upper boundary
      expect(component.getMissingFieldLabels(user)).toBe('vehicle Reg Number, proof Of Address');
    });
  });

  // ---------------------------------------------------------------------------
  // missing-fields badge — template assertions (AC-01..AC-06, AC-08)
  //
  // These tests set component.pendingUsers and component.userConfigOptions
  // directly (bypassing the service mock), then call fixture.detectChanges()
  // to trigger a re-render.  The outer beforeEach provides a fresh component
  // instance for each test.
  // ---------------------------------------------------------------------------
  describe('missing-fields badge — template', () => {
    // Three-field config reused across all template tests (Bike Driver with 3 mandatory fields).
    function driverConfig(): UserConfig {
      return {
        name: 'Bike Driver',
        label: 'Bike Driver',
        userRole: UserProfile.RoleEnum.MESSENGER,
        mandatoryFields: [
          { name: 'vehicleReg',    label: 'Vehicle Registration', dataType: DataType.STRING },
          { name: 'idNumber',      label: 'ID Number',            dataType: DataType.STRING },
          { name: 'driverLicense', label: "Driver's License",     dataType: DataType.STRING }
        ],
        optionalFields: [],
        hiddenFields: []
      };
    }

    // Build a UserProfile with exactly `count` missing mandatory fields (0–3).
    // Fields are populated left-to-right: vehicleReg first, then idNumber, then driverLicense.
    // Missing fields are those not filled, right-to-left.
    function userWithMissing(count: number): UserProfile {
      const all3 = ['vehicleReg', 'idNumber', 'driverLicense'];
      const tag: { [key: string]: string } = {};
      all3.slice(0, 3 - count).forEach(k => { tag[k] = 'some-value'; });
      return {
        id: `u-tpl-${count}`,
        description: 'Bike Driver',
        tag,
        profileApproved: false
      } as UserProfile;
    }

    // Set the component state and trigger a template re-render.
    function setScenario(users: UserProfile[], config: UserConfig): void {
      component.pendingUsers = users;
      component.userConfigOptions = [config];
      fixture.detectChanges();
    }

    // Find the badge wrapper in the list panel: outer span.small with [title].
    function findBadgeWrapper(): HTMLElement | null {
      const listPanel: HTMLElement | null = fixture.nativeElement.querySelector('.pending-list-panel');
      return listPanel ? listPanel.querySelector('span.small[title]') : null;
    }

    // Find the tick span in the list panel: span.small WITHOUT [title].
    function findTickSpan(): HTMLElement | null {
      const listPanel: HTMLElement | null = fixture.nativeElement.querySelector('.pending-list-panel');
      return listPanel ? listPanel.querySelector('span.small:not([title])') : null;
    }

    // ── AC-01: tick renders for a complete user; no badge ───────────────────
    it('AC-01: shows "Ready For App" tick and no badge wrapper when 0 fields missing', () => {
      setScenario([userWithMissing(0)], driverConfig());
      const tick = findTickSpan();
      const badge = findBadgeWrapper();
      expect(tick).withContext('tick span.small should be present').not.toBeNull();
      expect(tick!.textContent).toContain('Ready For App');
      expect(badge).withContext('badge wrapper span.small[title] should be absent').toBeNull();
    });

    // ── AC-02: badge renders when >=1 field missing; tick absent ────────────
    it('AC-02: shows badge and no tick when 1 field is missing', () => {
      setScenario([userWithMissing(1)], driverConfig());
      const tick = findTickSpan();
      const badge = findBadgeWrapper();
      expect(badge).withContext('badge wrapper span.small[title] should be present').not.toBeNull();
      expect(tick).withContext('tick span.small should be absent').toBeNull();
    });

    // ── AC-03: badge text is "{count} missing" — no singular/plural variant ─
    it('AC-03: badge text is "1 missing" for 1 missing field', () => {
      setScenario([userWithMissing(1)], driverConfig());
      const wrapper = findBadgeWrapper();
      expect(wrapper).withContext('badge wrapper must be present').not.toBeNull();
      const inner = wrapper!.querySelector('.iz-badge.ms-1');
      expect(inner).withContext('.iz-badge.ms-1 must exist inside wrapper').not.toBeNull();
      expect(inner!.textContent!.trim()).toBe('1 missing');
    });

    it('AC-03: badge text is "2 missing" for 2 missing fields (no plural variation)', () => {
      setScenario([userWithMissing(2)], driverConfig());
      const wrapper = findBadgeWrapper();
      expect(wrapper).withContext('badge wrapper must be present').not.toBeNull();
      const inner = wrapper!.querySelector('.iz-badge.ms-1');
      expect(inner).not.toBeNull();
      expect(inner!.textContent!.trim()).toBe('2 missing');
    });

    // ── AC-04: counts 1–2 use iz-badge--amber (count < 3) ───────────────────
    it('AC-04: 1 missing field applies iz-badge--amber', () => {
      setScenario([userWithMissing(1)], driverConfig());
      const wrapper = findBadgeWrapper();
      expect(wrapper).not.toBeNull();
      const inner = wrapper!.querySelector('.iz-badge.ms-1') as HTMLElement;
      expect(inner).not.toBeNull();
      expect(inner.classList.contains('iz-badge--amber'))
        .withContext('iz-badge--amber expected for count < 3').toBe(true);
      expect(inner.classList.contains('iz-badge--coral'))
        .withContext('iz-badge--coral must be absent for count < 3').toBe(false);
    });

    it('AC-04: 2 missing fields apply iz-badge--amber (boundary: count < 3)', () => {
      setScenario([userWithMissing(2)], driverConfig());
      const wrapper = findBadgeWrapper();
      expect(wrapper).not.toBeNull();
      const inner = wrapper!.querySelector('.iz-badge.ms-1') as HTMLElement;
      expect(inner).not.toBeNull();
      expect(inner.classList.contains('iz-badge--amber')).toBe(true);
      expect(inner.classList.contains('iz-badge--coral')).toBe(false);
    });

    // ── AC-05: count >= 3 uses iz-badge--coral (boundary is exactly 3) ──────
    it('AC-05: 3 missing fields apply iz-badge--coral (boundary: count >= 3)', () => {
      setScenario([userWithMissing(3)], driverConfig());
      const wrapper = findBadgeWrapper();
      expect(wrapper).not.toBeNull();
      const inner = wrapper!.querySelector('.iz-badge.ms-1') as HTMLElement;
      expect(inner).not.toBeNull();
      expect(inner.classList.contains('iz-badge--coral'))
        .withContext('iz-badge--coral expected for count >= 3').toBe(true);
      expect(inner.classList.contains('iz-badge--amber'))
        .withContext('iz-badge--amber must be absent for count >= 3').toBe(false);
    });

    // ── AC-06: outer span carries [title] with comma-separated formatted labels
    it('AC-06: outer span [title] equals getMissingFieldLabels output for 2 missing fields', () => {
      setScenario([userWithMissing(2)], driverConfig());
      // count=2: vehicleReg present, idNumber + driverLicense missing
      // getMissingFieldLabels returns "ID Number, Driver's License"
      const wrapper = findBadgeWrapper();
      expect(wrapper).withContext('badge wrapper must be present').not.toBeNull();
      const title = wrapper!.getAttribute('title');
      expect(title).toBe("ID Number, Driver's License");
    });

    it('AC-06: outer span [title] is not rendered at all when 0 fields are missing', () => {
      setScenario([userWithMissing(0)], driverConfig());
      // No badge wrapper rendered at count=0 — the tick span has no [title] attribute
      const wrapper = findBadgeWrapper();
      expect(wrapper).toBeNull();
    });

    // ── AC-08: no missing-fields count badge in the col-md-8 detail panel ───
    it('AC-08: no "span.small[title]" count badge appears inside the col-md-8 detail panel', () => {
      setScenario([userWithMissing(2)], driverConfig());
      component.selectedUser = userWithMissing(2);
      fixture.detectChanges();
      const detailPanel: HTMLElement | null = fixture.nativeElement.querySelector('.col-md-8');
      if (!detailPanel) {
        pending('col-md-8 not present in test DOM — structural check deferred');
        return;
      }
      const badgeWrappers = detailPanel.querySelectorAll('span.small[title]');
      expect(badgeWrappers.length)
        .withContext('No count-badge wrapper should exist in the detail panel').toBe(0);
    });

    // ── AC-08: no missing-fields count badge in the pending-user-modal ───────
    it('AC-08: no "span.small[title]" count badge appears in the pending-user-modal', () => {
      setScenario([userWithMissing(2)], driverConfig());
      component.selectedUser = userWithMissing(2);
      component.showUserReviewModal = true;
      fixture.detectChanges();
      const modal: HTMLElement | null = fixture.nativeElement.querySelector('.pending-user-modal');
      if (!modal) {
        pending('pending-user-modal not rendered at test viewport');
        return;
      }
      const badgeWrappers = modal.querySelectorAll('span.small[title]');
      expect(badgeWrappers.length)
        .withContext('No count-badge wrapper should exist in the mobile modal').toBe(0);
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

// ---------------------------------------------------------------------------
// UX review ONB-UX-02 — PA-3: criminal-check tab badge vs. all-clear icon
// ---------------------------------------------------------------------------
describe('PendingApprovalsComponent — UX review fixes (PA-3)', () => {
  afterEach(() => TestBed.resetTestingModule());

  function buildPAFixture(pendingUsers: UserProfile[] = []) {
    TestBed.configureTestingModule({
      declarations: [PendingApprovalsComponent],
      imports: [RouterTestingModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: IzingaOrderManagementService, useValue: makeOrderSvc(pendingUsers) },
        { provide: StorageService, useValue: makeStorageSvc() },
        { provide: ChatService, useValue: makeChatSvc() }
      ]
    });
    const f = TestBed.createComponent(PendingApprovalsComponent);
    const c = f.componentInstance;
    f.detectChanges();
    return { fixture: f, component: c };
  }

  // PA-3 (a): when no user has a pending criminal check the check_circle icon renders
  it('PA-3a — all-clear icon (aria-label="All clear") is present when criminalCheckPendingUsers is empty', () => {
    // No users → criminalCheckPendingUsers.length === 0
    const { fixture } = buildPAFixture([]);
    const icon: HTMLElement | null = fixture.nativeElement.querySelector('i[aria-label="All clear"]');
    expect(icon).not.toBeNull('all-clear icon must be present when there are no pending criminal checks');
  });

  // PA-3 (b): when a user IS pending criminal-check the badge renders and the icon does not
  it('PA-3b — iz-badge appears and all-clear icon is hidden when criminalCheckPendingUsers is non-empty', () => {
    const criminalPending: UserProfile = {
      id: 'u-crim-1',
      mobileNumber: '+27831110001',
      crminalCheckData: {
        criminalRecordCheckAccepted: true,
        criminalCheckPass: undefined
      }
    } as any;
    const { fixture } = buildPAFixture([criminalPending]);

    const badge: HTMLElement | null = fixture.nativeElement.querySelector('span.iz-badge');
    const icon: HTMLElement | null = fixture.nativeElement.querySelector('i[aria-label="All clear"]');

    expect(badge).not.toBeNull('iz-badge must render when at least one criminal check is pending');
    expect(icon).toBeNull('all-clear icon must NOT render when criminal check is pending');
  });
});
