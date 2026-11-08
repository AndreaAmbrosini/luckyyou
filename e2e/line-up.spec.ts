import { expect, test, type Locator } from '@playwright/test';

// "Everything in view at 1280 by 720" (specs/line-up.feature), on The Race's
// Line-up, measured where there is a layout to measure, and at 1280 by 800.
for (const height of [720, 800]) {
  test(`The Race's Line-up fits 1280 by ${height} with 8 people`, async ({ page }) => {
    const team = ['Anna', 'Ben', 'Carla', 'Dario', 'Elena', 'Femi', 'Giulia', 'Maria-Elena Ros'];
    await page.setViewportSize({ width: 1280, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('./');
    await page.evaluate((names) => {
      const people = names.map((name) => ({ name, ticked: true }));
      localStorage.setItem('luckyyou:v1:people', JSON.stringify(people));
      localStorage.setItem('luckyyou:v1:line-up:the-race:theme', JSON.stringify('autumn'));
    }, team);
    await page.reload();
    await page.getByRole('button', { name: 'Next: pick a show' }).click();
    await page.getByRole('button', { name: 'The Race', exact: true }).click();
    await page.getByRole('button', { name: 'Next: line up the racers' }).click();

    /** True when all of `locator` is inside `box`, the window unless given. */
    const inView = async (locator: Locator, box = { x: 0, y: 0, width: 1280, height }) => {
      for (const each of await locator.all()) {
        const at = (await each.boundingBox())!;
        const label = (await each.getAttribute('aria-label')) ?? (await each.textContent()) ?? '';
        expect(at.x, label).toBeGreaterThanOrEqual(box.x - 0.5);
        expect(at.y, label).toBeGreaterThanOrEqual(box.y - 0.5);
        expect(at.x + at.width, label).toBeLessThanOrEqual(box.x + box.width + 0.5);
        expect(at.y + at.height, label).toBeLessThanOrEqual(box.y + box.height + 0.5);
      }
    };
    /** Whatever scrolls, as whether the sheet holds it. */
    const scrolling = () =>
      page.evaluate(() =>
        [...document.querySelectorAll('*')]
          .filter(
            (element) =>
              element.scrollHeight > element.clientHeight + 1 &&
              ['auto', 'scroll'].includes(getComputedStyle(element).overflowY),
          )
          .map((element) => element.closest('[role="dialog"]') !== null),
      );

    // The themes, everyone and their cards, and the bottom bar, without scrolling.
    const row = page.getByRole('list', { name: "Today's people" });
    await inView(page.getByRole('group', { name: 'Theme' }).getByRole('button'));
    await inView(page.getByRole('button', { name: 'Shuffle everyone' }));
    await inView(page.getByRole('group', { name: 'Deal from' }).getByRole('button'));
    await inView(row.getByRole('listitem'));
    await inView(row.getByRole('button'));
    await inView(page.getByRole('contentinfo'));
    expect(await scrolling()).toEqual([]);
    // Each name wraps inside its card.
    const overflowing = await row.evaluate((list) =>
      [...list.querySelectorAll('button[aria-labelledby]')]
        .map((button) => document.getElementById(button.getAttribute('aria-labelledby')!)!)
        .filter((name) => name.scrollWidth > name.clientWidth + 0.5)
        .map((name) => name.textContent),
    );
    expect(overflowing).toEqual([]);

    // Ben's sheet: Ben drawn bigger than anyone in the row; the first eight of
    // whatever his first option shows are in view, and any more scroll inside it.
    await row.getByRole('button', { name: 'Ben', exact: true }).click();
    const sheet = page.getByRole('dialog', { name: 'Ben' });
    await inView(sheet);
    // The Race draws a racer, or a creature on its own feet.
    const drawn = '[data-part="racer"], [data-part="creature"]';
    const widths = await row
      .locator(drawn)
      .evaluateAll((all) => all.map((each) => each.getBoundingClientRect().width));
    expect(widths).toHaveLength(team.length);
    const portrait = (await sheet.locator(drawn).first().boundingBox())!;
    expect(portrait.width).toBeGreaterThan(Math.max(...widths));

    const racer = sheet.getByRole('group', { name: 'Racer' });
    const views = racer.getByRole('tablist').first().getByRole('tab');
    for (const view of await views.all()) {
      await view.click();
      const groups = racer.getByRole('tablist').nth(1).getByRole('tab');
      const tabs = (await groups.count()) > 0 ? await groups.all() : [view];
      for (const tab of tabs) {
        await tab.click();
        const choices = racer.getByRole('tabpanel').last().getByRole('button');
        for (const choice of (await choices.all()).slice(0, 8)) await inView(choice);
        expect((await scrolling()).every((inSheet) => inSheet)).toBe(true);
        await sheet.evaluate((element) =>
          element.querySelectorAll('*').forEach((each) => (each.scrollTop = 0)),
        );
      }
    }
  });
}

// "A smaller window scrolls the Line-up" (specs/line-up.feature).
test("The Race's Line-up scrolls at 800 by 600 with 8 people", async ({ page }) => {
  const team = ['Anna', 'Ben', 'Carla', 'Dario', 'Elena', 'Femi', 'Giulia', 'Maria-Elena Ros'];
  await page.setViewportSize({ width: 800, height: 600 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await page.evaluate((names) => {
    const people = names.map((name) => ({ name, ticked: true }));
    localStorage.setItem('luckyyou:v1:people', JSON.stringify(people));
    localStorage.setItem('luckyyou:v1:line-up:the-race:theme', JSON.stringify('autumn'));
  }, team);
  await page.reload();
  await page.getByRole('button', { name: 'Next: pick a show' }).click();
  await page.getByRole('button', { name: 'The Race', exact: true }).click();
  await page.getByRole('button', { name: 'Next: line up the racers' }).click();

  // The Line-up scrolls; the header and the bar stay in view.
  const main = page.getByRole('main');
  expect(await main.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
  await main.evaluate((element) => element.scrollTo(0, element.scrollHeight));
  const header = (await page.getByRole('banner').boundingBox())!;
  const bar = (await page.getByRole('contentinfo').boundingBox())!;
  expect(header.y).toBeGreaterThanOrEqual(0);
  expect(bar.y + bar.height).toBeLessThanOrEqual(600.5);

  // Scrolled down, each card holds its name, die and pin, above the bar and
  // inside the window, and no two cards overlap.
  const row = page.getByRole('list', { name: "Today's people" });
  let right = -Infinity;
  for (const [index, place] of (await row.getByRole('listitem').all()).entries()) {
    const box = (await place.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(right);
    expect(box.x + box.width).toBeLessThanOrEqual(800);
    expect(box.y + box.height).toBeLessThanOrEqual(bar.y + 0.5);
    right = box.x + box.width;
    const name = team[index]!;
    for (const part of [
      place.getByText(name, { exact: true }),
      place.getByRole('button', { name: `A new look for ${name}` }),
      place.getByRole('button', { name: `Pin ${name}` }),
    ]) {
      const at = (await part.boundingBox())!;
      expect(at.x, name).toBeGreaterThanOrEqual(box.x - 0.5);
      expect(at.x + at.width, name).toBeLessThanOrEqual(box.x + box.width + 0.5);
      expect(at.y + at.height, name).toBeLessThanOrEqual(box.y + box.height + 0.5);
    }
  }
});
