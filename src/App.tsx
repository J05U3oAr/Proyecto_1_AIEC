import React, { useState } from 'react';
import { ChatWidget } from './components/widget/ChatWidget';

export const App: React.FC = () => {
  const [count, setCount] = useState(0);

  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-slate-800/80 backdrop-blur rounded-2xl p-8 border border-slate-700 shadow-xl">
        <h1 className="text-3xl font-bold tracking-tight text-blue-400">AGIChat SDK</h1>
        <p className="mt-2 text-slate-400 text-sm">
          Configuración Base — React + Vite + TypeScript + Tailwind CSS
        </p>
        <div className="mt-6 flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={() => setCount(prev => prev + 1)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Contador: {count}
          </button>
          <span className="text-xs text-slate-400 font-mono">
            Entorno inicial listo para desarrollo
          </span>
        </div>
      </div>
      <ChatWidget />
    </main>
  );
};

export default App;
