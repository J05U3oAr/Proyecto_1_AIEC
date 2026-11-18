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
  await expect(frame.getByRole('status')).toContainText('No pude usar la pestaña');
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
