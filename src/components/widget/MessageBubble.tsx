import React from 'react';
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';
import { Message } from '@/store/types';

interface Props {
  message: Message;
}

export const MessageBubble: React.FC<Props> = ({ message }) => {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end mb-6">
        <div className="px-6 py-2 border border-black rounded-full max-w-[85%] bg-white text-black text-sm shadow-sm">
          {message.content}
        </div>
      </div>
    );
  }

  // Assistant message: Plain text left-aligned, no bubble background according to wireframe
  return (
    <div className="flex justify-start mb-6">
      <div className="max-w-[90%] text-black">
        <MarkdownRenderer content={message.content} />
      </div>
    </div>
  );
};
