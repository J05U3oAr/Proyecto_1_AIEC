import { Check, Copy, X } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';

interface CodeBlockProps {
  children: ReactNode;
  code: string;
  language?: string;
}

type CopyStatus = 'idle' | 'copied' | 'error';

const RESET_DELAY_MS = 2_000;

export function CodeBlock({ children, code, language }: CodeBlockProps) {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current) {
        clearTimeout(resetTimer.current);
      }
    },
    []
  );

  const copyCode = async () => {
    if (resetTimer.current) {
      clearTimeout(resetTimer.current);
    }

    try {
      await navigator.clipboard.writeText(code);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('error');
    }

    resetTimer.current = setTimeout(() => setCopyStatus('idle'), RESET_DELAY_MS);
  };

  const buttonLabel =
    copyStatus === 'copied'
      ? 'Código copiado'
      : copyStatus === 'error'
        ? 'No se pudo copiar'
        : 'Copiar código';

  return (
    <div className="my-3 overflow-hidden rounded-lg bg-slate-950 text-slate-100 shadow-sm">
      <div className="flex min-h-10 items-center justify-between border-b border-slate-700 px-3 py-2 text-xs">
        <span className="font-medium text-slate-300">{language ?? 'texto'}</span>
        <button
          type="button"
          onClick={copyCode}
          className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-slate-200 transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-agi-accent"
          aria-label={buttonLabel}
        >
          {copyStatus === 'copied' ? (
            <Check aria-hidden="true" size={14} />
          ) : copyStatus === 'error' ? (
            <X aria-hidden="true" size={14} />
          ) : (
            <Copy aria-hidden="true" size={14} />
          )}
          <span aria-live="polite">{buttonLabel}</span>
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-xs leading-relaxed [&>code]:bg-transparent [&>code]:p-0 [&>code]:text-slate-100">
        {children}
      </pre>
    </div>
  );
}
