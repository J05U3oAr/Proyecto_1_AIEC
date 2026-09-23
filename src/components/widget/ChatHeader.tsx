import React from 'react';
import { Minus, RotateCcw } from 'lucide-react';
import { useChatStore } from '../../store/useChatStore';

// Simple bear head SVG matching the minimalist wireframe
const BearAvatar = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Avatar de Sofía">
    <circle cx="32" cy="32" r="31" fill="white" stroke="black" strokeWidth="1.5" />
    <path d="M48 24C48 27.3137 45.3137 30 42 30C38.6863 30 36 27.3137 36 24C36 20.6863 38.6863 18 42 18C45.3137 18 48 20.6863 48 24Z" fill="black" />
    <path d="M28 24C28 27.3137 25.3137 30 22 30C18.6863 30 16 27.3137 16 24C16 20.6863 18.6863 18 22 18C25.3137 18 28 20.6863 28 24Z" fill="black" />
    <rect x="22" y="24" width="20" height="22" rx="10" fill="black" />
    <circle cx="27" cy="31" r="3" fill="white" />
    <circle cx="37" cy="31" r="3" fill="white" />
    <ellipse cx="32" cy="40" rx="6" ry="4" fill="white" />
    <ellipse cx="32" cy="39" rx="3" ry="2" fill="black" />
  </svg>
);

export const ChatHeader: React.FC = () => {
  const { toggleChat, clearChat } = useChatStore();

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
