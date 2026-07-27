import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { OrderItemHistoryComponent } from './order-item-history.component';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { StorageService } from '../service/storage-service.service';
import { ChatService } from '../service/chat.service';

describe('OrderItemHistoryComponent', () => {
  let component: OrderItemHistoryComponent;
  let fixture: ComponentFixture<OrderItemHistoryComponent>;

  beforeEach(waitForAsync(() => {
    const orderSvc = { getOrderById: () => of(null) } as any;
    const storageSvc = { userProfile: undefined } as any;
    const chatSvc = { getChatSessions: () => of([]), getMessages: () => of([]) } as any;

    TestBed.configureTestingModule({
      declarations: [ OrderItemHistoryComponent ],
      imports: [RouterTestingModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: IzingaOrderManagementService, useValue: orderSvc },
        { provide: StorageService, useValue: storageSvc },
        { provide: ChatService, useValue: chatSvc }
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(OrderItemHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
