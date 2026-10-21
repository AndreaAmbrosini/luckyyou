import { expect, test } from '@playwright/test';

test('the site loads', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1, name: "Who's on the team?" })).toBeVisible();
});

test('a whole pick', async ({ page }) => {
  const team = ['Anna', 'Ben', 'Carla'];
  await page.goto('./');
  for (const name of team) {
    await page.getByRole('textbox', { name: 'Add a name' }).fill(name);
    await page.getByRole('button', { name: 'Add', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Next: pick a show' }).click();
  await page.getByRole('button', { name: 'Shark Bait' }).click();

  // A show lasts at most 15 seconds.
  const heading = page.getByRole('heading', { level: 1, name: /^Lucky you, .+ 🎉$/ });
  await expect(heading).toBeVisible({ timeout: 16_000 });
  const unlucky = /^Lucky you, (.+) 🎉$/.exec((await heading.textContent()) ?? '')?.[1];
  expect(team).toContain(unlucky);
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
