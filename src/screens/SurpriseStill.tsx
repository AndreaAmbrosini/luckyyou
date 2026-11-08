import styles from './SurpriseStill.module.css';

/** The two curtains' inner edges meet at the top and part a little at the hem. */
const LEFT = 'M-10 -10 H322 V180 Q316 250 262 330 H-10 Z';
const RIGHT = 'M650 -10 H318 V180 Q324 250 378 330 H650 Z';
/** Folds, as darker stripes, x from the stage's outer edges. */
const FOLDS = [34, 102, 170, 234];
/** The pelmet's scalloped hem, one bump every 64 stage pixels. */
const PELMET = `M-10 -10 H650 V52 ${Array.from(
  { length: 11 },
  (_, i) => `Q${650 - i * 64 - 32} 92 ${650 - (i + 1) * 64} 52`,
).join(' ')} Z`;

/**
 * Surprise me's picture, in place of a show's still: a closed curtain, a "?"
 * sign, and someone peeking through the gap. Chosen, the sign swings and the
 * eyes look out.
 */
export function SurpriseStill({ chosen }: { chosen: boolean }) {
  return (
    <svg
      className={styles.picture}
      viewBox="0 0 640 360"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      data-chosen={chosen || undefined}
    >
      <rect className={styles.floor} x="-10" y="318" width="660" height="60" />
      <path className={styles.plank} d="M0 342 H640" />
      <path className={styles.gap} d="M320 170 L250 330 H390 Z" />
      <g>
        <ellipse className={styles.white} cx="304" cy="286" rx="14" ry="17" />
        <ellipse className={styles.white} cx="336" cy="286" rx="14" ry="17" />
        <g className={styles.pupils}>
          <circle className={styles.pupil} cx="299" cy="290" r="7" />
          <circle className={styles.pupil} cx="331" cy="290" r="7" />
        </g>
      </g>
      {[LEFT, RIGHT].map((d, side) => (
        <g key={d}>
          <path className={styles.curtain} d={d} />
          {FOLDS.map((x) => (
            <rect
              key={x}
              className={styles.fold}
              x={side === 0 ? x : 640 - x - 16}
              y="70"
              width="16"
              height="246"
              rx="8"
            />
          ))}
          <path className={styles.edge} d={d} />
        </g>
      ))}
      <g className={styles.sign}>
        <path className={styles.rope} d="M270 20 L276 112 M370 20 L364 112" />
        <rect className={styles.board} x="250" y="104" width="140" height="122" rx="16" />
        <path
          className={styles.hook}
          d="M294 150 Q294 124 320 124 Q346 124 346 148 Q346 166 320 174 V186"
        />
        <circle className={styles.dot} cx="320" cy="208" r="12" />
      </g>
      <path className={styles.pelmet} d={PELMET} />
    </svg>
  );
}
