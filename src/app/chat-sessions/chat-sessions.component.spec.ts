import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatSessionsComponent } from './chat-sessions.component';

describe('ChatSessionsComponent', () => {
  let component: ChatSessionsComponent;
  let fixture: ComponentFixture<ChatSessionsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ChatSessionsComponent]
    });
    fixture = TestBed.createComponent(ChatSessionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
