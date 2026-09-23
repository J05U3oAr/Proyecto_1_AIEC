export type Role = 'user' | 'assistant';

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
}

export interface ChatState {
  isOpen: boolean;
  isExpanded: boolean;
  messages: Message[];
  isTyping: boolean;
  toggleChat: () => void;
  toggleExpand: () => void;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  setTyping: (isTyping: boolean) => void;
  clearChat: () => void;
}
