import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { ChatSessionsComponent } from './chat-sessions.component';
import { ChatService } from '../service/chat.service';
import { StorageService } from '../service/storage-service.service';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';

/**
 * Helper: build a minimal StorageService stub with the supplied profile fields.
 */
function makeStorageSvc(profile: any): any {
  return { userProfile: profile } as any;
}

/**
 * Helper: build a ChatService spy object.
 * subscribeToChatSessions and subscribeToCustomerChatSessions return observable of [].
 */
function makeChatSvc(overrides: Partial<{
  subscribeToChatSessions: jasmine.Spy;
  subscribeToCustomerChatSessions: jasmine.Spy;
}> = {}): any {
  return {
    getChatSessions: jasmine.createSpy('getChatSessions').and.returnValue(of([])),
    subscribeToChatSessions:
      overrides.subscribeToChatSessions ??
      jasmine.createSpy('subscribeToChatSessions').and.returnValue(of([])),
    subscribeToCustomerChatSessions:
      overrides.subscribeToCustomerChatSessions ??
      jasmine.createSpy('subscribeToCustomerChatSessions').and.returnValue(of([])),
    getMessages: jasmine.createSpy('getMessages').and.returnValue(of([])),
    sendMessage: jasmine.createSpy('sendMessage').and.returnValue(of(null)),
    subscribeToMessages: jasmine.createSpy('subscribeToMessages').and.returnValue(of([])),
    updateSessionStatus: jasmine.createSpy('updateSessionStatus').and.returnValue(of(null)),
    markMessagesAsRead: jasmine.createSpy('markMessagesAsRead').and.returnValue(of(null)),
    createChatSession: jasmine.createSpy('createChatSession').and.returnValue(of('new-session-id'))
  } as any;
}

function makeOrderSvc(): any {
  return {
    getOrderById: jasmine.createSpy().and.returnValue(of(null)),
    getAllStoresSummary: jasmine.createSpy().and.returnValue(of([]))
  } as any;
}

describe('ChatSessionsComponent', () => {
  let component: ChatSessionsComponent;
  let fixture: ComponentFixture<ChatSessionsComponent>;

  // ---------------------------------------------------------------------------
  // Default setup — no profile (guest / unauthenticated state)
  // ---------------------------------------------------------------------------
  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ChatSessionsComponent],
      imports: [RouterTestingModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: ChatService, useValue: makeChatSvc() },
        { provide: StorageService, useValue: makeStorageSvc(undefined) },
        { provide: IzingaOrderManagementService, useValue: makeOrderSvc() }
      ]
    });
    fixture = TestBed.createComponent(ChatSessionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // WA-LINES-02 REQ-18 / AC-13 — role-based query routing in loadChatSessions()
  // ---------------------------------------------------------------------------

  describe('ngOnInit — role detection (WA-LINES-02 REQ-18)', () => {

    it('sets isAdmin=true for ADMIN role', () => {
      const chatSvc = makeChatSvc();
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        declarations: [ChatSessionsComponent],
        imports: [RouterTestingModule],
        schemas: [NO_ERRORS_SCHEMA],
        providers: [
          { provide: ChatService, useValue: chatSvc },
          { provide: StorageService, useValue: makeStorageSvc({ id: 'u1', role: 'ADMIN' }) },
          { provide: IzingaOrderManagementService, useValue: makeOrderSvc() }
        ]
      });
      const f = TestBed.createComponent(ChatSessionsComponent);
      const c = f.componentInstance;
      f.detectChanges();

      expect(c.isAdmin).toBe(true);
      expect(c.storeAdminStoreId).toBeNull();
    });

    it('sets isAdmin=false and populates storeAdminStoreId for STORE_ADMIN role with storeId', () => {
      const chatSvc = makeChatSvc();
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        declarations: [ChatSessionsComponent],
        imports: [RouterTestingModule],
        schemas: [NO_ERRORS_SCHEMA],
        providers: [
          { provide: ChatService, useValue: chatSvc },
          { provide: StorageService, useValue: makeStorageSvc({ id: 'u2', role: 'STORE_ADMIN', storeId: 'store-X' }) },
          { provide: IzingaOrderManagementService, useValue: makeOrderSvc() }
        ]
      });
      const f = TestBed.createComponent(ChatSessionsComponent);
      const c = f.componentInstance;
      f.detectChanges();

      expect(c.isAdmin).toBe(false);
      expect(c.storeAdminStoreId).toBe('store-X');
    });

    it('sets isAdmin=false and storeAdminStoreId=null for STORE_ADMIN with no storeId claim', () => {
      const chatSvc = makeChatSvc();
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        declarations: [ChatSessionsComponent],
        imports: [RouterTestingModule],
        schemas: [NO_ERRORS_SCHEMA],
        providers: [
          { provide: ChatService, useValue: chatSvc },
          { provide: StorageService, useValue: makeStorageSvc({ id: 'u3', role: 'STORE_ADMIN' }) },
          { provide: IzingaOrderManagementService, useValue: makeOrderSvc() }
        ]
      });
      const f = TestBed.createComponent(ChatSessionsComponent);
      const c = f.componentInstance;
      f.detectChanges();

      expect(c.isAdmin).toBe(false);
      expect(c.storeAdminStoreId).toBeNull();
    });
  });

  describe('loadChatSessions() — WA-LINES-02 REQ-18 / AC-13 server-side filter', () => {

    // Branch 1: ADMIN → subscribeToCustomerChatSessions() is called (all sessions, no storeId filter)
    it('ADMIN: calls subscribeToCustomerChatSessions and NOT subscribeToChatSessions', () => {
      const subscribeToChatSessions = jasmine.createSpy('subscribeToChatSessions').and.returnValue(of([]));
      const subscribeToCustomerChatSessions = jasmine.createSpy('subscribeToCustomerChatSessions').and.returnValue(of([]));
      const chatSvc = makeChatSvc({ subscribeToChatSessions, subscribeToCustomerChatSessions });

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        declarations: [ChatSessionsComponent],
        imports: [RouterTestingModule],
        schemas: [NO_ERRORS_SCHEMA],
        providers: [
          { provide: ChatService, useValue: chatSvc },
          { provide: StorageService, useValue: makeStorageSvc({ id: 'admin1', role: 'ADMIN' }) },
          { provide: IzingaOrderManagementService, useValue: makeOrderSvc() }
        ]
      });
      const f = TestBed.createComponent(ChatSessionsComponent);
      f.detectChanges();

      expect(subscribeToCustomerChatSessions).toHaveBeenCalled();
      expect(subscribeToChatSessions).not.toHaveBeenCalled();
    });

    // Branch 2: STORE_ADMIN with storeId → subscribeToChatSessions(storeId) is called with correct storeId
    // This is the AC-13 server-side Firestore where("storeId","==",storeId) branch.
    it('STORE_ADMIN with storeId: calls subscribeToChatSessions with the user storeId (server-side filter)', () => {
      const subscribeToChatSessions = jasmine.createSpy('subscribeToChatSessions').and.returnValue(of([]));
      const subscribeToCustomerChatSessions = jasmine.createSpy('subscribeToCustomerChatSessions').and.returnValue(of([]));
      const chatSvc = makeChatSvc({ subscribeToChatSessions, subscribeToCustomerChatSessions });

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        declarations: [ChatSessionsComponent],
        imports: [RouterTestingModule],
        schemas: [NO_ERRORS_SCHEMA],
        providers: [
          { provide: ChatService, useValue: chatSvc },
          { provide: StorageService, useValue: makeStorageSvc({ id: 'sa1', role: 'STORE_ADMIN', storeId: 'store-ABC' }) },
          { provide: IzingaOrderManagementService, useValue: makeOrderSvc() }
        ]
      });
      const f = TestBed.createComponent(ChatSessionsComponent);
      f.detectChanges();

      expect(subscribeToChatSessions).toHaveBeenCalledWith('store-ABC');
      expect(subscribeToCustomerChatSessions).not.toHaveBeenCalled();
    });

    // Branch 3: STORE_ADMIN with NO storeId claim → error shown, neither subscription called
    // Fail-safe: must not silently fall back to fetching all sessions.
    it('STORE_ADMIN with null storeId: shows error and calls neither subscription (fail-safe)', () => {
      const subscribeToChatSessions = jasmine.createSpy('subscribeToChatSessions').and.returnValue(of([]));
      const subscribeToCustomerChatSessions = jasmine.createSpy('subscribeToCustomerChatSessions').and.returnValue(of([]));
      const chatSvc = makeChatSvc({ subscribeToChatSessions, subscribeToCustomerChatSessions });

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        declarations: [ChatSessionsComponent],
        imports: [RouterTestingModule],
        schemas: [NO_ERRORS_SCHEMA],
        providers: [
          { provide: ChatService, useValue: chatSvc },
          { provide: StorageService, useValue: makeStorageSvc({ id: 'sa2', role: 'STORE_ADMIN' }) },
          { provide: IzingaOrderManagementService, useValue: makeOrderSvc() }
        ]
      });
      const f = TestBed.createComponent(ChatSessionsComponent);
      f.detectChanges();

      expect(subscribeToChatSessions).not.toHaveBeenCalled();
      expect(subscribeToCustomerChatSessions).not.toHaveBeenCalled();
      // Error message must be set — fail-open would expose all sessions to an unscoped STORE_ADMIN
      expect(f.componentInstance.errorMessage).toBeTruthy();
    });
  });

  // ---------------------------------------------------------------------------
  // ISSUE-1 fix: trackBy functions — prevent DOM thrash on Firestore push updates
  // ---------------------------------------------------------------------------
  describe('trackBy functions (ISSUE-1 fix)', () => {
    it('trackBySessionId returns the session id', () => {
      const session: any = { id: 'sess-abc', customerName: 'Test' };
      expect(component.trackBySessionId(0, session)).toBe('sess-abc');
    });

    it('trackBySessionId uses the id regardless of index', () => {
      const session: any = { id: 'sess-xyz', customerName: 'Another' };
      expect(component.trackBySessionId(5, session)).toBe('sess-xyz');
    });

    it('trackByStoreId returns the store id', () => {
      const store: any = { id: 'store-42', name: 'Shop A' };
      expect(component.trackByStoreId(0, store)).toBe('store-42');
    });
  });
});
