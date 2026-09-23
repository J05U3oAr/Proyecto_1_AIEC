import React from 'react';
import { ChatWidget } from './components/widget/ChatWidget';
import { BearAvatar } from './components/widget/ChatHeader';

export const App: React.FC = () => {
  return (
    <main className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
      <div className="opacity-20 animate-pulse pointer-events-none flex flex-col items-center">
        <BearAvatar size={250} />
        <h1 className="text-4xl font-bold text-white mt-8 tracking-widest uppercase">AGIChat</h1>
      </div>
      <ChatWidget />
    </main>
  );
};

export default App;
