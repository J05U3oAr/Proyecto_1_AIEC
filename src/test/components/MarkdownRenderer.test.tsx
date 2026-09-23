import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';

describe('MarkdownRenderer', () => {
  it('renderiza texto enriquecido, listas, citas y tablas GFM', () => {
    const content = [
      '# Respuesta',
      '',
      'Texto con **negrita** y *cursiva*.',
      '',
      '- elemento',
      '',
      '> Una cita',
      '',
      '| Nombre | Valor |',
      '| --- | --- |',
      '| sentido de la vida | 42 |',
    ].join('\n');

    const { container } = render(<MarkdownRenderer content={content} />);

    expect(screen.getByRole('heading', { name: 'Respuesta' })).toBeInTheDocument();
    expect(screen.getByText('negrita').tagName).toBe('STRONG');
    expect(screen.getByText('cursiva').tagName).toBe('EM');
    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(container.querySelector('blockquote')).toHaveTextContent('Una cita');
    expect(screen.getByRole('table')).toHaveTextContent('sentido de la vida');
    expect(screen.getByRole('table')).toHaveTextContent('42');
  });

  it('abre enlaces externos de forma segura', () => {
    render(<MarkdownRenderer content="[Documentación](https://example.com/docs)" />);

    expect(screen.getByRole('link', { name: 'Documentación' })).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: 'Documentación' })).toHaveAttribute(
      'rel',
      'noopener noreferrer'
    );
  });

  it('resalta un bloque de código y permite copiarlo', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    const code = 'const respuesta = 42;';
    const { container } = render(
      <MarkdownRenderer content={`\`\`\`javascript\n${code}\n\`\`\``} />
    );

    expect(container.querySelector('code')).toHaveClass('language-javascript', 'hljs');
    expect(screen.getByText('javascript')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Copiar código' }));

    expect(writeText).toHaveBeenCalledWith(code);
    expect(screen.getByRole('button', { name: 'Código copiado' })).toBeInTheDocument();
  });

  it('muestra feedback cuando el navegador no puede copiar', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(
      new Error('Clipboard no disponible')
    );
    render(<MarkdownRenderer content={'```\n42\n```'} />);

    await user.click(screen.getByRole('button', { name: 'Copiar código' }));

    expect(screen.getByRole('button', { name: 'No se pudo copiar' })).toBeInTheDocument();
  });
});
