import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { shouldEnableMocking } from '@/services/runtimeMode';
import { enableMocking } from '@/mocks/browser';

const renderApplication = (): void => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

const startApplication = async (): Promise<void> => {
  if (shouldEnableMocking(import.meta.env.DEV, import.meta.env.VITE_CHAT_MODE)) {
    await enableMocking();
  }

  renderApplication();
};

void startApplication();
