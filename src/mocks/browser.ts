import { setupWorker } from 'msw/browser';
import { handlers } from '@/mocks/handlers';

export const worker = setupWorker(...handlers);

export const enableMocking = async (): Promise<void> => {
  await worker.start({ onUnhandledRequest: 'bypass' });
};
