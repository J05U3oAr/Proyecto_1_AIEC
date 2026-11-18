import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { offlineNetwork } from './offlineNetwork.mjs';

// Real Chromium windows, controlled destination documents. No external provider is contacted.
test.beforeEach(async ({ context }) => {
  await offlineNetwork(context);
});

test('opens both typed destinations from submit gestures and never replays history', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Abrir chat', exact: true }).click();
  for (const [command, target] of [
    ['Abre su ficha en IMDb', 'https://www.imdb.com/title/tt0083658/'],
    ['Abre el libro en Google Books', 'https://books.google.com/books?id=3vExWrUnJB0C'],
  ]) {
    await page.getByRole('textbox', { name: 'Campo de texto para mensaje' }).fill(command);
    const opened = context.waitForEvent('page');
    await page.getByRole('button', { name: 'Enviar mensaje', exact: true }).click();
    const child = await opened;
    await expect(child).toHaveURL(target);
    expect(await child.evaluate(() => window.opener)).toBeNull();
    expect(context.pages()).toHaveLength(2);
    await child.close();
    await page.bringToFront();
  }
  await page.reload();
  await page.getByRole('button', { name: 'Abrir chat', exact: true }).click();
  await expect(page.getByRole('log')).toContainText('Referencia de demostración');
  expect(context.pages()).toHaveLength(1);
});

test('sandbox without allow-popups yields a safe fallback instead of another window', async ({
  page,
  context,
}) => {
  await page.goto('/tests/browser/sandbox.html');
  const frame = page.frameLocator('iframe');
  await frame.getByRole('button', { name: 'Abrir chat', exact: true }).click();
  await frame.getByRole('textbox', { name: 'Campo de texto para mensaje' }).fill('Abre IMDb');
  await frame.getByRole('button', { name: 'Enviar mensaje', exact: true }).click();
  await expect(
    frame.getByRole('status').filter({ hasText: 'No pude usar la pestaña' })
  ).toBeVisible();
  await expect(frame.getByRole('link', { name: /Abrir ficha en IMDb/ })).toHaveAttribute(
    'href',
    'https://www.imdb.com/title/tt0083658/'
  );
  expect(context.pages()).toHaveLength(1);
});

test('keeps the compact widget inside a 320px viewport and passes axe checks', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Abrir chat', exact: true }).click();
  const widget = page.locator('[data-agichat-widget]');
  const panel = page.getByRole('region', { name: 'Chat de Sofía' });
  await expect(panel).toBeVisible();
  const bounds = await panel.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
  expect(await widget.evaluate(element => element.scrollWidth)).toBeLessThanOrEqual(320);

  const accessibility = await new AxeBuilder({ page }).include('[data-agichat-widget]').analyze();
  expect(accessibility.violations, JSON.stringify(accessibility.violations, null, 2)).toEqual([]);
});

test('uses the mobile space for messages and keeps catalog details inside the card', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.route('**/api/chat', async route => {
    const { requestId } = route.request().postDataJSON();
    await route.fulfill({
      json: {
        requestId,
        response:
          'Una opción si te gusta el cine noir.\n\n**Blade Runner (1982)**\n\n' +
          'Duración: 117 min\n\nSinopsis de TMDB: Una sinopsis de prueba.',
        movies: [
          {
            id: 78,
            title: 'Blade Runner',
            year: 1982,
            runtime: 117,
            overview: 'Una sinopsis de prueba.',
            tmdb: 'https://www.themoviedb.org/movie/78',
          },
        ],
      },
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Abrir chat', exact: true }).click();
  const panel = page.getByRole('region', { name: 'Chat de Sofía' });
  const log = panel.getByRole('log');
  const welcome = log.getByText(/Puedo recomendarte películas y compararlas/);
  await expect(welcome).toBeVisible();
  const input = panel.getByRole('textbox', { name: 'Campo de texto para mensaje' });
  await expect(input).toBeFocused();
  await input.fill('Blade Runner 1982');
  await input.press('Enter');

  const card = log.getByRole('article', { name: 'Película: Blade Runner' });
  await expect(card).toBeVisible();
  await expect(card.getByText('Sin póster')).toBeVisible();
  await expect(welcome).toHaveCount(0);
  await expect(log.getByText('Una opción si te gusta el cine noir.')).toBeVisible();
  await expect(log.getByText('Duración: 117 min', { exact: true })).toHaveCount(0);
  await expect(card).toContainText('1982 · 117 min');
  const synopsis = card.getByText('Una sinopsis de prueba.');
  await expect(synopsis).toBeHidden();
  await card.getByText('Sinopsis (puede contener spoilers)').press('Enter');
  await expect(synopsis).toBeVisible();
});
