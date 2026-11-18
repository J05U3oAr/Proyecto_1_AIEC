import { ChatWidget } from '../components/widget/ChatWidget';
import '@/sdk/widget.css';
import { AGIChatWidgetProps } from './types';
import { useEffect, useMemo } from 'react';
import { HttpChatService, chatService } from '@/services/chatService';
import { ChatServiceContext } from '@/services/ChatServiceContext';
import { cancelNavigationFor } from '@/services/conversation';

export function AGIChatWidget({ apiEndpoint, ...props }: AGIChatWidgetProps) {
  const service = useMemo(
    () => (apiEndpoint ? new HttpChatService(apiEndpoint) : chatService),
    [apiEndpoint]
  );
  useEffect(
    () => () => {
      cancelNavigationFor(service);
      service.cancelPending?.();
    },
    [service]
  );
  return (
    <ChatServiceContext.Provider value={service}>
      <ChatWidget {...props} />
    </ChatServiceContext.Provider>
  );
}
