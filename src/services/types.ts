import type { ChatResponse } from '@/services/contracts.generated';
import type { NavigationIntent } from '@/services/contracts.generated';
export type { ChatRequest, ChatResponse } from '@/services/contracts.generated';

export interface ChatSendOptions {
  requestId: string;
  navigationIntent: NavigationIntent;
}

export interface IChatService {
  sendMessage(prompt: string, options?: ChatSendOptions): Promise<ChatResponse>;
  clearSession?(): Promise<void>;
  cancelPending?(): void;
}
