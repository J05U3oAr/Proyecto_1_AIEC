import React, { CSSProperties } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '@/store/useChatStore';
import { AGIChatWidgetProps, WidgetPosition } from '@/sdk/types';
import { resolveWidgetTheme } from '@/sdk/theme';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { FloatingLauncher } from './FloatingLauncher';

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
  welcomeMessage = 'Escribe una duda y yo te ayudaré en lo que pueda',
  avatarUrl,
  position = 'bottom-right',
  theme = 'light',
}) => {
  const { isOpen, isExpanded } = useChatStore();
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
      style={widgetStyles}
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3, type: 'spring', bounce: 0 }}
            className={`fixed flex flex-col overflow-hidden z-50 rounded-2xl border border-[var(--agichat-border)] bg-[var(--agichat-surface)] text-[var(--agichat-text)] shadow-widget ${
              isExpanded
                ? 'inset-0 m-auto w-[800px] h-[80vh] max-w-[95vw]'
                : `${panelPositionClasses[position]} w-[380px] h-[600px] max-h-[calc(100vh-120px)]`
            }`}
          >
            <ChatHeader
              agentName={agentName}
              welcomeMessage={welcomeMessage}
              avatarUrl={avatarUrl}
            />
            <MessageList />
            <div className="border-t border-[var(--agichat-border)]">
              <ChatInput />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <FloatingLauncher position={position} />
    </div>
  );
};
