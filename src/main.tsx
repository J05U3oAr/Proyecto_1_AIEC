import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { currentChatMode } from '@/services/runtimeMode';
import { ChatModeContext } from '@/services/ChatModeContext';
import { ChatServiceContext } from '@/services/ChatServiceContext';
import { chatService, HttpChatService } from '@/services/chatService';

const renderApplication = (): void => {
  const mode = currentChatMode();
  const endpoint = import.meta.env.VITE_CHAT_ENDPOINT;
  const service = mode === 'real' && endpoint ? new HttpChatService(endpoint) : chatService;
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ChatModeContext.Provider value={mode}>
        <ChatServiceContext.Provider value={service}>
          <App />
        </ChatServiceContext.Provider>
      </ChatModeContext.Provider>
    </React.StrictMode>
  );
};

const startApplication = async (): Promise<void> => {
  if (currentChatMode() === 'mock') {
    const { enableMocking } = await import('@/mocks/browser');
    await enableMocking();
  }

  renderApplication();
};

void startApplication();
