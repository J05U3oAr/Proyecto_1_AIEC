import { ChatWidget } from '../components/widget/ChatWidget';
import '../index.css';
import { AGIChatWidgetProps } from './types';
import { useEffect, useMemo } from 'react';
import { HttpChatService, chatService } from '@/services/chatService';
import { ChatServiceContext } from '@/services/ChatServiceContext';

export function AGIChatWidget({ apiEndpoint, ...props }: AGIChatWidgetProps) {
  const service = useMemo(
    () => (apiEndpoint ? new HttpChatService(apiEndpoint) : chatService),
    [apiEndpoint]
  );
  useEffect(() => () => service.cancelPending?.(), [service]);
  return (
    <ChatServiceContext.Provider value={service}>
      <ChatWidget {...props} />
    </ChatServiceContext.Provider>
  );
}
