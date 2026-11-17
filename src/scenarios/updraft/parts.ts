// Updraft!'s drawings: the jumper under a canopy of its own, with its extra;
// the landing mat, the trophy, the gust, the clouds and the dust. Every colour
// comes from a class in updraft.module.css; the canopy's colour comes in as
// --canopy and the skin as --skin. Coordinates are in head units: the head
// is on a 100 by 100 grid, its face centred on (50, 44), its raised hands at
// (2, 6) and (98, 6), the canopy above it and the boots below.

import { head, type Head, type Look, type Mood } from '../../scenario-kit';
import styles from './updraft.module.css';

const SVG = 'http://www.w3.org/2000/svg';

export type Shape = readonly [
  tag: string,
  className: string,
  attributes: Record<string, string | number>,
];

export const CANOPIES = [
  'chute',
  'umbrella',
  'parasol',
  'kite',
  'balloons',
  'bedsheet',
  'pizza',
  'coat',
  'towel',
  'newspaper',
  'dandelion',
  'gulls',
  'saucer',
  'flamingo',
] as const;
export type Canopy = (typeof CANOPIES)[number];

export const COLOURS = [
  'tomato',
  'orange',
  'sun',
  'mint',
  'sea',
  'grape',
  'pink',
  'shark',
] as const;
export type CanopyColour = (typeof COLOURS)[number];

export const EXTRAS = ['none', 'scarf', 'goggles', 'fan', 'mug'] as const;
export type Extra = (typeof EXTRAS)[number];

/** Where a jumper's boots hang below its face, in head units, and its canopy's top above it. */
export const BOOTS = 1.03;
export const TOP = 1.56;

export function draw(parent: Element, shapes: readonly Shape[]): SVGElement[] {
  return shapes.map(([tag, className, attributes]) => {
    const shape = parent.appendChild(document.createElementNS(SVG, tag)) as SVGElement;
    shape.setAttribute('class', className);
    for (const [key, value] of Object.entries(attributes)) shape.setAttribute(key, String(value));
    return shape;
  });
}

/** An SVG of `shapes` on a `width` by `height` grid, drawn past its edges. */
export function drawing(width: number, height: number, shapes: readonly Shape[] = []) {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', styles.drawing!);
  draw(svg, shapes);
  return svg;
}

function group(parent: Element, name: string, shapes: readonly Shape[] = []): SVGGElement {
  const g = parent.appendChild(document.createElementNS(SVG, 'g'));
  g.dataset.part = name;
  draw(g, shapes);
  return g;
}

const s = (className: string, d: string, width = 3): Shape => [
  'path',
  className,
  { d, 'stroke-width': width },
];
const dot = (className: string, cx: number, cy: number, r: number, width = 2): Shape => [
  'circle',
  className,
  { cx, cy, r, 'stroke-width': width },
];
const box = (className: string, x: number, y: number, width: number, height: number, round = 2) =>
  ['rect', className, { x, y, width, height, rx: round, 'stroke-width': 2 }] as const;

/** A gull, wings out, its middle at (x, y). */
function gull(x: number, y: number): Shape[] {
  const wings = `M${x - 24} ${y + 2} Q${x - 12} ${y - 16} ${x} ${y} Q${x + 12} ${y - 16} ${x + 24} ${y + 2}`;
  return [
    s(styles.line!, wings, 8),
    s(styles.paperLine!, wings, 4),
    dot(styles.paper!, x, y + 4, 6),
    s(styles.sun!, `M${x + 5} ${y + 3} L${x + 14} ${y + 6} L${x + 5} ${y + 8} Z`, 2),
  ];
}

/** Each canopy, tinted by --canopy, with its hem on y = -40. */
const CANOPY_SHAPES: Record<Canopy, readonly Shape[]> = {
  chute: [
    s(
      styles.tint!,
      'M-8 -42 C-8 -130 108 -130 108 -42 Q93 -54 79 -42 Q65 -54 50 -42 Q36 -54 21 -42 Q7 -54 -8 -42 Z',
    ),
    s(styles.line!, 'M21 -45 Q14 -90 50 -108 M79 -45 Q86 -90 50 -108 M50 -45 V-108', 2),
    box(styles.paper!, 58, -92, 18, 14),
    dot(styles.sun!, 28, -74, 8),
    s(styles.line!, 'M61 -85 H73 M64 -90 V-80', 1.5),
  ],
  umbrella: [
    s(
      styles.tint!,
      'M-6 -44 Q50 -150 106 -44 Q92 -56 78 -44 Q64 -56 50 -44 Q36 -56 22 -44 Q8 -56 -6 -44 Z',
    ),
    s(styles.line!, 'M22 -46 Q28 -92 50 -97 M78 -46 Q72 -92 50 -97 M50 -46 V-97', 2),
    s(styles.line!, 'M50 -97 V-114', 4),
    dot(styles.ink!, 50, -115, 3, 1),
  ],
  parasol: [
    s(styles.tint!, 'M-14 -42 Q50 -126 114 -42 Z'),
    s(
      styles.paper!,
      'M50 -84 L2 -44 L18 -43 Z M50 -84 L34 -42 L50 -42 Z M50 -84 L66 -42 L82 -43 Z M50 -84 L98 -44 L110 -43 Z',
      0,
    ),
    s(styles.line!, 'M-14 -42 Q50 -126 114 -42', 3),
    s(
      styles.line!,
      'M-14 -42 q8 9 16 0 q8 9 16 0 q8 9 16 0 q8 9 16 0 q8 9 16 0 q8 9 16 0 q8 9 16 0 q8 9 16 0',
      3,
    ),
    s(styles.line!, 'M50 -84 V-100', 3),
    dot(styles.sun!, 50, -102, 4),
  ],
  kite: [
    s(styles.tint!, 'M50 -120 L108 -80 L50 -40 L-8 -80 Z'),
    s(styles.line!, 'M50 -120 V-40 M-8 -80 H108', 2),
    s(styles.paper!, 'M50 -120 L108 -80 L50 -80 Z', 2),
    s(styles.line!, 'M108 -80 Q122 -68 112 -54 Q104 -44 116 -34', 2),
    s(styles.tomato!, 'M112 -62 l8 -4 l-2 10 Z M109 -44 l8 -4 l-2 10 Z', 2),
    s(styles.line!, 'M-8 -80 Q-22 -68 -12 -54 Q-4 -44 -16 -34', 2),
    s(styles.sun!, 'M-12 -62 l-8 -4 l2 10 Z M-9 -44 l-8 -4 l2 10 Z', 2),
  ],
  balloons: [
    s(
      styles.line!,
      'M30 -80 L6 -40 M50 -92 L2 -40 M70 -80 L98 -40 M90 -64 L98 -40 M12 -62 L2 -40',
      2,
    ),
    dot(styles.tomato!, 12, -66, 16),
    dot(styles.sun!, 88, -66, 16),
    dot(styles.tint!, 30, -88, 18),
    dot(styles.tint!, 70, -88, 18),
    dot(styles.tint!, 50, -106, 18),
    s(
      styles.paperLine!,
      'M26 -96 Q24 -90 28 -86 M46 -114 Q44 -108 48 -104 M66 -96 Q64 -90 68 -86',
      3,
    ),
  ],
  bedsheet: [
    s(styles.tint!, 'M-6 -42 Q4 -122 50 -112 Q96 -122 106 -42 Q78 -56 50 -44 Q22 -56 -6 -42 Z'),
    s(
      styles.paperLine!,
      'M10 -52 Q16 -100 40 -108 M34 -50 Q40 -92 54 -110 M62 -50 Q64 -92 70 -108',
      5,
    ),
    dot(styles.ink!, -6, -42, 4, 1),
    dot(styles.ink!, 106, -42, 4, 1),
    s(styles.line!, 'M-6 -42 Q22 -56 50 -44 Q78 -56 106 -42', 3),
  ],
  pizza: [
    s(styles.tint!, 'M0 -82 L48 -118 L104 -86 L56 -46 Z'),
    s(styles.line!, 'M0 -82 V-70 L56 -34 V-46 M56 -34 L104 -74 V-86', 3),
    dot(styles.tomato!, 52, -86, 20),
    dot(styles.sun!, 46, -92, 3, 0),
    dot(styles.sun!, 60, -82, 3, 0),
    dot(styles.sun!, 50, -76, 3, 0),
    dot(styles.ink!, 62, -92, 3, 0),
    dot(styles.ink!, 42, -82, 3, 0),
  ],
  coat: [
    s(
      styles.tint!,
      'M-12 -52 Q-18 -100 28 -114 L50 -96 L72 -114 Q118 -100 112 -52 L92 -46 Q50 -66 8 -46 Z',
    ),
    s(styles.paper!, 'M28 -114 L50 -96 L72 -114 L60 -100 L50 -80 L40 -100 Z', 2),
    s(styles.line!, 'M50 -80 V-48', 3),
    dot(styles.ink!, 50, -70, 3, 0),
    dot(styles.ink!, 50, -58, 3, 0),
    s(styles.line!, 'M-4 -60 Q10 -52 22 -54 M104 -60 Q90 -52 78 -54', 2),
  ],
  towel: [
    s(styles.tint!, 'M-4 -44 Q-2 -118 50 -116 Q102 -118 104 -44 Z'),
    s(styles.paperLine!, 'M4 -96 Q50 -108 96 -96 M2 -78 Q50 -90 98 -78 M0 -60 Q50 -72 100 -60', 6),
    s(styles.line!, 'M-4 -44 H104', 3),
    s(
      styles.line!,
      'M0 -44 v8 M10 -44 v8 M20 -44 v8 M30 -44 v8 M40 -44 v8 M50 -44 v8 M60 -44 v8 M70 -44 v8 M80 -44 v8 M90 -44 v8 M100 -44 v8',
      2,
    ),
  ],
  newspaper: [
    s(styles.paper!, 'M-8 -44 Q-6 -122 50 -118 Q106 -122 108 -44 Q80 -56 50 -46 Q20 -56 -8 -44 Z'),
    s(styles.tint!, 'M2 -98 Q50 -112 98 -98 L96 -86 Q50 -100 4 -86 Z', 2),
    s(styles.line!, 'M8 -76 Q50 -88 92 -76 M10 -66 Q50 -78 90 -66 M14 -56 Q50 -68 86 -56', 2),
    s(styles.line!, 'M50 -116 V-48', 2),
  ],
  dandelion: [
    s(
      styles.line!,
      'M50 -44 L6 -74 M50 -44 L14 -100 M50 -44 L34 -122 M50 -44 L50 -126 M50 -44 L66 -122 M50 -44 L86 -100 M50 -44 L94 -74',
      2,
    ),
    dot(styles.paper!, 5, -75, 7),
    dot(styles.paper!, 13, -101, 7),
    dot(styles.paper!, 33, -122, 7),
    dot(styles.paper!, 50, -127, 7),
    dot(styles.paper!, 67, -122, 7),
    dot(styles.paper!, 87, -101, 7),
    dot(styles.paper!, 95, -75, 7),
    dot(styles.tint!, 50, -84, 24),
    s(styles.paperLine!, 'M38 -90 Q50 -102 62 -90', 3),
  ],
  gulls: [
    s(styles.line!, 'M8 -64 L2 -40 M92 -64 L98 -40 M50 -88 L2 -40 M50 -88 L98 -40', 2),
    ...gull(6, -70),
    ...gull(94, -70),
    ...gull(50, -98),
    s(
      styles.tintLine!,
      'M-10 -68 Q-4 -80 6 -70 M106 -68 Q100 -80 94 -70 M38 -96 Q44 -110 50 -98',
      5,
    ),
  ],
  saucer: [
    s(styles.glass!, 'M16 -56 Q50 -128 84 -56 Z'),
    dot(styles.pink!, 50, -76, 7),
    ['ellipse', styles.tint!, { cx: 50, cy: -52, rx: 62, ry: 14, 'stroke-width': 3 }],
    dot(styles.sun!, 6, -50, 4),
    dot(styles.sun!, 28, -42, 4),
    dot(styles.sun!, 50, -38, 4),
    dot(styles.sun!, 72, -42, 4),
    dot(styles.sun!, 94, -50, 4),
  ],
  flamingo: [
    s(styles.line!, 'M6 -50 L2 -40 M94 -50 L98 -40', 2),
    ['ellipse', styles.tint!, { cx: 46, cy: -66, rx: 50, ry: 22, 'stroke-width': 3 }],
    s(styles.paperLine!, 'M10 -66 Q30 -54 52 -62', 4),
    s(
      styles.tint!,
      'M80 -76 Q106 -90 92 -112 Q88 -122 100 -122 Q116 -118 110 -104 Q104 -90 96 -66 Z',
      3,
    ),
    dot(styles.tint!, 102, -122, 8),
    s(styles.sun!, 'M108 -124 L124 -118 L108 -116 Z', 2),
    dot(styles.ink!, 103, -124, 2, 0),
  ],
};

/** Each extra on the jumper, in head units. The fan and the mug are in its raised hands. */
const EXTRA_SHAPES: Record<Extra, readonly Shape[]> = {
  none: [],
  scarf: [
    s(styles.tomato!, 'M24 70 Q50 86 76 70 L78 80 Q50 96 22 80 Z', 3),
    s(styles.tomato!, 'M62 84 L74 118 L62 122 L54 90 Z', 3),
    s(styles.paperLine!, 'M64 100 L72 98 M62 110 L70 108', 3),
  ],
  goggles: [
    s(styles.line!, 'M12 40 H28 M72 40 H88', 5),
    dot(styles.ink!, 38, 40, 12, 3),
    dot(styles.ink!, 62, 40, 12, 3),
    s(styles.line!, 'M48 40 H52', 4),
    s(styles.paperLine!, 'M31 34 L36 31 M55 34 L60 31', 3),
  ],
  fan: [
    s(styles.pink!, 'M98 6 L72 -10 Q98 -38 124 -10 Z', 3),
    s(styles.line!, 'M98 6 L84 -18 M98 6 L98 -26 M98 6 L112 -18', 2),
    dot(styles.skin!, 98, 6, 6, 3),
  ],
  mug: [
    s(styles.line!, 'M-6 4 Q-16 4 -14 12 Q-12 18 -6 18', 4),
    box(styles.paper!, -8, -8, 18, 24, 3),
    s(styles.tomato!, 'M-8 -2 H10', 4),
    s(styles.softLine!, 'M-2 -14 q4 -5 0 -10 M5 -14 q4 -5 0 -10', 2),
    dot(styles.skin!, 2, 6, 6, 3),
  ],
};

/** Each extra by itself, on a 32 by 32 grid, for the Line-up's picture buttons. */
const EXTRA_PICTURES: Record<Extra, readonly Shape[]> = {
  none: [dot(styles.line!, 16, 16, 11, 3), s(styles.line!, 'M8 24 L24 8', 3)],
  scarf: [
    s(styles.tomato!, 'M4 10 Q16 20 28 10 L29 17 Q16 27 3 17 Z', 2),
    s(styles.tomato!, 'M20 20 L26 31 L20 31 L16 22 Z', 2),
  ],
  goggles: [
    s(styles.line!, 'M2 14 H7 M25 14 H30', 3),
    dot(styles.ink!, 11, 15, 6.5, 2),
    dot(styles.ink!, 21, 15, 6.5, 2),
    s(styles.paperLine!, 'M8 12 L10 10 M18 12 L20 10', 1.5),
  ],
  fan: [
    s(styles.pink!, 'M16 27 L3 12 Q16 -2 29 12 Z', 2),
    s(styles.line!, 'M16 27 L8 8 M16 27 V4 M16 27 L24 8', 1.5),
  ],
  mug: [
    s(styles.line!, 'M22 12 Q30 12 29 19 Q28 24 22 24', 3),
    box(styles.paper!, 6, 9, 17, 19, 3),
    s(styles.tomato!, 'M6 14 H23', 3),
    s(styles.softLine!, 'M11 6 q3 -3 0 -5 M18 6 q3 -3 0 -5', 1.5),
  ],
};

export function extraPicture(extra: Extra): SVGElement {
  return drawing(32, 32, EXTRA_PICTURES[extra]);
}

export interface Rig {
  readonly el: SVGSVGElement;
  setMood(mood: Mood): void;
  setSweat(on: boolean): void;
  /** Swings the legs `degrees` one way and the other. */
  setSwing(degrees: number): void;
  /** 0 for a canopy full of air, 1 for one folded up on the risers. */
  setFolded(amount: number): void;
  setGust(on: boolean): void;
  readonly face: Head;
}

/** A jumper on a 100 by 100 grid, its canopy and boots past the edges. */
export function rig(
  look: Look,
  canopy: Canopy,
  colour: CanopyColour,
  extra: Extra,
  mood: Mood = 'calm',
): Rig {
  const el = document.createElementNS(SVG, 'svg');
  el.setAttribute('viewBox', '0 0 100 100');
  el.setAttribute('aria-hidden', 'true');
  el.setAttribute('class', styles.drawing!);
  el.style.setProperty('--canopy', `var(--color-${colour})`);
  el.style.setProperty('--skin', `var(--color-skin-${look.skin})`);

  const gust = group(el, 'gust');
  draw(gust, [
    s(styles.paperLine!, 'M10 150 q18 -12 34 0 t30 -2 M24 164 q16 -10 30 0 t26 -2', 5),
    s(styles.line!, 'M10 150 q18 -12 34 0 t30 -2 M24 164 q16 -10 30 0 t26 -2', 1.5),
  ]);
  gust.setAttribute('display', 'none');

  const sail = group(el, 'canopy');
  draw(sail, CANOPY_SHAPES[canopy]);
  const risers = group(el, 'risers', [
    s(styles.line!, 'M2 -40 V6 M98 -40 V6 M30 -42 L36 74 M70 -42 L64 74', 2),
  ]);

  const legs = [-1, 1].map((side) => {
    const leg = group(el, 'leg');
    draw(leg, [
      s(
        styles.soft!,
        `M${50 + side * 10 - 7} 104 H${50 + side * 10 + 7} L${50 + side * 12 + 6} 138 H${50 + side * 12 - 6} Z`,
        3,
      ),
      [
        'ellipse',
        styles.ink!,
        { cx: 50 + side * 12 + side * 3, cy: 142, rx: 11, ry: 6, 'stroke-width': 2 },
      ],
    ]);
    return leg;
  });

  const face = head({ ...look, accessory: 'cap' }, { mood, land: true, raised: true });
  face.el.setAttribute('x', '0');
  face.el.setAttribute('y', '0');
  face.el.setAttribute('width', '100');
  face.el.setAttribute('height', '100');
  face.el.setAttribute('overflow', 'visible');
  el.appendChild(face.el);

  group(el, 'extra', EXTRA_SHAPES[extra]);

  let folded = Number.NaN;
  let swing = Number.NaN;
  return {
    el,
    face,
    setMood: (next) => face.setMood(next),
    setSweat: (on) => face.setSweat(on),
    setSwing(degrees) {
      if (degrees === swing) return;
      swing = degrees;
      legs[0]!.setAttribute('transform', `rotate(${degrees} 50 104)`);
      legs[1]!.setAttribute('transform', `rotate(${-degrees} 50 104)`);
    },
    setFolded(amount) {
      if (amount === folded) return;
      folded = amount;
      // Folded, it sits on the head like a crumpled hat.
      const scale = 1 - 0.55 * amount;
      sail.setAttribute(
        'transform',
        `translate(50 ${-40 + 48 * amount}) scale(${scale}) translate(-50 40)`,
      );
      risers.setAttribute('opacity', String(1 - 0.7 * amount));
    },
    setGust(on) {
      if (on) gust.removeAttribute('display');
      else gust.setAttribute('display', 'none');
    },
  };
}

/** A jumper as the Line-up shows it: calm, under its canopy, boots and all. */
export function jumperPicture(
  look: Look,
  canopy: Canopy,
  colour: CanopyColour,
  extra: Extra,
): SVGElement {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '-20 -135 140 290');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', styles.drawing!);
  svg.dataset.part = 'jumper';
  const jumper = rig(look, canopy, colour, extra);
  jumper.el.setAttribute('width', '100');
  jumper.el.setAttribute('height', '100');
  svg.appendChild(jumper.el);
  return svg;
}

/** The mat's stripes, on a 600 by 36 grid. */
export function matPicture(): SVGElement {
  return drawing(600, 36, [
    ['rect', styles.mint!, { x: 2, y: 2, width: 596, height: 32, rx: 8, 'stroke-width': 4 }],
    s(styles.paperLine!, 'M24 6 V30 M576 6 V30', 4),
    s(styles.softLine!, 'M60 5 H540', 2),
    s(styles.softLine!, 'M60 31 H540', 2),
  ]);
}

/** The golden trophy, on a 72 by 60 grid. */
export function trophyPicture(): SVGElement {
  return drawing(72, 60, [
    s(styles.sun!, 'M14 8 Q-2 8 4 22 Q8 32 22 32 M58 8 Q74 8 68 22 Q64 32 50 32', 4),
    s(styles.sun!, 'M14 4 H58 Q58 34 36 40 Q14 34 14 4 Z', 3),
    s(styles.sun!, 'M32 40 H40 V50 H32 Z', 3),
    box(styles.bark!, 20, 50, 32, 9, 2),
    s(styles.paperLine!, 'M22 12 Q22 24 30 30', 4),
  ]);
}

/** A puff of dust, on a 180 by 50 grid. */
export function dustPicture(): SVGElement {
  return drawing(180, 50, [
    dot(styles.paper!, 30, 34, 14),
    dot(styles.paper!, 58, 26, 18),
    dot(styles.paper!, 92, 22, 22),
    dot(styles.paper!, 124, 28, 18),
    dot(styles.paper!, 152, 36, 13),
    s(styles.paperLine!, 'M10 46 H170', 14),
  ]);
}

const star = (x: number, y: number, r: number) => {
  const q = r / 3;
  return `M${x} ${y - r} L${x + q} ${y - q} L${x + r} ${y} L${x + q} ${y + q} L${x} ${y + r} L${x - q} ${y + q} L${x - r} ${y} L${x - q} ${y - q} Z`;
};

/** What drifts past, on a 140 by 60 grid: clouds, or in the crater stars and a planet. */
export function cloudPicture(kind: number, night: boolean): SVGElement {
  if (night) {
    return kind % 3 === 0
      ? drawing(140, 60, [
          dot(styles.sea!, 70, 30, 24, 3),
          s(styles.mint!, 'M58 18 Q70 14 76 24 Q64 30 58 18 Z', 2),
          s(styles.sunLine!, 'M30 40 Q70 58 110 20', 3),
        ])
      : drawing(140, 60, [
          s(styles.sun!, star(40, 30, 16), 2),
          s(styles.sun!, star(100, 20, 10), 2),
          s(styles.sun!, star(84, 46, 7), 2),
        ]);
  }
  const puff =
    kind % 3 === 0
      ? 'M16 50 a18 18 0 0 1 6 -32 a26 26 0 0 1 50 -10 a22 22 0 0 1 40 12 a18 18 0 0 1 8 30 Z'
      : kind % 3 === 1
        ? 'M22 52 a16 16 0 0 1 8 -28 a24 24 0 0 1 46 -6 a20 20 0 0 1 32 16 a14 14 0 0 1 2 18 Z'
        : 'M10 52 a14 14 0 0 1 10 -24 a18 18 0 0 1 34 -6 a22 22 0 0 1 40 4 a16 16 0 0 1 16 26 Z';
  return drawing(140, 60, [s(styles.paper!, puff, 3)]);
}

/** A theme's scenery is on a 1280 by 260 grid, its surface on y = 120. */
export const GROUND_HEIGHT = 260;
export const SURFACE = 120;
