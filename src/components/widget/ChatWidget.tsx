import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '../../store/useChatStore';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { FloatingLauncher } from './FloatingLauncher';

export const ChatWidget: React.FC = () => {
  const { isOpen, isExpanded } = useChatStore();

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3, type: 'spring', bounce: 0 }}
            className={`fixed bg-white shadow-widget flex flex-col overflow-hidden z-50 rounded-2xl border border-gray-100 ${
              isExpanded 
                ? 'inset-0 m-auto w-[800px] h-[80vh] max-w-[95vw]' 
                : 'bottom-24 right-6 w-[380px] h-[600px] max-h-[calc(100vh-120px)] origin-bottom-right'
            }`}
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
