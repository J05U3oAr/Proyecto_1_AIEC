import { createContext } from 'react';
import type { ChatMode } from '@/services/runtimeMode';

// Embedding the SDK never starts MSW. Only the demo bootstrap enables it.
export const ChatModeContext = createContext<ChatMode>('real');
