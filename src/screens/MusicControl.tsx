import { useEffect, useId, useRef, useState } from 'react';
import { createSample } from '../scenario-kit/music';
import { MusicIcon } from '../ui/icons';
import styles from './Header.module.css';

export interface MusicControlProps {
  /** The sound switch is off: that silences the music too. */
  muted: boolean;
  music: boolean;
  /** In percent, 0 to 100 in steps of 10. */
  musicVolume: number;
  onMusicChange(change: { music?: boolean; musicVolume?: number }): void;
}

/** The ♪ button, and the panel under it with the music's switch and volume. */
export function MusicControl({ muted, music, musicVolume, onMusicChange }: MusicControlProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const around = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const [sample] = useState(createSample);
  const heard = music && !muted;

  useEffect(() => {
    if (!open) return;
    const close = () => {
      setOpen(false);
      button.current?.focus();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (around.current?.contains(event.target as Node)) return;
      setOpen(false);
      // Back to the button, unless the click gave the focus to something else.
      const refocus = () => {
        if (document.activeElement === document.body) button.current?.focus();
      };
      document.addEventListener('click', refocus, { once: true });
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
      sample.stop();
    };
  }, [open, sample]);

  return (
    <div ref={around} className={styles.music}>
      <button
        ref={button}
        type="button"
        className={styles.control}
        aria-label={heard ? 'Music' : 'Music, off'}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={() => setOpen(!open)}
      >
        <MusicIcon on={heard} />
      </button>
      <div id={`${id}-panel`} className={styles.panel} hidden={!open}>
        <button
          type="button"
          role="switch"
          className={styles.switch}
          aria-checked={heard}
          aria-describedby={muted ? `${id}-reason` : undefined}
          disabled={muted}
          onClick={() => onMusicChange({ music: !music })}
        >
          Music
        </button>
        <div className={styles.volume}>
          <label htmlFor={`${id}-volume`}>Volume</label>
          <input
            id={`${id}-volume`}
            type="range"
            min={0}
            max={100}
            step={10}
            value={musicVolume}
            aria-valuetext={`${musicVolume}%`}
            aria-describedby={muted ? `${id}-reason` : undefined}
            disabled={muted}
            onChange={(event) => {
              const volume = Number(event.target.value);
              onMusicChange({ musicVolume: volume });
              sample.play(volume / 100);
            }}
          />
          <output htmlFor={`${id}-volume`}>{musicVolume}%</output>
        </div>
        {muted && (
          <p id={`${id}-reason`} className={styles.reason}>
            Sound is off.
          </p>
        )}
      </div>
    </div>
  );
}
