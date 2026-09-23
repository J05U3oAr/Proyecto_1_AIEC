import { describe, expect, it } from 'vitest';
import { GALACTIC_GUIDE_RESPONSE, getMockResponse } from '@/mocks/mockData';

describe('getMockResponse', () => {
  it('devuelve la respuesta 42 para la pregunta de la guía galáctica', () => {
    expect(getMockResponse('¿Cuál es la respuesta a la vida, el universo y todo?')).toBe(
      GALACTIC_GUIDE_RESPONSE
    );
  });

  it('devuelve una respuesta Markdown para otros mensajes', () => {
    expect(getMockResponse('Necesito ayuda')).toContain('**Necesito ayuda**');
  });
});
