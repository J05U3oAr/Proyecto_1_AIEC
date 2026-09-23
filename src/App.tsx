import React from 'react';
import { ChatWidget } from '@/components/widget/ChatWidget';
import { BearAvatar } from '@/components/widget/ChatHeader';

export const App: React.FC = () => {
  return (
    <main className="min-h-screen bg-black font-mono relative flex flex-col items-center justify-center p-6 text-center text-green-500 overflow-hidden">
      <div className="absolute top-6 left-6 text-left text-sm md:text-base opacity-80 pointer-events-none">
        <p>AGI_OS v1.0.42 (tty1)</p>
        <p className="mt-2">root@agichat:~$ ./start_system.sh</p>
        <p className="mt-1 animate-pulse">Cargando módulo &quot;Sofia&quot;... [OK]</p>
      </div>

      <div className="opacity-30 animate-pulse pointer-events-none flex flex-col items-center">
        <BearAvatar size={250} />
        <h1 className="text-4xl font-bold mt-8 tracking-widest uppercase">AGIChat</h1>
      </div>
      <ChatWidget />
    </main>
  );
};

export default App;
