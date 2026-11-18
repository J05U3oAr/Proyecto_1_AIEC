import React from 'react';
import { Minus, RotateCcw, Maximize2, Minimize2 } from 'lucide-react';
import { useChat } from '@/hooks/useChat';
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
  welcomeMessage = 'Soy una IA. Puedo recomendarte películas y compararlas con sus libros cuando exista una adaptación.',
  avatarUrl,
}) => {
  const { toggleChat, isExpanded, toggleExpand } = useChatStore();
  const { reset } = useChat();

  return (
    <div className="relative shrink-0 bg-[var(--agichat-surface)] px-4 pb-3 pt-14 text-[var(--agichat-text)]">
      {/* Botones de acción minimalistas en la esquina superior derecha */}
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={reset}
          className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--agichat-text)] focus-visible:outline focus-visible:outline-2"
          aria-label="Reiniciar chat"
          title="Reiniciar chat"
        >
          <RotateCcw size={16} strokeWidth={2} />
        </button>
        <button
          onClick={toggleExpand}
          className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--agichat-text)] focus-visible:outline focus-visible:outline-2"
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
          className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--agichat-text)] focus-visible:outline focus-visible:outline-2"
          aria-label="Minimizar ventana"
          title="Minimizar ventana"
        >
          <Minus size={16} strokeWidth={2} />
        </button>
      </div>

      <div className="float-left mr-3 mt-1">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={`Avatar de ${agentName}`}
            className="h-8 w-8 rounded-full border border-[var(--agichat-border)] object-cover"
          />
        ) : (
          <BearAvatar size={32} ariaLabel={`Avatar de ${agentName}`} />
        )}
      </div>

      <h2 className="mb-1 text-lg font-bold text-[var(--agichat-text)]">
        ¡Hola soy tu asistente virtual {agentName}!
      </h2>

      <p className="clear-both pt-2 text-sm text-[var(--agichat-text-muted)] [@media(max-height:500px)]:sr-only">
        {welcomeMessage}
      </p>
    </div>
  );
};
