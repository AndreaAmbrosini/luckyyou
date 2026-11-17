import { useEffect, useId, useRef, useState, type PointerEvent } from 'react';
import { Button } from '../ui/Button';
import type { Person } from './people';
import { cropArea, drawCrop, PHOTO_SIZE, readPicture, validPhoto, type Framing } from './photos';
import styles from './PhotoEditor.module.css';

const CENTRED: Framing = { zoom: 1, x: 50, y: 50 };
const clamp = (n: number) => Math.max(0, Math.min(100, n));

export function PhotoEditor({
  person,
  onSave,
  onClose,
}: {
  person: Person;
  onSave(photo?: string): void;
  onClose(): void;
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const selection = useRef(0);
  const drag = useRef<{ x: number; y: number; framing: Framing } | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [framing, setFraming] = useState(CENTRED);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [opener] = useState(() => document.activeElement);

  useEffect(() => {
    const pending = selection;
    dialog.current!.showModal();
    return () => {
      pending.current++;
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, [opener]);

  useEffect(() => {
    if (!image || !canvas.current) return;
    try {
      drawCrop(canvas.current, image, framing);
    } catch (reason) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError(reason instanceof Error ? reason.message : 'The photo preview could not be drawn.');
    }
  }, [image, framing]);

  async function choose(file: File | undefined) {
    if (!file) return;
    const current = ++selection.current;
    setLoading(true);
    setError(null);
    setImage(null);
    try {
      const next = await readPicture(file);
      if (current !== selection.current) return;
      setImage(next);
      setFraming(CENTRED);
    } catch (reason) {
      if (current === selection.current) {
        setError(reason instanceof Error ? reason.message : 'The picture could not be read.');
      }
    } finally {
      if (current === selection.current) setLoading(false);
    }
  }

  function move(event: PointerEvent<HTMLCanvasElement>) {
    if (!drag.current || !image) return;
    const { framing: start, x, y } = drag.current;
    const area = cropArea(image.naturalWidth, image.naturalHeight, start);
    const width = event.currentTarget.getBoundingClientRect().width;
    const dx = ((event.clientX - x) * area.size) / width;
    const dy = ((event.clientY - y) * area.size) / width;
    setFraming({
      ...start,
      x:
        image.naturalWidth === area.size
          ? 50
          : clamp(start.x - (dx / (image.naturalWidth - area.size)) * 100),
      y:
        image.naturalHeight === area.size
          ? 50
          : clamp(start.y - (dy / (image.naturalHeight - area.size)) * 100),
    });
  }

  function save() {
    try {
      if (!image || !canvas.current) return;
      const photo = canvas.current.toDataURL('image/jpeg', 0.85);
      if (!validPhoto(photo))
        throw new Error('The photo could not be prepared. Try another picture.');
      onSave(photo);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The photo could not be saved.');
    }
  }

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby={`${id}-heading`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <h2 id={`${id}-heading`}>Photo for {person.name}</h2>
      <p className={styles.note}>Frame a face from a picture. It stays in this browser.</p>
      <label className={styles.file}>
        Choose picture
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            void choose(event.target.files?.[0]);
          }}
        />
      </label>
      {loading && <p role="status">Reading picture…</p>}
      {image ? (
        <>
          <canvas
            ref={canvas}
            className={styles.preview}
            width={PHOTO_SIZE}
            height={PHOTO_SIZE}
            role="img"
            aria-label="Cropped face preview"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              drag.current = { x: event.clientX, y: event.clientY, framing };
            }}
            onPointerMove={move}
            onPointerUp={() => {
              drag.current = null;
            }}
            onPointerCancel={() => {
              drag.current = null;
            }}
          />
          <p className={styles.note}>Drag the picture or use the controls.</p>
          {(
            [
              ['zoom', 'Zoom', 1, 4, 0.05],
              ['x', 'Horizontal position', 0, 100, 1],
              ['y', 'Vertical position', 0, 100, 1],
            ] as const
          ).map(([key, label, min, max, step]) => (
            <label key={key} className={styles.control}>
              {label}
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={framing[key]}
                onChange={(event) => setFraming({ ...framing, [key]: Number(event.target.value) })}
              />
            </label>
          ))}
        </>
      ) : person.photo && !loading ? (
        <img className={styles.preview} src={person.photo} alt="Current photo" />
      ) : null}
      {error && <p role="alert">{error}</p>}
      <div className={styles.actions}>
        {person.photo && <Button onClick={() => onSave()}>Remove photo</Button>}
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!image || loading || error !== null} onClick={save}>
          Save photo
        </Button>
      </div>
    </dialog>
  );
}
