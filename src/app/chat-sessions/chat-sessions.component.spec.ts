import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { ChatSessionsComponent } from './chat-sessions.component';
import { ChatService } from '../service/chat.service';
import { StorageService } from '../service/storage-service.service';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';

describe('ChatSessionsComponent', () => {
  let component: ChatSessionsComponent;
  let fixture: ComponentFixture<ChatSessionsComponent>;

  beforeEach(() => {
    const chatSvc = {
      getChatSessions: () => of([]),
      subscribeToCustomerChatSessions: () => of([]),
      getMessages: () => of([]),
      sendMessage: () => of(null)
    } as any;
    const storageSvc = { userProfile: undefined } as any;
    const orderSvc = { getOrderById: () => of(null), getAllStoresSummary: () => of([]) } as any;

    TestBed.configureTestingModule({
      declarations: [ChatSessionsComponent],
      imports: [RouterTestingModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: ChatService, useValue: chatSvc },
        { provide: StorageService, useValue: storageSvc },
        { provide: IzingaOrderManagementService, useValue: orderSvc }
      ]
    });
    fixture = TestBed.createComponent(ChatSessionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
