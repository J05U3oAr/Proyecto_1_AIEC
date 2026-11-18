import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { currentChatMode } from '@/services/runtimeMode';
import { ChatModeContext } from '@/services/ChatModeContext';

const renderApplication = (): void => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ChatModeContext.Provider value={currentChatMode()}>
        <App />
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
