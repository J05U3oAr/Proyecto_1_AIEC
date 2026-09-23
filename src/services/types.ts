export interface ChatRequest {
  prompt: string;
}

export interface ChatResponse {
  response: string;
}

export interface IChatService {
  sendMessage(prompt: string): Promise<ChatResponse>;
}
