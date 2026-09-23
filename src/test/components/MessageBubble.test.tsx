import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MessageBubble } from '@/components/widget/MessageBubble';
import { Message } from '@/store/types';

const createMessage = (role: Message['role'], content: string): Message => ({
  id: 'message-1',
  role,
  content,
  timestamp: 1,
  status: 'sent',
});

describe('MessageBubble', () => {
  it('mantiene el contenido del usuario como texto literal', () => {
    render(<MessageBubble message={createMessage('user', '**texto literal**')} />);

    expect(screen.getByText('**texto literal**')).toBeInTheDocument();
    expect(screen.queryByText('texto literal')).not.toBeInTheDocument();
  });

  it('renderiza el Markdown de los mensajes del asistente', () => {
    render(<MessageBubble message={createMessage('assistant', '**respuesta enriquecida**')} />);

    expect(screen.getByText('respuesta enriquecida').tagName).toBe('STRONG');
  });

  it('informa cuando un mensaje del usuario no pudo enviarse', () => {
    render(
      <MessageBubble message={{ ...createMessage('user', 'Mensaje fallido'), status: 'error' }} />
    );

    expect(screen.getByRole('status')).toHaveTextContent('No se pudo enviar');
  });
});
