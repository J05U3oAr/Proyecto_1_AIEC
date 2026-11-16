export interface ChatRequest {
  prompt: string;
  sessionId?: string;
  requestId?: string;
}

export interface ChatResponse {
  response: string;
  sessionId?: string;
  requestId?: string;
}

export interface IChatService {
  sendMessage(prompt: string): Promise<ChatResponse>;
  clearSession?(): Promise<void>;
}
