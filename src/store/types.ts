export type Role = 'user' | 'assistant';
export type MessageStatus = 'sending' | 'sent' | 'error';

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  status: MessageStatus;
  details?: ResponseDetails;
}

export interface ChatSession {
  id: string;
  token: string;
  endpoint: string;
}

export interface ChatState {
  session: ChatSession | null;
  conversationVersion: number;
  setSession: (session: ChatSession | null) => void;
  isOpen: boolean;
  isExpanded: boolean;
  messages: Message[];
  isTyping: boolean;
  lastError: ChatFailure | null;
  navigationNotice: NavigationNotice | null;
  setNavigationNotice: (notice: NavigationNotice | null) => void;
  setError: (error: ChatFailure | null) => void;
  toggleChat: () => void;
  toggleExpand: () => void;
  sendMessage: (content: string) => string;
  receiveMessage: (content: string, details?: ResponseDetails) => void;
  markMessageAsSent: (messageId: string) => void;
  markMessageAsError: (messageId: string) => void;
  setTyping: (isTyping: boolean) => void;
  clearChat: () => void;
}
import type { ResponseDetails } from '@/services/responseValidation';
import type { ChatFailure } from '@/services/chatErrors';
import type { NavigationNotice } from '@/services/referenceNavigation';
