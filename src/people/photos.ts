export interface Framing {
  readonly zoom: number;
  readonly x: number;
  readonly y: number;
}

export const PHOTO_SIZE = 256;

/** Only our bounded raster output can come back from storage, never a remote URL. */
export function validPhoto(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 100_000 &&
    /^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]+={0,2}$/.test(value)
  );
}

export function cropArea(width: number, height: number, { zoom, x, y }: Framing) {
  const size = Math.min(width, height) / zoom;
  return { x: ((width - size) * x) / 100, y: ((height - size) * y) / 100, size };
}

export function drawCrop(canvas: HTMLCanvasElement, image: HTMLImageElement, framing: Framing) {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser cannot prepare a photo.');
  const area = cropArea(image.naturalWidth, image.naturalHeight, framing);
  context.clearRect(0, 0, PHOTO_SIZE, PHOTO_SIZE);
  context.drawImage(image, area.x, area.y, area.size, area.size, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
}

/** A saved photo as a picture to frame again; only the crop is kept, so framing can only tighten. */
export function loadPhoto(photo: string): Promise<HTMLImageElement> {
  if (!validPhoto(photo)) return Promise.reject(new Error('That photo is not a saved crop.'));
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The saved photo couldn't be read."));
    image.src = photo;
  });
}

export function readPicture(file: File): Promise<HTMLImageElement> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return Promise.reject(new Error('Choose a JPEG, PNG or WebP picture.'));
  }
  if (file.size > 20 * 1024 * 1024) {
    return Promise.reject(new Error('Choose a picture smaller than 20 MB.'));
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      if (
        !image.naturalWidth ||
        !image.naturalHeight ||
        image.naturalWidth * image.naturalHeight > 40_000_000
      ) {
        reject(new Error('Choose a picture with at most 40 million pixels.'));
      } else {
        resolve(image);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That picture couldn't be read. Try a different picture."));
    };
    image.src = url;
  });
}
