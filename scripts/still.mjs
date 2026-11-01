// Makes a show's still, the picture its card opens with (decision 0021), and
// saves it as src/scenarios/<folder>/still.webp. The show runs in Chromium
// from the dev server, with 8 people (or its most) and seed 1, on a
// hand-driven clock, so the same arguments make the same still. Each show's
// index.ts says the arguments its still was made with.
//
//   npm run still -- <folder> <seconds> <zoom> <across %> <down %> [theme]

import { writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const [folder, seconds, zoom, across, down, theme] = process.argv.slice(2);
if (!folder || [seconds, zoom, across, down].some((value) => !Number.isFinite(Number(value)))) {
  console.error('Usage: npm run still -- <folder> <seconds> <zoom> <across %> <down %> [theme]');
  process.exit(1);
}

const NAMES = ['Anna', 'Ben', 'Carla', 'Dario', 'Elena', 'Femi', 'Giulia', 'Hana'];
// Paths the dev server serves; in variables, so TypeScript leaves them to the browser.
const kit = '/src/scenario-kit/still.ts';
const show = `/src/scenarios/${folder}/index.ts`;
const cut = { zoom: Number(zoom), focus: { x: Number(across) / 100, y: Number(down) / 100 } };

const server = await createServer({ logLevel: 'warn', server: { open: false } });
const browser = await chromium.launch();
try {
  await server.listen();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2,
  });
  // The lab page brings the fonts and tokens a show is drawn with.
  await page.goto(new URL('lab.html', server.resolvedUrls?.local[0]).href);
  await page.evaluate(
    async ({ kit, show, names, at, theme }) => {
      const { holdShowAt } = await import(kit);
      const { default: scenario } = await import(show);
      const people = names.slice(0, scenario.people.max);
      await holdShowAt(scenario, {
        names: people,
        unlucky: people.at(-1),
        seed: 1,
        theme,
        at,
      });
    },
    { kit, show, names: NAMES, at: Number(seconds), theme },
  );
  const picture = (await page.screenshot()).toString('base64');
  const still = await page.evaluate(
    async ({ kit, picture, cut }) => {
      const { encodeStill } = await import(kit);
      return encodeStill(`data:image/png;base64,${picture}`, cut);
    },
    { kit, picture, cut },
  );
  const file = `src/scenarios/${folder}/still.webp`;
  await writeFile(file, Buffer.from(still.split(',')[1], 'base64'));
  console.log(`Saved ${file}`);
} finally {
  await browser.close();
  await server.close();
}
