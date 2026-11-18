import type { ResponseDetails } from '@/services/responseValidation';
import { isResponseDetails } from '@/services/responseValidation';
import { MovieCard } from '@/components/widget/results/MovieCard';
import { ComparisonCard } from '@/components/widget/results/ComparisonCard';
import { ResultSources } from '@/components/widget/results/ResultSources';

export function MessageResults({
  details,
  responseText,
}: {
  details: ResponseDetails;
  responseText: string;
}) {
  // Defense at the render boundary also covers programmatic store writes and restored history.
  if (!isResponseDetails(details)) return <p>No pude mostrar las fichas de esta respuesta.</p>;
  const movie = details.movies?.find(item => item.id === details.comparison?.adaptation.movieId);
  return (
    <div className="mt-4 space-y-4">
      {details.movies?.map((item, index) => (
        <MovieCard key={`${item.id}-${index}`} movie={item} />
      ))}
      {details.comparison && (
        <ComparisonCard
          comparison={details.comparison}
          movieTitle={movie?.title}
          responseText={responseText}
        />
      )}
      <ResultSources sources={details.sources ?? []} />
    </div>
  );
}
