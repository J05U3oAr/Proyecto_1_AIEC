import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '../../store/useChatStore';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { FloatingLauncher } from './FloatingLauncher';

export const ChatWidget: React.FC = () => {
  const { isOpen } = useChatStore();

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-24 right-6 w-[380px] h-[600px] max-h-[calc(100vh-120px)] bg-white shadow-widget flex flex-col overflow-hidden z-50 origin-bottom-right"
          >
            <ChatHeader />
            <MessageList />
            <div className="border-t border-black">
              <ChatInput />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <FloatingLauncher />
    </>
  );
};
