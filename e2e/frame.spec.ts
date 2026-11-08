import { expect, test, type Locator, type Page } from '@playwright/test';

// "The header and the bar keep to one row in a small window" and "A big
// window shows the steps bigger" (specs/setup.feature), measured where there
// is a layout to measure.

const team = ['Anna', 'Ben', 'Carla', 'Dario', 'Elena', 'Femi', 'Giulia', 'Maria-Elena Ros'];

/** Who's in, then Pick a show with The Race chosen, then its Line-up, looking at each. */
async function walk(page: Page, width: number, height: number, look: () => Promise<void>) {
  await page.setViewportSize({ width, height });
  await page.goto('./');
  await page.evaluate((names) => {
    const people = names.map((name) => ({ name, ticked: true }));
    localStorage.setItem('luckyyou:v1:people', JSON.stringify(people));
  }, team);
  await page.reload();
  await look();
  await page.getByRole('button', { name: 'Next: pick a show' }).click();
  await page.getByRole('button', { name: 'The Race', exact: true }).click();
  await look();
  await page.getByRole('button', { name: 'Next: line up the racers' }).click();
  await look();
}

/** True when everything `row` shows shares one band across: a single row. */
const oneRow = (row: Locator) =>
  row.evaluate((element) => {
    /** Folded away: in something taken out of the row. */
    const folded = (each: Element) => {
      for (let at: Element | null = each; at && at !== element; at = at.parentElement) {
        if (getComputedStyle(at).position === 'absolute') return true;
      }
      return false;
    };
    // Its buttons, and the text and icons in it.
    const shown = [...element.querySelectorAll('button, p, span, svg')].filter((each) => {
      const box = each.getBoundingClientRect();
      return box.width > 1 && box.height > 1 && !folded(each);
    });
    const boxes = shown.map((each) => each.getBoundingClientRect());
    return Math.max(...boxes.map((box) => box.top)) < Math.min(...boxes.map((box) => box.bottom));
  });

test('the header and the bar keep to one row at 800 by 600', async ({ page }) => {
  await walk(page, 800, 600, async () => {
    for (const row of [page.getByRole('banner'), page.getByRole('contentinfo')]) {
      expect(await oneRow(row)).toBe(true);
      const box = (await row.boundingBox())!;
      expect(box.x + box.width).toBeLessThanOrEqual(800.5);
      // No text under --size-small, no target under --target-min.
      const sizes = await row.evaluate((element) =>
        [...element.querySelectorAll('*')]
          .filter((each) =>
            [...each.childNodes].some((node) => node.nodeType === 3 && node.textContent!.trim()),
          )
          .filter((each) => each.getBoundingClientRect().width > 1)
          .map((each) => parseFloat(getComputedStyle(each).fontSize)),
      );
      expect(Math.min(...sizes)).toBeGreaterThanOrEqual(18);
      for (const button of await row.getByRole('button').all()) {
        const at = (await button.boundingBox())!;
        expect(Math.min(at.width, at.height)).toBeGreaterThanOrEqual(44);
      }
    }
  });
  // Folded, and still read out in full.
  const steps = page.getByRole('list', { name: 'Steps' }).getByRole('listitem');
  await expect(steps).toHaveText([/Who's in · 8$/, /Show · The Race$/, /Line-up$/]);
  await expect(page.getByRole('contentinfo').getByRole('button').first()).toHaveAccessibleName(
    'Pick a show',
  );
});

test('a big window shows the steps bigger', async ({ page }) => {
  const rem = () =>
    page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
  const sizes: number[] = [];
  for (const [width, height] of [
    [1280, 800],
    [1920, 1080],
    [2560, 1440],
  ] as const) {
    await walk(page, width, height, async () => {
      sizes.push(await rem());
      // Everything still in view.
      const bar = (await page.getByRole('contentinfo').boundingBox())!;
      expect(bar.y + bar.height).toBeLessThanOrEqual(height + 0.5);
    });
  }
  expect(sizes.slice(0, 3)).toEqual([16, 16, 16]);
  expect(sizes[3]).toBeGreaterThan(18);
  expect(sizes[6]).toBeLessThanOrEqual(24);
});
