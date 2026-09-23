import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AGIChatWidget, WidgetPosition } from '@/sdk';
import { useChatStore } from '@/store/useChatStore';

describe('AGIChatWidget', () => {
  beforeEach(() => {
    useChatStore.setState({
      isOpen: true,
      isExpanded: false,
      messages: [],
      isTyping: false,
    });
    window.HTMLElement.prototype.scrollTo = vi.fn();
  });

  it('incluye una configuración predeterminada lista para usar', () => {
    const { container } = render(<AGIChatWidget />);
    const widget = container.querySelector('[data-agichat-widget]');

    expect(screen.getByText('¡Hola soy tu asistente virtual Sofía!')).toBeInTheDocument();
    expect(
      screen.getByText('Escribe una duda y yo te ayudaré en lo que pueda')
    ).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Avatar de Sofía' })).toBeInTheDocument();
    expect(widget).toHaveAttribute('data-theme', 'light');
    expect(widget).toHaveAttribute('data-position', 'bottom-right');
  });

  it('personaliza el agente, el mensaje de bienvenida y el avatar', () => {
    render(
      <AGIChatWidget
        agentName="Luna"
        welcomeMessage="¿En qué puedo ayudarte hoy?"
        avatarUrl="https://example.com/luna.png"
      />
    );

    expect(screen.getByText('¡Hola soy tu asistente virtual Luna!')).toBeInTheDocument();
    expect(screen.getByText('¿En qué puedo ayudarte hoy?')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Avatar de Luna' })).toHaveAttribute(
      'src',
      'https://example.com/luna.png'
    );
  });

  it.each<{
    position: WidgetPosition;
    panelClasses: string[];
    launcherClasses: string[];
  }>([
    {
      position: 'bottom-right',
      panelClasses: ['bottom-24', 'right-6'],
      launcherClasses: ['bottom-6', 'right-6'],
    },
    {
      position: 'bottom-left',
      panelClasses: ['bottom-24', 'left-6'],
      launcherClasses: ['bottom-6', 'left-6'],
    },
    {
      position: 'top-right',
      panelClasses: ['top-24', 'right-6'],
      launcherClasses: ['top-6', 'right-6'],
    },
    {
      position: 'top-left',
      panelClasses: ['top-24', 'left-6'],
      launcherClasses: ['top-6', 'left-6'],
    },
  ])('ubica el widget en $position', ({ position, panelClasses, launcherClasses }) => {
    render(<AGIChatWidget position={position} />);

    const panel = screen.getByText(/soy tu asistente virtual/i).closest('div.fixed');
    const launcher = screen.getByRole('button', { name: 'Cerrar chat' });

    expect(panel).toHaveClass(...panelClasses);
    expect(launcher).toHaveClass(...launcherClasses);
  });

  it('aplica el tema oscuro predefinido', () => {
    const { container } = render(<AGIChatWidget theme="dark" />);
    const widget = container.querySelector<HTMLElement>('[data-agichat-widget]');

    expect(widget).toHaveAttribute('data-theme', 'dark');
    expect(widget?.style.getPropertyValue('--agichat-surface')).toBe('#0f172a');
    expect(widget?.style.getPropertyValue('--agichat-text')).toBe('#f8fafc');
  });

  it('combina colores personalizados con los valores seguros del tema claro', () => {
    const { container } = render(
      <AGIChatWidget theme={{ primary: '#7c3aed', surface: '#faf5ff' }} />
    );
    const widget = container.querySelector<HTMLElement>('[data-agichat-widget]');

    expect(widget).toHaveAttribute('data-theme', 'custom');
    expect(widget?.style.getPropertyValue('--agichat-primary')).toBe('#7c3aed');
    expect(widget?.style.getPropertyValue('--agichat-surface')).toBe('#faf5ff');
    expect(widget?.style.getPropertyValue('--agichat-text')).toBe('#0f172a');
  });
});
