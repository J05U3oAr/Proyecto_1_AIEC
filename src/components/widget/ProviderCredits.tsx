import tmdbLogo from '@/assets/attribution/tmdb.svg';
import googleBooksLogo from '@/assets/attribution/google-books-poweredby.png';

/** Static attribution: opening credits never calls a provider or changes the conversation. */
export function ProviderCredits() {
  return (
    <div
      role="group"
      aria-label="Créditos y fuentes"
      className="shrink-0 border-t border-[var(--agichat-border)] px-4 pb-3 text-sm leading-relaxed text-[var(--agichat-text)]"
    >
      <details>
        <summary className="min-h-11 cursor-pointer content-center rounded text-sm font-semibold underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--agichat-text)]">
          Créditos y fuentes
        </summary>
        <div className="max-h-[30dvh] space-y-4 overflow-y-auto pb-3 pr-2">
          <section aria-label="Datos de películas">
            <h3 className="font-semibold">Películas · TMDB</h3>
            <a
              href="https://www.themoviedb.org"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center rounded px-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--agichat-text)]"
            >
              <img src={tmdbLogo} width="80" alt="TMDB (abre otra pestaña)" />
            </a>
            <p>Los datos y pósteres de películas proceden de TMDB.</p>
          </section>
          <section aria-label="Datos de libros">
            <h3 className="font-semibold">Libros · Google Books</h3>
            <a
              href="https://books.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--agichat-text)]"
            >
              {/* Neutral brand plate keeps the original transparent graphic readable in every theme. */}
              <span className="rounded bg-white p-2">
                <img
                  src={googleBooksLogo}
                  alt="Powered by Google (abre Google Books en otra pestaña)"
                />
              </span>
            </a>
            <p>La información bibliográfica procede de Google Books.</p>
          </section>
          <p>
            Las recomendaciones y los veredictos son opiniones generadas por Sofía, una IA. No
            representan la opinión ni el respaldo de TMDB o Google.
          </p>
          <p>Las imágenes y los textos pertenecen a sus respectivos titulares.</p>
        </div>
      </details>
      <p className="text-[13px] leading-normal" lang="en">
        This product uses the TMDB API but is not endorsed or certified by TMDB.
      </p>
    </div>
  );
}
