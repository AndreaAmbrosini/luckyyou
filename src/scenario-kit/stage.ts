import styles from './stage.module.css';

/** The stage every show draws on, in stage pixels. */
export const STAGE = { width: 1280, height: 720 } as const;

/**
 * Builds the stage in `host`: a 1280×720 box, scaled to fit and letterboxed,
 * that follows the window's size until it is removed.
 */
export function buildStage(host: HTMLElement) {
  const frame = host.appendChild(document.createElement('div'));
  frame.className = styles.frame;
  frame.dataset.kit = 'frame';
  const box = frame.appendChild(document.createElement('div'));
  box.className = styles.box;
  const stage = box.appendChild(document.createElement('div'));
  stage.className = styles.layer;
  stage.dataset.kit = 'stage';
  const overlay = box.appendChild(document.createElement('div'));
  overlay.className = `${styles.layer} ${styles.overlay}`;
  const live = frame.appendChild(document.createElement('div'));
  live.className = styles.live;
  live.setAttribute('aria-live', 'polite');

  const rescale = () => {
    const { clientWidth: width, clientHeight: height } = host;
    // A host with no size yet (or in a test) shows the stage at its own size.
    const scale = width && height ? Math.min(width / STAGE.width, height / STAGE.height) : 1;
    box.style.setProperty('--stage-scale', String(scale));
  };
  rescale();
  window.addEventListener('resize', rescale);

  return {
    /** Where the scenario draws. */
    stage,
    /** Above the stage, for captions. */
    overlay,
    /** Read out by screen readers. */
    live,
    remove() {
      window.removeEventListener('resize', rescale);
      stage.replaceChildren();
      frame.remove();
    },
  };
}

/**
 * Places `count` people evenly across `area`, centred, each in an equal slot.
 * They are sized to `fill` of their slot, so fewer people are bigger, up to
 * `maxSize`.
 */
export function spread(
  count: number,
  area: { left: number; right: number },
  { maxSize = Infinity, fill = 0.8 }: { maxSize?: number; fill?: number } = {},
): { x: number; size: number }[] {
  const slot = (area.right - area.left) / count;
  const size = Math.min(maxSize, slot * fill);
  return Array.from({ length: count }, (_, index) => ({
    x: area.left + slot * (index + 0.5),
    size,
  }));
}
