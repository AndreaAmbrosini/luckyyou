import { expect, test, type Page } from '@playwright/test';

/** A stored photo's size and two of its pixels: the centre and the left edge. */
function look(page: Page, photo: string) {
  return page.evaluate(async (src) => {
    const image = new Image();
    image.src = src;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(image, 0, 0);
    const at = (x: number) => [...ctx.getImageData(x, 128, 1, 1).data];
    return { width: image.width, height: image.height, centre: at(128), edge: at(8) };
  }, photo);
}

test('a local picture is framed, saved, replaced, cancelled and removed', async ({ page }) => {
  const outbound: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (['http:', 'https:'].includes(url.protocol) && url.origin !== 'http://localhost:4173') {
      outbound.push(request.url());
    }
  });
  await page.goto('./');
  const picture = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 300;
    const context = canvas.getContext('2d')!;
    context.fillStyle = 'red';
    context.fillRect(0, 0, 300, 300);
    context.fillStyle = 'blue';
    context.fillRect(300, 0, 300, 300);
    // A stripe at the face's edge, which tightening the saved face crops away.
    context.fillStyle = 'lime';
    context.fillRect(0, 0, 30, 300);
    return canvas.toDataURL('image/png').split(',')[1]!;
  });
  await page.getByRole('textbox', { name: 'Add a name' }).fill('Anna, Ben');
  await page.getByRole('button', { name: 'Add 2', exact: true }).click();
  await page.getByRole('button', { name: 'Add photo for Anna' }).click();
  const dialog = page.getByRole('dialog', { name: 'Photo for Anna' });
  await dialog.getByLabel('Choose picture').setInputFiles({
    name: 'team.png',
    mimeType: 'image/png',
    buffer: Buffer.from(picture, 'base64'),
  });
  await expect(dialog.getByRole('slider', { name: 'Zoom' })).toBeVisible();
  const preview = (await dialog.getByRole('img', { name: 'Cropped face preview' }).boundingBox())!;
  await page.mouse.move(preview.x + preview.width / 2, preview.y + preview.height / 2);
  await page.mouse.down();
  await page.mouse.move(preview.x + (preview.width * 3) / 4, preview.y + preview.height / 2);
  await page.mouse.up();
  expect(
    Number(await dialog.getByRole('slider', { name: 'Horizontal position' }).inputValue()),
  ).toBeCloseTo(25, 0);
  await dialog.getByRole('slider', { name: 'Horizontal position' }).fill('0');
  await dialog.getByRole('button', { name: 'Save photo' }).click();
  await expect(dialog).not.toBeVisible();
  const kept = await page.evaluate(
    () => JSON.parse(localStorage.getItem('luckyyou:v1:people')!)[0].photo as string,
  );
  expect(kept).toMatch(/^data:image\/jpeg;base64,/);
  const saved = await look(page, kept);
  expect(saved.width).toBe(256);
  expect(saved.height).toBe(256);
  expect(saved.centre[0]).toBeGreaterThan(240);
  expect(saved.centre[2]).toBeLessThan(15);
  expect(saved.edge[1]).toBeGreaterThan(200);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Change photo for Anna' })).toBeVisible();

  // The saved crop opens for tightening without choosing the picture again.
  await page.getByRole('button', { name: 'Change photo for Anna' }).click();
  const tighten = dialog.getByRole('slider', { name: 'Zoom' });
  await expect(tighten).toHaveAttribute('max', '2');
  await expect(dialog.getByRole('button', { name: 'Save photo' })).toBeDisabled();
  await tighten.fill('2');
  await dialog.getByRole('button', { name: 'Save photo' }).click();
  await expect(dialog).not.toBeVisible();
  const tightened = await page.evaluate(
    () => JSON.parse(localStorage.getItem('luckyyou:v1:people')!)[0].photo as string,
  );
  expect(tightened).toMatch(/^data:image\/jpeg;base64,/);
  expect(tightened).not.toBe(kept);
  const tight = await look(page, tightened);
  expect(tight.width).toBe(256);
  expect(tight.centre[0]).toBeGreaterThan(240);
  expect(tight.edge[0]).toBeGreaterThan(200);
  expect(tight.edge[1]).toBeLessThan(60);

  await page.getByRole('button', { name: 'Change photo for Anna' }).click();
  await dialog.getByLabel('Choose picture').setInputFiles({
    name: 'new.png',
    mimeType: 'image/png',
    buffer: Buffer.from(picture, 'base64'),
  });
  await dialog.getByRole('slider', { name: 'Zoom' }).fill('2');
  await dialog.getByRole('slider', { name: 'Horizontal position' }).fill('100');
  await dialog.getByRole('slider', { name: 'Zoom' }).focus();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Change photo for Anna' })).toBeFocused();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('luckyyou:v1:people')!)[0].photo),
  ).toBe(tightened);

  await page.getByRole('button', { name: 'Change photo for Anna' }).click();
  await dialog.getByLabel('Choose picture').setInputFiles({
    name: 'replacement.png',
    mimeType: 'image/png',
    buffer: Buffer.from(picture, 'base64'),
  });
  const zoom = dialog.getByRole('slider', { name: 'Zoom' });
  await zoom.fill('2');
  await zoom.focus();
  await page.keyboard.press('ArrowRight');
  await expect(zoom).toHaveValue('2.05');
  await dialog.getByRole('slider', { name: 'Horizontal position' }).fill('100');
  await dialog.getByRole('button', { name: 'Save photo' }).click();
  const replacement = await page.evaluate(
    () => JSON.parse(localStorage.getItem('luckyyou:v1:people')!)[0].photo as string,
  );
  expect(replacement).not.toBe(tightened);

  // The chosen face also reaches every line-up preview, including creatures.
  await page.getByRole('button', { name: 'Next: pick a show' }).click();
  await page.getByRole('button', { name: 'The Race', exact: true }).click();
  await page.getByRole('button', { name: 'Next: line up the racers' }).click();
  await expect(page.locator('[data-part="photo-face"] image').first()).toHaveAttribute(
    'href',
    replacement,
  );
  await page.getByRole('button', { name: 'Pick a show', exact: true }).click();
  await page.getByRole('button', { name: "Who's in", exact: true }).click();
  await page.getByRole('button', { name: 'Change photo for Anna' }).click();
  await dialog.getByRole('button', { name: 'Remove photo' }).click();
  await expect(page.getByRole('button', { name: 'Add photo for Anna' })).toBeVisible();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('luckyyou:v1:people')!)[0].photo),
  ).toBeUndefined();
  await expect(page.getByRole('checkbox', { name: 'Anna', exact: true })).toBeChecked();
  expect(outbound).toEqual([]);
});

test('invalid pictures cannot be saved, and the editor fits a small window', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await page.goto('./');
  await page.getByRole('textbox', { name: 'Add a name' }).fill('Anna, Ben');
  await page.getByRole('button', { name: 'Add 2', exact: true }).click();
  await page.getByRole('button', { name: 'Add photo for Anna' }).click();
  const dialog = page.getByRole('dialog', { name: 'Photo for Anna' });
  const input = dialog.getByLabel('Choose picture');
  await input.setInputFiles({
    name: 'not-a-picture.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from('<svg/>'),
  });
  await expect(dialog.getByRole('alert')).toHaveText('Choose a JPEG, PNG or WebP picture.');
  await expect(dialog.getByRole('button', { name: 'Save photo' })).toBeDisabled();
  await input.setInputFiles({
    name: 'broken.png',
    mimeType: 'image/png',
    buffer: Buffer.from('not an image'),
  });
  await expect(dialog.getByRole('alert')).toHaveText(/couldn't be read/);
  await expect(dialog.getByRole('button', { name: 'Save photo' })).toBeDisabled();
  const box = (await dialog.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(800);
  expect(box.y + box.height).toBeLessThanOrEqual(600);
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('button', { name: 'Add photo for Anna' })).toBeFocused();
});
