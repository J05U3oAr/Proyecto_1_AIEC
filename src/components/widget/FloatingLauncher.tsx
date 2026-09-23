import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';
import { useChatStore } from '@/store/useChatStore';
import { WidgetPosition } from '@/sdk/types';

interface FloatingLauncherProps {
  position?: WidgetPosition;
}

const launcherPositionClasses: Record<WidgetPosition, string> = {
  'bottom-right': 'bottom-6 right-6',
  'bottom-left': 'bottom-6 left-6',
  'top-right': 'top-6 right-6',
  'top-left': 'top-6 left-6',
};

export const FloatingLauncher: React.FC<FloatingLauncherProps> = ({
  position = 'bottom-right',
}) => {
  const { isOpen, toggleChat } = useChatStore();

  return (
    <motion.button
      onClick={toggleChat}
      className={`fixed ${launcherPositionClasses[position]} w-14 h-14 bg-[var(--agichat-primary)] text-[var(--agichat-primary-contrast)] rounded-full flex items-center justify-center shadow-widget z-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--agichat-primary)]`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label={isOpen ? 'Cerrar chat' : 'Abrir chat'}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isOpen ? (
          <motion.div
            key="close"
            initial={{ opacity: 0, rotate: -90 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: 90 }}
            transition={{ duration: 0.2 }}
          >
            <X size={24} />
          </motion.div>
        ) : (
          <motion.div
            key="open"
            initial={{ opacity: 0, rotate: 90 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: -90 }}
            transition={{ duration: 0.2 }}
          >
            <MessageCircle size={24} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
};
