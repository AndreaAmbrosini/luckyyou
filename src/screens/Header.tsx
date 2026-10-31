import { useFullscreen } from '../ui/fullscreen';
import { FullscreenIcon, SoundIcon } from '../ui/icons';
import styles from './Header.module.css';
import { MusicControl, type MusicControlProps } from './MusicControl';

/** The third step shows only on a show's Line-up. */
const STEPS = ["1 · Who's in", '2 · Pick a show', '3 · Line-up'];

export interface HeaderProps extends MusicControlProps {
  step: 1 | 2 | 3;
  onMutedChange(muted: boolean): void;
}

export function Header({ step, onMutedChange, ...music }: HeaderProps) {
  const { muted } = music;
  const fullscreen = useFullscreen();

  return (
    <header className={styles.header}>
      <span className={styles.logo}>LuckyYou</span>
      <ol className={styles.steps} aria-label="Steps">
        {STEPS.slice(0, Math.max(2, step)).map((label, index) => (
          <li
            key={label}
            className={styles.step}
            aria-current={index + 1 === step ? 'step' : undefined}
          >
            {label}
          </li>
        ))}
      </ol>
      <div className={styles.controls}>
        <button
          type="button"
          role="switch"
          className={styles.control}
          aria-label="Sound"
          aria-checked={!muted}
          onClick={() => onMutedChange(!muted)}
        >
          <SoundIcon on={!muted} />
        </button>
        <MusicControl {...music} />
        {fullscreen.supported && (
          <button
            type="button"
            className={styles.control}
            aria-label="Fullscreen"
            aria-pressed={fullscreen.active}
            onClick={fullscreen.toggle}
          >
            <FullscreenIcon active={fullscreen.active} />
          </button>
        )}
      </div>
    </header>
  );
}
