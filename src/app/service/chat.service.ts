import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, from, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { initializeApp, getApp } from "firebase/app";
import { 
  getFirestore, 
  Firestore, 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  onSnapshot, 
  doc, 
  updateDoc, 
  addDoc, 
  writeBatch, 
  serverTimestamp,
  Timestamp 
} from "firebase/firestore";
import { ChatSession, ChatMessage, ChatSessionSummary } from '../model/chatSession';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private firestore: Firestore;
  private chatSessionsSubject = new BehaviorSubject<ChatSession[]>([]);
  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);

  public chatSessions$ = this.chatSessionsSubject.asObservable();
  public messages$ = this.messagesSubject.asObservable();

  constructor(private http: HttpClient) {
    // Get the default Firebase app and use izinga database
    try {
      const app = getApp();
      this.firestore = getFirestore(app, 'izinga');
    } catch (error) {
      console.warn('Firebase app not initialized, using default firestore');
      this.firestore = getFirestore();
    }
  }

  /**
   * Get all chat sessions for a store
   */
  getChatSessions(storeId: string): Observable<ChatSession[]> {
    const sessionsRef = query(
      collection(this.firestore, 'chatSessions'),
      where('storeId', '==', storeId),
      orderBy('lastMessageTimestamp', 'desc')
    );

    return from(getDocs(sessionsRef)).pipe(
      map(snapshot => {
        const sessions: ChatSession[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          sessions.push({
            id: doc.id,
            sessionId: data['sessionId'],
            customerId: data['customerId'],
            customerMobileNumber: data['customerMobileNumber'],
            customerName: data['customerName'],
            storeId: data['storeId'],
            storeName: data['storeName'],
            status: data['status'],
            lastMessageTimestamp: data['lastMessageTimestamp']?.toDate() || new Date(),
            lastMessage: data['lastMessage'],
            unreadMessagesCount: data['unreadMessagesCount'] || 0,
            createdAt: data['createdAt']?.toDate() || new Date(),
            updatedAt: data['updatedAt']?.toDate() || new Date()
          });
        });
        this.chatSessionsSubject.next(sessions);
        return sessions;
      }),
      catchError(error => {
        console.error('Error fetching chat sessions:', error);
        return of([]);
      })
    );
  }

  /**
   * Get all chat sessions for a customer
   */
  getChatSessionsForCustomer(customerId: string): Observable<ChatSession[]> {
    const sessionsRef = query(
      collection(this.firestore, 'chatSessions'),
      where('customerId', '==', customerId),
      orderBy('lastMessageTimestamp', 'desc')
    );

    return from(getDocs(sessionsRef)).pipe(
      map(snapshot => {
        const sessions: ChatSession[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          sessions.push({
            id: doc.id,
            sessionId: data['sessionId'],
            customerId: data['customerId'],
            customerMobileNumber: data['customerMobileNumber'],
            customerName: data['customerName'],
            storeId: data['storeId'],
            storeName: data['storeName'],
            status: data['status'],
            lastMessageTimestamp: data['lastMessageTimestamp']?.toDate() || new Date(),
            lastMessage: data['lastMessage'],
            unreadMessagesCount: data['unreadMessagesCount'] || 0,
            createdAt: data['createdAt']?.toDate() || new Date(),
            updatedAt: data['updatedAt']?.toDate() || new Date()
          });
        });
        this.chatSessionsSubject.next(sessions);
        return sessions;
      }),
      catchError(error => {
        console.error('Error fetching customer chat sessions:', error);
        return of([]);
      })
    );
  }

  /**
   * Get messages for a specific chat session
   */
  getChatMessages(sessionId: string): Observable<ChatMessage[]> {
    const messagesRef = query(
      collection(this.firestore, 'chatSessions', sessionId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    return from(getDocs(messagesRef)).pipe(
      map(snapshot => {
        const messages: ChatMessage[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          messages.push({
            id: doc.id,
            sessionId: data['sessionId'],
            senderId: data['senderId'],
            senderType: data['senderType'],
            message: data['message'],
            messageType: data['messageType'] || 'TEXT',
            timestamp: data['timestamp']?.toDate() || new Date(),
            isRead: data['isRead'] || false,
            metadata: data['metadata']
          });
        });
        this.messagesSubject.next(messages);
        return messages;
      }),
      catchError(error => {
        console.error('Error fetching messages:', error);
        return of([]);
      })
    );
  }

  /**
   * Listen to real-time updates for chat sessions (store-based)
   */
  subscribeToChatSessions(storeId: string): Observable<ChatSession[]> {
    const sessionsRef = query(
      collection(this.firestore, 'chatSessions'),
      where('storeId', '==', storeId),
      orderBy('lastMessageTimestamp', 'desc')
    );

    return new Observable<ChatSession[]>(observer => {
      const unsubscribe = onSnapshot(sessionsRef, snapshot => {
        const sessions: ChatSession[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          sessions.push({
            id: doc.id,
            sessionId: data['sessionId'],
            customerId: data['customerId'],
            customerMobileNumber: data['customerMobileNumber'],
            customerName: data['customerName'],
            storeId: data['storeId'],
            storeName: data['storeName'],
            status: data['status'],
            lastMessageTimestamp: data['lastMessageTimestamp']?.toDate() || new Date(),
            lastMessage: data['lastMessage'],
            unreadMessagesCount: data['unreadMessagesCount'] || 0,
            createdAt: data['createdAt']?.toDate() || new Date(),
            updatedAt: data['updatedAt']?.toDate() || new Date()
          });
        });
        this.chatSessionsSubject.next(sessions);
        observer.next(sessions);
      }, error => {
        console.error('Error in chat sessions subscription:', error);
        observer.error(error);
      });

      return () => unsubscribe();
    });
  }

  /**
   * Listen to real-time updates for customer chat sessions
   */
  subscribeToCustomerChatSessions(): Observable<ChatSession[]> {
    const sessionsRef = query(
      collection(this.firestore, 'chatSessions'),
      orderBy('lastMessageTimestamp', 'desc')
    );

    return new Observable<ChatSession[]>(observer => {
      const unsubscribe = onSnapshot(sessionsRef, snapshot => {
        const sessions: ChatSession[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          sessions.push({
            id: doc.id,
            sessionId: data['sessionId'],
            customerId: data['customerId'],
            customerMobileNumber: data['customerMobileNumber'],
            customerName: data['customerName'],
            storeId: data['storeId'],
            storeName: data['storeName'],
            status: data['status'],
            lastMessageTimestamp: data['lastMessageTimestamp']?.toDate() || new Date(),
            lastMessage: data['lastMessage'],
            unreadMessagesCount: data['unreadMessagesCount'] || 0,
            createdAt: data['createdAt']?.toDate() || new Date(),
            updatedAt: data['updatedAt']?.toDate() || new Date()
          });
        });
        this.chatSessionsSubject.next(sessions);
        observer.next(sessions);
      }, error => {
        console.error('Error in customer chat sessions subscription:', error);
        observer.error(error);
      });

      return () => unsubscribe();
    });
  }

  /**
   * Listen to real-time updates for messages in a session
   */
  subscribeToMessages(sessionId: string): Observable<ChatMessage[]> {
    const messagesRef = query(
      collection(this.firestore, 'chatSessions', sessionId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    return new Observable<ChatMessage[]>(observer => {
      const unsubscribe = onSnapshot(messagesRef, snapshot => {
        const messages: ChatMessage[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          messages.push({
            id: doc.id,
            sessionId: data['sessionId'],
            senderId: data['senderId'],
            senderType: data['senderType'],
            message: data['message'],
            messageType: data['messageType'] || 'TEXT',
            timestamp: data['timestamp']?.toDate() || new Date(),
            isRead: data['isRead'] || false,
            metadata: data['metadata']
          });
        });
        this.messagesSubject.next(messages);
        observer.next(messages);
      }, error => {
        console.error('Error in messages subscription:', error);
        observer.error(error);
      });

      return () => unsubscribe();
    });
  }

  /**
   * Send a message to a chat session
   */
  sendMessage(sessionId: string, message: Omit<ChatMessage, 'id' | 'sessionId' | 'timestamp' | 'isRead'>): Observable<string> {
    const messageData = {
      ...message,
      timestamp: serverTimestamp(),
      isRead: false,
      createdAt: serverTimestamp()
    };

    return from(
            addDoc(collection(this.firestore, 'chatSessions', sessionId, 'messages'), messageData)
          )
          .pipe(
            tap(docRef => {
              this.updateChatSessionLastMessage(sessionId, message.message);
            }),
            map(docRef => docRef.id),
            catchError(error => {
              console.error('Error sending message:', error);
              throw error;
            })
          );
  }

  /**
   * Notify Izinga backend when a new message is sent
   */
  private notifyIzingaBackend(chatSessionId: string, messageId: string): Observable<any> {
    const notificationUrl = `${environment.izingaUrl}/chatSession/${chatSessionId}/message/${messageId}`;
    
    return this.http.get(notificationUrl).pipe(
      catchError(error => {
        console.error('Backend notification failed:', error);
        return of(null); // Don't fail the message send if notification fails
      })
    );
  }

  /**
   * Update chat session status
   */
  updateSessionStatus(sessionId: string, status: 'ACTIVE' | 'INACTIVE' | 'CLOSED'): Observable<void> {
    return from(updateDoc(doc(this.firestore, 'chatSessions', sessionId), {
      status: status,
      updatedAt: serverTimestamp()
    })).pipe(
      catchError(error => {
        console.error('Error updating session status:', error);
        throw error;
      })
    );
  }

  /**
   * Mark messages as read
   */
  markMessagesAsRead(sessionId: string, messageIds: string[]): Observable<void> {
    const batch = writeBatch(this.firestore);
    
    messageIds.forEach(messageId => {
      const messageRef = doc(this.firestore, 'chatSessions', sessionId, 'messages', messageId);
      batch.update(messageRef, { isRead: true });
    });

    // Also update unread count in session
    const sessionRef = doc(this.firestore, 'chatSessions', sessionId);
    batch.update(sessionRef, { unreadMessagesCount: 0 });

    return from(batch.commit()).pipe(
      catchError(error => {
        console.error('Error marking messages as read:', error);
        throw error;
      })
    );
  }

  /**
   * Create a new chat session
   */
  createChatSession(session: Omit<ChatSession, 'id' | 'createdAt' | 'updatedAt'>): Observable<string> {
    const sessionData = {
      ...session,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    console.log('Creating chat session with data:', sessionData);
    return from(addDoc(collection(this.firestore, 'chatSessions'), sessionData)).pipe(
      map(docRef => docRef.id),
      catchError(error => {
        console.error('Error creating chat session:', error);
        throw error;
      })
    );
  }

  /**
   * Get chat session summary for dashboard
   */
  getChatSessionSummary(storeId: string): Observable<ChatSessionSummary> {
    return this.getChatSessions(storeId).pipe(
      map(sessions => {
        const activeSessions = sessions.filter(session => session.status === 'ACTIVE');
        const totalUnreadMessages = sessions.reduce((total, session) => total + session.unreadMessagesCount, 0);
        
        return {
          totalActiveSessions: activeSessions.length,
          totalUnreadMessages: totalUnreadMessages,
          activeSessions: activeSessions.slice(0, 5), // Latest 5 active sessions
          recentSessions: sessions.slice(0, 10) // Latest 10 sessions overall
        };
      })
    );
  }

  private updateChatSessionLastMessage(sessionId: string, lastMessage: string): void {
    updateDoc(doc(this.firestore, 'chatSessions', sessionId), {
      lastMessage: lastMessage,
      lastMessageTimestamp: serverTimestamp(),
      updatedAt: serverTimestamp()
    }).catch(error => {
      console.error('Error updating last message:', error);
    });
  }

  /**
   * Search chat sessions
   */
  searchChatSessions(storeId: string, searchTerm: string): Observable<ChatSession[]> {
    // Note: For full text search, you might want to use a more sophisticated solution
    // like Algolia or implement search indexing
    return this.getChatSessions(storeId).pipe(
      map(sessions => sessions.filter(session => 
        session.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.customerMobileNumber.includes(searchTerm) ||
        session.lastMessage?.toLowerCase().includes(searchTerm.toLowerCase())
      ))
    );
  }
}
