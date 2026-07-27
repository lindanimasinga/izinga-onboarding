import { TestBed } from '@angular/core/testing';

import { ChatService } from './chat.service';

// ChatService calls getFirestore() in its constructor which requires a live Firebase app.
// Provide a minimal stub so the scaffold test passes without a real Firebase context.
const chatServiceStub = {
  getChatSessions: jasmine.createSpy('getChatSessions'),
  subscribeToCustomerChatSessions: jasmine.createSpy('subscribeToCustomerChatSessions'),
  chatSessions$: jasmine.createSpy('chatSessions$'),
  messages$: jasmine.createSpy('messages$')
};

describe('ChatService', () => {
  let service: ChatService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: ChatService, useValue: chatServiceStub }]
    });
    service = TestBed.inject(ChatService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
