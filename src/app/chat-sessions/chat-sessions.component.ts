import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, OnDestroy } from '@angular/core';
import { ChatSession, ChatMessage } from '../model/chatSession';
import { ChatService } from '../service/chat.service';
import { StorageService } from '../service/storage-service.service';
import { Router, ActivatedRoute } from '@angular/router';
import { map, Subscription } from 'rxjs';
import { IzingaOrderManagementService } from '../service/izinga-order-management.service';

@Component({
  selector: 'app-chat-sessions',
  templateUrl: './chat-sessions.component.html',
  styleUrls: ['./chat-sessions.component.css']
})
export class ChatSessionsComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('chatPane') chatPane?: ElementRef<HTMLElement>;
  @ViewChild('messageInput') messageInput?: ElementRef<HTMLInputElement>;

  allSessions: ChatSession[] = [];
  activeSessions: ChatSession[] = [];
  filteredSessions: ChatSession[] = [];
  selectedSession?: ChatSession;
  messages: ChatMessage[] = [];
  
  activeFilter: 'active' | 'recent' = 'active';
  loading: boolean = false;
  loadingMessages: boolean = false;
  sendingMessage: boolean = false;
  showNewSessionModal: boolean = false;
  showChatSessionModal: boolean = false;
  newSessionStoreId: string = '';
  availableStores: any[] = [];
  
  newMessage: string = '';
  errorMessage: string = '';
  private errorDismissTimer: any = null;
  loadingStores: boolean = false;

  private shouldScrollToBottom = false;
  private subscriptions: Subscription[] = [];
  private currentCustomerId: string = '';

  constructor(
    private chatService: ChatService,
    private storageService: StorageService,
    private router: Router,
    private route: ActivatedRoute,
    private izingaOrderService: IzingaOrderManagementService
  ) { }

  ngOnInit(): void {
    // Get current customer ID from user profile
    this.currentCustomerId = this.storageService.userProfile?.id || 'default_customer';
    this.loadChatSessions();
    
    // Check for sessionId query parameter to auto-select session
    this.route.queryParams.subscribe(params => {
      const sessionId = params['sessionId'];
      if (sessionId && this.allSessions.length > 0) {
        this.selectSessionById(sessionId);
      }
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  loadChatSessions(): void {
    this.loading = true;
    
    // Subscribe to real-time chat sessions for this customer
    const sessionsSub = this.chatService.subscribeToCustomerChatSessions()
      .subscribe(
        sessions => {
          const previousSessionCount = this.allSessions.length;
          this.allSessions = sessions;
          this.allSessions.sort((a, b) => new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime());
          this.activeSessions = this.allSessions;
          
          // Log session updates
          if (previousSessionCount > 0 && sessions.length > previousSessionCount) {
            console.log('🆕 New chat session(s) received:', sessions.length - previousSessionCount);
          } else if (sessions.length > 0 && previousSessionCount === 0) {
            console.log(`💬 Loaded ${sessions.length} chat sessions`);
          }
          
          this.filterSessions(this.activeFilter);
          this.loading = false;
          
          // Check for auto-selection after sessions are loaded
          this.route.queryParams.subscribe(params => {
            const sessionId = params['sessionId'];
            if (sessionId) {
              this.selectSessionById(sessionId);
            }
          });
        },
        error => {
          console.error('Error loading chat sessions:', error);
          this.loading = false;
        }
      );
    
    this.subscriptions.push(sessionsSub);
  }

  filterSessions(filter: 'active' | 'recent'): void {
    this.activeFilter = filter;
    
    if (filter === 'active') {
      this.filteredSessions = this.activeSessions;
    } else {
      this.filteredSessions = this.allSessions
        .sort((a, b) => new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime())
        .slice(0, 20);
    }
  }

  selectSession(session: ChatSession): void {
    this.selectedSession = session;
    this.loadMessages(session.id);
    if (this.isMobileView()) {
      this.showChatSessionModal = true;
    }
    this.scrollSelectedSessionIntoView();
    
    // Mark session as read
    if (session.unreadMessagesCount > 0) {
      this.markAsRead();
    }
  }

  selectSessionById(sessionId: string): void {
    const session = this.allSessions.find(s => s.id === sessionId);
    if (session) {
      this.selectSession(session);
      console.log('🎯 Auto-selected session:', session.id);
      // Clear the query parameter to avoid re-selection
      this.router.navigate([], { 
        relativeTo: this.route,
        queryParams: {},
        replaceUrl: true
      });
    }
  }

  loadMessages(sessionId: string): void {
    this.loadingMessages = true;
    
    // Unsubscribe from previous messages subscription
    this.subscriptions.forEach(sub => {
      if (sub.closed === false) sub.unsubscribe();
    });
    
    // Subscribe to real-time messages
    const messagesSub = this.chatService.subscribeToMessages(sessionId)
      .subscribe(
        messages => {
          const previousMessageCount = this.messages.length;
          this.messages = messages;
          
          // Log new messages
          if (previousMessageCount > 0 && messages.length > previousMessageCount) {
            const newMessages = messages.slice(previousMessageCount);
            newMessages.forEach(message => {
              console.log('📩 New message received:', {
                sender: message.senderType,
                message: message.message,
                timestamp: message.timestamp
              });
            });
          } else if (messages.length > 0 && previousMessageCount === 0) {
            console.log(`💬 Loaded ${messages.length} messages for session ${sessionId}`);
          }
          
          this.loadingMessages = false;
          this.shouldScrollToBottom = true;
        },
        error => {
          console.error('Error loading messages:', error);
          this.loadingMessages = false;
        }
      );
    
    this.subscriptions.push(messagesSub);
  }

  sendMessage(): void {
    if (!this.newMessage?.trim() || !this.selectedSession || this.sendingMessage) {
      return;
    }

    this.sendingMessage = true;
    
    const messageData = {
      senderId: this.storageService.userProfile?.id || 'store',
      senderType: 'STORE' as const,
      message: this.newMessage.trim(),
      messageType: 'TEXT' as const
    };

    // Clear input immediately
    const messageText = this.newMessage.trim();
    this.newMessage = '';
    
    this.chatService.sendMessage(this.selectedSession.id, messageData).subscribe(
      messageId => {
         console.log('📤 Message sent successfully:', {
          id: messageId,
          message: messageText,
          sessionId: this.selectedSession?.id,
          sender: messageData.senderType
        });
        this.sendingMessage = false;
              this.izingaOrderService.notifyNewMessage(this.selectedSession!.id, messageId).subscribe(
                response => {
                  console.log('🔔 Izinga backend notified successfully:', response);
                },
                error => {
                  console.warn('⚠️ Failed to notify Izinga backend:', error);
                }
              );
        // Real-time subscription will update the UI
      },
      error => {
        console.error('Error sending message:', error);
        // Restore message on error
        this.newMessage = messageText;
        this.sendingMessage = false;
        
        this.showError('Failed to send message. Please try again.');
      }
    );
  }

  toggleSessionStatus(): void {
    if (!this.selectedSession) return;
    
    const newStatus = this.selectedSession.status === 'ACTIVE' ? 'CLOSED' : 'ACTIVE';
    
    this.chatService.updateSessionStatus(this.selectedSession.id, newStatus).subscribe(
      () => {
        console.log('Session status updated successfully');
        // Real-time subscription will update the UI
      },
      error => {
        console.error('Error updating session status:', error);
        this.showError('Failed to update session status. Please try again.');
      }
    );
  }

  markAsRead(): void {
    if (!this.selectedSession) return;
    
    const unreadMessages = this.messages.filter(
      message => message.senderType === 'CUSTOMER' && !message.isRead
    );
    
    if (unreadMessages.length === 0) return;
    
    const messageIds = unreadMessages.map(message => message.id);
    
    this.chatService.markMessagesAsRead(this.selectedSession.id, messageIds).subscribe(
      () => {
        console.log('Messages marked as read');
        // Real-time subscription will update the UI
      },
      error => {
        console.error('Error marking messages as read:', error);
      }
    );
  }

  private scrollToBottom(): void {
    if (this.messagesContainer) {
      const element = this.messagesContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }

  private scrollSelectedSessionIntoView(): void {
    setTimeout(() => {
      this.chatPane?.nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });

      if (window.innerWidth <= 768) {
        setTimeout(() => {
          this.messageInput?.nativeElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }, 200);
      }
    }, 0);
  }

  isMobileView(): boolean {
    return window.innerWidth <= 768;
  }

  closeChatSessionModal(): void {
    this.showChatSessionModal = false;
  }

  startNewSession(): void {
    this.loadAvailableStores();
    this.showNewSessionModal = true;
  }

  loadAvailableStores(): void {
    this.loadingStores = true;
    this.availableStores = [];
    const userId = this.storageService.userProfile?.id || '';
    this.izingaOrderService.getAllStoresSummary(userId).subscribe(
      stores => {
        this.availableStores = stores;
        this.loadingStores = false;
      },
      error => {
        console.error('Error loading stores:', error);
        this.loadingStores = false;
        this.showError('Failed to load stores. Please try again.');
      }
    );
  }

  createNewSession(storeId: string): void {
    console.log('Creating new session for store ID:', storeId);
    const selectedStore = this.availableStores.find(store => store.id === storeId);
    if (!selectedStore) return;

    const newSession: ChatSession = {
      id: this.storageService.userProfile?.mobileNumber || '', // Will be set by Firebase
      sessionId: `session_${Date.now()}`,
      customerId: this.storageService.userProfile?.id || 'default_customer',
      customerMobileNumber: this.storageService.userProfile?.mobileNumber || '+27600000000',
      customerName: this.storageService.userProfile?.name,
      storeId: selectedStore.id,
      storeName: selectedStore.name,
      status: 'ACTIVE',
      lastMessageTimestamp: new Date(),
      unreadMessagesCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.chatService.createChatSession(newSession).subscribe(
      sessionId => {
        console.log('New session created:', sessionId);
        // Update the session with the actual Firebase document ID
        newSession.id = sessionId;
        
        // Add to local sessions immediately for better UX
        this.allSessions.unshift(newSession);
        this.activeSessions.unshift(newSession);
        this.filterSessions(this.activeFilter);
        
        // Select the new session
        this.selectSession(newSession);
        
        // Close modal
        this.showNewSessionModal = false;
        this.newSessionStoreId = '';
      },
      error => {
        console.error('Error creating session:', error);
        this.showError('Failed to create new session. Please try again.');
      }
    );
  }

  closeNewSessionModal(): void {
    this.showNewSessionModal = false;
    this.newSessionStoreId = '';
  }

  showError(message: string): void {
    this.errorMessage = message;
    if (this.errorDismissTimer) {
      clearTimeout(this.errorDismissTimer);
    }
    this.errorDismissTimer = setTimeout(() => {
      this.errorMessage = '';
      this.errorDismissTimer = null;
    }, 5000);
  }

  dismissError(): void {
    this.errorMessage = '';
    if (this.errorDismissTimer) {
      clearTimeout(this.errorDismissTimer);
      this.errorDismissTimer = null;
    }
  }

  /** CS-01: Compute initials (up to 2 chars) from a contact name */
  getInitials(name: string | undefined): string {
    if (!name || !name.trim()) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  /** CS-01: Deterministic background colour from name hash */
  getAvatarColor(name: string | undefined): string {
    const colours = ['#be833d', '#00a9a1', '#D66247', '#1083A5', '#127672', '#8e6bbf', '#c45b8a'];
    if (!name || !name.trim()) return '#6c757d';
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colours[Math.abs(hash) % colours.length];
  }

  /** CS-03: Format phone number as +27 XX XXX XXXX */
  formatPhoneNumber(phone: string | undefined): string {
    if (!phone) return '';
    let digits = phone.replace(/\D/g, '');
    if (digits.startsWith('0') && digits.length === 10) {
      digits = '27' + digits.slice(1);
    }
    if (digits.startsWith('27') && digits.length === 11) {
      return `+27 ${digits.slice(2, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
    }
    return phone;
  }
}
