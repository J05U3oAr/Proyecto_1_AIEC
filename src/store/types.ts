export type Role = 'user' | 'assistant';
export type MessageStatus = 'sending' | 'sent' | 'error';

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  status: MessageStatus;
}

export interface ChatState {
  isOpen: boolean;
  isExpanded: boolean;
  messages: Message[];
  isTyping: boolean;
  toggleChat: () => void;
  toggleExpand: () => void;
  addMessage: (message: { role: Role; content: string; status?: MessageStatus }) => void;
  sendMessage: (content: string) => string;
  receiveMessage: (content: string) => void;
  markMessageAsSent: (messageId: string) => void;
  markMessageAsError: (messageId: string) => void;
  setTyping: (isTyping: boolean) => void;
  clearChat: () => void;
}
