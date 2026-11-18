import React, { CSSProperties, useContext, useEffect, useId, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useChatStore } from '@/store/useChatStore';
import { AGIChatWidgetProps, WidgetPosition } from '@/sdk/types';
import { resolveWidgetTheme } from '@/sdk/theme';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { FloatingLauncher } from './FloatingLauncher';
import { ProviderCredits } from './ProviderCredits';
import { ChatModeContext } from '@/services/ChatModeContext';

const panelPositionClasses: Record<WidgetPosition, string> = {
  'bottom-right': 'bottom-24 right-6 origin-bottom-right',
  'bottom-left': 'bottom-24 left-6 origin-bottom-left',
  'top-right': 'top-24 right-6 origin-top-right',
  'top-left': 'top-24 left-6 origin-top-left',
};

interface WidgetCSSProperties extends CSSProperties {
  '--agichat-primary': string;
  '--agichat-primary-contrast': string;
  '--agichat-surface': string;
  '--agichat-surface-muted': string;
  '--agichat-text': string;
  '--agichat-text-muted': string;
  '--agichat-border': string;
}

export const ChatWidget: React.FC<AGIChatWidgetProps> = ({
  agentName = 'Sofía',
  welcomeMessage = 'Soy una IA. Puedo recomendarte películas y compararlas con sus libros cuando exista una adaptación.',
  avatarUrl,
  position = 'bottom-right',
  theme = 'light',
}) => {
  const { isOpen, isExpanded } = useChatStore();
  const mode = useContext(ChatModeContext);
  const reducedMotion = useReducedMotion();
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    let cancelled = false;
    if (isOpen)
      queueMicrotask(() => {
        if (!cancelled) panelRef.current?.querySelector('textarea')?.focus({ preventScroll: true });
      });
    else if (wasOpen.current) launcherRef.current?.focus({ preventScroll: true });
    wasOpen.current = isOpen;
    return () => {
      cancelled = true;
    };
  }, [isOpen]);
  const resolvedTheme = resolveWidgetTheme(theme);
  const widgetStyles: WidgetCSSProperties = {
    '--agichat-primary': resolvedTheme.colors.primary,
    '--agichat-primary-contrast': resolvedTheme.colors.primaryContrast,
    '--agichat-surface': resolvedTheme.colors.surface,
    '--agichat-surface-muted': resolvedTheme.colors.surfaceMuted,
    '--agichat-text': resolvedTheme.colors.text,
    '--agichat-text-muted': resolvedTheme.colors.textMuted,
    '--agichat-border': resolvedTheme.colors.border,
  };

  return (
    <div
      data-agichat-widget=""
      data-position={position}
      data-theme={resolvedTheme.name}
      data-mode={mode}
      style={widgetStyles}
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id={panelId}
            ref={panelRef}
            role="region"
            aria-label={`Chat de ${agentName}`}
            onKeyDown={event => {
              if (event.key === 'Escape' && useChatStore.getState().isOpen) {
                event.preventDefault();
                useChatStore.getState().toggleChat();
              }
            }}
            layout={!reducedMotion}
            initial={reducedMotion ? false : { opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.95 }}
            transition={
              reducedMotion ? { duration: 0 } : { duration: 0.3, type: 'spring', bounce: 0 }
            }
            className={`fixed flex flex-col overflow-hidden z-50 rounded-2xl border border-[var(--agichat-border)] bg-[var(--agichat-surface)] text-[var(--agichat-text)] shadow-widget max-sm:inset-3 max-sm:m-0 max-sm:h-auto max-sm:w-auto max-sm:max-w-none max-sm:max-h-none [@media(max-height:700px)]:inset-y-3 [@media(max-height:700px)]:h-auto [@media(max-height:700px)]:max-h-none ${
              isExpanded
                ? 'inset-0 m-auto w-[800px] h-[80vh] max-w-[95vw]'
                : `${panelPositionClasses[position]} w-[380px] max-w-[calc(100vw-48px)] h-[600px] max-h-[calc(100dvh-120px)]`
            }`}
          >
            <ChatHeader agentName={agentName} avatarUrl={avatarUrl} />
            <MessageList agentName={agentName} welcomeMessage={welcomeMessage} />
            <p className="shrink-0 px-4 py-1 text-sm text-[var(--agichat-text-muted)]">
              {mode === 'mock'
                ? 'Modo simulado · respuestas de prueba'
                : 'Modo real · consultas al agente al enviar'}
            </p>
            <div className="min-h-0 max-h-[45dvh] overflow-y-auto border-t border-[var(--agichat-border)]">
              <ChatInput />
            </div>
            <ProviderCredits />
          </motion.div>
        )}
      </AnimatePresence>
      <FloatingLauncher position={position} buttonRef={launcherRef} panelId={panelId} />
    </div>
  );
};
