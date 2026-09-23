import React from 'react';
import { ChatWidget } from './components/widget/ChatWidget';

export const App: React.FC = () => {
  return (
    <main className="min-h-screen bg-slate-900">
      <ChatWidget />
    </main>
  );
};

export default App;
