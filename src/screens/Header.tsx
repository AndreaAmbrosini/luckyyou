import { useFullscreen } from '../ui/fullscreen';
import { CheckIcon, FullscreenIcon, SoundIcon } from '../ui/icons';
import styles from './Header.module.css';
import { MusicControl, type MusicControlProps } from './MusicControl';

export interface Step {
  label: string;
  /** What was chosen there, shown once the step is done. */
  chosen?: string;
}

export interface HeaderProps extends MusicControlProps {
  steps: readonly Step[];
  /** The current step's index in `steps`. */
  current: number;
  onMutedChange(muted: boolean): void;
}

export function Header({ steps, current, onMutedChange, ...music }: HeaderProps) {
  const { muted } = music;
  const fullscreen = useFullscreen();

  return (
    <header className={styles.header}>
      <span className={styles.logo}>LuckyYou</span>
      <ol className={styles.steps} aria-label="Steps">
        {steps.map(({ label, chosen }, index) => {
          const done = index < current;
          return (
            <li
              key={label}
              className={styles.step}
              data-done={done || undefined}
              aria-current={index === current ? 'step' : undefined}
            >
              <span className={styles.mark} aria-hidden="true">
                {done ? <CheckIcon size={18} /> : index + 1}
              </span>
              {label}
              {done && chosen !== undefined && (
                <span className={styles.chosen}>
                  {' · '}
                  <span dir="auto">{chosen}</span>
                </span>
              )}
            </li>
          );
        })}
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
