import { expect, test } from '@playwright/test';

test('the site loads', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1, name: 'LuckyYou' })).toBeVisible();
});

test("every request stays on the site's own origin", async ({ page, baseURL }) => {
  const origins = new Set<string>();
  page.on('request', (request) => origins.add(new URL(request.url()).origin));
  await page.goto('./');

  // Load both families even where the page doesn't use them yet.
  const [lilita, nunito] = await page.evaluate(async () => [
    (await document.fonts.load('400 1em "Lilita One"')).length,
    (await document.fonts.load('900 1em Nunito')).length,
  ]);

  expect(lilita, 'Lilita One font faces').toBeGreaterThan(0);
  expect(nunito, 'Nunito font faces').toBeGreaterThan(0);
  expect([...origins]).toEqual([new URL(baseURL!).origin]);
});
