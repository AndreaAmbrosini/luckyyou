// Shark Bait's drawings, from the Design canvas's storyboard: the sea, the
// helicopter with its rope and hook, and the shark's fin. Every colour comes
// from a class in shark-bait.module.css.

import styles from './shark-bait.module.css';

type Shape = readonly [tag: string, className: string, attributes: Record<string, string | number>];

const SVG = 'http://www.w3.org/2000/svg';

/** An SVG of `shapes` on a `width` by `height` grid. */
function drawing(width: number, height: number, shapes: readonly Shape[]): SVGSVGElement {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('aria-hidden', 'true');
  for (const [tag, className, attributes] of shapes) {
    const shape = svg.appendChild(document.createElementNS(SVG, tag));
    shape.setAttribute('class', className);
    for (const [key, value] of Object.entries(attributes)) shape.setAttribute(key, String(value));
  }
  return svg;
}

const part = (className: string, name?: string) => {
  const element = document.createElement('div');
  element.className = className;
  if (name) element.dataset.part = name;
  return element;
};

/** The sky, three clouds, the sea from y 250 down, and its waves. */
export function sea() {
  const scene = part(styles.scene, 'scene');
  for (const cloud of [styles.cloud1, styles.cloud2, styles.cloud3]) {
    scene.append(part(`${styles.cloud} ${cloud}`));
  }
  scene.append(part(styles.water));
  const waves = scene.appendChild(part(styles.waves, 'waves'));
  waves.append(
    drawing(1280, 720, [
      ['path', styles.wave, { d: 'M80 300 q20 -12 40 0' }],
      ['path', styles.wave, { d: 'M420 330 q20 -12 40 0' }],
      ['path', styles.wave, { d: 'M760 292 q20 -12 40 0' }],
      ['path', styles.wave, { d: 'M1140 318 q20 -12 40 0' }],
      ['path', styles.wave, { d: 'M240 440 q24 -14 48 0' }],
      ['path', styles.wave, { d: 'M990 455 q24 -14 48 0' }],
      ['path', styles.wave, { d: 'M640 520 q24 -14 48 0' }],
    ]),
  );
  return { scene, waves };
}

/** The helicopter's body is drawn this wide, in stage pixels. */
export const HELICOPTER_WIDTH = 200;

/**
 * The helicopter, placed by the point its rope hangs from. The rope and hook
 * hang in `line`, which can swing; the rope's length is its height, and the
 * hook sits at the rope's end.
 */
export function helicopter() {
  const el = part(styles.helicopter, 'helicopter');
  const line = el.appendChild(part(styles.line));
  const rope = line.appendChild(part(styles.rope, 'rope'));
  const hook = line.appendChild(part(styles.hook, 'hook'));
  const body = el.appendChild(part(styles.body));
  const rotor = drawing(220, 130, [
    ['path', styles.ink, { d: 'M93 32 V18', 'stroke-width': 6 }],
    ['path', styles.ink, { d: 'M15 16 H175', 'stroke-width': 7 }],
  ]);
  body.append(
    drawing(220, 130, [
      ['path', styles.ink, { d: 'M150 62 H205', 'stroke-width': 13 }],
      ['path', styles.sunLine, { d: 'M150 62 H205', 'stroke-width': 5 }],
      ['circle', styles.paper, { cx: 207, cy: 58, r: 13, 'stroke-width': 4 }],
      ['ellipse', styles.sun, { cx: 95, cy: 70, rx: 62, ry: 38, 'stroke-width': 5 }],
      [
        'path',
        styles.glass,
        { d: 'M50 58 Q60 38 92 38 L92 74 L46 74 Q42 66 50 58 Z', 'stroke-width': 4 },
      ],
      ['path', styles.ink, { d: 'M62 106 V120 M128 106 V120 M40 122 H150', 'stroke-width': 5 }],
    ]),
    rotor,
  );
  rotor.setAttribute('class', styles.rotor);
  return { el, line, rope, hook, body, rotor };
}

/** The shark's fin cutting through the water, placed by the middle of its base. */
export function fin() {
  const el = part(styles.fin, 'shark');
  const shape = el.appendChild(part(styles.finShape));
  shape.append(
    drawing(120, 80, [
      ['path', styles.shark, { d: 'M18 70 L62 6 Q70 40 92 70 Z', 'stroke-width': 5 }],
      ['path', styles.wake, { d: 'M0 72 Q15 62 30 72 T60 72 T90 72 T120 72', 'stroke-width': 6 }],
    ]),
  );
  return { el, shape };
}
