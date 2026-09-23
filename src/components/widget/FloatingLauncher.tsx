import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';
import { useChatStore } from '../../store/useChatStore';

export const FloatingLauncher: React.FC = () => {
  const { isOpen, toggleChat } = useChatStore();

  return (
    <motion.button
      onClick={toggleChat}
      className="fixed bottom-6 right-6 w-14 h-14 bg-black text-white rounded-full flex items-center justify-center shadow-widget z-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
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
