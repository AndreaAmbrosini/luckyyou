import { expect, test, type Locator } from '@playwright/test';

// "The start line fits the window" (src/scenarios/the-race/the-race.feature),
// measured where there is a layout to measure.
test("The Race's start line fits 1280 by 800 with 8 people", async ({ page }) => {
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

  /** True when all of `locator` is inside `box`, the window unless given. */
  const inView = async (locator: Locator, box = { x: 0, y: 0, width: 1280, height: 800 }) => {
    for (const each of await locator.all()) {
      const at = (await each.boundingBox())!;
      const label = (await each.getAttribute('aria-label')) ?? (await each.textContent()) ?? '';
      expect(at.x, label).toBeGreaterThanOrEqual(box.x - 0.5);
      expect(at.y, label).toBeGreaterThanOrEqual(box.y - 0.5);
      expect(at.x + at.width, label).toBeLessThanOrEqual(box.x + box.width + 0.5);
      expect(at.y + at.height, label).toBeLessThanOrEqual(box.y + box.height + 0.5);
    }
  };

  const start = page.getByRole('region', { name: 'The start' });
  const panel = start.getByRole('region', { name: 'Anna' });
  const tabs = panel.getByRole('tab');
  for (const tab of await tabs.all()) {
    await tab.click();
    await inView(page.getByRole('group', { name: 'Theme' }).getByRole('button'));
    await inView(start);
    await inView(start.getByRole('list', { name: "Today's people" }).getByRole('button'));
    await inView(panel);
    await inView(tabs);
    await inView(panel.getByRole('group', { name: 'Colour' }).getByRole('button'));
    await inView(panel.getByRole('group', { name: 'Extra' }).getByRole('button'));
    await inView(page.getByRole('button', { name: 'Shuffle everyone' }));
    await inView(page.getByRole('button', { name: 'Start the race' }));

    // The open tab's first eight racers show in the panel; any more scroll inside it.
    const racers = panel.getByRole('tabpanel');
    const shown = (await racers.boundingBox())!;
    const firstEight = (await racers.getByRole('button').all()).slice(0, 8);
    for (const racer of firstEight) await inView(racer, shown);

    const scrolls = await page.evaluate(() =>
      [...document.querySelectorAll('*')]
        .filter(
          (element) =>
            element.scrollHeight > element.clientHeight + 1 &&
            ['auto', 'scroll'].includes(getComputedStyle(element).overflowY),
        )
        .map((element) => element.getAttribute('role')),
    );
    const many = (await racers.getByRole('button').count()) > 8;
    expect(scrolls).toEqual(many ? ['tabpanel'] : []);
  }
});
