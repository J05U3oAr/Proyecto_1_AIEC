import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('compiled SDK renders the live catalog and opens both references from the agent', async ({
  page,
  context,
}) => {
  test.setTimeout(240000);
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/tests/browser/sdk-host.html');
  await page.getByRole('button', { name: 'Abrir chat', exact: true }).click();
  const input = page.getByRole('textbox', { name: 'Campo de texto para mensaje' });
  const send = page.getByRole('button', { name: 'Enviar mensaje', exact: true });

  await input.fill('Blade Runner 1982');
  await send.click();
  const movie = page.locator('article[aria-label="Película: Blade Runner"]').first();
  await expect(movie).toBeVisible({ timeout: 60000 });
  await expect(movie.locator('img')).toHaveAttribute('src', /^https:\/\/image\.tmdb\.org\/t\/p\//);
  await expect
    .poll(() => movie.locator('img').evaluate(image => image.naturalWidth))
    .toBeGreaterThan(0);
  await expect(movie).toContainText('TMDB');
  const messageLog = page.getByRole('log');
  const userBubble = messageLog.getByText('Blade Runner 1982', { exact: true });
  const assistantBubble = messageLog
    .getByText('Recomendación y valoración de Sofía · IA', { exact: true })
    .first()
    .locator('..');
  const logBounds = await messageLog.boundingBox();
  const userBounds = await userBubble.boundingBox();
  const assistantBounds = await assistantBubble.boundingBox();
  const midpoint = logBounds.x + logBounds.width / 2;
  expect(userBounds.x + userBounds.width / 2).toBeGreaterThan(midpoint);
  expect(assistantBounds.x + assistantBounds.width / 2).toBeLessThan(midpoint);
  await expect(userBubble).toHaveCSS('border-top-right-radius', '2px');
  await expect(assistantBubble).toHaveCSS('border-top-left-radius', '2px');
  await movie.screenshot({ path: 'test-results/live-movie-card-320.png' });

  await input.fill('Compara esa película con su libro sin spoilers');
  await send.click();
  const comparison = page.getByRole('region', { name: 'Comparación con el libro' }).first();
  await expect(comparison).toBeVisible({ timeout: 60000 });
  await expect(comparison).toContainText('Adaptación confirmada por las fuentes');
  await expect(comparison).toContainText('Do Androids Dream of Electric Sheep?');
  const bookLink = comparison.getByRole('link', { name: /Google Books/ }).first();
  await expect(bookLink).toHaveAttribute('href', /^https:\/\/books\.google\.com\/books\?id=/);

  const widget = page.locator('[data-agichat-widget]');
  const panel = page.getByRole('region', { name: 'Chat de Sofía' });
  const bounds = await panel.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
  expect(await widget.evaluate(element => element.scrollWidth)).toBeLessThanOrEqual(320);
  const accessibility = await new AxeBuilder({ page }).include('[data-agichat-widget]').analyze();
  expect(accessibility.violations, JSON.stringify(accessibility.violations, null, 2)).toEqual([]);
  await comparison.scrollIntoViewIfNeeded();
  await comparison.screenshot({ path: 'test-results/live-comparison-card-320.png' });
  await page.screenshot({ path: 'test-results/live-flow-320.png' });

  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const resizedBounds = await panel.boundingBox();
    expect(resizedBounds).not.toBeNull();
    expect(resizedBounds.x).toBeGreaterThanOrEqual(0);
    expect(resizedBounds.x + resizedBounds.width).toBeLessThanOrEqual(width);
    expect(await widget.evaluate(element => element.scrollWidth)).toBeLessThanOrEqual(width);
  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  const log = page.getByRole('log');
  await log.evaluate(element => {
    element.scrollTop = 0;
  });
  await page.screenshot({ path: 'test-results/live-movie-desktop.png' });
  await log.evaluate(element => {
    element.scrollTop = element.scrollHeight;
  });
  await page.screenshot({ path: 'test-results/live-comparison-desktop.png' });

  for (const [command, resource] of [
    ['Abre la ficha de esa película en IMDb', movie.getByRole('link', { name: /IMDb/ })],
    ['Ahora abre el libro en Google Books', bookLink],
  ]) {
    const expectedUrl = await resource.getAttribute('href');
    expect(expectedUrl).toBeTruthy();
    await input.fill(command);
    const opening = context.waitForEvent('page');
    const replied = page.waitForResponse(
      response =>
        new URL(response.url()).pathname === '/api/chat' && response.request().method() === 'POST',
      { timeout: 70000 }
    );
    await send.click();
    const [tab, reply] = await Promise.all([opening, replied]);
    expect(reply.ok(), `HTTP ${reply.status()} para ${command}`).toBe(true);
    const payload = await reply.json();
    expect(payload.actions, `Acción de navegación para ${command}`).toEqual([
      expect.objectContaining({ type: 'open_reference', url: expectedUrl }),
    ]);
    const reference = new URL(expectedUrl);
    await expect(tab).toHaveURL(
      url => {
        if (reference.hostname === 'www.imdb.com') {
          return url.hostname === reference.hostname && url.pathname === reference.pathname;
        }
        return (
          /^books\.google\.com(?:\.gt)?$/.test(url.hostname) &&
          url.pathname === '/books' &&
          url.searchParams.get('id') === reference.searchParams.get('id')
        );
      },
      { timeout: 30000 }
    );
    expect(await tab.evaluate(() => window.opener)).toBeNull();
    await tab.close();
    await page.bringToFront();
  }

  await page.getByRole('button', { name: /Reiniciar chat/ }).click();
  await expect(page.getByRole('log')).not.toContainText('Blade Runner');
});

for (const theme of ['light', 'dark', 'violet']) {
  test(`compiled SDK fits all target viewports with the ${theme} theme`, async ({ page }) => {
    await page.goto(`/tests/browser/sdk-host.html?theme=${theme}`);
    await page.getByRole('button', { name: 'Abrir chat', exact: true }).click();
    const panel = page.getByRole('region', { name: 'Chat de Sofía' });
    const input = page.getByRole('textbox', { name: 'Campo de texto para mensaje' });
    await expect(input).toBeFocused();

    for (const width of [320, 375, 768, 1440]) {
      await page.setViewportSize({ width, height: 740 });
      const bounds = await panel.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      await page.screenshot({ path: `test-results/sdk-${theme}-${width}.png` });
    }
    const accessibility = await new AxeBuilder({ page }).include('[data-agichat-widget]').analyze();
    expect(accessibility.violations, JSON.stringify(accessibility.violations, null, 2)).toEqual([]);
    await input.press('Escape');
    await expect(page.getByRole('button', { name: 'Abrir chat', exact: true })).toBeFocused();
  });
}
