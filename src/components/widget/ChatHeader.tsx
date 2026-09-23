import React from 'react';
import { Minus, RotateCcw, Maximize2, Minimize2 } from 'lucide-react';
import { useChatStore } from '@/store/useChatStore';

// Simple bear head SVG matching the minimalist wireframe
export const BearAvatar = ({
  size = 64,
  ariaLabel = 'Avatar de Sofía',
}: {
  size?: number | string;
  ariaLabel?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label={ariaLabel}
  >
    <circle cx="32" cy="32" r="31" fill="white" stroke="black" strokeWidth="1.5" />
    <circle cx="18" cy="23.5" r="9" fill="black" />
    <circle cx="46" cy="23.5" r="9" fill="black" />
    <rect x="17" y="19.2" width="30" height="32" rx="10" fill="black" />
    <circle cx="25" cy="30.6" r="2" fill="white" />
    <circle cx="39" cy="30.6" r="2" fill="white" />
    <rect x="22.5" y="36.5" width="19" height="13" rx="7" fill="white" />
    <polygon
      points="29.5,39.5 34.5,39.5 32,42.5"
      fill="black"
      stroke="black"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
  </svg>
);

interface ChatHeaderProps {
  agentName?: string;
  welcomeMessage?: string;
  avatarUrl?: string;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  agentName = 'Sofía',
  welcomeMessage = 'Escribe una duda y yo te ayudaré en lo que pueda',
  avatarUrl,
}) => {
  const { toggleChat, clearChat, isExpanded, toggleExpand } = useChatStore();

  return (
    <div className="relative flex flex-col items-center bg-[var(--agichat-surface)] px-6 pb-4 pt-10 text-[var(--agichat-text)]">
      {/* Botones de acción minimalistas en la esquina superior derecha */}
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={clearChat}
          className="rounded-full p-1 text-[var(--agichat-text-muted)] transition-colors hover:text-[var(--agichat-text)]"
          aria-label="Reiniciar chat"
          title="Reiniciar chat"
        >
          <RotateCcw size={16} strokeWidth={2} />
        </button>
        <button
          onClick={toggleExpand}
          className="rounded-full p-1 text-[var(--agichat-text-muted)] transition-colors hover:text-[var(--agichat-text)]"
          aria-label={isExpanded ? 'Contraer chat' : 'Expandir chat'}
          title={isExpanded ? 'Contraer chat' : 'Expandir chat'}
        >
          {isExpanded ? (
            <Minimize2 size={16} strokeWidth={2} />
          ) : (
            <Maximize2 size={16} strokeWidth={2} />
          )}
        </button>
        <button
          onClick={toggleChat}
          className="rounded-full p-1 text-[var(--agichat-text-muted)] transition-colors hover:text-[var(--agichat-text)]"
          aria-label="Minimizar ventana"
          title="Minimizar ventana"
        >
          <Minus size={16} strokeWidth={2} />
        </button>
      </div>

      <div className="mb-4 relative">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={`Avatar de ${agentName}`}
            className="h-16 w-16 rounded-full border border-[var(--agichat-border)] object-cover"
          />
        ) : (
          <BearAvatar ariaLabel={`Avatar de ${agentName}`} />
        )}
        {/* Indicador de estado online */}
        <span
          className="absolute bottom-1 right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"
          aria-label="Estado: En línea"
        ></span>
      </div>

      <h2 className="mb-1 max-w-[280px] text-center text-lg font-bold text-[var(--agichat-text)]">
        ¡Hola soy tu asistente virtual {agentName}!
      </h2>

      <p className="max-w-[280px] text-center text-sm text-[var(--agichat-text-muted)]">
        {welcomeMessage}
      </p>
    </div>
  );
};
