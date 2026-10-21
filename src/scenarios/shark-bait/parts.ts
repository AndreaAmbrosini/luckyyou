// Shark Bait's drawings, from the Design canvas's storyboard: the sea, the
// helicopter with its rope and hook, and the shark, as a fin and as the
// shark that comes up for the ride. Every colour comes from a class in
// shark-bait.module.css.

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

/** Lines that trail behind something fast, left out with reduced motion. */
function speedLines(width: number, height: number, lines: readonly string[]): SVGSVGElement {
  const svg = drawing(
    width,
    height,
    lines.map((d) => ['path', styles.ink, { d, 'stroke-width': 7 }]),
  );
  svg.dataset.part = 'speed-lines';
  return svg;
}

const WAVES: readonly Shape[] = [
  ['path', styles.wave, { d: 'M80 300 q20 -12 40 0' }],
  ['path', styles.wave, { d: 'M420 330 q20 -12 40 0' }],
  ['path', styles.wave, { d: 'M760 292 q20 -12 40 0' }],
  ['path', styles.wave, { d: 'M1140 318 q20 -12 40 0' }],
  ['path', styles.wave, { d: 'M240 440 q24 -14 48 0' }],
  ['path', styles.wave, { d: 'M990 455 q24 -14 48 0' }],
  ['path', styles.wave, { d: 'M640 520 q24 -14 48 0' }],
];

/**
 * The sky, three clouds, and the sea from y 250 down. Its waves are drawn
 * twice, a stage's width apart, so they can scroll without a seam.
 */
export function sea() {
  const scene = part(styles.scene, 'scene');
  for (const cloud of [styles.cloud1, styles.cloud2, styles.cloud3]) {
    scene.append(part(`${styles.cloud} ${cloud}`));
  }
  scene.append(part(styles.water));
  const waves = scene.appendChild(part(styles.waves, 'waves'));
  waves.append(drawing(1280, 720, WAVES), drawing(1280, 720, WAVES));
  return { scene, waves };
}

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

/** The riding shark, as the canvas draws it: 1.45 times its own grid, at 230, 380. */
const AT = 'translate(230 380) scale(1.45)';

/** The front edge of the sea for the ride: its water, and the wavy line along its top. */
const FRONT_WAVE =
  'M0 660 Q80 640 160 660 T320 660 T480 660 T640 660 T800 660 T960 660 T1120 660 T1280 660';

/**
 * The shark. First a fin that patrols, placed by the middle of its base,
 * then, for the ride, the whole shark coming up out of the sea, with the
 * front of the sea in front of it. Speed lines are left out with reduced
 * motion.
 */
export function shark({ speedLines: fast }: { speedLines: boolean }) {
  const el = part(styles.shark, 'shark');

  const fin = el.appendChild(part(styles.fin, 'fin'));
  const finShape = fin.appendChild(part(styles.finShape));
  finShape.append(
    drawing(120, 80, [
      ['path', styles.sharkSkin, { d: 'M18 70 L62 6 Q70 40 92 70 Z', 'stroke-width': 5 }],
      ['path', styles.wake, { d: 'M0 72 Q15 62 30 72 T60 72 T90 72 T120 72', 'stroke-width': 6 }],
    ]),
  );
  // Drawn, the fin swims left, so its speed lines trail to its right.
  const finLines = fast ? speedLines(160, 60, ['M20 8 H140', 'M0 30 H120', 'M30 52 H160']) : null;
  if (finLines) {
    finLines.setAttribute('class', styles.finLines);
    finShape.append(finLines);
  }

  const ride = el.appendChild(part(styles.ride, 'ride'));
  if (fast) ride.append(speedLines(1280, 720, ['M20 470 H190', 'M50 530 H230', 'M10 590 H150']));
  ride.append(
    drawing(1280, 720, [
      ['circle', styles.paper, { cx: 200, cy: 640, r: 34, 'stroke-width': 4 }],
      ['circle', styles.paper, { cx: 150, cy: 598, r: 24, 'stroke-width': 4 }],
      ['circle', styles.paper, { cx: 250, cy: 684, r: 40, 'stroke-width': 4 }],
      ['circle', styles.paper, { cx: 105, cy: 660, r: 20, 'stroke-width': 4 }],
      [
        'path',
        styles.sharkSkin,
        { d: 'M20 150 L-45 92 L-28 150 L-45 208 Z', 'stroke-width': 5, transform: AT },
      ],
      [
        'path',
        styles.sharkSkin,
        {
          d: 'M20 150 C80 92 220 72 360 86 C450 96 520 122 590 150 C520 186 440 206 340 206 C220 206 100 196 20 150 Z',
          'stroke-width': 5,
          transform: AT,
        },
      ],
      [
        'path',
        styles.paper,
        {
          d: 'M120 176 C240 204 420 206 560 164 C500 196 430 206 340 206 C240 206 170 198 120 176 Z',
          'stroke-width': 4,
          transform: AT,
        },
      ],
      [
        'path',
        styles.sharkSkin,
        { d: 'M250 84 L300 4 Q306 50 345 88 Z', 'stroke-width': 5, transform: AT },
      ],
      [
        'path',
        styles.sharkSkin,
        { d: 'M330 186 L296 246 L384 196 Z', 'stroke-width': 5, transform: AT },
      ],
      [
        'path',
        styles.ink,
        {
          d: 'M420 118 Q412 140 420 162 M438 116 Q430 140 438 164',
          'stroke-width': 4,
          transform: AT,
        },
      ],
      ['circle', styles.inkFill, { cx: 500, cy: 128, r: 10, transform: AT }],
      ['path', styles.ink, { d: 'M462 166 Q512 186 556 160', 'stroke-width': 5, transform: AT }],
    ]),
  );

  // Drawn twice, side by side, to scroll; only the wavy top is outlined, so no seam shows.
  const front = el.appendChild(part(styles.front));
  for (let copy = 0; copy < 2; copy++) {
    front.append(
      drawing(1280, 720, [
        // The water runs a pixel past each side, so the copies meet without a hairline.
        ['path', styles.seaFill, { d: `${FRONT_WAVE} H1281 V720 H-1 V660 Z` }],
        ['path', styles.ink, { d: FRONT_WAVE, 'stroke-width': 4 }],
      ]),
    );
  }

  return { el, fin, finShape, finLines, ride, front };
}
