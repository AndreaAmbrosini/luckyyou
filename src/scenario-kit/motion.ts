// Movement every show can use. Each preset is a GSAP animation on the show's
// clock, so the run stops it when the show ends. A preset that moves an
// element owns its transform: bob a head inside the element that places it.

import { gsap } from 'gsap';
import type { Show } from './contract';

type Target = gsap.TweenTarget;

/** Floats up and down until the show ends. */
export function bob(
  target: Target,
  { distance = 8, seconds = 1.4 }: { distance?: number; seconds?: number } = {},
): gsap.core.Animation {
  return gsap.to(target, {
    y: `-=${distance}`,
    duration: seconds / 2,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
  });
}

/** Sways from its top, like something hanging, until the show ends. */
export function hoverWobble(target: Target): gsap.core.Animation {
  return gsap.fromTo(
    target,
    { rotation: -5 },
    {
      rotation: 5,
      transformOrigin: '50% 0%',
      duration: 0.45,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    },
  );
}

/** Grows in from nothing, with a little overshoot. */
export function popIn(target: Target): gsap.core.Animation {
  return gsap.from(target, { scale: 0, autoAlpha: 0, duration: 0.4, ease: 'back.out(1.7)' });
}

/**
 * Shakes from side to side for 0.4 seconds. With reduced motion it stays
 * still for those 0.4 seconds, so the show's timing doesn't change.
 */
export function shake(target: Target, show: Pick<Show, 'reducedMotion'>): gsap.core.Animation {
  if (show.reducedMotion) return gsap.to({}, { duration: 0.4 });
  const step = { duration: 0.08, ease: 'none' };
  return gsap.to(target, {
    keyframes: [
      { x: '-=8', ...step },
      { x: '+=16', ...step },
      { x: '-=14', ...step },
      { x: '+=12', ...step },
      { x: '-=6', ...step },
    ],
  });
}

/**
 * Scrolls `layer` to the left without end, at `speed` stage pixels a second.
 * The layer holds its picture twice, `width` apart, so the loop has no seam.
 */
export function scroller(
  layer: HTMLElement,
  { width, speed }: { width: number; speed: number },
): gsap.core.Animation {
  return gsap.fromTo(
    layer,
    { x: 0 },
    { x: -width, duration: width / speed, ease: 'none', repeat: -1 },
  );
}
