import { describe, expect, it } from 'vitest';
import { cropArea, readPicture, validPhoto } from './photos';

describe('photo framing', () => {
  it.each([
    [800, 400, 1, 50, 50, { x: 200, y: 0, size: 400 }],
    [400, 800, 1, 50, 100, { x: 0, y: 400, size: 400 }],
    [800, 400, 2, 100, 0, { x: 600, y: 0, size: 200 }],
  ])('crops %s by %s without stretching or leaving the image', (w, h, zoom, x, y, want) => {
    expect(cropArea(w, h, { zoom, x, y })).toEqual(want);
  });

  it('only accepts bounded local JPEG data', () => {
    expect(validPhoto('data:image/jpeg;base64,/9j/2Q==')).toBe(true);
    for (const bad of [
      null,
      42,
      'https://example.com/a.jpg',
      'data:image/svg+xml,<svg/>',
      'data:image/jpeg;base64,!',
      `data:image/jpeg;base64,${'a'.repeat(100_001)}`,
    ]) {
      expect(validPhoto(bad)).toBe(false);
    }
  });

  it('refuses unsupported and oversized files before decoding', async () => {
    await expect(
      readPicture(new File(['<svg/>'], 'face.svg', { type: 'image/svg+xml' })),
    ).rejects.toThrow(/JPEG, PNG or WebP/);
    await expect(
      readPicture(
        new File([new Uint8Array(20 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' }),
      ),
    ).rejects.toThrow(/20 MB/);
  });
});
