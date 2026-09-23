import React from 'react';
import { Minus, RotateCcw, Maximize2, Minimize2 } from 'lucide-react';
import { useChatStore } from '../../store/useChatStore';

// Simple bear head SVG matching the minimalist wireframe
const BearAvatar = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Avatar de Sofía">
    <circle cx="32" cy="32" r="31" fill="white" stroke="black" strokeWidth="1.5" />
    <circle cx="18" cy="23.5" r="9" fill="black" />
    <circle cx="46" cy="23.5" r="9" fill="black" />
    <rect x="17" y="19.2" width="30" height="32" rx="10" fill="black" />
    <circle cx="25" cy="30.6" r="2" fill="white" />
    <circle cx="39" cy="30.6" r="2" fill="white" />
    <rect x="22.5" y="36.5" width="19" height="13" rx="7" fill="white" />
    <polygon points="29.5,39.5 34.5,39.5 32,42.5" fill="black" stroke="black" strokeLinejoin="round" strokeWidth="1.5" />
  </svg>
);

export const ChatHeader: React.FC = () => {
  const { toggleChat, clearChat, isExpanded, toggleExpand } = useChatStore();

  return (
    <div className="flex flex-col items-center px-6 pt-10 pb-4 bg-white relative">
      {/* Botones de acción minimalistas en la esquina superior derecha */}
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={clearChat}
          className="p-1 text-gray-400 hover:text-black transition-colors rounded-full"
          aria-label="Reiniciar chat"
          title="Reiniciar chat"
        >
          <RotateCcw size={16} strokeWidth={2} />
        </button>
        <button
          onClick={toggleExpand}
          className="p-1 text-gray-400 hover:text-black transition-colors rounded-full"
          aria-label={isExpanded ? "Contraer chat" : "Expandir chat"}
          title={isExpanded ? "Contraer chat" : "Expandir chat"}
        >
          {isExpanded ? <Minimize2 size={16} strokeWidth={2} /> : <Maximize2 size={16} strokeWidth={2} />}
        </button>
        <button
          onClick={toggleChat}
          className="p-1 text-gray-400 hover:text-black transition-colors rounded-full"
          aria-label="Minimizar ventana"
          title="Minimizar ventana"
        >
          <Minus size={16} strokeWidth={2} />
        </button>
      </div>

      <div className="mb-4 relative">
        <BearAvatar />
        {/* Indicador de estado online */}
        <span
          className="absolute bottom-1 right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"
          aria-label="Estado: En línea"
        ></span>
      </div>

      <h2 className="text-center font-bold text-lg text-black mb-1 max-w-[280px]">
        ¡Hola soy tu asistente virtual Sofía!
      </h2>

      <p className="text-center text-sm text-black max-w-[280px]">
        Escribe una duda y yo te ayudaré en lo que pueda
      </p>
    </div>
  );
};
