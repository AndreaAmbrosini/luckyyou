import { expect, test } from '@playwright/test';

test('the site loads', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1, name: 'LuckyYou' })).toBeVisible();
});
