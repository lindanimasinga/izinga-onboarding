export interface ChatSession {
  id: string;
  sessionId: string;
  customerId: string;
  customerMobileNumber: string;
  customerName?: string;
  storeId: string;
  storeName: string;
  status: 'ACTIVE' | 'INACTIVE' | 'CLOSED';
  lastMessageTimestamp: Date;
  lastMessage?: string;
  unreadMessagesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  senderId: string;
  senderType: 'CUSTOMER' | 'STORE';
  message: string;
  messageType: 'TEXT' | 'IMAGE' | 'AUDIO' | 'DOCUMENT';
  timestamp: Date;
  isRead: boolean;
  metadata?: {
    imageUrl?: string;
    documentUrl?: string;
    audioUrl?: string;
    fileName?: string;
  };
}

export interface ChatSessionSummary {
  totalActiveSessions: number;
  totalUnreadMessages: number;
  activeSessions: ChatSession[];
  recentSessions: ChatSession[];
}