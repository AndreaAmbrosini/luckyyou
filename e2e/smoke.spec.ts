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

  // A show lasts at most 20 seconds.
  const heading = page.getByRole('heading', { level: 1, name: /^Lucky you, .+ 🎉$/ });
  await expect(heading).toBeVisible({ timeout: 21_000 });
  const unlucky = /^Lucky you, (.+) 🎉$/.exec((await heading.textContent()) ?? '')?.[1];
  expect(team).toContain(unlucky);
});

test('long names never cover each other on stage', async ({ page }) => {
  const team = [
    'Wolfeschlegelsteinhausenberger',
    'Bartholomew-Montgomery-Smit',
    'Maria Giulia Bianchi-Rossi Jr.',
    'Alexandra Konstantinopoulou',
    'Jean-Baptiste de La Fontaine',
    'Christopher Alexanderson',
    'Oluwaseun Adebayo-Okafor',
    'Konstantinos Papadopoulos',
    'Anastasia Vasilievna Petrova',
    'Maximilian von Hohenzollern',
    'Siobhán Ní Mhaolagáin',
    '🦄'.repeat(30),
  ];
  await page.goto('./');
  await page.evaluate((names) => {
    const people = names.map((name) => ({ name, ticked: true }));
    localStorage.setItem('luckyyou:v1:people', JSON.stringify(people));
  }, team);
  await page.reload();
  await page.getByRole('button', { name: 'Next: pick a show' }).click();
  await page.getByRole('button', { name: 'Shark Bait' }).click();

  // Heads pop in with a little overshoot, so look again until they have
  // settled. Once someone leaves the water, twelve tags are no longer in it.
  await expect(async () => {
    const tags = await page
      .locator('[data-in-water="true"] [style*="--tag-size"]')
      .evaluateAll((elements) =>
        elements.map((element) => {
          const { left, right, top, bottom } = element.getBoundingClientRect();
          return { name: element.textContent, left, right, top, bottom };
        }),
      );
    expect(tags).toHaveLength(team.length);
    tags.forEach((a, index) => {
      for (const b of tags.slice(index + 1)) {
        const apart =
          a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;
        expect(apart, `${a.name} and ${b.name}`).toBe(true);
      }
    });
  }).toPass({ intervals: [100], timeout: 5000 });
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
