import React from 'react';

export const TypingIndicator: React.FC = () => {
  return (
    <div
      role="status"
      className="mb-6 flex min-h-6 items-center pl-2 text-sm text-[var(--agichat-text-muted)]"
    >
      El asistente está escribiendo…
    </div>
  );
};
