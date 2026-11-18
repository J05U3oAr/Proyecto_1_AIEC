import { readFileSync } from 'node:fs';

const fixture = JSON.parse(
  readFileSync(
    new URL('../../docs/integration/fixtures/m3-comparison-valid.json', import.meta.url),
    'utf8'
  )
).response;

/** Route every request. Provider documents are controlled responses, never an API or live page. */
export async function offlineNetwork(context) {
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === 'http://127.0.0.1:4317') {
      if (url.pathname === '/api/chat') {
        const body = request.postDataJSON();
        if (body.prompt === 'simular error')
          return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
        const response = structuredClone(fixture);
        response.requestId = body.requestId;
        response.response =
          'Referencia de demostración para pruebas de navegador. Datos sintéticos sin consultas externas.';
        response.comparison.adaptation.book.id = '3vExWrUnJB0C';
        response.comparison.adaptation.book.url = 'https://books.google.com/books?id=3vExWrUnJB0C';
        response.actions = body.navigationIntent
          ? [
              {
                type: 'open_reference',
                id: body.requestId,
                requestId: body.requestId,
                provider: body.navigationIntent.provider,
                resourceId:
                  body.navigationIntent.provider === 'imdb' ? 'tt0083658' : '3vExWrUnJB0C',
                url:
                  body.navigationIntent.provider === 'imdb'
                    ? 'https://www.imdb.com/title/tt0083658/'
                    : 'https://books.google.com/books?id=3vExWrUnJB0C',
              },
            ]
          : [];
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify(response) });
      }
      return route.continue();
    }
    if (['www.imdb.com', 'books.google.com'].includes(url.hostname))
      return route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><html lang="es"><head><title>Referencia controlada</title></head><body><h1>Destino de prueba local</h1></body></html>',
      });
    return route.abort();
  });
}
