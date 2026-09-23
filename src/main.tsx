import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { enableMocking } from '@/mocks/browser';

const renderApplication = (): void => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

const startApplication = async (): Promise<void> => {
  if (import.meta.env.DEV) {
    await enableMocking();
  }

  renderApplication();
};

void startApplication();
