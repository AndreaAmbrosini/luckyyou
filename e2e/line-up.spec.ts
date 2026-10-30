import { expect, test, type Locator } from '@playwright/test';

// "The Line-up fits the window" (src/scenarios/the-race/the-race.feature),
// measured where there is a layout to measure.
test("The Race's Line-up fits 1280 by 800 with 8 people", async ({ page }) => {
  const team = ['Anna', 'Ben', 'Carla', 'Dario', 'Elena', 'Femi', 'Giulia', 'Maria-Elena Ros'];
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('./');
  await page.evaluate((names) => {
    const people = names.map((name) => ({ name, ticked: true }));
    localStorage.setItem('luckyyou:v1:people', JSON.stringify(people));
  }, team);
  await page.reload();
  await page.getByRole('button', { name: 'Next: pick a show' }).click();
  await page.getByRole('button', { name: 'The Race' }).click();

  /** True when all of `locator` is inside the window. */
  const inView = async (locator: Locator) => {
    for (const each of await locator.all()) {
      const box = (await each.boundingBox())!;
      const label = (await each.getAttribute('aria-label')) ?? (await each.textContent()) ?? '';
      expect(box.x, label).toBeGreaterThanOrEqual(0);
      expect(box.y, label).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, label).toBeLessThanOrEqual(1280);
      expect(box.y + box.height, label).toBeLessThanOrEqual(800);
    }
  };

  const tabs = page.getByRole('tab');
  for (const tab of await tabs.all()) {
    await tab.click();
    await inView(page.getByRole('list', { name: "Today's people" }).getByRole('button'));
    await inView(page.getByRole('heading', { level: 2 }));
    await inView(tabs);
    await inView(page.getByRole('tabpanel').getByRole('button'));
    await inView(page.getByRole('group', { name: 'Colour' }).getByRole('button'));
    await inView(page.getByRole('group', { name: 'Extra' }).getByRole('button'));
    await inView(page.getByRole('button', { name: 'Shuffle everyone' }));
    await inView(page.getByRole('button', { name: 'Start the race' }));
    const scrolls = await page.evaluate(() =>
      [...document.querySelectorAll('*')].some(
        (element) =>
          element.scrollHeight > element.clientHeight + 1 &&
          ['auto', 'scroll'].includes(getComputedStyle(element).overflowY),
      ),
    );
    expect(scrolls).toBe(false);
  }
});
