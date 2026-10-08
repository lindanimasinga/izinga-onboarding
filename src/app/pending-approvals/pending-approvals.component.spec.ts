import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { PendingApprovalsComponent } from './pending-approvals.component';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { StorageService } from '../service/storage-service.service';
import { ChatService } from '../service/chat.service';
import { UserProfile } from '../model/models';

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

    it('returns undefined when user has no id', () => {
      const user: UserProfile = {} as UserProfile;
      expect(component.trackByUserId(0, user)).toBeUndefined();
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
});
