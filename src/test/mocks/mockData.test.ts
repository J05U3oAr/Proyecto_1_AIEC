import { describe, expect, it } from 'vitest';
import {
  CODE_DEMO_RESPONSE,
  GALACTIC_GUIDE_RESPONSE,
  getMockResponse,
  TABLE_DEMO_RESPONSE,
} from '@/mocks/mockData';

describe('getMockResponse', () => {
  it('devuelve la respuesta 42 para la pregunta de la guía galáctica', () => {
    expect(getMockResponse('¿Cuál es la respuesta a la vida, el universo y todo?')).toBe(
      GALACTIC_GUIDE_RESPONSE
    );
  });

  it('devuelve una respuesta Markdown para otros mensajes', () => {
    expect(getMockResponse('Necesito ayuda')).toContain('**Necesito ayuda**');
  });

  it('devuelve respuestas enriquecidas para los escenarios del demo', () => {
    expect(getMockResponse('Métricas', 'table')).toBe(TABLE_DEMO_RESPONSE);
    expect(getMockResponse('Código', 'code')).toBe(CODE_DEMO_RESPONSE);
    expect(TABLE_DEMO_RESPONSE).toContain('| Métrica | Resultado |');
    expect(CODE_DEMO_RESPONSE).toContain('```ts');
  });
});
