import { createContext } from 'react';
import { chatService } from '@/services/chatService';
import type { IChatService } from '@/services/types';

export const ChatServiceContext = createContext<IChatService>(chatService);
