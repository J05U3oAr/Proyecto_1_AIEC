import type { ChatResponse } from '@/services/contracts.generated';
export type { ChatRequest, ChatResponse } from '@/services/contracts.generated';

export interface IChatService {
  sendMessage(prompt: string): Promise<ChatResponse>;
  clearSession?(): Promise<void>;
  cancelPending?(): void;
}
