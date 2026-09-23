import type { MockScenario } from '@/mocks/demoScenario';

export const GALACTIC_GUIDE_RESPONSE =
  'Según *La guía del autoestopista galáctico*, la respuesta a la vida, el universo y todo lo demás es **42**.';

export const TABLE_DEMO_RESPONSE = `## Métricas del piloto

| Métrica | Resultado |
| --- | ---: |
| Conversaciones | 200 |
| Satisfacción | 98% |
| Respuesta promedio | 1.2 s |`;

export const CODE_DEMO_RESPONSE = `## Ejemplo de integración

\`\`\`ts
const widget = new AGIChatWidget({
  agentName: 'Sofía',
  position: 'bottom-right',
});
\`\`\``;

export const getMockResponse = (prompt: string, scenario: MockScenario = 'default'): string => {
  if (scenario === 'table') {
    return TABLE_DEMO_RESPONSE;
  }

  if (scenario === 'code') {
    return CODE_DEMO_RESPONSE;
  }

  const normalizedPrompt = prompt.toLocaleLowerCase();

  if (
    normalizedPrompt.includes('vida') &&
    normalizedPrompt.includes('universo') &&
    normalizedPrompt.includes('todo')
  ) {
    return GALACTIC_GUIDE_RESPONSE;
  }

  return `¡Hola! Soy Sofía. Recibí tu mensaje: **${prompt}**. ¿En qué más puedo ayudarte?`;
};
