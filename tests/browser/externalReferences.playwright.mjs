import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

const fixture = JSON.parse(
  readFileSync(
    new URL('../../docs/integration/fixtures/m3-comparison-valid.json', import.meta.url),
    'utf8'
  )
).response;

test('opens external IMDb and Google Books pages in real Chromium tabs', async ({
  page,
  context,
}) => {
  await page.route('**/api/chat', async route => {
    const request = route.request().postDataJSON();
    const response = structuredClone(fixture);
    response.requestId = request.requestId;
    response.response = 'Respuesta de prueba del backend local.';
    response.comparison.adaptation.book.id = '3vExWrUnJB0C';
    response.comparison.adaptation.book.url = 'https://books.google.com/books?id=3vExWrUnJB0C';
    response.actions = request.navigationIntent
      ? [
          {
            type: 'open_reference',
            id: request.requestId,
            requestId: request.requestId,
            provider: request.navigationIntent.provider,
            resourceId: request.navigationIntent.provider === 'imdb' ? 'tt0083658' : '3vExWrUnJB0C',
            url:
              request.navigationIntent.provider === 'imdb'
                ? 'https://www.imdb.com/title/tt0083658/'
                : 'https://books.google.com/books?id=3vExWrUnJB0C',
          },
        ]
      : [];
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(response) });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Abrir chat', exact: true }).click();
  const input = page.getByRole('textbox', { name: 'Campo de texto para mensaje' });
  const send = page.getByRole('button', { name: 'Enviar mensaje', exact: true });
  for (const [command, target, finalUrl] of [
    [
      'Abre su ficha en IMDb',
      'https://www.imdb.com/title/tt0083658/',
      /^https:\/\/www\.imdb\.com\/title\/tt0083658\/$/,
    ],
    [
      'Abre el libro en Google Books',
      'https://books.google.com/books?id=3vExWrUnJB0C',
      /^https:\/\/books\.google\.com(?:\.gt)?\/books\?id=3vExWrUnJB0C(?:&redir_esc=y)?$/,
    ],
  ]) {
    await input.fill(command);
    const requested = [];
    const recordNavigation = request => {
      if (request.isNavigationRequest()) requested.push(request.url());
    };
    context.on('request', recordNavigation);
    const opened = context.waitForEvent('page');
    await send.click();
    const child = await opened;
    await expect(child).toHaveURL(finalUrl, { timeout: 30000 });
    expect(requested).toContain(target);
    expect(await child.evaluate(() => window.opener)).toBeNull();
    context.off('request', recordNavigation);
    await child.close();
    await page.bringToFront();
  }
});
