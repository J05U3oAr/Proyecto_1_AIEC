import { delay, http, HttpResponse } from 'msw';
import { getMockScenario } from '@/mocks/demoScenario';
import { getMockResponse } from '@/mocks/mockData';
import type { ChatRequest, ChatResponse } from '@/services/types';
import { cinemaFixture } from '@/mocks/cinemaFixtures';

const getLatency = (): number => 800 + Math.floor(Math.random() * 701);

export const handlers = [
  http.post('*/api/chat', async ({ request }) => {
    const body = (await request.json()) as ChatRequest;
    const scenario = getMockScenario();

    await delay(getLatency());

    if (scenario === 'error') {
      return HttpResponse.json(
        { message: 'El agente no está disponible temporalmente.' },
        { status: 503 }
      );
    }

    if (scenario !== 'default' && scenario !== 'table' && scenario !== 'code') {
      return HttpResponse.json(cinemaFixture(scenario, body.requestId));
    }

    const response: ChatResponse = {
      response: getMockResponse(body.prompt, scenario),
    };

    return HttpResponse.json(response);
  }),
];
