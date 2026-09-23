import { delay, http, HttpResponse } from 'msw';
import { getMockResponse } from '@/mocks/mockData';
import type { ChatRequest, ChatResponse } from '@/services/types';

const getLatency = (): number => 800 + Math.floor(Math.random() * 701);

export const handlers = [
  http.post('/api/chat', async ({ request }) => {
    const body = (await request.json()) as ChatRequest;

    await delay(getLatency());

    const response: ChatResponse = {
      response: getMockResponse(body.prompt),
    };

    return HttpResponse.json(response);
  }),
];
