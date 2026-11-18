import type { Comparison } from '@/services/contracts.generated';
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';
import { BooksAttribution, SourceLink } from '@/components/widget/results/ResultSources';

const statuses = {
  confirmed: 'Adaptación confirmada por las fuentes',
  uncertain: 'No pude confirmar el vínculo con el libro',
  not_found: 'No encontré evidencia de una adaptación en la colección consultada',
};

export function ComparisonCard({
  comparison,
  movieTitle,
  responseText,
}: {
  comparison: Comparison;
  movieTitle?: string;
  responseText: string;
}) {
  const { adaptation, verdict } = comparison;
  const book = adaptation.book;
  const googleEvidence = adaptation.evidence?.some(item => item.source.provider === 'google_books');
  const reply = responseText.trim();
  const valuation = verdict.trim();
  const alreadyShown = reply === valuation || reply.startsWith(valuation + '\n\n');
  return (
    <section
      aria-label="Comparación con el libro"
      className="space-y-3 rounded-xl border border-[var(--agichat-border)] p-3"
    >
      <div>
        <h3 className="text-lg font-semibold">Película y libro</h3>
        <p>{movieTitle ?? 'Película de esta comparación'}</p>
        <p className="mt-2 font-medium">{statuses[adaptation.status]}</p>
      </div>
      {adaptation.status === 'not_found' && (
        <p>No confirma que el libro no exista. Puedes precisar otro título o año.</p>
      )}
      {book && (
        <div className="rounded-lg bg-[var(--agichat-surface-muted)] p-3">
          <p className="text-sm text-[var(--agichat-text-muted)]">
            {adaptation.status === 'confirmed'
              ? 'Libro'
              : 'Libro candidato · vínculo sin confirmar'}
          </p>
          <h4 className="font-semibold">{book.title}</h4>
          <p>{book.authors?.length ? book.authors.join(', ') : 'Autoría no disponible'}</p>
          {book.year != null && <p className="text-sm">Año de esta edición: {book.year}</p>}
          <BooksAttribution />
          <SourceLink source={{ provider: 'google_books', url: book.url, label: book.title }}>
            Ver libro en Google Books
          </SourceLink>
        </div>
      )}
      {!!adaptation.limitations?.length && (
        <div>
          <h4 className="font-semibold">Límites de la comparación</h4>
          <ul className="list-disc space-y-1 pl-5">
            {adaptation.limitations.map((text, i) => (
              <li key={i}>{text}</li>
            ))}
          </ul>
        </div>
      )}
      {!!adaptation.evidence?.length && (
        <details>
          <summary className="min-h-11 cursor-pointer content-center rounded font-medium underline underline-offset-4 focus-visible:outline focus-visible:outline-2">
            Evidencia y detalles (pueden contener spoilers)
          </summary>
          {googleEvidence && <BooksAttribution />}
          <ul className="space-y-4 pt-2">
            {adaptation.evidence.map((item, i) => (
              <li key={i}>
                <p className="whitespace-pre-wrap">{item.statement}</p>
                <div className="text-sm">
                  <SourceLink source={item.source} />
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}
      {!alreadyShown && (
        <div>
          <h4 className="font-semibold">Valoración de Sofía · opinión de IA</h4>
          <MarkdownRenderer content={verdict} />
        </div>
      )}
    </section>
  );
}
