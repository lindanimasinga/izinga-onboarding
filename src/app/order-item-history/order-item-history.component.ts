import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';
import { StorageService } from '../service/storage-service.service';
import { ChatService } from '../service/chat.service';
import { environment } from 'src/environments/environment';
import { UserProfile } from '../model/models';
import { interval } from 'rxjs';
import { Order } from '../model/order';
import { StoreProfile } from '../model/storeProfile';
import { ChatSession } from '../model/chatSession';

@Component({
  selector: 'app-order-item-history',
  templateUrl: './order-item-history.component.html',
  styleUrls: ['./order-item-history.component.css']
})
export class OrderItemHistoryComponent implements OnInit {

  order: Order | undefined
  customer: UserProfile | undefined;
  store: StoreProfile | undefined;

  constructor(private route: ActivatedRoute,
    private router: Router,
    private izingaService: IzingaOrderManagementService,
    private storageService: StorageService,
    private chatService: ChatService) { }

  ngOnInit() {
    const orderId = this.route.snapshot.paramMap.get('orderId');
    this.izingaService.getOrderById(orderId!)
      .subscribe(order => {
        this.order = order
        this.getCustomerDetails(order.customerId!)
    })
    
    interval(10000).subscribe(() =>this.fetchOrder())
  }

  getCustomerDetails(customerId: string) {
    this.izingaService.getCustomerById(customerId)
      .subscribe(customer => {
        this.customer = customer
      })
  }

  statusText(stage : Order.StageEnum) {
    return Order.stageEnumText[stage!];
  }

  statusColor(stage : Order.StageEnum) {
    return Order.stageEnumColor[stage!];
  }

  get mobileNumber() {
   return this.customer?.mobileNumber?.startsWith("0") ? 
      this.customer.mobileNumber.replace('0', "+27") : 
      this.customer?.mobileNumber?.startsWith("27") ? this.customer.mobileNumber.replace('27', "+27") : this.customer?.mobileNumber 
  }

  fetchOrder () {
    this.izingaService.getOrderById(this.order?.id!)
        .subscribe(resp => this.order = resp)
  }

  get hasOwnDelivery(): boolean {
    return this.store?.storeMessenger != undefined && this.store.storeMessenger.length > 0
  }

  get cancellable(): boolean {
    return this.order?.stage != Order.StageEnum._6WITHCUSTOMER && this.order?.stage != Order.StageEnum._7ALLPAID
  }

  get updatable(): boolean {
    return this.order?.stage == Order.StageEnum._1WAITINGSTORECONFIRM || this.order?.stage == Order.StageEnum._2STOREPROCESSING || this.storageService.userProfile?.role?.includes('ADMIN')!
  }

  updateStatus() {
    this.izingaService.updateStage(this.order?.id!).subscribe(order => {
      this.order = order
    },(error) => this.storageService.errorMessage = `Updated Order details failed ${error.error}`)
  }

  cancelOrder() {
    this.izingaService.cancelOrder(this.order?.id!).subscribe(order => {
      this.order = order
    },(error) => this.storageService.errorMessage = `Updated Order details failed ${error.error}`)
  }

  startChat() {
    if (!this.customer || !this.order) {
      this.storageService.errorMessage = 'Customer or order information not available';
      return;
    }

    // First check if an active chat session already exists for this customer
    this.chatService.getChatSessionsForCustomer(this.customer.id!).subscribe(
      existingSessions => {
        // Look for an active session
        const activeSession = existingSessions.find(session => 
          session.status === 'ACTIVE' && session.storeId === this.order!.shopId
        );

        if (activeSession) {
          // Navigate to existing session
          console.log('Found existing chat session:', activeSession.id);
          this.router.navigate(['/business/chat-sessions'], { 
            queryParams: { sessionId: activeSession.id } 
          });
        } else {
          // Create a new chat session
          const newChatSession: Omit<ChatSession, 'id' | 'createdAt' | 'updatedAt'> = {
            sessionId: `order_${this.order!.id}_${Date.now()}`,
            customerId: this.customer!.id!,
            customerMobileNumber: this.customer!.mobileNumber!,
            customerName: this.customer!.name || 'Customer',
            storeId: this.order!.shopId!,
            storeName: 'iZinga',
            status: 'ACTIVE',
            lastMessageTimestamp: new Date(),
            lastMessage: '',
            unreadMessagesCount: 0
          };

          this.chatService.createChatSession(newChatSession).subscribe(
            sessionId => {
              console.log('Chat session created successfully:', sessionId);
              // Navigate to chat sessions page
              this.router.navigate(['/business/chat-sessions'], { 
                queryParams: { sessionId: sessionId } 
              });
            },
            error => {
              console.error('Error creating chat session:', error);
              this.storageService.errorMessage = 'Failed to start chat session';
            }
          );
        }
      },
      error => {
        console.error('Error checking existing sessions:', error);
        this.storageService.errorMessage = 'Failed to check existing chat sessions';
      }
    );
  }
}
