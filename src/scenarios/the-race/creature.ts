// A creature racing on its own feet, from the Design canvas's Creature: no
// mount and no rider, its own face carrying the mood. Its legs run whatever
// the mood; in front it leans back and flails its arms. The astronaut and the
// villain have human faces in the kit's skin tone for the run. Every colour
// comes from a class in the-race.module.css, the creature's colour as
// --racer, the contrast for its extras as --band, and a limb's as --paint.

import type { Look, Mood } from '../../scenario-kit';
import {
  draw,
  drawing,
  group,
  RACER,
  show,
  TROPHY,
  type Creature,
  type Pose,
  type RacerLook,
  type Runner,
  type Shape,
} from './parts';
import styles from './the-race.module.css';

type Point = readonly [x: number, y: number];

/** What a limb or a shoe is painted: the creature's colour, the person's skin, or a token. */
type Paint = 'colour' | 'skin' | 'ink' | 'ink-soft' | 'shark' | 'paper' | 'glass' | 'mint-soft';

/** A creature, on the canvas's grid. */
interface Spec {
  /** The middle of its face, where its name tag and bubbles go, and its nose. */
  readonly face: number;
  readonly nose: number;
  /** Where its back and front legs start; each leg's width and paint, and its shoes'. */
  readonly hips: readonly [Point, Point];
  readonly legW: number;
  readonly legs: Paint;
  readonly shoes: Paint;
  /** Its back and front shoulders; each arm's width, and its paint and its hands'. */
  readonly shoulders: readonly [Point, Point];
  readonly armW: number;
  readonly arms: Paint;
  readonly hands: Paint;
  /** Fins for arms. */
  readonly fins?: boolean;
  /** A human face, with dots for eyes. */
  readonly dots?: boolean;
  /** Arms out in front as it runs. */
  readonly zombieArms?: boolean;
  /** One tooth, or a row of pointy teeth. */
  readonly tooth?: boolean;
  readonly teeth?: boolean;
  /** Each eye's x, y and radius; the mouth's x, y and width; where it sweats. */
  readonly eyes: readonly (readonly [number, number, number])[];
  readonly mouth: readonly [number, number, number];
  readonly sweat: readonly Point[];
  /** Where the scarf or the bow tie, the racing number and the top hat go. */
  readonly neck: Point;
  readonly chest: Point;
  readonly hat: Point;
  /** The trophy's top middle; how far its arms reach, 1 to hold it overhead. */
  readonly cup: Point;
  readonly reach: number;
}

export const CREATURE_SPEC: Readonly<Record<Creature, Spec>> = {
  zombie: {
    face: 130,
    nose: 206,
    hips: [
      [116, 146],
      [140, 146],
    ],
    legW: 12,
    legs: 'ink-soft',
    shoes: 'ink',
    shoulders: [
      [108, 102],
      [150, 102],
    ],
    armW: 9,
    arms: 'mint-soft',
    hands: 'mint-soft',
    zombieArms: true,
    tooth: true,
    eyes: [
      [118, 60, 10],
      [143, 60, 7],
    ],
    mouth: [130, 82, 22],
    sweat: [
      [92, 44],
      [166, 44],
    ],
    neck: [130, 96],
    chest: [124, 124],
    hat: [130, 26],
    cup: [130, -24],
    reach: 1,
  },
  robot: {
    face: 130,
    nose: 176,
    hips: [
      [118, 146],
      [142, 146],
    ],
    legW: 11,
    legs: 'shark',
    shoes: 'ink-soft',
    shoulders: [
      [104, 102],
      [156, 102],
    ],
    armW: 9,
    arms: 'shark',
    hands: 'shark',
    eyes: [
      [118, 52, 9],
      [142, 52, 9],
    ],
    mouth: [130, 68, 22],
    sweat: [
      [84, 30],
      [176, 30],
    ],
    neck: [130, 98],
    chest: [130, 128],
    hat: [130, 22],
    cup: [130, -26],
    reach: 1,
  },
  shark: {
    face: 188,
    nose: 228,
    hips: [
      [106, 114],
      [132, 114],
    ],
    legW: 9,
    legs: 'skin',
    shoes: 'colour',
    shoulders: [
      [134, 102],
      [150, 104],
    ],
    armW: 0,
    arms: 'colour',
    hands: 'colour',
    fins: true,
    teeth: true,
    eyes: [
      [178, 58, 9],
      [200, 60, 8],
    ],
    mouth: [198, 92, 32],
    sweat: [
      [164, 36],
      [218, 40],
    ],
    neck: [170, 104],
    chest: [96, 76],
    hat: [188, 42],
    cup: [108, -40],
    reach: 0,
  },
  astronaut: {
    face: 130,
    nose: 180,
    hips: [
      [118, 146],
      [142, 146],
    ],
    legW: 13,
    legs: 'paper',
    shoes: 'shark',
    shoulders: [
      [104, 102],
      [156, 102],
    ],
    armW: 11,
    arms: 'paper',
    hands: 'paper',
    dots: true,
    eyes: [
      [121, 58, 4],
      [139, 58, 4],
    ],
    mouth: [130, 70, 14],
    sweat: [
      [112, 44],
      [148, 44],
    ],
    neck: [130, 96],
    chest: [130, 126],
    hat: [130, 20],
    cup: [130, -30],
    reach: 1,
  },
  monster: {
    face: 130,
    nose: 196,
    hips: [
      [114, 156],
      [146, 156],
    ],
    legW: 15,
    legs: 'colour',
    shoes: 'colour',
    shoulders: [
      [86, 104],
      [174, 104],
    ],
    armW: 11,
    arms: 'colour',
    hands: 'colour',
    teeth: true,
    eyes: [[130, 58, 17]],
    mouth: [130, 90, 40],
    sweat: [
      [84, 50],
      [176, 50],
    ],
    neck: [130, 110],
    chest: [104, 132],
    hat: [130, 30],
    cup: [130, -26],
    reach: 1,
  },
  villain: {
    face: 130,
    nose: 172,
    hips: [
      [118, 146],
      [142, 146],
    ],
    legW: 11,
    legs: 'ink-soft',
    shoes: 'ink',
    shoulders: [
      [106, 102],
      [154, 102],
    ],
    armW: 10,
    arms: 'ink-soft',
    hands: 'paper',
    dots: true,
    eyes: [
      [119, 54, 4],
      [141, 55, 4],
    ],
    mouth: [130, 85, 12],
    sweat: [
      [98, 40],
      [162, 40],
    ],
    neck: [130, 92],
    chest: [142, 126],
    hat: [130, 28],
    cup: [130, -28],
    reach: 1,
  },
  alien: {
    face: 130,
    nose: 176,
    hips: [
      [120, 146],
      [140, 146],
    ],
    legW: 8,
    legs: 'colour',
    shoes: 'glass',
    shoulders: [
      [108, 102],
      [152, 102],
    ],
    armW: 8,
    arms: 'colour',
    hands: 'colour',
    eyes: [
      [113, 56, 9],
      [147, 56, 9],
      [130, 38, 7],
    ],
    mouth: [130, 76, 14],
    sweat: [
      [84, 50],
      [176, 50],
    ],
    neck: [130, 94],
    chest: [130, 130],
    hat: [130, 24],
    cup: [130, -32],
    reach: 1,
  },
  dinosaur: {
    face: 162,
    nose: 220,
    hips: [
      [112, 142],
      [138, 142],
    ],
    legW: 16,
    legs: 'colour',
    shoes: 'colour',
    shoulders: [
      [150, 98],
      [154, 100],
    ],
    armW: 7,
    arms: 'colour',
    hands: 'colour',
    teeth: true,
    eyes: [
      [150, 38, 8],
      [172, 36, 8],
    ],
    mouth: [188, 62, 40],
    sweat: [
      [136, 30],
      [222, 30],
    ],
    neck: [150, 88],
    chest: [120, 120],
    hat: [164, 22],
    cup: [164, -36],
    reach: 0.45,
  },
};

/** A paint as a fill class, and as a line's colour. */
const FILLS: Record<Paint, string> = {
  colour: styles.racer!,
  skin: styles.skin!,
  ink: styles.ink!,
  'ink-soft': styles.inkSoft!,
  shark: styles.shark!,
  paper: styles.paper!,
  glass: styles.glass!,
  'mint-soft': styles.mintSoft!,
};
const LINES: Record<Paint, string> = {
  colour: 'var(--racer)',
  skin: 'var(--skin)',
  ink: 'var(--color-ink)',
  'ink-soft': 'var(--color-ink-soft)',
  shark: 'var(--color-shark)',
  paper: 'var(--color-paper)',
  glass: 'var(--color-glass)',
  'mint-soft': 'var(--color-mint-soft)',
};

/** The monster's fur: a jagged oval round (cx, cy), every other point pulled in. */
function fur(cx: number, cy: number, rx: number, ry: number): string {
  const points: string[] = [];
  for (let a = 0; a < 360; a += 12) {
    const k = (a / 12) % 2 === 0 ? 1 : 0.9;
    const t = (a * Math.PI) / 180;
    const x = Math.round(cx + rx * k * Math.cos(t));
    const y = Math.round(cy + ry * k * Math.sin(t));
    points.push(`${points.length ? 'L' : 'M'}${x} ${y}`);
  }
  return `${points.join(' ')} Z`;
}

/**
 * Each creature's body and head, back to front. The parts in its colour are
 * named for where they are, as the feature says.
 */
const BODIES: Record<Creature, readonly Shape[]> = {
  zombie: [
    ['rect', styles.mintSoft!, { x: 121, y: 84, width: 18, height: 14, 'stroke-width': 4 }],
    [
      'path',
      styles.racer!,
      {
        d:
          'M100 100 Q100 92 112 91 H148 Q158 92 158 100 L160 148 L152 141 L144 149 L136 141 ' +
          'L128 149 L120 141 L112 149 L104 141 L98 147 Z',
        'stroke-width': 4,
        'data-part': 'shirt',
      },
    ],
    [
      'rect',
      styles.tomatoSoft!,
      { x: 136, y: 114, width: 13, height: 13, 'stroke-width': 3, transform: 'rotate(8 142 120)' },
    ],
    ['circle', styles.mintSoft!, { cx: 100, cy: 62, r: 7, 'stroke-width': 4 }],
    [
      'path',
      styles.mintSoft!,
      {
        d: 'M100 42 Q100 24 130 24 Q160 24 160 44 L160 76 Q160 96 130 96 Q100 96 100 76 Z',
        'stroke-width': 4,
      },
    ],
    [
      'path',
      styles.inkSoft!,
      {
        d:
          'M100 40 L106 20 L116 30 L124 12 L134 26 L144 12 L150 28 L160 36 Q150 26 130 28 ' +
          'Q110 28 100 40 Z',
        'stroke-width': 4,
      },
    ],
    [
      'path',
      styles.line!,
      { d: 'M140 42 L156 46 M144 38 L142 47 M151 40 L149 49', 'stroke-width': 3 },
    ],
  ],
  robot: [
    ['path', styles.line!, { d: 'M130 22 V9', 'stroke-width': 4 }],
    ['circle', styles.racer!, { cx: 130, cy: 7, r: 7, 'stroke-width': 4, 'data-part': 'antenna' }],
    ['rect', styles.shark!, { x: 86, y: 44, width: 10, height: 22, rx: 3, 'stroke-width': 4 }],
    ['rect', styles.shark!, { x: 164, y: 44, width: 10, height: 22, rx: 3, 'stroke-width': 4 }],
    ['rect', styles.shark!, { x: 122, y: 84, width: 16, height: 12, 'stroke-width': 3 }],
    [
      'rect',
      styles.racer!,
      { x: 102, y: 94, width: 56, height: 54, rx: 8, 'stroke-width': 4, 'data-part': 'body' },
    ],
    ['circle', styles.paper!, { cx: 118, cy: 112, r: 7, 'stroke-width': 3 }],
    ['path', styles.line!, { d: 'M118 112 L122 107 M112 136 H148', 'stroke-width': 3 }],
    ['circle', styles.tomato!, { cx: 141, cy: 109, r: 4, 'stroke-width': 2.5 }],
    ['circle', styles.sun!, { cx: 150, cy: 120, r: 4, 'stroke-width': 2.5 }],
    ['rect', styles.shark!, { x: 94, y: 22, width: 72, height: 66, rx: 12, 'stroke-width': 4 }],
    [
      'rect',
      styles.glass!,
      { x: 102, y: 32, width: 56, height: 46, rx: 8, 'stroke-width': 3, 'data-part': 'screen' },
    ],
  ],
  shark: [
    [
      'path',
      styles.racer!,
      { d: 'M60 74 L24 38 L38 76 L22 112 Z', 'stroke-width': 4, 'data-part': 'body' },
    ],
    [
      'path',
      styles.racer!,
      { d: 'M104 46 Q106 16 92 2 Q128 8 138 42 Z', 'stroke-width': 4, 'data-part': 'body' },
    ],
    [
      'path',
      styles.racer!,
      {
        d:
          'M52 78 Q60 42 120 38 Q184 36 212 58 Q230 72 228 84 Q210 108 150 116 Q92 120 62 106 ' +
          'Q48 94 52 78 Z',
        'stroke-width': 4,
        'data-part': 'body',
      },
    ],
    [
      'path',
      styles.paper!,
      { d: 'M62 100 Q120 96 226 84 Q208 108 150 116 Q94 120 62 104 Z', 'stroke-width': 3 },
    ],
    [
      'path',
      styles.line!,
      { d: 'M148 62 Q144 72 148 82 M158 60 Q154 70 158 80', 'stroke-width': 3 },
    ],
  ],
  astronaut: [
    [
      'rect',
      styles.racer!,
      { x: 80, y: 92, width: 26, height: 52, rx: 6, 'stroke-width': 4, 'data-part': 'backpack' },
    ],
    [
      'path',
      styles.paper!,
      { d: 'M102 98 Q104 90 118 90 H142 Q156 90 158 98 L160 148 H100 Z', 'stroke-width': 4 },
    ],
    [
      'rect',
      styles.racer!,
      { x: 116, y: 104, width: 28, height: 16, rx: 3, 'stroke-width': 3, 'data-part': 'panel' },
    ],
    ['circle', styles.paperFill!, { cx: 124, cy: 112, r: 3 }],
    ['circle', styles.paperFill!, { cx: 136, cy: 112, r: 3 }],
    ['rect', styles.shark!, { x: 100, y: 136, width: 60, height: 8, 'stroke-width': 3 }],
    ['rect', styles.shark!, { x: 106, y: 86, width: 48, height: 12, rx: 6, 'stroke-width': 3 }],
    ['circle', styles.glass!, { cx: 130, cy: 56, r: 36, 'stroke-width': 4 }],
    ['circle', styles.skin!, { cx: 130, cy: 60, r: 24, 'stroke-width': 3, 'data-part': 'skin' }],
    ['path', styles.stripe!, { d: 'M102 46 Q108 28 126 22', 'stroke-width': 5 }],
  ],
  monster: [
    [
      'path',
      styles.paper!,
      {
        d: 'M104 40 Q92 20 102 6 Q108 24 116 34 Z M156 34 Q168 20 158 6 Q150 22 144 32 Z',
        'stroke-width': 4,
      },
    ],
    ['path', styles.racer!, { d: fur(130, 96, 50, 68), 'stroke-width': 4, 'data-part': 'fur' }],
    ['ellipse', styles.tomatoSoft!, { cx: 130, cy: 130, rx: 26, ry: 20, 'stroke-width': 3 }],
  ],
  villain: [
    [
      'path',
      styles.racer!,
      { d: 'M108 94 Q62 112 44 164 Q76 154 104 162 Z', 'stroke-width': 4, 'data-part': 'cape' },
    ],
    [
      'path',
      styles.inkSoft!,
      { d: 'M104 98 Q106 90 118 90 H142 Q154 90 156 98 L156 148 H104 Z', 'stroke-width': 4 },
    ],
    ['path', styles.paper!, { d: 'M121 90 L130 112 L139 90 Z', 'stroke-width': 3 }],
    ['rect', styles.skin!, { x: 122, y: 78, width: 16, height: 14, 'stroke-width': 3 }],
    [
      'path',
      styles.racer!,
      {
        d: 'M112 92 L100 66 L124 86 Z M148 92 L160 66 L136 86 Z',
        'stroke-width': 4,
        'data-part': 'collar',
      },
    ],
    ['circle', styles.skin!, { cx: 130, cy: 56, r: 28, 'stroke-width': 4, 'data-part': 'skin' }],
    [
      'path',
      styles.inkSoft!,
      {
        d: 'M102 54 Q100 26 130 26 Q160 26 158 54 Q152 38 136 38 L130 46 L124 38 Q108 38 102 54 Z',
        'stroke-width': 4,
      },
    ],
    [
      'path',
      styles.inkFill!,
      {
        d:
          'M130 72 Q118 63 107 70 Q100 76 104 82 Q107 73 115 74 Q123 76 130 74 Q137 76 145 74 ' +
          'Q153 73 156 82 Q160 76 153 70 Q142 63 130 72 Z',
      },
    ],
    ['circle', styles.line!, { cx: 141, cy: 55, r: 9, 'stroke-width': 3 }],
    ['path', styles.line!, { d: 'M150 58 Q156 72 148 88', 'stroke-width': 2.5 }],
  ],
  alien: [
    ['path', styles.line!, { d: 'M114 32 L102 8 M146 32 L158 8', 'stroke-width': 4 }],
    ['circle', styles.sun!, { cx: 102, cy: 7, r: 6, 'stroke-width': 3 }],
    ['circle', styles.sun!, { cx: 158, cy: 7, r: 6, 'stroke-width': 3 }],
    ['rect', styles.racer!, { x: 124, y: 82, width: 12, height: 14, 'stroke-width': 3 }],
    [
      'path',
      styles.glass!,
      { d: 'M108 98 Q110 92 120 92 H140 Q150 92 152 98 L156 148 H104 Z', 'stroke-width': 4 },
    ],
    ['circle', styles.sun!, { cx: 130, cy: 114, r: 8, 'stroke-width': 3 }],
    [
      'ellipse',
      styles.racer!,
      { cx: 130, cy: 56, rx: 42, ry: 32, 'stroke-width': 4, 'data-part': 'head' },
    ],
  ],
  dinosaur: [
    [
      'path',
      styles.racer!,
      { d: 'M98 118 Q52 128 12 170 Q60 152 106 144 Z', 'stroke-width': 4, 'data-part': 'body' },
    ],
    [
      'path',
      styles.racer!,
      {
        d: 'M108 70 l-12 -8 l4 16 Z M96 94 l-14 -4 l8 14 Z',
        'stroke-width': 3,
        'data-part': 'body',
      },
    ],
    [
      'path',
      styles.racer!,
      {
        d: 'M90 112 Q92 80 126 78 Q160 80 162 114 Q162 148 126 152 Q92 150 90 112 Z',
        'stroke-width': 4,
        'data-part': 'body',
      },
    ],
    [
      'path',
      styles.tomatoSoft!,
      { d: 'M120 90 Q148 96 152 126 Q144 146 124 148 Q136 120 120 90 Z', 'stroke-width': 3 },
    ],
    [
      'path',
      styles.racer!,
      {
        d:
          'M118 54 Q118 22 160 22 Q206 22 216 46 Q220 62 208 70 L164 72 Q164 84 152 86 ' +
          'Q128 88 122 74 Q118 66 118 54 Z',
        'stroke-width': 4,
        'data-part': 'body',
      },
    ],
    ['circle', styles.inkFill!, { cx: 208, cy: 36, r: 2.5 }],
  ],
};

/** How far a creature leans back when scared, about its hips. */
export const LEAN = -10;

const round = (n: number) => Math.round(n * 10) / 10;
const path = (points: readonly Point[]) =>
  points.map(([x, y], i) => `${i ? 'L' : 'M'}${round(x)} ${round(y)}`).join(' ');

/** What a creature's stop brings out, each hidden until then. */
export type CreatureProp = 'lostShoe' | 'flag' | 'wrap' | 'question' | 'snack';

/** A pole planted in the ground at (0, 0), its flag in the creature's colour. */
const FLAG: readonly Shape[] = [
  ['path', styles.line!, { d: 'M0 0 V-58', 'stroke-width': 4 }],
  ['path', styles.racer!, { d: 'M0 -58 L32 -49 L0 -40 Z', 'stroke-width': 3 }],
];

/** A paper sticker with a question mark, over the alien's head. */
const QUESTION: readonly Shape[] = [
  ['circle', styles.paper!, { cx: 130, cy: -18, r: 18, 'stroke-width': 4 }],
  [
    'path',
    styles.line!,
    { d: 'M123 -24 Q123 -32 130 -32 Q137 -32 137 -25 Q137 -20 130 -17 V-12', 'stroke-width': 4 },
  ],
  ['circle', styles.inkFill!, { cx: 130, cy: -4, r: 2.5 }],
];

/** The villain's cape, wrapped round it. */
const WRAP: readonly Shape[] = [
  [
    'path',
    styles.racer!,
    { d: 'M98 98 Q130 82 162 98 L160 142 Q130 154 100 142 Z', 'stroke-width': 4 },
  ],
  [
    'path',
    styles.line!,
    { d: 'M108 104 Q130 96 152 106 M106 124 Q130 116 156 124', 'stroke-width': 3 },
  ],
];

/** A leaf on a stick, just in front of the dinosaur's tiny arms. */
const SNACK: readonly Shape[] = [
  ['path', styles.line!, { d: 'M222 186 V112', 'stroke-width': 4 }],
  ['path', styles.grass!, { d: 'M202 112 Q210 92 240 96 Q236 124 202 112 Z', 'stroke-width': 3 }],
  ['path', styles.line!, { d: 'M206 111 Q222 104 236 99', 'stroke-width': 2.5 }],
];

const PROPS: Partial<Record<Creature, Partial<Record<CreatureProp, (spec: Spec) => Shape[]>>>> = {
  zombie: {
    lostShoe: (spec) => [
      [
        'ellipse',
        FILLS[spec.shoes],
        { cx: 0, cy: 0, rx: Math.max(11, spec.legW), ry: 7, 'stroke-width': 3 },
      ],
    ],
  },
  astronaut: { flag: () => [...FLAG] },
  villain: { wrap: () => [...WRAP] },
  alien: { question: () => [...QUESTION] },
  dinosaur: { snack: () => [...SNACK] },
};

export interface CreatureRunner extends Runner {
  readonly look: RacerLook & { readonly mount: Creature };
  /** Everything above the legs, leaning back when scared. */
  readonly body: SVGGElement;
  /** Its eyes, brows and mouth, to blank. */
  readonly face: SVGGElement;
  /** Its back and front arm, each to turn about its shoulder. */
  readonly arms: readonly [SVGGElement, SVGGElement];
  /** Its back and front shoe. */
  readonly shoes: readonly [SVGElement, SVGElement];
  /** What its stop brings out, hidden until shown. */
  readonly props: Readonly<Partial<Record<CreatureProp, SVGGElement>>>;
  /** Stretches both arms forward, for what's out of reach. */
  setStretch(on: boolean): void;
  /** Bends forward from its hips by `degrees`, unless it leans back scared. */
  setBend(degrees: number): void;
}

/**
 * A creature racing as `look` chose, from the canvas's Creature: its legs and
 * shoes, then, leaning from its hips, the cape, its back arm, its body, its
 * face, its front arm, and the scarf, bow tie, number, top hat and trophy.
 * `face` is the kit's look for the run, for the astronaut's and the
 * villain's skin, and the shark's legs.
 */
export function creature(
  look: RacerLook & { readonly mount: Creature },
  {
    face: faceLook,
    number,
    mood = 'calm',
    pose = 'hold',
  }: { face: Look; number: number; mood?: Mood; pose?: Pose },
): CreatureRunner {
  const kind = look.mount;
  const spec = CREATURE_SPEC[kind];
  const el = drawing(RACER.width, RACER.height);
  el.dataset.part = 'creature';
  el.dataset.mount = kind;
  el.dataset.colour = look.colour;
  el.dataset.extra = look.extra;
  el.style.setProperty('--racer', `var(--color-${look.colour})`);
  el.style.setProperty('--band', `var(--color-${look.colour === 'sun' ? 'tomato' : 'sun'})`);
  el.style.setProperty('--skin', `var(--color-skin-${faceLook.skin})`);

  // Legs keep running whatever the mood: the creature can't stop them.
  const [h1, h2] = spec.hips;
  const leg = ([x, y]: Point, back: boolean) => {
    const length = 186 - y;
    const knee: Point = back ? [x - 12, y + length * 0.5] : [x + 20, y + length * 0.45];
    const foot: Point = back ? [x - 24, 182] : [x + 18, 182];
    return { d: path([[x, y], knee, foot]), foot };
  };
  const back = leg(h1, true);
  const front = leg(h2, false);
  const legs = `${back.d} ${front.d}`;
  const shoe = Math.max(11, spec.legW);
  const feet = group(el, 'feet', [
    ['path', styles.line!, { d: legs, 'stroke-width': spec.legW + 7 }],
    ['path', styles.limb!, { d: legs, 'stroke-width': spec.legW }],
    [
      'ellipse',
      FILLS[spec.shoes],
      { cx: back.foot[0] + 6, cy: 186, rx: shoe, ry: 7, 'stroke-width': 3 },
    ],
    [
      'ellipse',
      FILLS[spec.shoes],
      { cx: front.foot[0] + 8, cy: 186, rx: shoe, ry: 7, 'stroke-width': 3 },
    ],
  ]);
  (feet.children[1] as SVGElement).style.setProperty('--paint', LINES[spec.legs]);
  (feet.children[1] as SVGElement).dataset.part = 'legs';
  for (const each of [...feet.children].slice(2)) (each as SVGElement).dataset.part = 'shoe';

  const hipX = (h1[0] + h2[0]) / 2;
  const hipY = (h1[1] + h2[1]) / 2;
  const body = group(el, 'lean');

  const [nx, ny] = spec.neck;
  if (look.extra === 'cape') {
    group(body, 'cape', [
      [
        'path',
        styles.band!,
        {
          d:
            `M${nx - 10} ${ny - 2} Q${nx - 52} ${ny + 8} ${nx - 74} ${ny + 58} ` +
            `L${nx - 48} ${ny + 66} Q${nx - 32} ${ny + 30} ${nx + 4} ${ny + 10} Z`,
          'stroke-width': 4,
        },
      ],
    ]);
  }

  /** An arm: an ink line under a painted one and a hand, or a fin. */
  const arm = (name: string) => {
    const holder = group(body, name);
    const [ink, line, hand] = draw(holder, [
      [
        'path',
        spec.fins ? styles.racer! : styles.line!,
        { 'stroke-width': spec.fins ? 4 : spec.armW + 6 },
      ],
      ['path', styles.limb!, { 'stroke-width': spec.armW }],
      ['circle', FILLS[spec.hands], { r: Math.round(spec.armW * 0.75 + 2), 'stroke-width': 3 }],
    ]) as [SVGElement, SVGElement, SVGElement];
    line.style.setProperty('--paint', LINES[spec.arms]);
    show(line, !spec.fins);
    show(hand, !spec.fins);
    return { holder, ink, line, hand };
  };
  const arms = [arm('back-arm')];
  group(body, 'own', BODIES[kind]);

  // The face: eyes, pupils, brows, mouth and teeth, shades, and sweat.
  const face = group(body, 'face');
  const eyes = spec.eyes.map(() =>
    draw(face, [
      ['circle', styles.paper!, {}],
      ['circle', styles.inkFill!, {}],
    ]),
  );
  const [brows, mouth, teeth, shades, sweat] = draw(face, [
    ['path', styles.line!, { 'stroke-width': 4 }],
    ['path', styles.line!, { 'stroke-width': 4 }],
    ['path', styles.paper!, { 'stroke-width': 2.5 }],
    ['path', styles.ink!, { 'stroke-width': 3 }],
    ['path', styles.glass!, { 'stroke-width': 3 }],
  ]) as [SVGElement, SVGElement, SVGElement, SVGElement, SVGElement];
  shades.dataset.part = 'shades';
  sweat.dataset.part = 'sweat';
  arms.push(arm('front-arm'));

  if (look.extra === 'scarf') {
    group(body, 'scarf', [
      [
        'path',
        styles.band!,
        {
          d:
            `M${nx - 16} ${ny} Q${nx - 40} ${ny + 2} ${nx - 66} ${ny + 14} ` +
            `L${nx - 60} ${ny + 28} Q${nx - 36} ${ny + 14} ${nx - 12} ${ny + 10} Z`,
          'stroke-width': 4,
        },
      ],
      [
        'rect',
        styles.band!,
        { x: nx - 22, y: ny - 6, width: 44, height: 13, rx: 6.5, 'stroke-width': 4 },
      ],
    ]);
  }
  if (look.extra === 'bowtie') {
    group(body, 'bowtie', [
      [
        'path',
        styles.band!,
        {
          d:
            `M${nx} ${ny} L${nx - 13} ${ny - 8} V${ny + 8} Z ` +
            `M${nx} ${ny} L${nx + 13} ${ny - 8} V${ny + 8} Z`,
          'stroke-width': 3,
        },
      ],
    ]);
  }
  if (look.extra === 'number') {
    const [x, y] = spec.chest;
    const roundel = group(body, 'number', [
      ['circle', styles.paper!, { cx: x, cy: y, r: 16, 'stroke-width': 3 }],
    ]);
    const text = roundel.appendChild(
      document.createElementNS('http://www.w3.org/2000/svg', 'text'),
    );
    text.setAttribute('class', styles.number!);
    text.setAttribute('x', String(x));
    text.setAttribute('y', String(y));
    text.textContent = String(number);
  }
  if (look.extra === 'tophat') {
    const [x, y] = spec.hat;
    const hat = group(body, 'tophat', [
      ['rect', styles.inkFill!, { x: 7, y: 2, width: 22, height: 24, rx: 2 }],
      ['rect', styles.band!, { x: 7, y: 15, width: 22, height: 6, 'stroke-width': 2 }],
      ['rect', styles.inkFill!, { x: 1, y: 24, width: 34, height: 7, rx: 3.5 }],
    ]);
    hat.setAttribute('transform', `translate(${x - 23} ${y - 40}) scale(1.3)`);
  }

  // Held overhead, or balanced on the head or the fin by short arms.
  const trophy = drawing(72, 60, TROPHY);
  trophy.dataset.part = 'trophy';
  trophy.setAttribute('x', String(spec.cup[0] - 36));
  trophy.setAttribute('y', String(spec.cup[1]));
  trophy.setAttribute('width', '72');
  trophy.setAttribute('height', '60');
  body.append(trophy);

  // What a stop brings out: on the ground, or over the creature as it leans.
  const props: Partial<Record<CreatureProp, SVGGElement>> = {};
  for (const [name, shapes] of Object.entries(PROPS[kind] ?? {})) {
    const prop = group(name === 'question' || name === 'wrap' ? body : el, name, shapes(spec));
    show(prop, false);
    props[name as CreatureProp] = prop;
  }

  let current = { mood, pose, sweat: false, trophy: false, stretch: false, bend: 0 };

  /** Draws the face, the arms and the lean for the current mood, pose, sweat and trophy. */
  const update = () => {
    const party = current.mood === 'party' || current.pose === 'party';
    const scared = current.mood === 'scared';
    const k = spec.reach;

    // Arms by pose. Scared: flailing, leaning back. A zombie runs arms out.
    const reachOut = (s: Point, isFront: boolean): Point[] => {
      const side = isFront ? 1 : -1;
      if (party) {
        return current.trophy && k === 1
          ? [s, [s[0] + 8 * side, s[1] - 34], [spec.cup[0] + 24 * side, spec.cup[1] + 26]]
          : [s, [s[0] + 10 * side * k, s[1] - 30 * k], [s[0] + 16 * side * k, s[1] - 58 * k]];
      }
      if (current.stretch) return [s, [s[0] + 14, s[1] - 3], [s[0] + 26, s[1] - 6]];
      if (current.pose === 'pull') {
        return isFront
          ? [s, [s[0] + 20 * k, s[1] - 22 * k], [s[0] + 24 * k, s[1] - 52 * k]]
          : [s, [s[0] - 18 * k, s[1] - 22 * k], [s[0] - 30 * k, s[1] - 48 * k]];
      }
      if (current.pose === 'wave' && isFront) {
        return [s, [s[0] + 18 * k, s[1] - 18 * k], [s[0] + 12 * k, s[1] - 50 * k]];
      }
      if (spec.zombieArms) return isFront ? [s, [s[0] + 56, s[1] - 2]] : [s, [s[0] + 68, s[1] + 4]];
      return isFront
        ? [s, [s[0] + 12 * k, s[1] + 20 * k], [s[0] + 28 * k, s[1] + 10 * k]]
        : [s, [s[0] - 16 * k, s[1] + 16 * k], [s[0] - 28 * k, s[1] + 2 * k]];
    };
    spec.shoulders.forEach((s, i) => {
      const points = reachOut(s, i === 1);
      const end = points.at(-1)!;
      const { ink, line, hand } = arms[i]!;
      if (spec.fins) {
        // A fin: a triangle from the shoulder to where a hand would be.
        const mx = (s[0] + end[0]) / 2;
        const my = (s[1] + end[1]) / 2;
        ink.setAttribute(
          'd',
          `M${s[0] - 9} ${s[1] - 4} Q${round(mx - 6)} ${round(my)} ${round(end[0])} ${round(end[1])} ` +
            `Q${round(mx + 8)} ${round(my + 4)} ${s[0] + 9} ${s[1] + 6} Z`,
        );
      } else {
        ink.setAttribute('d', path(points));
        line.setAttribute('d', path(points));
        hand.setAttribute('cx', String(round(end[0])));
        hand.setAttribute('cy', String(round(end[1])));
      }
    });

    // The eyes: shut behind shades at a party; dots that widen when scared;
    // wide with tiny pupils when scared; wobbly with googly eyes.
    const googly = look.extra === 'googly' && !spec.dots;
    spec.eyes.forEach(([x, y, r], i) => {
      const [white, pupil] = eyes[i]! as [SVGElement, SVGElement];
      let eye = { r, on: !party };
      let dot = { x: x + r * 0.25, y: y + r * 0.1, r: r * 0.46, on: !party };
      if (party) {
        dot = { x, y, r: 1, on: false };
      } else if (spec.dots) {
        eye = { r: 7.5, on: scared };
        dot = { x, y, r: scared ? 3 : r, on: true };
      } else if (scared) {
        eye = { r: r * 1.18, on: true };
        dot = { x, y, r: r * 0.28, on: true };
      } else if (googly) {
        eye = { r: r * 1.1, on: true };
        dot = { x: x + r * (i % 2 ? -0.3 : 0.38), y: y + r * 0.32, r: r * 0.58, on: true };
      }
      white.setAttribute('cx', String(x));
      white.setAttribute('cy', String(y));
      white.setAttribute('r', String(round(eye.r)));
      white.setAttribute('stroke-width', googly ? '3.5' : '3');
      show(white, eye.on);
      pupil.setAttribute('cx', String(round(dot.x)));
      pupil.setAttribute('cy', String(round(dot.y)));
      pupil.setAttribute('r', String(round(dot.r)));
      show(pupil, dot.on);
    });

    const middle = spec.eyes.reduce((sum, [x]) => sum + x, 0) / spec.eyes.length;
    let browPath = '';
    if (current.mood === 'worried' || scared) {
      for (const [x, y, r0] of spec.eyes.slice(0, 2)) {
        const r = spec.dots ? 7 : r0;
        if (spec.eyes.length === 1) {
          browPath += scared
            ? `M${x - r} ${y - r - 8} Q${x} ${y - r - 20} ${x + r} ${y - r - 8}`
            : `M${x - r} ${y - r - 2} L${x} ${y - r - 10} L${x + r} ${y - r - 2}`;
        } else if (scared) {
          browPath += `M${x - r} ${y - r - 6} Q${x} ${y - r - 14} ${x + r} ${y - r - 6} `;
        } else {
          const inner = x < middle ? 1 : -1;
          browPath += `M${x - inner * r} ${y - r - 2} L${x + inner * r} ${y - r - 9} `;
        }
      }
    }
    brows.setAttribute('d', browPath.trim() || 'M0 0');

    const [mx, my, mw] = spec.mouth;
    let mouthPath: string;
    let open = false;
    if (party || current.mood === 'happy') {
      mouthPath = `M${mx - mw / 2} ${my - 2} Q${mx} ${round(my + mw * 0.75)} ${mx + mw / 2} ${my - 2} Z`;
      open = true;
    } else if (scared) {
      const rx = round(mw * 0.3);
      const ry = round(mw * 0.4);
      mouthPath =
        `M${round(mx - rx)} ${round(my + ry / 2)} a${rx} ${ry} 0 1 0 ${2 * rx} 0 ` +
        `a${rx} ${ry} 0 1 0 ${-2 * rx} 0 Z`;
      open = true;
    } else if (current.mood === 'worried') {
      mouthPath =
        `M${mx - mw / 2} ${round(my + mw * 0.18)} Q${mx} ${round(my - mw * 0.2)} ` +
        `${mx + mw / 2} ${round(my + mw * 0.18)}`;
    } else {
      mouthPath = `M${mx - mw / 2} ${my} Q${mx} ${round(my + mw * 0.4)} ${mx + mw / 2} ${my}`;
    }
    mouth.setAttribute('d', mouthPath);
    mouth.setAttribute('class', open ? styles.ink! : styles.line!);

    let teethPath = '';
    if (spec.teeth && current.mood !== 'worried') {
      // A row of pointy teeth along the top of the mouth.
      const n = 5;
      const w = (mw * 0.8) / n;
      const top = scared
        ? round(my - mw * 0.1)
        : current.mood === 'calm'
          ? round(my + mw * 0.12)
          : my;
      for (let i = 0; i < n; i++) {
        const x = round(mx - mw * 0.4 + i * w);
        teethPath += `M${x} ${top} l${round(w / 2)} ${round(w * 0.9)} l${round(w / 2)} ${round(-w * 0.9)} Z `;
      }
    }
    if (spec.tooth && !party && current.mood !== 'happy' && !scared) {
      teethPath = `M${mx + 2} ${round(my + mw * 0.15)} h7 v8 h-7 Z`;
    }
    teeth.setAttribute('d', teethPath.trim() || 'M0 0');

    let shadesPath = '';
    if (party) {
      for (const [x, y, r0] of spec.eyes.slice(0, 2)) {
        const r = spec.dots ? 9 : r0 + 3;
        shadesPath += `M${x - r} ${y - r * 0.7} h${2 * r} v${r} a${r} ${r * 0.7} 0 0 1 ${-2 * r} 0 Z `;
      }
      const [first, second] = spec.eyes;
      shadesPath += second
        ? `M${first![0]} ${first![1] - 4} H${second[0]}`
        : `M${first![0] - 30} ${first![1] - 6} H${first![0] + 30}`;
    }
    shades.setAttribute('d', shadesPath.trim() || 'M0 0');
    show(shades, party);

    const sweating = current.sweat || scared;
    sweat.setAttribute(
      'd',
      spec.sweat
        .map(
          ([x, y]) =>
            `M${x} ${y} Q${x + 7} ${y + 12} ${x} ${y + 16} Q${x - 7} ${y + 12} ${x} ${y} Z`,
        )
        .join(' '),
    );
    show(sweat, sweating);

    const lean = current.pose === 'pull' ? LEAN : current.bend;
    body.setAttribute('transform', `rotate(${lean} ${hipX} ${hipY})`);
    show(trophy, current.trophy);
    el.dataset.mood = current.mood;
    el.dataset.pose = current.pose;
    el.dataset.sweat = String(sweating);
    el.dataset.trophy = String(current.trophy);
    el.dataset.stretch = String(current.stretch);
    el.dataset.bend = String(current.bend);
  };

  update();
  return {
    el,
    look,
    nose: spec.nose,
    faceX: spec.face,
    body,
    face,
    arms: [arms[0]!.holder, arms[1]!.holder],
    shoes: [feet.children[2] as SVGElement, feet.children[3] as SVGElement],
    props,
    setStretch(on) {
      if (on === current.stretch) return;
      current = { ...current, stretch: on };
      update();
    },
    setBend(degrees) {
      if (degrees === current.bend) return;
      current = { ...current, bend: degrees };
      update();
    },
    setMood(next) {
      current = { ...current, mood: next };
      update();
    },
    setPose(next) {
      current = { ...current, pose: next };
      update();
    },
    setSweat(on) {
      current = { ...current, sweat: on };
      update();
    },
    setTrophy(on) {
      current = { ...current, trophy: on };
      update();
    },
  };
}
