// The Race's drawings, from the Design canvas: the racer on each mount, with
// its extra, the rider's mood and pose, and the trophy (a creature, racing on
// its own feet, is in creature.ts); a theme's costume and prize; the tracks,
// each with its backdrop, ground, signs and lines; and the photo-finish card.
// Every colour comes from a class in the-race.module.css; the racer's colour
// comes in as --racer, and the contrast for the hat band, the scarf, the
// cape and the bow tie as --band.

import { head, nameTag, type Head, type Look, type Mood } from '../../scenario-kit';
import type { Course } from './plan';
import styles from './the-race.module.css';

export type Mount =
  'snail' | 'duck' | 'chair' | 'caterpillar' | 'hopper' | 'ostrich' | 'rocket' | 'sandwich';
export type Creature =
  | 'zombie'
  | 'robot'
  | 'shark'
  | 'astronaut'
  | 'monster'
  | 'villain'
  | 'alien'
  | 'dinosaur'
  | 'mug'
  | 'printer'
  | 'sticky'
  | 'banana'
  | 'icecream'
  | 'sushi'
  | 'cat'
  | 'octopus'
  | 'penguin'
  | 'pigeon'
  | 'ghost'
  | 'mummy'
  | 'yeti'
  | 'gnome';
export type RacerColour = 'tomato' | 'sun' | 'mint' | 'grape' | 'pink' | 'orange' | 'sea' | 'shark';
export type Extra = 'googly' | 'tophat' | 'number' | 'scarf' | 'cape' | 'bowtie';
/** `hold`, the reins or the backrest; `pull`, leaning back on them; `wave`; `party`, arms up. */
export type Pose = 'hold' | 'pull' | 'wave' | 'party';

export const MOUNTS: readonly Mount[] = [
  'snail',
  'duck',
  'chair',
  'caterpillar',
  'hopper',
  'ostrich',
  'rocket',
  'sandwich',
];
export const CREATURES: readonly Creature[] = [
  'zombie',
  'robot',
  'shark',
  'astronaut',
  'monster',
  'villain',
  'alien',
  'dinosaur',
  'mug',
  'printer',
  'sticky',
  'banana',
  'icecream',
  'sushi',
  'cat',
  'octopus',
  'penguin',
  'pigeon',
  'ghost',
  'mummy',
  'yeti',
  'gnome',
];
/** The creatures that are things on legs, which tilt from their feet. */
export const THINGS: readonly Creature[] = [
  'mug',
  'printer',
  'sticky',
  'banana',
  'icecream',
  'sushi',
];
export const RACER_COLOURS: readonly RacerColour[] = [
  'tomato',
  'sun',
  'mint',
  'grape',
  'pink',
  'orange',
  'sea',
  'shark',
];
export const EXTRAS: readonly Extra[] = ['googly', 'tophat', 'number', 'scarf', 'cape', 'bowtie'];

/**
 * What the Line-up chooses for one racer: a mount to ride or a creature to
 * race as, both under the key `mount`, so looks stored before creatures fit.
 */
export interface RacerLook {
  readonly mount: Kind;
  readonly colour: RacerColour;
  readonly extra: Extra;
}

/** A look on a mount. */
export type RideLook = RacerLook & { readonly mount: Mount };

/** What someone races as: a mount, or a creature. */
export type Kind = Mount | Creature;

export const isCreature = (kind: Kind): kind is Creature =>
  (CREATURES as readonly string[]).includes(kind);

/** A racer's drawing: 240 by 200, facing right, the mount's feet at y 190. */
export const RACER = { width: 240, height: 200, feet: 190 } as const;

type Point = readonly [x: number, y: number];

/**
 * Per mount: the saddle, where the rider's shirt sits (the same height on
 * every mount, so heads line up); the nose; where the reins tie on, or null
 * where the rider holds on instead (`hold`); the hat; each googly eye (x, y,
 * radius, and the pupil's offset); and the racing number.
 */
export const SPEC: Readonly<
  Record<
    Mount,
    {
      saddle: Point;
      nose: number;
      reins: Point | null;
      hold?: Point;
      hat: Point;
      googly: readonly (readonly [number, number, number, number, number])[];
      roundel: Point;
    }
  >
> = {
  snail: {
    saddle: [100, 110],
    nose: 236,
    reins: [210, 122],
    hat: [216, 118],
    googly: [
      [197, 80, 11, 4, 3],
      [229, 84, 11, -3, 4],
    ],
    roundel: [100, 140],
  },
  duck: {
    saddle: [112, 110],
    nose: 240,
    reins: [198, 114],
    hat: [186, 70],
    googly: [[196, 88, 12, 4, 3]],
    roundel: [62, 140],
  },
  chair: {
    saddle: [104, 110],
    nose: 200,
    reins: null,
    hold: [163, 88],
    hat: [181, 36],
    googly: [
      [172, 62, 9, 3, 2],
      [190, 62, 9, -2, 3],
    ],
    roundel: [181, 88],
  },
  caterpillar: {
    saddle: [108, 110],
    nose: 218,
    reins: [178, 96],
    hat: [188, 88],
    googly: [
      [176, 108, 10, 3, 3],
      [198, 108, 10, -3, 4],
    ],
    roundel: [36, 132],
  },
  hopper: {
    saddle: [104, 110],
    nose: 164,
    reins: null,
    hold: [146, 86],
    hat: [170, 92],
    googly: [
      [146, 134, 9, 3, 2],
      [161, 137, 9, -2, 3],
    ],
    roundel: [104, 162],
  },
  ostrich: {
    saddle: [100, 110],
    nose: 216,
    reins: [176, 82],
    hat: [182, 50],
    googly: [[185, 57, 8, 3, 2]],
    roundel: [84, 132],
  },
  rocket: {
    saddle: [92, 110],
    nose: 238,
    reins: null,
    hold: [162, 94],
    hat: [214, 122],
    googly: [[206, 130, 8, 3, 2]],
    roundel: [72, 134],
  },
  sandwich: {
    saddle: [104, 110],
    nose: 212,
    reins: [200, 86],
    hat: [201, 72],
    googly: [
      [184, 118, 8, 3, 2],
      [168, 118, 8, -2, 3],
    ],
    roundel: [120, 154],
  },
};

/** The rider's head holder: 72 px, its foot 81 px down, where it leans from. */
export const RIDER = { size: 72, foot: 81, lean: -12 } as const;

export type Shape = readonly [
  tag: string,
  className: string,
  attributes: Record<string, string | number>,
];

const SVG = 'http://www.w3.org/2000/svg';

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

export function group(parent: Element, name: string, shapes: readonly Shape[] = []): SVGGElement {
  const g = parent.appendChild(document.createElementNS(SVG, 'g'));
  g.dataset.part = name;
  draw(g, shapes);
  return g;
}

/** Each extra on its own, on a 32 by 32 grid, for the Line-up's picture buttons. */
const EXTRA_PICTURES: Record<Extra, readonly Shape[]> = {
  googly: [
    ['circle', styles.paper!, { cx: 10.5, cy: 16, r: 7 }],
    ['circle', styles.paper!, { cx: 22, cy: 15, r: 6 }],
    ['circle', styles.inkFill!, { cx: 12.5, cy: 18.5, r: 3 }],
    ['circle', styles.inkFill!, { cx: 20, cy: 17.5, r: 2.6 }],
  ],
  tophat: [
    ['rect', styles.ink!, { x: 9.5, y: 6, width: 13, height: 17, rx: 1.5 }],
    ['rect', styles.tomato!, { x: 9.5, y: 17, width: 13, height: 3.5, 'stroke-width': 0 }],
    ['rect', styles.ink!, { x: 4, y: 22.5, width: 24, height: 4, rx: 2 }],
  ],
  number: [['circle', styles.paper!, { cx: 16, cy: 16, r: 11.5 }]],
  scarf: [
    ['path', styles.tomato!, { d: 'M19 15 L17 28 L23 28 L24.5 14 Z' }],
    ['path', styles.tomato!, { d: 'M5 9 Q16 15 27 9 L27 15 Q16 21 5 15 Z' }],
  ],
  cape: [
    ['path', styles.tomato!, { d: 'M11 5 H21 L28 27 Q16 23 4 27 Z' }],
    ['path', styles.line!, { d: 'M11 5 Q16 9 21 5' }],
  ],
  bowtie: [
    ['path', styles.tomato!, { d: 'M16 16 L4 8.5 V23.5 Z' }],
    ['path', styles.tomato!, { d: 'M16 16 L28 8.5 V23.5 Z' }],
    ['circle', styles.tomato!, { cx: 16, cy: 16, r: 3.8 }],
  ],
};

/** `extra` on its own, as the Line-up shows it on its button. */
export function extraPicture(extra: Extra): SVGSVGElement {
  const svg = drawing(32, 32);
  const g = group(svg, extra, EXTRA_PICTURES[extra]);
  g.setAttribute('stroke-width', '2.5');
  if (extra === 'number') {
    // The racing number's own type, at 15 of the grid's 32.
    const [label] = draw(g, [
      ['text', styles.number!, { transform: `translate(16 16.5) scale(${15 / 22})` }],
    ]);
    label!.textContent = '3';
  }
  return svg;
}

/** Shows `el` when `on`, hides it otherwise; writes only on a change. */
export function show(el: Element, on: boolean) {
  const shown = !el.hasAttribute('display');
  if (shown === on) return;
  if (on) el.removeAttribute('display');
  else el.setAttribute('display', 'none');
}

/** The hopper's horns, and the ostrich's legs and neck: an ink line under a coloured one. */
const HORNS = 'M140 112 Q134 94 146 84 M156 118 Q156 102 170 94';
const OSTRICH = {
  legs: 'M98 146 L90 168 L98 188 M124 146 L132 168 L124 188',
  feet: 'M98 188 H114 M124 188 H140',
  neck: 'M150 126 Q172 104 180 70',
} as const;

const MOUNT_SHAPES: Record<Mount, (eyes: boolean) => Shape[]> = {
  snail: (eyes) => [
    [
      'path',
      styles.shark!,
      {
        d: 'M22 188 Q20 166 50 164 L170 164 Q188 160 194 138 Q200 114 216 116 Q232 120 230 144 Q228 170 214 188 Z',
        'stroke-width': 4,
      },
    ],
    ['path', styles.line!, { d: 'M208 122 L198 88 M220 120 L228 92', 'stroke-width': 5 }],
    ...(eyes
      ? ([
          ['circle', styles.paper!, { cx: 197, cy: 82, r: 9, 'stroke-width': 3 }],
          ['circle', styles.ink!, { cx: 200, cy: 83, r: 4 }],
          ['circle', styles.paper!, { cx: 229, cy: 86, r: 9, 'stroke-width': 3 }],
          ['circle', styles.ink!, { cx: 232, cy: 87, r: 4 }],
        ] as Shape[])
      : []),
    ['path', styles.line!, { d: 'M210 152 Q219 160 228 149', 'stroke-width': 4 }],
    ['circle', styles.racer!, { cx: 100, cy: 138, r: 38, 'stroke-width': 4 }],
    [
      'path',
      styles.line!,
      {
        d: 'M100 138 m-6 0 a6 6 0 1 1 12 0 a13 13 0 1 1 -25 3 a20 20 0 1 1 39 -4 a28 28 0 1 1 -54 7',
        'stroke-width': 4,
      },
    ],
  ],
  duck: (eyes) => [
    ['path', styles.racer!, { d: 'M46 132 L20 102 Q44 106 64 124 Z', 'stroke-width': 4 }],
    ['rect', styles.board!, { x: 52, y: 168, width: 132, height: 10, rx: 5, 'stroke-width': 3 }],
    ['circle', styles.wheel!, { cx: 74, cy: 183, r: 7, 'stroke-width': 4, 'data-part': 'wheel' }],
    ['circle', styles.wheel!, { cx: 162, cy: 183, r: 7, 'stroke-width': 4, 'data-part': 'wheel' }],
    ['ellipse', styles.racer!, { cx: 116, cy: 140, rx: 80, ry: 32, 'stroke-width': 4 }],
    ['circle', styles.racer!, { cx: 186, cy: 98, r: 30, 'stroke-width': 4 }],
    ['path', styles.racer!, { d: 'M92 138 Q118 116 152 136 Q122 158 92 138 Z', 'stroke-width': 4 }],
    [
      'path',
      styles.orange!,
      { d: 'M212 92 Q240 94 240 104 Q228 116 210 112 Z', 'stroke-width': 4 },
    ],
    ...(eyes ? ([['circle', styles.ink!, { cx: 196, cy: 90, r: 5 }]] as Shape[]) : []),
  ],
  chair: () => [
    ['rect', styles.shark!, { x: 106, y: 122, width: 12, height: 54, 'stroke-width': 3 }],
    ['path', styles.line!, { d: 'M52 180 L112 174 L172 180', 'stroke-width': 7 }],
    ['circle', styles.shark!, { cx: 52, cy: 182, r: 8, 'stroke-width': 4, 'data-part': 'wheel' }],
    ['circle', styles.shark!, { cx: 112, cy: 182, r: 8, 'stroke-width': 4, 'data-part': 'wheel' }],
    ['circle', styles.shark!, { cx: 172, cy: 182, r: 8, 'stroke-width': 4, 'data-part': 'wheel' }],
    ['rect', styles.racer!, { x: 48, y: 104, width: 136, height: 22, rx: 11, 'stroke-width': 4 }],
    ['rect', styles.racer!, { x: 162, y: 34, width: 38, height: 76, rx: 14, 'stroke-width': 4 }],
  ],
  caterpillar: (eyes) => [
    [
      'path',
      styles.line!,
      {
        d: 'M36 150 V186 M72 148 V186 M108 150 V186 M144 148 V186 M186 144 V186',
        'stroke-width': 5,
      },
    ],
    ['circle', styles.racer!, { cx: 36, cy: 132, r: 22, 'stroke-width': 4 }],
    ['circle', styles.racer!, { cx: 72, cy: 128, r: 24, 'stroke-width': 4 }],
    ['circle', styles.racer!, { cx: 108, cy: 130, r: 24, 'stroke-width': 4 }],
    ['circle', styles.racer!, { cx: 144, cy: 128, r: 24, 'stroke-width': 4 }],
    ['path', styles.line!, { d: 'M176 92 L166 66 M200 90 L210 66', 'stroke-width': 5 }],
    ['circle', styles.racer!, { cx: 166, cy: 64, r: 6, 'stroke-width': 3 }],
    ['circle', styles.racer!, { cx: 210, cy: 64, r: 6, 'stroke-width': 3 }],
    ['circle', styles.racer!, { cx: 188, cy: 116, r: 30, 'stroke-width': 4 }],
    ...(eyes
      ? ([
          ['circle', styles.ink!, { cx: 178, cy: 110, r: 4.5 }],
          ['circle', styles.ink!, { cx: 198, cy: 110, r: 4.5 }],
        ] as Shape[])
      : []),
    ['path', styles.line!, { d: 'M176 126 Q188 140 202 126', 'stroke-width': 4 }],
  ],
  hopper: (eyes) => [
    ['path', styles.line!, { d: HORNS, 'stroke-width': 14 }],
    ['path', styles.racerLine!, { d: HORNS, 'stroke-width': 6 }],
    ['circle', styles.racer!, { cx: 122, cy: 146, r: 42, 'stroke-width': 4 }],
    ['path', styles.stripe!, { d: 'M94 132 Q100 116 116 110', 'stroke-width': 6 }],
    ...(eyes
      ? ([
          ['circle', styles.ink!, { cx: 146, cy: 136, r: 4.5 }],
          ['circle', styles.ink!, { cx: 160, cy: 138, r: 4.5 }],
        ] as Shape[])
      : []),
    ['path', styles.line!, { d: 'M142 152 Q153 162 163 150', 'stroke-width': 4 }],
  ],
  ostrich: (eyes) => [
    [
      'path',
      styles.racer!,
      { d: 'M66 118 Q40 96 28 112 Q42 118 34 132 Q52 128 64 138 Z', 'stroke-width': 4 },
    ],
    ['path', styles.line!, { d: OSTRICH.legs, 'stroke-width': 11, 'data-part': 'legs' }],
    ['path', styles.pinkLine!, { d: OSTRICH.legs, 'stroke-width': 4, 'data-part': 'legs' }],
    ['path', styles.line!, { d: OSTRICH.feet, 'stroke-width': 6, 'data-part': 'legs' }],
    ['path', styles.line!, { d: OSTRICH.neck, 'stroke-width': 15 }],
    ['path', styles.pinkLine!, { d: OSTRICH.neck, 'stroke-width': 7 }],
    ['ellipse', styles.racer!, { cx: 110, cy: 128, rx: 50, ry: 28, 'stroke-width': 4 }],
    ['path', styles.racer!, { d: 'M84 124 Q110 104 140 120 Q114 144 84 124 Z', 'stroke-width': 4 }],
    [
      'circle',
      styles.pink!,
      { cx: 182, cy: 62, r: 14, 'stroke-width': 4, 'data-part': 'bird-head' },
    ],
    [
      'path',
      styles.orange!,
      { d: 'M193 57 Q216 59 216 64 Q208 72 193 68 Z', 'stroke-width': 4, 'data-part': 'bird-head' },
    ],
    ...(eyes
      ? ([
          ['circle', styles.ink!, { cx: 185, cy: 58, r: 3.5, 'data-part': 'bird-head' }],
        ] as Shape[])
      : []),
  ],
  rocket: (eyes) => [
    ['path', styles.line!, { d: 'M70 158 L64 184 M152 158 L158 184', 'stroke-width': 5 }],
    ['path', styles.line!, { d: 'M48 187 H178', 'stroke-width': 6 }],
    [
      'path',
      styles.orange!,
      { d: 'M38 116 L6 134 L38 152 Z', 'stroke-width': 4, 'data-part': 'flame' },
    ],
    ['path', styles.sunFill!, { d: 'M38 126 L20 134 L38 142 Z', 'data-part': 'flame' }],
    ['path', styles.racer!, { d: 'M52 110 L32 84 L84 108 Z', 'stroke-width': 4 }],
    [
      'path',
      styles.racer!,
      { d: 'M36 108 H176 Q224 114 238 134 Q224 154 176 160 H36 Z', 'stroke-width': 4 },
    ],
    ['rect', styles.paper!, { x: 120, y: 108, width: 14, height: 52, 'stroke-width': 3 }],
    ...(eyes
      ? ([['circle', styles.glass!, { cx: 188, cy: 134, r: 10, 'stroke-width': 3 }]] as Shape[])
      : []),
    ['path', styles.line!, { d: 'M146 108 L152 94 L164 94', 'stroke-width': 5 }],
  ],
  sandwich: () => [
    ['path', styles.line!, { d: 'M72 158 V182 M168 158 V182', 'stroke-width': 6 }],
    ['ellipse', styles.inkFill!, { cx: 80, cy: 186, rx: 13, ry: 6 }],
    ['ellipse', styles.inkFill!, { cx: 176, cy: 186, rx: 13, ry: 6 }],
    ['rect', styles.bread!, { x: 34, y: 144, width: 176, height: 20, rx: 10, 'stroke-width': 4 }],
    [
      'path',
      styles.lettuce!,
      {
        d:
          'M30 147 Q40 134 52 144 Q64 134 76 144 Q88 134 100 144 Q112 134 124 144 ' +
          'Q136 134 148 144 Q160 134 172 144 Q184 134 196 144 Q206 136 214 147 Z',
        'stroke-width': 3,
      },
    ],
    ['rect', styles.racer!, { x: 36, y: 124, width: 172, height: 17, rx: 6, 'stroke-width': 4 }],
    [
      'path',
      styles.bread!,
      { d: 'M32 129 Q32 108 66 108 H178 Q212 108 212 129 Z', 'stroke-width': 4 },
    ],
    ['path', styles.line!, { d: 'M58 116 l6 -2 M150 114 l6 2 M182 119 l5 -3', 'stroke-width': 3 }],
    ['path', styles.line!, { d: 'M196 110 L200 82', 'stroke-width': 4 }],
    ['circle', styles.lettuce!, { cx: 201, cy: 78, r: 8, 'stroke-width': 3 }],
  ],
};

/** The egg an ostrich lays, from the canvas, on its 40 by 48 grid. */
const EGG: readonly Shape[] = [
  [
    'path',
    styles.paper!,
    { d: 'M20 2 Q38 4 38 28 Q38 46 20 46 Q2 46 2 28 Q2 4 20 2 Z', 'stroke-width': 4 },
  ],
  ['path', styles.line!, { d: 'M10 22 l4 -3 M26 30 l5 -2 M18 38 l3 -3', 'stroke-width': 3 }],
];

/** The puff of smoke from a rocket out of fuel, round (0, 0). */
const SMOKE: readonly Shape[] = [
  ['circle', styles.paper!, { cx: -20, cy: 8, r: 16, 'stroke-width': 4 }],
  ['circle', styles.paper!, { cx: 0, cy: -10, r: 20, 'stroke-width': 4 }],
  ['circle', styles.paper!, { cx: 18, cy: 8, r: 16, 'stroke-width': 4 }],
];

/** Puffs of steam out of a spicy sandwich, behind its rider and at its nose: an ink wisp under a paper one. */
const WISPS =
  'M32 112 q-8 -10 0 -20 q8 -10 0 -20 M58 108 q-8 -10 0 -20 q8 -10 0 -20 ' +
  'M220 116 q-8 -10 0 -20 q8 -10 0 -20';
const STEAM: readonly Shape[] = [
  ['path', styles.line!, { d: WISPS, 'stroke-width': 10 }],
  ['path', styles.stripe!, { d: WISPS, 'stroke-width': 5 }],
];

/** The pickle a sandwich drops, round (0, 0), pale so it shows on the grass. */
const PICKLE: readonly Shape[] = [
  ['ellipse', styles.pickle!, { cx: 0, cy: 0, rx: 18, ry: 9, 'stroke-width': 4 }],
  ['path', styles.line!, { d: 'M-8 -2 h1 M0 2 h1 M8 -2 h1', 'stroke-width': 3 }],
];

/** What a burst or a stop brings out, per mount, each hidden until then. */
export type Prop = 'egg' | 'smoke' | 'steam' | 'pickle';
const PROPS: Partial<Record<Mount, Partial<Record<Prop, readonly Shape[]>>>> = {
  ostrich: { egg: EGG },
  rocket: { smoke: SMOKE },
  sandwich: { steam: STEAM, pickle: PICKLE },
};

/** The rider's scarf, on the head's 100 grid, under the chin and out behind. */
const SCARF: readonly Shape[] = [
  ['path', styles.band!, { d: 'M34 74 Q4 60 -36 72 L-32 88 Q2 78 34 84 Z', 'stroke-width': 4 }],
  ['path', styles.stripe!, { d: 'M-6 66 L-2 82 M-22 69 L-18 85', 'stroke-width': 5 }],
  ['rect', styles.band!, { x: 30, y: 68, width: 40, height: 13, rx: 6.5, 'stroke-width': 4 }],
];

/** The cape, on the head's 100 grid, from the shoulders and flying out behind. */
const CAPE: readonly Shape[] = [
  ['path', styles.band!, { d: 'M30 80 Q-6 80 -48 114 L-30 130 Q0 102 36 94 Z', 'stroke-width': 4 }],
];

/** The bow tie, on the head's 100 grid, at the collar. */
const BOW_TIE: readonly Shape[] = [
  ['path', styles.band!, { d: 'M50 80 L34 70 V90 Z M50 80 L66 70 V90 Z', 'stroke-width': 3.5 }],
  ['circle', styles.band!, { cx: 50, cy: 80, r: 5, 'stroke-width': 3 }],
];

/**
 * What a track's own events bring, from the canvas or in its style: the
 * office's coffee machine, on the stage from its left edge, standing on the
 * floor in front of the partitions, below the caption; the paper cup, on its 40 by 44 grid; the wet-floor sign, standing on
 * its middle at (0, 0); the seaweed that wraps round a racer, on its 160 by
 * 120 grid; the current's swirls behind a racer, on the racer's grid; the
 * snowdrift that piles up round a racer, on its 200 by 84 grid; and the
 * sledge that slides in under one, on its 160 by 50 grid.
 */
export const TRACK_PROPS: Readonly<
  Record<
    'machine' | 'cup' | 'wetFloor' | 'seaweed' | 'swirls' | 'snowdrift' | 'sledge',
    readonly Shape[]
  >
> = {
  machine: [
    ['rect', styles.tomato!, { x: 0, y: 118, width: 70, height: 96, rx: 8, 'stroke-width': 4 }],
    ['rect', styles.glass!, { x: 12, y: 130, width: 46, height: 28, rx: 4, 'stroke-width': 3 }],
    ['rect', styles.paper!, { x: 24, y: 186, width: 22, height: 20, 'stroke-width': 3 }],
  ],
  cup: [
    ['path', styles.paper!, { d: 'M4 10 H32 L28 42 H8 Z', 'stroke-width': 4 }],
    ['path', styles.line!, { d: 'M32 16 Q42 18 38 28 Q36 32 30 32', 'stroke-width': 4 }],
    ['path', styles.line!, { d: 'M12 6 Q8 0 14 -6 M22 6 Q18 0 24 -6', 'stroke-width': 3 }],
  ],
  wetFloor: [
    ['path', styles.sun!, { d: 'M-26 0 L-10 -64 H10 L26 0 Z', 'stroke-width': 4 }],
    ['path', styles.line!, { d: 'M0 -50 V-28', 'stroke-width': 6 }],
    ['circle', styles.inkFill!, { cx: 0, cy: -16, r: 4 }],
  ],
  seaweed: [
    [
      'path',
      styles.leaf!,
      {
        d: 'M0 40 Q30 20 60 46 T120 44 T160 30 L156 46 Q130 60 118 58 T58 62 T4 56 Z',
        'stroke-width': 4,
      },
    ],
    [
      'path',
      styles.leaf!,
      {
        d: 'M30 120 Q20 90 40 70 Q50 92 44 120 Z M110 120 Q104 86 124 64 Q134 90 126 120 Z',
        'stroke-width': 4,
      },
    ],
  ],
  swirls: [
    [
      'path',
      styles.line!,
      {
        d: 'M70 150 q-30 -24 -50 0 q-10 16 8 18 q14 0 10 -12 M96 108 q-26 -20 -44 0 q-8 14 6 15 q12 0 8 -10',
        'stroke-width': 10,
      },
    ],
    [
      'path',
      styles.swirl!,
      {
        d: 'M70 150 q-30 -24 -50 0 q-10 16 8 18 q14 0 10 -12 M96 108 q-26 -20 -44 0 q-8 14 6 15 q12 0 8 -10',
        'stroke-width': 5,
      },
    ],
  ],
  snowdrift: [
    [
      'path',
      styles.paper!,
      {
        d: 'M0 84 Q4 44 40 44 Q54 8 100 18 Q142 0 162 38 Q196 38 200 84 Z',
        'stroke-width': 5,
      },
    ],
    [
      'path',
      styles.glassLine!,
      { d: 'M28 70 Q58 56 88 64 M118 66 Q144 52 172 62', 'stroke-width': 5 },
    ],
    [
      'path',
      styles.paper!,
      {
        d:
          'M60 4 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 Z M150 -6 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0 Z ' +
          'M118 -18 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0 Z',
        'stroke-width': 3,
      },
    ],
  ],
  sledge: [
    ['path', styles.line!, { d: 'M30 42 V26 M112 42 V26', 'stroke-width': 5 }],
    ['path', styles.line!, { d: 'M4 42 H130 Q150 42 154 20', 'stroke-width': 6 }],
    [
      'path',
      styles.tomato!,
      { d: 'M8 12 H128 Q142 12 142 22 V28 H8 Z', 'stroke-width': 4, 'stroke-linejoin': 'round' },
    ],
    ['path', styles.sunLine!, { d: 'M16 20 H132', 'stroke-width': 4 }],
  ],
};

/** The trophy, on its 72 by 60 grid. */
export const TROPHY: readonly Shape[] = [
  [
    'path',
    styles.line!,
    { d: 'M16 12 Q4 12 6 22 Q8 32 20 32 M56 12 Q68 12 66 22 Q64 32 52 32', 'stroke-width': 4 },
  ],
  ['path', styles.sun!, { d: 'M16 6 H56 V18 Q56 38 36 40 Q16 38 16 18 Z', 'stroke-width': 4 }],
  ['rect', styles.sun!, { x: 31, y: 39, width: 10, height: 9, 'stroke-width': 3 }],
  ['rect', styles.board!, { x: 20, y: 47, width: 32, height: 10, rx: 3, 'stroke-width': 3 }],
];

/** The present, on the trophy's 72 by 60 grid: tomato, with a sun ribbon and bow. */
export const PRESENT: readonly Shape[] = [
  ['rect', styles.tomato!, { x: 12, y: 24, width: 48, height: 33, rx: 3, 'stroke-width': 4 }],
  ['rect', styles.tomato!, { x: 8, y: 16, width: 56, height: 12, rx: 3, 'stroke-width': 4 }],
  ['rect', styles.sun!, { x: 31, y: 16, width: 10, height: 41, 'stroke-width': 3 }],
  [
    'path',
    styles.sun!,
    { d: 'M36 16 Q20 0 18 10 Q20 20 36 16 Z M36 16 Q52 0 54 10 Q52 20 36 16 Z', 'stroke-width': 3 },
  ],
  ['circle', styles.sun!, { cx: 36, cy: 16, r: 5, 'stroke-width': 3 }],
];

/**
 * The Santa hat, round the middle of its brim's bottom: its tail and bobble
 * hang back. `shaded`, it has a creature's flat shadow and shine.
 */
export function santaHat(shaded = false): Shape[] {
  const cone = 'M-24 -12 C-22 -38 -4 -54 14 -50 C24 -46 26 -30 24 -12 Z';
  return [
    [
      'path',
      styles.tomato!,
      {
        d: 'M12 -50 C-6 -60 -30 -56 -42 -36 L-34 -30 C-26 -42 -10 -46 4 -42 Z',
        'stroke-width': 4,
        'stroke-linejoin': 'round',
      },
    ],
    ['path', styles.tomato!, { d: cone, 'stroke-width': 4, 'stroke-linejoin': 'round' }],
    ...(shaded
      ? ([
          [
            'path',
            styles.shade!,
            { d: 'M-23 -13 C-22 -30 -15 -42 -6 -48 C-11 -36 -13 -24 -11 -13 Z' },
          ],
          [
            'path',
            styles.stripe!,
            { d: 'M15 -42 Q20 -33 20 -20', 'stroke-width': 4, opacity: 0.8 },
          ],
        ] as Shape[])
      : []),
    [
      'path',
      styles.paper!,
      { d: 'M-22 -15 H22 A7.5 7.5 0 0 1 22 0 H-22 A7.5 7.5 0 0 1 -22 -15 Z', 'stroke-width': 4 },
    ],
    ['circle', styles.paper!, { cx: -40, cy: -32, r: 8.5, 'stroke-width': 4 }],
  ];
}

/** What a theme dresses everyone in, and what the winner holds up. */
export interface Dress {
  readonly costume: 'santa' | null;
  readonly prize: 'trophy' | 'present';
}

/** Christmas puts everyone in a Santa hat and gives the winner a present; other themes, the trophy. */
export const dressFor = (course: Course | null): Dress =>
  course === 'christmas'
    ? { costume: 'santa', prize: 'present' }
    : { costume: null, prize: 'trophy' };

/** A racer, a rider on a mount or a creature, as the race moves it. */
export interface Runner {
  /** 240 by 200 on its grid, facing right, its feet at y 190; size it with width and height. */
  readonly el: SVGSVGElement;
  readonly look: RacerLook;
  /** Its nose's x, and the middle of its face's 72 px box, on its grid. */
  readonly nose: number;
  readonly faceX: number;
  setMood(mood: Mood): void;
  setPose(pose: Pose): void;
  setSweat(on: boolean): void;
  setTrophy(on: boolean): void;
}

export interface Racer extends Runner {
  readonly face: Head;
  /** The mount, without its rider, to wobble or spin. */
  readonly mount: SVGGElement;
  /** The rider's holder, leaning back when pulling. */
  readonly rider: SVGGElement;
  readonly look: RideLook;
  /** Shows or hides the lettuce leaf a snail nibbles at its mouth. */
  setLeaf(on: boolean): void;
  /** The mount's props, hidden until shown, to place and show. */
  readonly props: Readonly<Partial<Record<Prop, SVGGElement>>>;
}

/**
 * A racer on their mount, from the canvas's Racer: the mount in the
 * racer's colour, their extra, and the rider, the kit's head on land with a
 * shirt in the racer's colour, holding on in `pose`, in the theme's `dress`.
 */
export function racer(
  look: RideLook,
  {
    face: faceLook,
    number,
    mood = 'calm',
    pose = 'hold',
    dress = dressFor(null),
  }: { face: Look; number: number; mood?: Mood; pose?: Pose; dress?: Dress },
): Racer {
  const spec = SPEC[look.mount];
  const [sx, sy] = spec.saddle;
  const el = drawing(RACER.width, RACER.height);
  el.dataset.part = 'racer';
  el.dataset.mount = look.mount;
  el.dataset.colour = look.colour;
  el.dataset.extra = look.extra;
  el.style.setProperty('--racer', `var(--color-${look.colour})`);
  el.style.setProperty('--band', `var(--color-${look.colour === 'sun' ? 'tomato' : 'sun'})`);

  const googly = look.extra === 'googly';
  const mount = group(el, 'mount', MOUNT_SHAPES[look.mount](!googly));

  if (look.extra === 'number') {
    const [x, y] = spec.roundel;
    const roundel = group(mount, 'number', [
      ['circle', styles.paper!, { cx: x, cy: y, r: 15.5, 'stroke-width': 3 }],
    ]);
    const text = roundel.appendChild(document.createElementNS(SVG, 'text'));
    text.setAttribute('class', styles.number!);
    text.setAttribute('x', String(x));
    text.setAttribute('y', String(y));
    text.textContent = String(number);
  }
  if (googly) {
    group(
      mount,
      'googly',
      spec.googly.flatMap(([x, y, r, px, py]) => {
        const k = r / 12;
        return [
          ['circle', styles.paper!, { cx: x, cy: y, r: 10.5 * k, 'stroke-width': 2.5 * k }],
          ['circle', styles.ink!, { cx: x + px * k, cy: y + py * k, r: 4.6 * k }],
        ] as Shape[];
      }),
    );
  }
  if (look.extra === 'tophat') {
    const [x, y] = spec.hat;
    const hat = group(mount, 'tophat', [
      ['rect', styles.ink!, { x: 7, y: 2, width: 22, height: 24, rx: 2, 'stroke-width': 2 }],
      ['rect', styles.band!, { x: 7, y: 15, width: 22, height: 6, 'stroke-width': 2 }],
      ['rect', styles.inkFill!, { x: 1, y: 24, width: 34, height: 7, rx: 3.5 }],
    ]);
    hat.setAttribute('transform', `translate(${x - 18} ${y - 30})`);
  }

  // The rider: the kit's head in a holder that leans from the shirt's foot.
  const rider = group(el, 'rider');
  rider.setAttribute('transform', `translate(${sx - 36} ${sy - RIDER.foot})`);
  const lean = group(rider, 'lean');
  const face = head(faceLook, { mood, ring: false, land: true });
  face.el.style.setProperty('--shirt', `var(--color-${look.colour})`);
  face.el.setAttribute('width', String(RIDER.size));
  face.el.setAttribute('height', String(RIDER.size));
  /** Puts on an extra drawn on the head's grid, at the rider's size. */
  const wear = (name: string, shapes: readonly Shape[]) => {
    const extra = lean.appendChild(drawing(100, 100, shapes));
    extra.dataset.part = name;
    extra.setAttribute('width', String(RIDER.size));
    extra.setAttribute('height', String(RIDER.size));
    return extra;
  };
  // The cape goes behind the rider; the scarf and the bow tie over the shirt.
  if (look.extra === 'cape') wear('cape', CAPE);
  lean.append(face.el);
  if (dress.costume === 'santa') {
    // Instead of the cap, the goggles or the snorkel the kit hands out.
    face.el.querySelector(`[data-part="${faceLook.accessory}"]`)?.remove();
    group(wear('santa', []), 'hat', santaHat()).setAttribute('transform', 'translate(50 24)');
  }
  if (look.extra === 'scarf') wear('scarf', SCARF);
  if (look.extra === 'bowtie') wear('bowtie', BOW_TIE);

  // Arms, reins and hands, over the rider and the mount.
  const hands = group(el, 'hands');
  const [arms, reins] = draw(hands, [
    ['path', styles.line!, { d: 'M0 0', 'stroke-width': 5 }],
    ['path', styles.line!, { d: 'M0 0', 'stroke-width': 4 }],
  ]) as [SVGElement, SVGElement];
  reins.dataset.part = 'reins';
  const fists = draw(hands, [
    ['circle', styles.skin!, { cx: 0, cy: 0, r: 4.5, 'stroke-width': 2.5 }],
    ['circle', styles.skin!, { cx: 0, cy: 0, r: 4.5, 'stroke-width': 2.5 }],
  ]);
  hands.style.setProperty('--skin', `var(--color-skin-${faceLook.skin})`);

  // What a burst or a stop brings out, over the racer.
  const props: Partial<Record<Prop, SVGGElement>> = {};
  for (const [name, shapes] of Object.entries(PROPS[look.mount] ?? {})) {
    const prop = group(el, name, shapes);
    show(prop, false);
    props[name as Prop] = prop;
  }

  // The lettuce leaf a stopped snail nibbles, at its mouth.
  const leaf = group(el, 'leaf', [
    ['path', styles.grass!, { d: 'M2 20 Q12 0 42 4 Q38 32 2 20 Z', 'stroke-width': 3 }],
    ['path', styles.line!, { d: 'M6 19 Q22 12 38 7', 'stroke-width': 2.5 }],
  ]);
  leaf.setAttribute('transform', 'translate(214 138)');
  show(leaf, false);

  const trophy = drawing(72, 60, dress.prize === 'present' ? PRESENT : TROPHY);
  trophy.dataset.part = dress.prize;
  trophy.setAttribute('x', String(sx - 36));
  trophy.setAttribute('y', String(sy - 132));
  trophy.setAttribute('width', '72');
  trophy.setAttribute('height', '60');
  el.append(trophy);
  show(trophy, false);

  let current = { mood, pose };
  const setPose = (next: Pose) => {
    current = { ...current, pose: next };
    const party = next === 'party' || current.mood === 'party';
    const held: Point[] = [];
    let armPath = '';
    let reinPath = '';
    if (next === 'hold') {
      const hand = spec.hold ?? [sx + 50, sy - 8];
      armPath = `M${sx + 20} ${sy - 19} L${hand[0]} ${hand[1]}`;
      held.push(hand);
      if (spec.reins) {
        const sag = Math.max(hand[1], spec.reins[1]) + 16;
        const mid = Math.round((hand[0] + spec.reins[0]) / 2);
        reinPath = `M${hand[0]} ${hand[1]} Q${mid} ${sag} ${spec.reins[0]} ${spec.reins[1]}`;
      }
    } else if (next === 'wave') {
      const hand: Point = [sx + 38, sy - 76];
      armPath = `M${sx + 20} ${sy - 19} L${hand[0]} ${hand[1]}`;
      held.push(hand);
    } else if (next === 'pull') {
      const one: Point = [sx + 28, sy - 4];
      const two: Point = [sx + 22, sy - 1];
      armPath =
        `M${sx + 16} ${sy - 23} L${one[0]} ${one[1]} ` +
        `M${sx - 23} ${sy - 14} L${two[0]} ${two[1]}`;
      held.push(one, two);
      if (spec.reins) reinPath = `M${one[0]} ${one[1]} L${spec.reins[0]} ${spec.reins[1]}`;
    }
    arms.setAttribute('d', armPath || 'M0 0');
    show(arms, armPath !== '');
    reins.setAttribute('d', reinPath || 'M0 0');
    show(reins, reinPath !== '' && !party);
    fists.forEach((fist, i) => {
      const hand = held[i];
      show(fist, hand !== undefined);
      if (hand) {
        fist.setAttribute('cx', String(hand[0]));
        fist.setAttribute('cy', String(hand[1]));
      }
    });
    lean.setAttribute(
      'transform',
      next === 'pull' ? `rotate(${RIDER.lean} 36 ${RIDER.foot})` : 'rotate(0 36 81)',
    );
    el.dataset.pose = next;
  };

  const racerDrawn: Racer = {
    el,
    face,
    mount,
    rider,
    look,
    nose: spec.nose,
    faceX: sx,
    setMood(next) {
      current = { ...current, mood: next };
      face.setMood(next);
      el.dataset.mood = next;
      setPose(current.pose);
    },
    setPose,
    setSweat(on) {
      face.setSweat(on);
      el.dataset.sweat = String(on);
    },
    setTrophy(on) {
      show(trophy, on);
      el.dataset.trophy = String(on);
    },
    setLeaf(on) {
      show(leaf, on);
    },
    props,
  };
  racerDrawn.setMood(mood);
  racerDrawn.setPose(pose);
  return racerDrawn;
}

/** The flags' colours along the bunting, in order. */
const FLAGS: readonly RacerColour[] = ['tomato', 'sun', 'mint', 'grape', 'pink', 'orange'];
/**
 * The bunting dips once every `dip` px from `top`, `sag` deep, with a flag
 * every `flag` px, and moves at half the camera's speed.
 */
const BUNTING = { dip: 640, flag: 64, top: 96, sag: 34, parallax: 0.5 };
/** A rail post every so often, moving with the ground. */
const POST = 160;
/** Clouds drift at a fifth of the camera's speed, round again past `wrap`. */
const CLOUDS = { parallax: 0.2, wrap: 1500 };

const wrap = (value: number, size: number) => ((value % size) + size) % size;

/** The y of the bunting's string at x. */
const stringY = (x: number) =>
  BUNTING.top + Math.round(BUNTING.sag * Math.sin((Math.PI * wrap(x, BUNTING.dip)) / BUNTING.dip));

/** A chequered strip two squares wide, `rows` squares long, from (x, y). */
function chequer(x: number, y: number, rows: number, size: number): string {
  const squares: string[] = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < 2; column++) {
      if ((row + column) % 2 === 0) {
        squares.push(`M${x + column * size} ${y + row * size} h${size} v${size} h-${size} Z`);
      }
    }
  }
  return squares.join(' ');
}

/**
 * How a track's signs stand: on a post by the rail, stuck to a partition,
 * by a candy cane, or on their own.
 */
type Stands = 'post' | 'note' | 'cane' | 'bare';

/** A candy cane standing on the ground's edge, its hook over to the right, 30 px left of a 150 px sign. */
const CANE = 'M-105 214 V126 Q-105 106 -87 106 Q-69 106 -69 124';

/** A sign saying `text`, its post or its middle at x 0 of its holder. */
function sign(text: string, colour: 'paper' | 'sun', stands: Stands): HTMLElement {
  const holder = document.createElement('div');
  holder.className = styles.sign!;
  holder.dataset.part = 'sign';
  if (stands === 'post') {
    const post = holder.appendChild(document.createElement('div'));
    post.className = styles.post!;
  }
  if (stands === 'cane') {
    const cane = holder.appendChild(
      drawing(1, 1, [
        ['path', styles.line!, { d: CANE, 'stroke-width': 16 }],
        ['path', styles.stripe!, { d: CANE, 'stroke-width': 8 }],
        ['path', styles.caneStripe!, { d: CANE, 'stroke-width': 8 }],
      ]),
    );
    cane.classList.add(styles.cane!);
    cane.dataset.part = 'cane';
  }
  const board = holder.appendChild(document.createElement('p'));
  board.className = [
    styles.signBoard,
    colour === 'sun' && styles.sunBoard,
    stands === 'note' && styles.note,
  ]
    .filter(Boolean)
    .join(' ');
  board.textContent = text;
  return holder;
}

/** A picture repeated every `period` px, passing at `parallax` times the camera's speed. */
interface Strip {
  readonly el: SVGGElement;
  readonly period: number;
  readonly parallax: number;
}

/** `shapes` repeated every `period` px, across the stage and a period either side. */
function strip(
  parent: Element,
  name: string,
  period: number,
  parallax: number,
  shapes: readonly Shape[],
): Strip {
  const el = group(parent, name);
  for (let copy = -1; copy * period < 1280 + period; copy++) {
    const tile = el.appendChild(document.createElementNS(SVG, 'g'));
    tile.setAttribute('transform', `translate(${copy * period} 0)`);
    draw(tile, shapes);
  }
  return { el, period, parallax };
}

/** The office: a wall with windows and a clock, partitions with a plant in front, grey carpet. */
function office(back: SVGSVGElement, ground: SVGSVGElement): Strip[] {
  const wall = strip(back, 'wall', 1440, 0.5, [
    ['rect', styles.glass!, { x: 40, y: 20, width: 300, height: 120, rx: 6, 'stroke-width': 4 }],
    ['path', styles.line!, { d: 'M190 20 V140 M40 80 H340', 'stroke-width': 4 }],
    ['rect', styles.glass!, { x: 760, y: 20, width: 300, height: 120, rx: 6, 'stroke-width': 4 }],
    ['path', styles.line!, { d: 'M910 20 V140 M760 80 H1060', 'stroke-width': 4 }],
    ['circle', styles.paper!, { cx: 560, cy: 62, r: 34, 'stroke-width': 4 }],
    ['path', styles.line!, { d: 'M560 62 V40 M560 62 L576 70', 'stroke-width': 4 }],
  ]);
  draw(ground, [
    ['rect', styles.mintSoft!, { x: -10, y: 152, width: 1300, height: 64, 'stroke-width': 4 }],
  ]);
  const panels = strip(ground, 'panels', 200, 1, [
    ['path', styles.line!, { d: 'M160 152 V216', 'stroke-width': 4 }],
  ]);
  draw(ground, [
    ['rect', styles.carpet!, { x: -10, y: 214, width: 1300, height: 520, 'stroke-width': 4 }],
  ]);
  const seams = strip(ground, 'seams', 160, 1, [
    ['path', styles.seam!, { d: 'M80 216 V720', 'stroke-width': 4 }],
  ]);
  const plant = strip(ground, 'plant', 1600, 1, [
    [
      'path',
      styles.leaf!,
      {
        d: 'M1180 176 q-30 -40 -6 -66 q8 30 6 66 M1180 176 q30 -44 8 -70 q-10 34 -8 70 M1180 176 q-4 -50 0 -80',
        'stroke-width': 4,
      },
    ],
    ['path', styles.orange!, { d: 'M1158 176 h44 l-6 40 h-32 Z', 'stroke-width': 4 }],
  ]);
  return [wall, panels, seams, plant];
}

/** A bubble whose outer edge is `d` across, from its top left at (x, y). */
const bubbleAt = (x: number, y: number, d: number): Shape => [
  'circle',
  styles.glass!,
  { cx: x + d / 2, cy: y + d / 2, r: d / 2 - 1.5, 'stroke-width': 3 },
];

/** Under the sea: the surface, fish and bubbles, seaweed, sand and a rope of floats. */
function sea(back: SVGSVGElement, ground: SVGSVGElement): Strip[] {
  // The surface's wave drawn apart from the water above it, and that over a
  // flat fill above the crests, so no tile shows a seam.
  const wave = 'M170 22 Q130 40 90 22 Q50 4 10 22';
  draw(back, [['rect', styles.skyFill!, { x: -10, y: -10, width: 1300, height: 20 }]]);
  const surface = strip(back, 'surface', 160, 0.5, [
    ['path', styles.skyFill!, { d: 'M10 -10 H170 V22 Q130 40 90 22 Q50 4 10 22 Z' }],
    ['path', styles.line!, { d: wave, 'stroke-width': 4 }],
  ]);
  const water = strip(back, 'fish', 1500, 0.2, [
    [
      'path',
      styles.orange!,
      { d: 'M140 110 l40 -18 v36 Z M180 110 q30 -26 60 0 q-30 26 -60 0 Z', 'stroke-width': 4 },
    ],
    ['circle', styles.inkFill!, { cx: 226, cy: 106, r: 3.5 }],
    [
      'path',
      styles.pink!,
      { d: 'M980 70 l30 -14 v28 Z M1010 70 q24 -20 48 0 q-24 20 -48 0 Z', 'stroke-width': 4 },
    ],
    ['circle', styles.inkFill!, { cx: 1046, cy: 67, r: 3 }],
    bubbleAt(360, 60, 22),
    bubbleAt(384, 30, 14),
    bubbleAt(640, 120, 18),
    bubbleAt(820, 50, 26),
    bubbleAt(846, 18, 12),
  ]);
  const weed = strip(ground, 'seaweed', 150, 1, [
    [
      'path',
      styles.leaf!,
      { d: 'M30 216 q-16 -40 4 -70 q16 -30 0 -60 q24 30 8 62 q-14 30 6 68 Z', 'stroke-width': 4 },
    ],
  ]);
  draw(ground, [
    ['rect', styles.sun!, { x: -10, y: 214, width: 1300, height: 520, 'stroke-width': 4 }],
    ['path', styles.line!, { d: 'M-10 190 H1290', 'stroke-width': 4 }],
  ]);
  const floats = strip(ground, 'floats', 240, 1, [
    ['circle', styles.tomato!, { cx: 33, cy: 190, r: 11, 'stroke-width': 4 }],
    ['circle', styles.paper!, { cx: 153, cy: 190, r: 11, 'stroke-width': 4 }],
  ]);
  return [surface, water, weed, floats];
}

/** Four-pointed stars, 18 px across. */
const STARS = [
  [80, 40],
  [160, 150],
  [420, 30],
  [520, 140],
  [660, 70],
  [760, 160],
  [900, 30],
  [980, 140],
  [1240, 160],
  [340, 170],
]
  .map(
    ([x = 0, y = 0]) =>
      `M${x} ${y - 9} L${x + 3} ${y - 3} L${x + 9} ${y} L${x + 3} ${y + 3} ` +
      `L${x} ${y + 9} L${x - 3} ${y + 3} L${x - 9} ${y} L${x - 3} ${y - 3} Z`,
  )
  .join(' ');

/** The Moon's craters: each one's middle and half its width; a third as tall as wide. */
const CRATERS = [
  [150, 300, 50],
  [520, 420, 64],
  [930, 330, 44],
  [300, 600, 56],
  [1100, 560, 70],
  [700, 660, 40],
]
  .map(([x = 0, y = 0, r = 0]) => {
    const ry = Math.round(r / 3);
    return `M${x - r} ${y} a${r} ${ry} 0 1 0 ${2 * r} 0 a${r} ${ry} 0 1 0 ${-2 * r} 0 Z`;
  })
  .join(' ');

/** The Moon: a dark sky with stars, the Earth and a ringed planet, grey dust with craters. */
function moon(back: SVGSVGElement, ground: SVGSVGElement): Strip[] {
  const space = strip(back, 'space', 1500, 0.1, [
    ['circle', styles.earth!, { cx: 1120, cy: 70, r: 48, 'stroke-width': 4 }],
    [
      'path',
      styles.leaf!,
      {
        d: 'M1088 52 q16 -14 30 0 q-6 16 -24 14 Z M1124 80 q18 -6 26 8 q-14 14 -28 4 Z',
        'stroke-width': 3,
      },
    ],
    ['circle', styles.planet!, { cx: 240, cy: 86, r: 26, 'stroke-width': 4 }],
    ['ellipse', styles.ring!, { cx: 240, cy: 86, rx: 50, ry: 10, 'stroke-width': 5 }],
    ['path', styles.sunFill!, { d: STARS }],
  ]);
  // The hills' edge drawn apart from the dust under it, and the dust over a
  // flat fill below the dips, so no tile shows a seam.
  const hills = 'M-10 214 Q170 176 350 214 Q530 252 710 214';
  draw(ground, [['rect', styles.dust!, { x: -10, y: 240, width: 1300, height: 500 }]]);
  const dust = strip(ground, 'dust', 720, 1, [
    ['path', styles.dust!, { d: `${hills} V740 H-10 Z` }],
    ['path', styles.line!, { d: hills, 'stroke-width': 4 }],
  ]);
  const craters = strip(ground, 'craters', 1280, 1, [
    ['path', styles.inkSoft!, { d: CRATERS, 'stroke-width': 3 }],
  ]);
  return [space, dust, craters];
}

/** The field's sky, bunting, grass and rail. */
function field(back: SVGSVGElement, ground: SVGSVGElement): Strip[] {
  // The bunting: one picture a dip wider than the stage, slid along.
  const flags = group(back, 'flags');
  const string: string[] = [];
  for (let x = -BUNTING.flag; x <= 1280 + BUNTING.dip; x += 16) {
    string.push(`${string.length ? 'L' : 'M'}${x} ${stringY(x)}`);
  }
  draw(flags, [['path', styles.line!, { d: string.join(' '), 'stroke-width': 4 }]]);
  for (let j = 0, x = -BUNTING.flag; x <= 1280 + BUNTING.dip; j++, x += BUNTING.flag) {
    const y = stringY(x + 18);
    const [flag] = draw(flags, [
      [
        'path',
        styles.flag!,
        { d: `M${x + 2} ${y} H${x + 34} L${x + 18} ${y + 34} Z`, 'stroke-width': 3 },
      ],
    ]);
    flag!.style.setProperty('--flag', `var(--color-${FLAGS[j % FLAGS.length]})`);
  }
  draw(ground, [
    ['rect', styles.grass!, { x: -10, y: 214, width: 1300, height: 520, 'stroke-width': 4 }],
    ['rect', styles.paper!, { x: -10, y: 186, width: 1300, height: 16, 'stroke-width': 4 }],
  ]);
  const posts = strip(ground, 'posts', POST, 1, [
    ['path', styles.paper!, { d: 'M0 180 h12 v36 h-12 Z', 'stroke-width': 4 }],
  ]);
  return [{ el: flags, period: BUNTING.dip, parallax: BUNTING.parallax }, posts];
}

/** A circle round (x, y) as a path. */
const dot = (x: number, y: number, r: number) =>
  `M${x - r} ${y} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z `;
const triangle = (a: number, b: number, c: number, d: number, e: number, f: number) =>
  `M${a} ${b} L${c} ${d} L${e} ${f} Z `;

/** Christmas's snowflakes in the dusk sky. */
const FLAKES = [
  [40, 30],
  [150, 70],
  [260, 24],
  [330, 110],
  [420, 50],
  [500, 130],
  [620, 20],
  [700, 96],
  [780, 40],
  [860, 120],
  [900, 30],
  [1040, 70],
  [1100, 140],
  [1250, 120],
  [210, 150],
  [460, 170],
  [1010, 20],
]
  .map(([x = 0, y = 0]) => dot(x, y, 4))
  .join('');

/** The village's hills stand on y `HILLS`; its fairy lights hang along y `LIGHTS`, a bulb every 64 px. */
const HILLS = 194;
const LIGHTS = 198;
const BULBS: readonly string[] = [styles.tomato!, styles.sun!, styles.mint!, styles.pink!];

/**
 * Christmas: a snowy village at dusk, with snowflakes and a crescent moon,
 * white hills, a tomato house and a mint house with snowy roofs and lit
 * windows, pines, and a big tree with baubles and a star; fairy lights along
 * the snow.
 */
function christmas(back: SVGSVGElement, ground: SVGSVGElement): Strip[] {
  const y = HILLS;
  const sky = strip(back, 'night', 1500, 0.1, [
    ['path', styles.paperFill!, { d: FLAKES }],
    [
      'path',
      styles.sun!,
      {
        d: 'M70 22 A46 46 0 1 0 104 104 A38 38 0 1 1 70 22 Z',
        'stroke-width': 4,
        'data-part': 'moon',
      },
    ],
  ]);
  // The hills' edge drawn apart from the snow under it, so no tile shows a seam.
  const hill = `M-10 ${y} Q170 ${y - 40} 350 ${y} Q530 ${y + 40} 710 ${y}`;
  const hills = strip(back, 'hills', 720, 0.5, [
    ['path', styles.paperFill!, { d: `${hill} V216 H-10 Z` }],
    ['path', styles.line!, { d: hill, 'stroke-width': 4 }],
  ]);
  let pines = '';
  for (const [x, s] of [
    [380, 0.7],
    [800, 0.75],
    [1230, 0.6],
  ] as const) {
    pines +=
      triangle(x - 50 * s, y, x + 50 * s, y, x, y - 70 * s) +
      triangle(x - 40 * s, y - 40 * s, x + 40 * s, y - 40 * s, x, y - 110 * s);
  }
  // The big tree, right of the caption at the start.
  const bx = 1110;
  const tree =
    triangle(bx - 60, y + 4, bx + 60, y + 4, bx, y - 76) +
    triangle(bx - 48, y - 44, bx + 48, y - 44, bx, y - 116) +
    triangle(bx - 34, y - 88, bx + 34, y - 88, bx, y - 150);
  const sy = y - 158;
  const star =
    `M${bx} ${sy - 16} L${bx + 4.5} ${sy - 5} L${bx + 16} ${sy - 5} L${bx + 7} ${sy + 2} ` +
    `L${bx + 10} ${sy + 14} L${bx} ${sy + 7} L${bx - 10} ${sy + 14} L${bx - 7} ${sy + 2} ` +
    `L${bx - 16} ${sy - 5} L${bx - 4.5} ${sy - 5} Z`;
  const village = strip(back, 'village', 1440, 0.5, [
    [
      'rect',
      styles.tomato!,
      { x: 120, y: y - 60, width: 90, height: 64, 'stroke-width': 4, 'data-part': 'house' },
    ],
    [
      'path',
      styles.paper!,
      { d: triangle(106, y - 56, 165, y - 104, 224, y - 56), 'stroke-width': 4 },
    ],
    [
      'path',
      styles.sun!,
      {
        d: `M134 ${y - 44} h20 v18 h-20 Z M176 ${y - 44} h20 v18 h-20 Z`,
        'stroke-width': 3,
        'data-part': 'windows',
      },
    ],
    [
      'rect',
      styles.mint!,
      { x: 940, y: y - 54, width: 80, height: 58, 'stroke-width': 4, 'data-part': 'house' },
    ],
    [
      'path',
      styles.paper!,
      { d: triangle(928, y - 50, 980, y - 92, 1032, y - 50), 'stroke-width': 4 },
    ],
    [
      'path',
      styles.sun!,
      {
        d: `M952 ${y - 40} h18 v16 h-18 Z M990 ${y - 40} h18 v16 h-18 Z`,
        'stroke-width': 3,
        'data-part': 'windows',
      },
    ],
    ['path', styles.leaf!, { d: pines, 'stroke-width': 4, 'data-part': 'pines' }],
    ['path', styles.leaf!, { d: tree, 'stroke-width': 4, 'data-part': 'tree' }],
    [
      'path',
      styles.tomato!,
      {
        d:
          dot(bx - 26, y - 14, 7) +
          dot(bx + 24, y - 22, 7) +
          dot(bx - 4, y - 60, 6) +
          dot(bx + 16, y - 100, 5) +
          dot(bx - 16, y - 96, 5),
        'stroke-width': 3,
        'data-part': 'baubles',
      },
    ],
    ['path', styles.sun!, { d: star, 'stroke-width': 3, 'data-part': 'star' }],
  ]);
  draw(ground, [
    ['rect', styles.snow!, { x: -10, y: 214, width: 1300, height: 520, 'stroke-width': 4 }],
    ['path', styles.line!, { d: `M-10 ${LIGHTS} H1290`, 'stroke-width': 4 }],
  ]);
  const lights = strip(
    ground,
    'lights',
    64 * BULBS.length,
    1,
    BULBS.map((bulb, i) => [
      'rect',
      bulb,
      { x: 21.5 + 64 * i, y: LIGHTS - 0.5, width: 15, height: 19, rx: 7.5, 'stroke-width': 3 },
    ]),
  );
  return [sky, hills, village, lights];
}

const BACKDROPS: Record<Course, (back: SVGSVGElement, ground: SVGSVGElement) => Strip[]> = {
  field,
  office,
  sea,
  moon,
  christmas,
};

/**
 * How each track's lane lines look, whole or dashed, and its signs: how they
 * stand, and the colour of the distances (Start and Finish take the other).
 */
const LOOKS: Record<
  Course,
  { lines: string; dashed: boolean; stands: Stands; distance: 'paper' | 'sun' }
> = {
  field: { lines: styles.paperFill!, dashed: false, stands: 'post', distance: 'sun' },
  office: { lines: styles.sunFill!, dashed: false, stands: 'note', distance: 'sun' },
  sea: { lines: styles.orangeFill!, dashed: false, stands: 'post', distance: 'paper' },
  moon: { lines: styles.paperFill!, dashed: true, stands: 'post', distance: 'paper' },
  christmas: { lines: styles.glassFill!, dashed: false, stands: 'cane', distance: 'paper' },
};

/** Dashed lines: a dash this long every `every` px. */
const DASH = { long: 44, every: 80 };

export interface Track {
  /** Everything behind the racers. */
  readonly el: HTMLElement;
  /** Moves what passes by, the lines, signs and backdrop, for the camera at `camera` px. */
  set(camera: number): void;
}

/**
 * Track `course`, from the canvas: the sports field (sky with two clouds,
 * bunting, the rail with its posts, grass), the office, under the sea, the
 * Moon or Christmas. On each, lines between the lanes, the Start line at `start` and the
 * chequered Finish at `finish`, in px along the track, and distance signs
 * counting down to it over a race of 200 m. `lanes` are the lanes' tops,
 * back to front.
 */
export function track({
  lanes,
  start,
  finish,
  course = 'field',
}: {
  lanes: readonly number[];
  start: number;
  finish: number;
  course?: Course;
}): Track {
  const el = document.createElement('div');
  el.className = `${styles.layer} ${styles[course]}`;
  el.dataset.part = 'track';
  el.dataset.course = course;
  const look = LOOKS[course];

  const clouds =
    course === 'field'
      ? [60, 900].map((x, i) => {
          const cloud = el.appendChild(document.createElement('span'));
          cloud.className = `${styles.cloud} ${i === 0 ? styles.cloudA : styles.cloudB}`;
          return { cloud, x };
        })
      : [];

  // The backdrop, then the ground in front of it.
  const back = el.appendChild(drawing(1280, 720));
  back.classList.add(styles.full!);
  back.dataset.part = 'backdrop';
  const ground = el.appendChild(drawing(1280, 720));
  ground.classList.add(styles.full!);
  ground.dataset.part = 'ground';
  const strips = BACKDROPS[course](back, ground);

  // The lines between lanes: whole, or dashes that pass by.
  const between = lanes.slice(1).map((top) => top - 4);
  if (look.dashed) {
    const dashes = between.map((y) => `M0 ${y} h${DASH.long} v8 h-${DASH.long} Z`).join(' ');
    strips.push(
      strip(ground, 'lines', DASH.every, 1, [['path', look.lines, { d: dashes || 'M0 0' }]]),
    );
  } else {
    const lines = between.map((y) => `M-10 ${y} h1300 v8 h-1300 Z`).join(' ');
    group(ground, 'lines', [['path', look.lines, { d: lines || 'M0 0' }]]);
  }

  // The start and finish lines.
  const startLine = group(ground, 'start', [
    ['rect', styles.paper!, { x: 0, y: 216, width: 16, height: 500, 'stroke-width': 4 }],
  ]);
  const finishLine = group(ground, 'finish', [
    ['rect', styles.paper!, { x: 0, y: 216, width: 24, height: 500, 'stroke-width': 4 }],
    ['path', styles.inkFill!, { d: chequer(0, 216, 42, 12) }],
  ]);

  const length = finish - start;
  const ends: 'paper' | 'sun' = look.distance === 'sun' ? 'paper' : 'sun';
  // A candy cane only by a distance.
  const endsStand = look.stands === 'cane' ? 'bare' : look.stands;
  const signs = [
    { text: 'Start', at: start + 8, colour: ends, stands: endsStand },
    ...[150, 100, 50].map((metres) => ({
      text: `${metres} m`,
      at: finish - (metres / 200) * length,
      colour: look.distance,
      stands: look.stands,
    })),
    { text: 'Finish', at: finish + 12, colour: ends, stands: endsStand },
  ].map((each) => ({ ...each, el: el.appendChild(sign(each.text, each.colour, each.stands)) }));

  /** Shows `target` at `x` while it is anywhere near the stage. */
  const near = (x: number) => x > -300 && x < 1580;
  const slide = (target: Element, x: number) => {
    show(target, near(x));
    if (near(x)) target.setAttribute('transform', `translate(${x.toFixed(1)} 0)`);
  };

  const scene: Track = {
    el,
    set(camera) {
      for (const { cloud, x } of clouds) {
        const at = wrap(x - camera * CLOUDS.parallax + 200, CLOUDS.wrap) - 200;
        cloud.style.translate = `${at.toFixed(1)}px 0`;
      }
      for (const { el: passing, period, parallax } of strips) {
        const by = -wrap(camera * parallax, period);
        passing.setAttribute('transform', `translate(${by.toFixed(1)} 0)`);
      }
      slide(startLine, start - camera);
      slide(finishLine, finish - camera);
      for (const each of signs) {
        const x = each.at - camera;
        each.el.hidden = !near(x);
        if (near(x)) each.el.style.translate = `${x.toFixed(1)}px 0`;
      }
    },
  };
  scene.set(0);
  return scene;
}

/** Where the photo card sits, its window inside it, and the racers' scale in it. */
export const PHOTO = {
  scale: 1.4,
  /** The finish line's left edge in the window, and each lane's ground: back, then front. */
  line: 380,
  grounds: [190, 352],
  /** The highest a tag's middle goes, so it stays inside the window. */
  tagTop: 40,
  /** The window's size. */
  width: 576,
  height: 360,
} as const;

/** The photo's ground on each track, from 150 px down, and what lies on it. */
const PHOTO_GROUND: Record<Course, { ground: string; on: readonly Shape[] }> = {
  field: { ground: styles.grass!, on: [] },
  office: {
    ground: styles.carpet!,
    on: [['path', styles.seam!, { d: 'M120 152 V370 M280 152 V370', 'stroke-width': 4 }]],
  },
  sea: { ground: styles.sun!, on: [] },
  christmas: { ground: styles.snow!, on: [] },
  moon: {
    ground: styles.shark!,
    on: [
      [
        'path',
        styles.inkSoft!,
        { d: 'M60 300 a50 17 0 1 0 100 0 a50 17 0 1 0 -100 0 Z', 'stroke-width': 3 },
      ],
    ],
  },
};

/**
 * The photo-finish card, from the canvas, on the track's ground: the two
 * racers side-on at the line
 * at 1.4 times, back lane first, each with their name tag beside their face,
 * and the verdict under the picture. `nose` is each nose's x in the window.
 */
export function photoCard(
  pair: readonly { name: string; racer: Runner; nose: number }[],
  verdict: string,
  course: Course = 'field',
): HTMLElement {
  const card = document.createElement('div');
  card.className = styles.photo!;
  card.dataset.part = 'photo';
  const view = card.appendChild(document.createElement('div'));
  view.className = `${styles.photoWindow} ${styles[course]}`;
  view.dataset.course = course;
  const scene = view.appendChild(drawing(PHOTO.width, PHOTO.height));
  scene.classList.add(styles.full!);
  const { ground, on } = PHOTO_GROUND[course];
  draw(scene, [
    ['rect', ground, { x: -10, y: 150, width: 600, height: 220, 'stroke-width': 4 }],
    ...on,
    ['rect', styles.paper!, { x: PHOTO.line, y: -10, width: 24, height: 380, 'stroke-width': 4 }],
    ['path', styles.inkFill!, { d: chequer(PHOTO.line, -10, 32, 12) }],
  ]);
  const k = PHOTO.scale;
  const placed = pair.map(({ name, racer: drawn, nose }, i) => {
    const left = nose - drawn.nose * k;
    const holder = view.appendChild(document.createElement('div'));
    holder.className = styles.holder!;
    holder.dataset.person = name;
    holder.style.translate = `${left}px ${PHOTO.grounds[i]! - RACER.feet * k}px`;
    holder.style.scale = String(k);
    holder.append(drawn.el);
    // Beside the face, just short of it, as on the track.
    const face = left + (drawn.faceX - RIDER.size / 2) * k;
    // Inside the window, as on the canvas, even where the back head is cut off.
    return { name, right: face - 2, middle: Math.max(PHOTO.tagTop, PHOTO.grounds[i]! - 129 * k) };
  });
  // The tags over both racers, beside each face.
  for (const { name, right, middle } of placed) {
    const tag = view.appendChild(nameTag(name, { size: 30, maxWidth: 220 }));
    tag.classList.add(styles.tag!);
    tag.style.translate = `calc(${right}px - 100%) calc(${middle}px - 50%)`;
  }
  const words = card.appendChild(document.createElement('p'));
  words.className = styles.verdict!;
  words.textContent = verdict;
  return card;
}
