export type Role = 'user' | 'assistant';
export type MessageStatus = 'sending' | 'sent' | 'error';

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  status: MessageStatus;
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
  toggleChat: () => void;
  toggleExpand: () => void;
  sendMessage: (content: string) => string;
  receiveMessage: (content: string) => void;
  markMessageAsSent: (messageId: string) => void;
  markMessageAsError: (messageId: string) => void;
  setTyping: (isTyping: boolean) => void;
  clearChat: () => void;
}
