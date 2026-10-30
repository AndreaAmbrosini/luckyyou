// A creature racing on its own feet, from the Design canvas's Creature: no
// mount and no rider, its own face carrying the mood. A modern cartoon: lidded
// eyes with shines, a flat shadow on each main part (the light comes from the
// top right), curved limbs with gloves, shoes by kind, and a sprint. Its legs
// run whatever the mood; in front it leans back and flails its arms. The
// astronaut and the villain have human faces in the kit's skin tone for the
// run. Every colour comes from a class in the-race.module.css, the creature's
// colour as --racer, the contrast for its extras as --band, and a limb's as
// --paint.

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
type Paint =
  | 'colour'
  | 'skin'
  | 'ink'
  | 'ink-soft'
  | 'shark'
  | 'paper'
  | 'glass'
  | 'mint-soft'
  | 'orange'
  | 'pink'
  | 'sea';

/** Sneakers, boots, big bare feet, flat paddles, bird's toes or a curled tentacle tip. */
export type Foot = 'sneaker' | 'boot' | 'bare' | 'paddle' | 'toes' | 'tip';

/** A creature, on the canvas's grid. */
interface Spec {
  /** The middle of its face, where its name tag and bubbles go, and its nose. */
  readonly face: number;
  readonly nose: number;
  /** Where its back and front legs start; each leg's width and paint. */
  readonly hips: readonly [Point, Point];
  readonly legW: number;
  readonly legs: Paint;
  /** Its feet, their size (1 unless big), and the paint of its shoes and their soles. */
  readonly foot: Foot;
  readonly footK?: number;
  readonly shoes: Paint;
  readonly sole?: Paint;
  /** Its back and front shoulders; each arm's width, and its paint and its hands'. */
  readonly shoulders: readonly [Point, Point];
  readonly armW: number;
  readonly arms: Paint;
  readonly hands: Paint;
  /** Hands with no thumb: paws or tentacle tips. */
  readonly noThumb?: boolean;
  /** Fins for arms, as leaves, this much longer. */
  readonly fins?: boolean;
  readonly finK?: number;
  /** A human face, with dark oval eyes. */
  readonly dots?: boolean;
  /** A dark screen for a face, its eyes and mouth glowing, and no brows. */
  readonly screen?: boolean;
  readonly noBrows?: boolean;
  /** Arms out in front as it runs. */
  readonly zombieArms?: boolean;
  /** One square tooth, or a row of pointy teeth. */
  readonly tooth?: boolean;
  readonly teeth?: boolean;
  /** A cat's slit pupils. */
  readonly slit?: boolean;
  /** Each eye's x, y and radius; the paint round them, for lids; its pupils' size. */
  readonly eyes: readonly (readonly [number, number, number])[];
  readonly lid: Paint;
  readonly pupil?: number;
  /** The mouth's x, y and width; where it sweats. */
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

/**
 * A thing on legs: ink-soft legs and arms 7 wide, white gloves, white
 * sneakers striped in its colour, its lids in its colour unless given, its
 * arms reaching over its head.
 */
const thing = (
  spec: Omit<
    Spec,
    'legW' | 'legs' | 'foot' | 'shoes' | 'armW' | 'arms' | 'hands' | 'lid' | 'reach'
  > &
    Partial<Pick<Spec, 'legW' | 'armW' | 'lid'>>,
): Spec => ({
  legW: 7,
  legs: 'ink-soft',
  foot: 'sneaker',
  shoes: 'paper',
  armW: 7,
  arms: 'ink-soft',
  hands: 'paper',
  lid: 'colour',
  reach: 1,
  ...spec,
});

export const CREATURE_SPEC: Readonly<Record<Creature, Spec>> = {
  zombie: {
    face: 130,
    nose: 206,
    hips: [
      [118, 146],
      [140, 146],
    ],
    legW: 12,
    legs: 'ink-soft',
    foot: 'sneaker',
    shoes: 'ink-soft',
    shoulders: [
      [108, 102],
      [152, 102],
    ],
    armW: 10,
    arms: 'mint-soft',
    hands: 'mint-soft',
    zombieArms: true,
    tooth: true,
    eyes: [
      [118, 58, 12],
      [148, 58, 9],
    ],
    lid: 'mint-soft',
    pupil: 0.3,
    mouth: [132, 86, 22],
    sweat: [
      [88, 40],
      [172, 40],
    ],
    neck: [130, 98],
    chest: [124, 124],
    hat: [130, 22],
    cup: [130, -30],
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
    foot: 'boot',
    shoes: 'ink-soft',
    sole: 'shark',
    shoulders: [
      [102, 102],
      [158, 102],
    ],
    armW: 9,
    arms: 'shark',
    hands: 'shark',
    screen: true,
    noBrows: true,
    eyes: [
      [118, 48, 8],
      [142, 48, 8],
    ],
    lid: 'ink',
    mouth: [130, 64, 16],
    sweat: [
      [80, 30],
      [180, 30],
    ],
    neck: [130, 96],
    chest: [130, 128],
    hat: [130, 20],
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
    foot: 'sneaker',
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
      [176, 58, 9],
      [198, 60, 8],
    ],
    lid: 'colour',
    mouth: [196, 92, 32],
    sweat: [
      [162, 34],
      [218, 38],
    ],
    neck: [170, 104],
    chest: [96, 76],
    hat: [186, 42],
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
    foot: 'boot',
    shoes: 'shark',
    sole: 'ink-soft',
    shoulders: [
      [104, 102],
      [156, 102],
    ],
    armW: 11,
    arms: 'paper',
    hands: 'paper',
    dots: true,
    eyes: [
      [121, 57, 4.5],
      [139, 57, 4.5],
    ],
    lid: 'skin',
    mouth: [130, 71, 14],
    sweat: [
      [112, 40],
      [150, 40],
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
    foot: 'bare',
    footK: 1.2,
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
    lid: 'colour',
    mouth: [130, 92, 40],
    sweat: [
      [82, 50],
      [178, 50],
    ],
    neck: [130, 112],
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
    foot: 'boot',
    shoes: 'ink',
    sole: 'ink-soft',
    shoulders: [
      [106, 102],
      [154, 102],
    ],
    armW: 10,
    arms: 'ink-soft',
    hands: 'paper',
    dots: true,
    eyes: [
      [119, 54, 4.5],
      [141, 55, 4.5],
    ],
    lid: 'skin',
    mouth: [130, 86, 12],
    sweat: [
      [96, 40],
      [164, 40],
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
    foot: 'sneaker',
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
    lid: 'colour',
    mouth: [130, 76, 14],
    sweat: [
      [82, 50],
      [178, 50],
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
    foot: 'bare',
    footK: 1.2,
    shoes: 'colour',
    shoulders: [
      [150, 98],
      [154, 100],
    ],
    armW: 7,
    arms: 'colour',
    hands: 'colour',
    noThumb: true,
    teeth: true,
    eyes: [
      [150, 38, 8],
      [172, 36, 8],
    ],
    lid: 'colour',
    mouth: [188, 62, 40],
    sweat: [
      [134, 28],
      [222, 30],
    ],
    neck: [150, 88],
    chest: [120, 120],
    hat: [164, 22],
    cup: [164, -36],
    reach: 0.45,
  },
  // Things on legs: dark noodle limbs, white gloves, white sneakers.
  mug: thing({
    face: 139,
    nose: 170,
    hips: [
      [122, 148],
      [142, 149],
    ],
    shoulders: [
      [104, 98],
      [166, 98],
    ],
    eyes: [
      [124, 60, 12],
      [154, 60, 12],
    ],
    mouth: [140, 90, 22],
    sweat: [
      [88, 44],
      [182, 44],
    ],
    neck: [134, 112],
    chest: [150, 126],
    hat: [134, 14],
    cup: [134, -46],
  }),
  printer: thing({
    face: 131,
    nose: 180,
    hips: [
      [116, 138],
      [148, 138],
    ],
    shoulders: [
      [86, 96],
      [178, 96],
    ],
    eyes: [
      [116, 64, 10],
      [146, 64, 10],
    ],
    lid: 'paper',
    mouth: [131, 82, 20],
    sweat: [
      [74, 40],
      [190, 40],
    ],
    neck: [131, 116],
    chest: [102, 114],
    hat: [130, 30],
    cup: [130, -44],
  }),
  sticky: thing({
    face: 131,
    nose: 170,
    hips: [
      [118, 104],
      [142, 104],
    ],
    legW: 6,
    shoulders: [
      [92, 70],
      [168, 70],
    ],
    armW: 6,
    eyes: [
      [115, 54, 10],
      [146, 54, 10],
    ],
    mouth: [131, 76, 22],
    sweat: [
      [78, 28],
      [182, 28],
    ],
    neck: [130, 98],
    chest: [104, 90],
    hat: [130, 22],
    cup: [130, -40],
  }),
  banana: thing({
    face: 134,
    nose: 186,
    hips: [
      [122, 150],
      [140, 150],
    ],
    shoulders: [
      [98, 96],
      [164, 94],
    ],
    eyes: [
      [121, 66, 10],
      [147, 64, 10],
    ],
    mouth: [136, 88, 22],
    sweat: [
      [86, 46],
      [178, 44],
    ],
    neck: [132, 114],
    chest: [126, 130],
    hat: [140, 6],
    cup: [140, -50],
  }),
  icecream: thing({
    face: 131,
    nose: 172,
    hips: [
      [125, 150],
      [137, 150],
    ],
    shoulders: [
      [94, 80],
      [168, 80],
    ],
    eyes: [
      [117, 56, 10],
      [145, 56, 10],
    ],
    mouth: [131, 78, 20],
    sweat: [
      [80, 36],
      [182, 36],
    ],
    neck: [131, 100],
    chest: [131, 122],
    hat: [128, 10],
    cup: [130, -46],
  }),
  sushi: thing({
    face: 141,
    nose: 192,
    hips: [
      [116, 146],
      [148, 146],
    ],
    shoulders: [
      [90, 104],
      [173, 104],
    ],
    eyes: [
      [128, 56, 9],
      [153, 55, 9],
    ],
    mouth: [141, 71, 18],
    sweat: [
      [80, 30],
      [196, 34],
    ],
    neck: [140, 92],
    chest: [148, 120],
    hat: [140, 38],
    cup: [136, -30],
  }),
  // Animals.
  cat: {
    face: 137,
    nose: 189,
    hips: [
      [118, 146],
      [134, 147],
    ],
    legW: 11,
    legs: 'colour',
    foot: 'sneaker',
    shoes: 'paper',
    shoulders: [
      [110, 100],
      [142, 100],
    ],
    armW: 9,
    arms: 'colour',
    hands: 'paper',
    slit: true,
    eyes: [
      [120, 50, 12],
      [154, 50, 12],
    ],
    lid: 'colour',
    mouth: [142, 80, 16],
    sweat: [
      [84, 28],
      [190, 32],
    ],
    neck: [128, 94],
    chest: [128, 124],
    hat: [134, 20],
    cup: [134, -46],
    reach: 1,
  },
  octopus: {
    face: 130,
    nose: 178,
    hips: [
      [118, 100],
      [142, 100],
    ],
    legW: 10,
    legs: 'colour',
    foot: 'tip',
    shoes: 'colour',
    shoulders: [
      [94, 78],
      [166, 78],
    ],
    armW: 10,
    arms: 'colour',
    hands: 'colour',
    noThumb: true,
    eyes: [
      [113, 62, 11],
      [147, 62, 11],
    ],
    lid: 'colour',
    mouth: [130, 85, 14],
    sweat: [
      [74, 34],
      [186, 34],
    ],
    neck: [130, 100],
    chest: [130, 28],
    hat: [130, 2],
    cup: [130, -50],
    reach: 1,
  },
  penguin: {
    face: 130,
    nose: 177,
    hips: [
      [118, 150],
      [142, 150],
    ],
    legW: 9,
    legs: 'orange',
    foot: 'paddle',
    shoes: 'orange',
    shoulders: [
      [90, 90],
      [170, 90],
    ],
    armW: 0,
    arms: 'colour',
    hands: 'colour',
    fins: true,
    finK: 1.1,
    eyes: [
      [115, 54, 9],
      [145, 54, 9],
    ],
    lid: 'paper',
    mouth: [130, 76, 22],
    sweat: [
      [84, 26],
      [176, 26],
    ],
    neck: [130, 100],
    chest: [130, 126],
    hat: [130, 8],
    cup: [130, -46],
    reach: 1,
  },
  pigeon: {
    face: 167,
    nose: 204,
    hips: [
      [112, 148],
      [132, 148],
    ],
    legW: 5,
    legs: 'pink',
    foot: 'toes',
    shoes: 'pink',
    shoulders: [
      [108, 100],
      [124, 102],
    ],
    armW: 0,
    arms: 'colour',
    hands: 'colour',
    fins: true,
    finK: 1.5,
    eyes: [
      [156, 40, 9],
      [177, 41, 7],
    ],
    lid: 'shark',
    mouth: [181, 64, 14],
    sweat: [
      [138, 14],
      [200, 20],
    ],
    neck: [150, 86],
    chest: [104, 116],
    hat: [162, 22],
    cup: [162, -36],
    reach: 0.6,
  },
  // Spooky. The gnome has a face in the kit's skin tone, and balances the trophy on its hat.
  ghost: {
    face: 131,
    nose: 176,
    hips: [
      [118, 150],
      [142, 150],
    ],
    legW: 9,
    legs: 'ink-soft',
    foot: 'sneaker',
    shoes: 'colour',
    shoulders: [
      [88, 92],
      [172, 92],
    ],
    armW: 12,
    arms: 'paper',
    hands: 'paper',
    noThumb: true,
    eyes: [
      [116, 56, 11],
      [146, 56, 11],
    ],
    lid: 'paper',
    mouth: [131, 83, 18],
    sweat: [
      [76, 36],
      [184, 36],
    ],
    neck: [130, 104],
    chest: [130, 124],
    hat: [130, 14],
    cup: [130, -44],
    reach: 1,
  },
  mummy: {
    face: 130,
    nose: 160,
    hips: [
      [118, 146],
      [142, 146],
    ],
    legW: 13,
    legs: 'paper',
    foot: 'sneaker',
    shoes: 'colour',
    shoulders: [
      [104, 100],
      [156, 100],
    ],
    armW: 11,
    arms: 'paper',
    hands: 'paper',
    eyes: [
      [118, 55, 9],
      [142, 53, 9],
    ],
    lid: 'ink-soft',
    mouth: [130, 80, 16],
    sweat: [
      [86, 40],
      [174, 36],
    ],
    neck: [130, 94],
    chest: [130, 124],
    hat: [130, 24],
    cup: [130, -30],
    reach: 1,
  },
  yeti: {
    face: 130,
    nose: 188,
    hips: [
      [112, 164],
      [148, 164],
    ],
    legW: 16,
    legs: 'paper',
    foot: 'bare',
    footK: 1.3,
    shoes: 'glass',
    shoulders: [
      [78, 100],
      [182, 100],
    ],
    armW: 13,
    arms: 'paper',
    hands: 'glass',
    tooth: true,
    eyes: [
      [119, 57, 9],
      [141, 57, 9],
    ],
    lid: 'glass',
    mouth: [130, 79, 20],
    sweat: [
      [80, 28],
      [180, 28],
    ],
    neck: [130, 104],
    chest: [108, 134],
    hat: [130, 8],
    cup: [130, -38],
    reach: 1,
  },
  gnome: {
    face: 130,
    nose: 168,
    hips: [
      [118, 150],
      [142, 150],
    ],
    legW: 10,
    legs: 'ink-soft',
    foot: 'boot',
    shoes: 'ink',
    sole: 'ink-soft',
    shoulders: [
      [106, 104],
      [154, 104],
    ],
    armW: 10,
    arms: 'sea',
    hands: 'skin',
    dots: true,
    eyes: [
      [118, 55, 4.5],
      [142, 55, 4.5],
    ],
    lid: 'skin',
    mouth: [130, 94, 12],
    sweat: [
      [90, 44],
      [170, 44],
    ],
    neck: [130, 100],
    chest: [146, 124],
    hat: [130, -24],
    cup: [130, -86],
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
  orange: styles.orange!,
  pink: styles.pink!,
  sea: styles.seaBlue!,
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
  orange: 'var(--color-orange)',
  pink: 'var(--color-pink)',
  sea: 'var(--color-sea)',
};

const paint = (el: Element, p: Paint) => (el as SVGElement).style.setProperty('--paint', LINES[p]);

const round = (n: number) => Math.round(n * 10) / 10;
const at = ([x, y]: Point) => `${round(x)} ${round(y)}`;
/** An ellipse as a path, from its left end round. */
const oval = (x: number, y: number, rx: number, ry: number) =>
  `M${round(x - rx)} ${round(y)} a${round(rx)} ${round(ry)} 0 1 0 ${round(2 * rx)} 0 ` +
  `a${round(rx)} ${round(ry)} 0 1 0 ${round(-2 * rx)} 0 Z`;
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
 * A main part of a body: filled with `paint`, then what's drawn on it, then
 * its shadow (the part less itself moved by `shadow`, up and right, so the
 * shadow falls on its lower left), then its outline. `part` names it for
 * where the feature says its colour is.
 */
interface Shaded {
  readonly paint: string;
  readonly d: string;
  readonly shadow: Point;
  readonly on?: readonly Shape[];
  readonly part?: string;
}

/** A white highlight on the upper right of a head or a body. */
const shine = (d: string, width = 5, opacity = 0.8): Shape => [
  'path',
  styles.stripe!,
  { d, 'stroke-width': width, opacity, 'data-part': 'highlight' },
];

/** A line `width` wide over an ink one `ink` wide: in `className`, or in the colour token `colour`. */
const inkUnder = (
  d: string,
  ink: number,
  width: number,
  className: string,
  colour?: string,
): Shape[] => [
  ['path', styles.line!, { d, 'stroke-width': ink }],
  [
    'path',
    className,
    { d, 'stroke-width': width, ...(colour && { style: `--paint: var(--color-${colour})` }) },
  ],
];

/** The ice cream's scoop, its lower edge dripping. */
const SCOOP =
  'M94 70 Q90 30 130 24 Q172 28 168 68 Q172 84 162 96 Q156 108 150 96 Q144 104 138 98 ' +
  'Q130 110 122 98 Q114 106 108 96 Q98 102 96 90 Q86 82 94 70 Z';

/** The cat's tail, curling up behind it. */
const CAT_TAIL = 'M110 132 Q80 140 72 116 Q66 94 82 82';

/** The octopus's four hanging tentacles, back to front, each from its root. */
export const TENTACLES = [
  'M102 92 Q80 112 86 134 Q90 150 76 158',
  'M114 98 Q102 124 110 146 Q114 160 102 168',
  'M146 98 Q158 124 150 146 Q146 160 158 168',
  'M158 92 Q180 112 174 134 Q170 150 184 158',
] as const;

/** The ghost's sheet, its hem in scallops. */
const GHOST_SHEET =
  'M84 150 L86 60 Q86 12 130 12 Q174 12 174 60 L176 150 Q168 142 160 152 Q152 142 144 152 ' +
  'Q136 142 128 152 Q120 142 112 152 Q104 142 96 152 Q90 144 84 150 Z';

/** The band over the yeti's head, between its earmuffs. */
const EARMUFF_BAND = 'M94 52 Q94 6 130 6 Q166 6 166 52';

/** The gnome's pointy hat, its tip at (130, -28). */
const GNOME_HAT = 'M92 48 L124 -22 Q130 -30 136 -22 L168 48 Q130 38 92 48 Z';

/**
 * Each creature's body and head, back to front. The parts in its colour are
 * named for where they are, as the feature says.
 */
const BODIES: Record<Creature, readonly (Shape | Shaded)[]> = {
  zombie: [
    ['rect', styles.mintSoft!, { x: 122, y: 84, width: 18, height: 14, 'stroke-width': 4 }],
    {
      paint: styles.racer!,
      d:
        'M102 104 Q102 92 116 92 H146 Q160 92 160 104 L162 146 L154 140 L146 148 L138 141 ' +
        'L130 148 L122 141 L114 148 L106 141 L100 146 Z',
      shadow: [10, -4],
      part: 'shirt',
      on: [
        [
          'rect',
          styles.tomatoSoft!,
          {
            x: 136,
            y: 112,
            width: 14,
            height: 14,
            rx: 2,
            'stroke-width': 3,
            transform: 'rotate(8 143 119)',
          },
        ],
      ],
    },
    ['circle', styles.mintSoft!, { cx: 98, cy: 62, r: 7, 'stroke-width': 4 }],
    {
      paint: styles.mintSoft!,
      d: 'M98 46 Q96 18 128 18 Q164 18 164 48 L163 76 Q162 98 130 98 Q100 98 99 76 Z',
      shadow: [9, -7],
    },
    shine('M156 50 Q161 62 159 76', 4),
    [
      'path',
      styles.inkSoft!,
      {
        d:
          'M97 44 Q94 22 110 16 L114 6 L122 16 L130 2 L138 16 L148 6 L151 20 Q165 26 165 46 ' +
          'Q154 30 132 30 Q110 30 97 44 Z',
        'stroke-width': 4,
      },
    ],
    [
      'path',
      styles.line!,
      { d: 'M102 80 L114 85 M105 77 L104 86 M110 79 L109 88', 'stroke-width': 3 },
    ],
  ],
  robot: [
    ['path', styles.line!, { d: 'M130 22 V9', 'stroke-width': 4 }],
    ['circle', styles.racer!, { cx: 130, cy: 7, r: 7, 'stroke-width': 4, 'data-part': 'antenna' }],
    ['circle', styles.paperFill!, { cx: 127.5, cy: 4.5, r: 2 }],
    ['rect', styles.shark!, { x: 84, y: 42, width: 12, height: 26, rx: 4, 'stroke-width': 4 }],
    ['rect', styles.shark!, { x: 164, y: 42, width: 12, height: 26, rx: 4, 'stroke-width': 4 }],
    ['rect', styles.shark!, { x: 122, y: 84, width: 16, height: 12, 'stroke-width': 3 }],
    {
      paint: styles.racer!,
      d: 'M110 94 H150 Q160 94 160 104 V138 Q160 148 150 148 H110 Q100 148 100 138 V104 Q100 94 110 94 Z',
      shadow: [8, -6],
      part: 'body',
      on: [
        ['circle', styles.paper!, { cx: 118, cy: 113, r: 7, 'stroke-width': 3 }],
        ['path', styles.line!, { d: 'M118 113 L122 108', 'stroke-width': 3 }],
        ['circle', styles.tomato!, { cx: 141, cy: 109, r: 4, 'stroke-width': 2.5 }],
        ['circle', styles.sun!, { cx: 150, cy: 120, r: 4, 'stroke-width': 2.5 }],
        ['path', styles.line!, { d: 'M112 134 H148 M112 140 H148', 'stroke-width': 3 }],
      ],
    },
    {
      paint: styles.shark!,
      d: 'M106 20 H154 Q168 20 168 34 V74 Q168 88 154 88 H106 Q92 88 92 74 V34 Q92 20 106 20 Z',
      shadow: [9, -7],
    },
    shine('M154 25 Q164 26 165 37', 4),
    [
      'rect',
      styles.ink!,
      { x: 101, y: 30, width: 58, height: 48, rx: 10, 'stroke-width': 3, 'data-part': 'screen' },
    ],
    shine('M146 35 Q152 35 154 40', 2.5, 0.45),
  ],
  shark: [
    [
      'path',
      styles.racer!,
      {
        d: 'M60 74 Q40 54 24 36 Q34 58 38 76 Q32 96 22 114 Q44 98 60 92 Z',
        'stroke-width': 4,
        'data-part': 'body',
      },
    ],
    [
      'path',
      styles.racer!,
      { d: 'M104 46 Q106 16 92 2 Q128 8 138 42 Z', 'stroke-width': 4, 'data-part': 'body' },
    ],
    {
      paint: styles.racer!,
      d:
        'M52 78 Q60 42 120 38 Q184 36 212 58 Q230 72 228 84 Q210 108 150 116 Q92 120 62 106 ' +
        'Q48 94 52 78 Z',
      shadow: [8, -8],
      part: 'body',
      on: [
        [
          'path',
          styles.paper!,
          { d: 'M62 100 Q120 96 226 84 Q208 108 150 116 Q94 120 62 104 Z', 'stroke-width': 3 },
        ],
        [
          'path',
          styles.line!,
          { d: 'M146 62 Q142 72 146 82 M156 60 Q152 70 156 80', 'stroke-width': 3 },
        ],
      ],
    },
    shine('M100 46 Q140 38 182 47'),
  ],
  astronaut: [
    {
      paint: styles.racer!,
      d: 'M85 90 H99 Q106 90 106 97 V139 Q106 146 99 146 H85 Q78 146 78 139 V97 Q78 90 85 90 Z',
      shadow: [6, -4],
      part: 'backpack',
    },
    {
      paint: styles.paper!,
      d: 'M102 98 Q104 90 118 90 H142 Q156 90 158 98 L160 148 H100 Z',
      shadow: [8, -4],
      on: [
        [
          'rect',
          styles.racer!,
          { x: 116, y: 104, width: 28, height: 16, rx: 3, 'stroke-width': 3, 'data-part': 'panel' },
        ],
        ['circle', styles.paperFill!, { cx: 124, cy: 112, r: 3 }],
        ['circle', styles.paperFill!, { cx: 136, cy: 112, r: 3 }],
        ['rect', styles.shark!, { x: 100, y: 136, width: 60, height: 8, 'stroke-width': 3 }],
      ],
    },
    ['rect', styles.shark!, { x: 106, y: 86, width: 48, height: 12, rx: 6, 'stroke-width': 3 }],
    {
      paint: styles.glass!,
      d: 'M94 56 A36 36 0 1 0 166 56 A36 36 0 1 0 94 56 Z',
      shadow: [8, -7],
    },
    {
      paint: styles.skin!,
      d: 'M106 60 A24 24 0 1 0 154 60 A24 24 0 1 0 106 60 Z',
      shadow: [5, -5],
      part: 'skin',
    },
    shine('M146 27 Q161 33 165 50', 6),
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
    ['path', styles.line!, { d: 'M100 22 L108 21 M160 22 L152 21', 'stroke-width': 2.5 }],
    {
      paint: styles.racer!,
      d: fur(130, 96, 50, 68),
      shadow: [9, -7],
      part: 'fur',
      on: [
        ['ellipse', styles.tomatoSoft!, { cx: 130, cy: 130, rx: 26, ry: 20, 'stroke-width': 3 }],
      ],
    },
    shine('M152 38 Q166 46 172 62'),
  ],
  villain: [
    {
      paint: styles.racer!,
      d: 'M108 94 Q62 112 44 164 Q76 154 104 162 Z',
      shadow: [6, -6],
      part: 'cape',
    },
    {
      paint: styles.inkSoft!,
      d: 'M104 98 Q106 90 118 90 H142 Q154 90 156 98 L156 148 H104 Z',
      shadow: [8, -4],
      on: [['path', styles.paper!, { d: 'M121 90 L130 112 L139 90 Z', 'stroke-width': 3 }]],
    },
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
    {
      paint: styles.skin!,
      d: 'M102 56 A28 28 0 1 0 158 56 A28 28 0 1 0 102 56 Z',
      shadow: [6, -6],
      part: 'skin',
    },
    [
      'path',
      styles.inkSoft!,
      {
        d: 'M102 54 Q100 26 130 26 Q160 26 158 54 Q152 38 136 38 L130 46 L124 38 Q108 38 102 54 Z',
        'stroke-width': 4,
      },
    ],
    shine('M140 30 Q150 31 154 38', 3, 0.6),
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
    ['circle', styles.paperFill!, { cx: 100, cy: 5, r: 1.8 }],
    ['circle', styles.paperFill!, { cx: 156, cy: 5, r: 1.8 }],
    ['rect', styles.racer!, { x: 124, y: 82, width: 12, height: 14, 'stroke-width': 3 }],
    {
      paint: styles.glass!,
      d: 'M108 98 Q110 92 120 92 H140 Q150 92 152 98 L156 148 H104 Z',
      shadow: [8, -4],
      on: [
        ['circle', styles.sun!, { cx: 130, cy: 114, r: 8, 'stroke-width': 3 }],
        ['circle', styles.paperFill!, { cx: 127.5, cy: 111.5, r: 2 }],
      ],
    },
    {
      paint: styles.racer!,
      d: 'M88 56 A42 32 0 1 0 172 56 A42 32 0 1 0 88 56 Z',
      shadow: [9, -7],
      part: 'head',
    },
    shine('M150 30 Q164 36 168 50'),
  ],
  dinosaur: [
    {
      paint: styles.racer!,
      d: 'M98 118 Q52 128 12 170 Q60 152 106 144 Z',
      shadow: [6, -6],
      part: 'body',
    },
    [
      'path',
      styles.racer!,
      {
        d: 'M108 70 l-12 -8 l4 16 Z M96 94 l-14 -4 l8 14 Z',
        'stroke-width': 3,
        'data-part': 'body',
      },
    ],
    {
      paint: styles.racer!,
      d: 'M90 112 Q92 80 126 78 Q160 80 162 114 Q162 148 126 152 Q92 150 90 112 Z',
      shadow: [8, -6],
      part: 'body',
      on: [
        [
          'path',
          styles.tomatoSoft!,
          { d: 'M120 90 Q148 96 152 126 Q144 146 124 148 Q136 120 120 90 Z', 'stroke-width': 3 },
        ],
      ],
    },
    {
      paint: styles.racer!,
      d:
        'M118 54 Q118 22 160 22 Q206 22 216 46 Q220 62 208 70 L164 72 Q164 84 152 86 ' +
        'Q128 88 122 74 Q118 66 118 54 Z',
      shadow: [8, -7],
      part: 'body',
      on: [['circle', styles.inkFill!, { cx: 208, cy: 36, r: 2.5 }]],
    },
    shine('M162 26 Q196 24 210 37'),
  ],
  mug: [
    // Wisps of steam, while it isn't empty.
    ...inkUnder(
      'M118 8 Q110 0 118 -8 Q126 -16 118 -24 M138 6 Q130 -2 138 -10 Q146 -18 138 -26',
      11,
      5,
      styles.stripe!,
    ).map(([tag, className, attributes]): Shape => [
      tag,
      className,
      { ...attributes, 'data-part': 'wisps' },
    ]),
    ['path', styles.line!, { d: 'M102 46 Q68 46 68 80 Q68 112 102 112', 'stroke-width': 20 }],
    [
      'path',
      styles.limb!,
      {
        d: 'M102 46 Q68 46 68 80 Q68 112 102 112',
        'stroke-width': 12,
        style: '--paint: var(--racer)',
        'data-part': 'handle',
      },
    ],
    {
      paint: styles.racer!,
      d: 'M98 24 Q98 16 106 16 H162 Q170 16 170 24 L166 136 Q165 150 150 150 H116 Q102 150 101 136 Z',
      shadow: [12, -3],
      part: 'mug',
      on: [
        ['path', styles.paper!, { d: 'M100.5 118 H166.6 L166.2 130 H100.8 Z', 'stroke-width': 3 }],
      ],
    },
    shine('M158 34 Q160 74 157 106', 6),
    [
      'ellipse',
      styles.racer!,
      { cx: 134, cy: 20, rx: 36, ry: 8, 'stroke-width': 4, 'data-part': 'mug' },
    ],
    ['ellipse', styles.inkSoft!, { cx: 134, cy: 21, rx: 29, ry: 5, 'stroke-width': 3 }],
  ],
  printer: [
    ['path', styles.paper!, { d: 'M106 32 L110 0 L154 4 L150 32 Z', 'stroke-width': 3 }],
    ['path', styles.inkSoftLine!, { d: 'M118 10 H144 M117 18 H140', 'stroke-width': 3 }],
    {
      paint: styles.paper!,
      d: 'M96 28 H168 Q180 28 180 40 V120 Q180 132 168 132 H96 Q84 132 84 120 V40 Q84 28 96 28 Z',
      shadow: [10, -6],
      on: [
        [
          'path',
          styles.racer!,
          {
            d: 'M84 50 V40 Q84 28 96 28 H168 Q180 28 180 40 V50 Z',
            'stroke-width': 4,
            'data-part': 'cover',
          },
        ],
        ['rect', styles.inkFill!, { x: 98, y: 100, width: 68, height: 9, rx: 4.5 }],
        ['circle', styles.mint!, { cx: 168, cy: 68, r: 4, 'stroke-width': 2.5 }],
        [
          'circle',
          styles.tomato!,
          { cx: 168, cy: 82, r: 4, 'stroke-width': 2.5, 'data-part': 'light' },
        ],
      ],
    },
    shine('M158 32 Q170 32 174 40', 4),
    [
      'path',
      styles.paper!,
      { d: 'M106 104 H158 L162 122 Q150 128 138 122 Q124 116 110 122 Z', 'stroke-width': 3 },
    ],
    ['path', styles.inkSoftLine!, { d: 'M116 111 H150', 'stroke-width': 2.5 }],
    [
      'rect',
      styles.racer!,
      { x: 92, y: 126, width: 80, height: 12, rx: 4, 'stroke-width': 3, 'data-part': 'tray' },
    ],
  ],
  sticky: [
    {
      paint: styles.racer!,
      d: 'M90 20 H170 V84 L150 104 H90 Z',
      shadow: [8, -6],
      part: 'note',
      // Its sticky strip, a touch darker.
      on: [['rect', styles.inkFill!, { x: 90, y: 20, width: 80, height: 12, opacity: 0.1 }]],
    },
    ['path', styles.paper!, { d: 'M170 84 L150 104 L153 87 Z', 'stroke-width': 3 }],
    shine('M163 38 Q165 54 163 70', 4),
  ],
  banana: [
    ['path', styles.paper!, { d: 'M126 32 Q124 4 140 2 Q156 4 154 32 Z', 'stroke-width': 4 }],
    {
      paint: styles.racer!,
      d: 'M118 148 Q90 112 98 72 Q104 42 122 30 H158 Q168 58 164 94 Q160 128 140 148 Z',
      shadow: [9, -5],
      part: 'peel',
      on: [['path', styles.line!, { d: 'M108 74 Q104 108 122 140', 'stroke-width': 3 }]],
    },
    [
      'path',
      styles.racer!,
      {
        d: 'M124 30 Q104 26 94 50 Q110 40 132 42 Z M156 30 Q178 26 186 50 Q168 40 148 42 Z',
        'stroke-width': 4,
        'data-part': 'peel',
      },
    ],
    [
      'path',
      styles.inkSoft!,
      { d: 'M120 146 Q129 154 138 146 L136 154 Q129 160 122 154 Z', 'stroke-width': 3 },
    ],
    shine('M161 84 Q162 102 155 122'),
  ],
  icecream: [
    {
      paint: styles.orange!,
      d: 'M100 92 H162 L134 152 Q131 158 128 152 Z',
      shadow: [6, -4],
      on: [
        [
          'path',
          styles.line!,
          {
            d: 'M116 98 L140 122 M134 98 L150 114 M146 98 L120 124 M128 98 L112 114',
            'stroke-width': 2.5,
          },
        ],
      ],
    },
    {
      paint: styles.racer!,
      d: SCOOP,
      shadow: [8, -7],
      part: 'scoop',
    },
    ...inkUnder('M104 46 L109 41', 7.5, 3.5, styles.limb!, 'sun'),
    ...inkUnder('M116 33 L122 32', 7.5, 3.5, styles.limb!, 'mint'),
    ...inkUnder('M99 64 L101 58', 7.5, 3.5, styles.limb!, 'grape'),
    shine('M148 30 Q162 36 166 52'),
    ['path', styles.line!, { d: 'M130 12 Q134 0 146 -6', 'stroke-width': 3 }],
    ['circle', styles.tomato!, { cx: 128, cy: 18, r: 9, 'stroke-width': 3 }],
    ['circle', styles.paperFill!, { cx: 125, cy: 15, r: 2.5 }],
  ],
  sushi: [
    {
      paint: styles.paper!,
      d: 'M88 86 Q86 70 102 70 H160 Q176 70 174 86 L172 134 Q172 146 158 146 H104 Q90 146 90 134 Z',
      shadow: [8, -5],
      on: [
        [
          'path',
          styles.inkSoftLine!,
          {
            d: 'M120 118 l6 3 M128 134 l7 -2 M150 128 l6 3 M160 110 l5 4 M134 100 l6 -2 M146 116 l6 2',
            'stroke-width': 3,
          },
        ],
      ],
    },
    {
      paint: styles.racer!,
      d: 'M80 74 Q78 40 112 36 Q150 30 182 46 Q194 54 186 68 Q178 80 160 78 Q130 74 104 84 Q84 90 80 74 Z',
      shadow: [6, -6],
      part: 'fish',
      on: [
        [
          'path',
          styles.stripe!,
          { d: 'M168 46 Q164 58 170 72 M179 52 Q176 62 180 70', 'stroke-width': 3.5 },
        ],
      ],
    },
    // The nori band.
    ['rect', styles.inkSoft!, { x: 96, y: 38, width: 16, height: 108, 'stroke-width': 3 }],
  ],
  cat: [
    // Its tail, curling up behind, with a white tip.
    ['path', styles.line!, { d: CAT_TAIL, 'stroke-width': 17 }],
    [
      'path',
      styles.limb!,
      { d: CAT_TAIL, 'stroke-width': 10, style: '--paint: var(--racer)', 'data-part': 'fur' },
    ],
    ['circle', styles.paper!, { cx: 82, cy: 82, r: 6.5, 'stroke-width': 3 }],
    {
      paint: styles.racer!,
      d: 'M106 110 Q104 90 126 89 Q148 90 148 110 L146 132 Q144 150 126 150 Q108 150 107 132 Z',
      shadow: [9, -6],
      part: 'fur',
      on: [
        [
          'path',
          styles.paper!,
          {
            d: 'M118 104 Q128 98 138 104 Q142 122 136 140 Q128 146 120 140 Q114 122 118 104 Z',
            'stroke-width': 3,
          },
        ],
      ],
    },
    [
      'path',
      styles.racer!,
      {
        d: 'M96 46 Q90 16 102 4 Q118 14 126 28 Z M150 26 Q160 10 174 6 Q178 24 172 46 Z',
        'stroke-width': 4,
        'data-part': 'fur',
      },
    ],
    [
      'path',
      styles.pinkFill!,
      { d: 'M102 36 Q100 20 105 12 Q114 20 118 28 Z M156 26 Q163 16 170 14 Q171 26 168 36 Z' },
    ],
    // Tufts at its cheeks.
    [
      'path',
      styles.racer!,
      {
        d: 'M94 64 L80 72 L95 78 Z M174 64 L189 70 L175 78 Z',
        'stroke-width': 4,
        'data-part': 'fur',
      },
    ],
    {
      paint: styles.racer!,
      d: 'M90 56 A44 37 0 1 0 178 56 A44 37 0 1 0 90 56 Z',
      shadow: [9, -7],
      part: 'fur',
    },
    shine('M156 27 Q170 33 175 47'),
    [
      'path',
      styles.line!,
      { d: 'M130 19 Q133 25 131 31 M141 19 Q144 25 142 31', 'stroke-width': 3.5 },
    ],
    ['ellipse', styles.paper!, { cx: 142, cy: 75, rx: 17, ry: 11, 'stroke-width': 3 }],
    [
      'path',
      styles.pink!,
      { d: 'M136 66 Q142 63 148 66 Q146 71 142 72 Q138 71 136 66 Z', 'stroke-width': 2.5 },
    ],
    [
      'path',
      styles.line!,
      {
        d: 'M125 74 L104 70 M125 80 L104 83 M159 74 L181 70 M159 80 L181 83',
        'stroke-width': 3,
      },
    ],
  ],
  octopus: [
    // Four tentacles hanging from its mantle, each to whirl on its own.
    ...TENTACLES.flatMap((d, i): Shape[] => [
      ['path', styles.line!, { d, 'stroke-width': 17, 'data-tentacle': i }],
      [
        'path',
        styles.limb!,
        {
          d,
          'stroke-width': 10,
          style: '--paint: var(--racer)',
          'data-part': 'tentacles',
          'data-tentacle': i,
        },
      ],
    ]),
    ...(
      [
        [85, 128, 0],
        [89, 142, 0],
        [108, 138, 1],
        [111, 152, 1],
        [152, 138, 2],
        [149, 152, 2],
        [175, 128, 3],
        [171, 142, 3],
      ] as const
    ).map(([cx, cy, i]): Shape => [
      'circle',
      styles.tomatoSoft!,
      { cx, cy, r: 2.8, 'stroke-width': 2, 'data-tentacle': i },
    ]),
    {
      paint: styles.racer!,
      d: 'M86 64 Q78 2 130 0 Q182 2 174 64 Q176 98 152 102 H108 Q84 98 86 64 Z',
      shadow: [9, -7],
      part: 'body',
      on: [
        ['circle', styles.paper!, { cx: 100, cy: 30, r: 5, 'stroke-width': 2.5 }],
        ['circle', styles.paper!, { cx: 112, cy: 14, r: 3.5, 'stroke-width': 2.5 }],
        ['circle', styles.paper!, { cx: 93, cy: 46, r: 3, 'stroke-width': 2.5 }],
      ],
    },
    shine('M150 10 Q168 18 172 36'),
  ],
  penguin: [
    {
      paint: styles.racer!,
      d: 'M130 6 Q84 8 84 70 Q82 128 100 148 Q130 162 160 148 Q178 128 176 70 Q176 8 130 6 Z',
      shadow: [9, -6],
      part: 'back',
      on: [
        [
          'path',
          styles.paper!,
          {
            d:
              'M130 42 Q118 28 104 36 Q92 46 98 70 Q104 92 130 98 Q156 92 162 70 Q168 46 156 36 ' +
              'Q142 28 130 42 Z',
            'stroke-width': 3,
          },
        ],
        ['ellipse', styles.paper!, { cx: 130, cy: 124, rx: 28, ry: 24, 'stroke-width': 3 }],
      ],
    },
    ['circle', styles.pinkFill!, { cx: 104, cy: 76, r: 5, opacity: 0.7 }],
    ['circle', styles.pinkFill!, { cx: 156, cy: 76, r: 5, opacity: 0.7 }],
    ['path', styles.orange!, { d: 'M112 74 Q130 62 148 74 Q130 90 112 74 Z', 'stroke-width': 3 }],
    shine('M150 14 Q166 22 172 40'),
  ],
  pigeon: [
    ['path', styles.inkSoft!, { d: 'M84 100 L46 106 L50 124 L90 120 Z', 'stroke-width': 4 }],
    {
      paint: styles.shark!,
      d: 'M80 104 Q78 74 112 70 Q150 68 162 92 Q170 120 150 140 Q120 156 96 140 Q80 128 80 104 Z',
      shadow: [8, -6],
    },
    [
      'path',
      styles.racer!,
      {
        d: 'M128 84 Q130 62 146 58 L176 68 Q172 90 158 100 Q140 98 128 84 Z',
        'stroke-width': 4,
        'data-part': 'neck',
      },
    ],
    // The sheen on its neck.
    ['path', styles.stripe!, { d: 'M136 78 Q146 70 160 74', 'stroke-width': 3, opacity: 0.6 }],
    {
      paint: styles.shark!,
      d: 'M136 46 A26 26 0 1 0 188 46 A26 26 0 1 0 136 46 Z',
      shadow: [7, -6],
    },
    ['circle', styles.orange!, { cx: 156, cy: 40, r: 12.5, 'stroke-width': 3 }],
    ['path', styles.inkSoft!, { d: 'M186 42 L204 50 L186 57 Z', 'stroke-width': 3 }],
    ['ellipse', styles.paper!, { cx: 188, cy: 42, rx: 5, ry: 4, 'stroke-width': 2 }],
    shine('M168 22 Q181 26 185 35', 4),
  ],
  ghost: [
    {
      paint: styles.paper!,
      d: GHOST_SHEET,
      shadow: [10, -6],
      on: [
        ...(
          [
            [104, 32, 6],
            [158, 28, 5],
            [98, 102, 7],
            [160, 108, 6],
            [120, 132, 6],
            [150, 136, 4],
          ] as const
        ).map(([cx, cy, r]): Shape => [
          'circle',
          styles.racer!,
          { cx, cy, r, 'stroke-width': 2.5, 'data-part': 'dots' },
        ]),
        [
          'path',
          styles.inkSoftLine!,
          { d: 'M108 116 Q104 132 110 146 M154 116 Q158 132 152 146', 'stroke-width': 2.5 },
        ],
      ],
    },
  ],
  mummy: [
    // A loose end of bandage, trailing behind.
    [
      'path',
      styles.paper!,
      { d: 'M102 62 Q72 64 52 84 L58 94 Q76 76 102 72 Z', 'stroke-width': 3 },
    ],
    {
      paint: styles.paper!,
      d: 'M104 98 Q106 90 118 90 H142 Q154 90 156 98 L158 148 H102 Z',
      shadow: [8, -4],
      on: [
        [
          'path',
          styles.line!,
          {
            d: 'M104 106 L156 100 M103 118 L157 112 M102 130 L158 124 M102 141 L158 136',
            'stroke-width': 2.5,
          },
        ],
      ],
    },
    {
      paint: styles.paper!,
      d: 'M100 42 Q100 22 130 22 Q160 22 160 42 L160 74 Q160 94 130 94 Q100 94 100 74 Z',
      shadow: [8, -6],
      on: [
        // The gap in its bandages its eyes look out of.
        ['path', styles.inkSoft!, { d: 'M100 44 L160 40 L160 64 L100 68 Z', 'stroke-width': 3 }],
        ['path', styles.line!, { d: 'M101 74 L159 70 M102 88 L158 85', 'stroke-width': 2.5 }],
      ],
    },
    [
      'path',
      styles.racer!,
      { d: 'M100 30 L160 26 L160 38 L100 42 Z', 'stroke-width': 4, 'data-part': 'sweatband' },
    ],
    ['path', styles.stripe!, { d: 'M140 30 L154 29', 'stroke-width': 2.5, opacity: 0.7 }],
  ],
  yeti: [
    { paint: styles.paper!, d: fur(130, 94, 58, 76), shadow: [9, -7] },
    ['path', styles.line!, { d: EARMUFF_BAND, 'stroke-width': 12 }],
    [
      'path',
      styles.limb!,
      {
        d: EARMUFF_BAND,
        'stroke-width': 5,
        style: '--paint: var(--racer)',
        'data-part': 'earmuffs',
      },
    ],
    {
      paint: styles.glass!,
      d: 'M104 52 Q104 34 130 34 Q156 34 156 52 L156 72 Q156 92 130 92 Q104 92 104 72 Z',
      shadow: [6, -5],
    },
    [
      'circle',
      styles.racer!,
      { cx: 93, cy: 58, r: 13, 'stroke-width': 4, 'data-part': 'earmuffs' },
    ],
    [
      'circle',
      styles.racer!,
      { cx: 167, cy: 58, r: 13, 'stroke-width': 4, 'data-part': 'earmuffs' },
    ],
    ['circle', styles.paperFill!, { cx: 171, cy: 53, r: 3, opacity: 0.8 }],
    ['circle', styles.paperFill!, { cx: 97, cy: 53, r: 3, opacity: 0.8 }],
  ],
  gnome: [
    {
      paint: styles.seaBlue!,
      d: 'M104 106 Q104 96 116 96 H144 Q156 96 156 106 L158 150 H102 Z',
      shadow: [7, -4],
      on: [
        ['rect', styles.inkFill!, { x: 102, y: 134, width: 56, height: 9 }],
        ['rect', styles.sun!, { x: 123, y: 131, width: 14, height: 14, rx: 2, 'stroke-width': 3 }],
      ],
    },
    {
      paint: styles.skin!,
      d: 'M103 62 A27 27 0 1 0 157 62 A27 27 0 1 0 103 62 Z',
      shadow: [5, -5],
      part: 'skin',
    },
    ['circle', styles.pinkFill!, { cx: 113, cy: 68, r: 5, opacity: 0.6 }],
    ['circle', styles.pinkFill!, { cx: 147, cy: 68, r: 5, opacity: 0.6 }],
    {
      paint: styles.paper!,
      d:
        'M100 64 Q98 92 110 114 Q122 134 130 140 Q138 134 150 114 Q162 92 160 64 ' +
        'Q150 80 130 80 Q110 80 100 64 Z',
      shadow: [6, -4],
      part: 'beard',
      on: [
        [
          'path',
          styles.inkSoftLine!,
          {
            d: 'M114 100 Q119 105 117 112 M146 100 Q141 105 143 112 M130 116 Q133 122 130 128',
            'stroke-width': 2.5,
          },
        ],
      ],
    },
    // Its moustache.
    [
      'path',
      styles.paper!,
      {
        d: 'M130 79 Q118 71 108 79 Q116 86 130 83 Q144 86 152 79 Q142 71 130 79 Z',
        'stroke-width': 3,
      },
    ],
    { paint: styles.racer!, d: GNOME_HAT, shadow: [7, -6], part: 'hat' },
    shine('M138 -10 Q150 14 158 36', 4),
    // Its round nose.
    ['circle', styles.skin!, { cx: 130, cy: 69, r: 9, 'stroke-width': 3, 'data-part': 'skin' }],
    ['circle', styles.paperFill!, { cx: 133, cy: 66, r: 2.2, opacity: 0.8 }],
  ],
};

/**
 * Each kind of foot, its ankle at (0, 0) and its sole 11 below, facing right:
 * the shoe in `shoe`, its sole in `sole`, a stripe in `stripe`, or toes and
 * tips as lines in `line`.
 */
export const FEET: Record<
  Foot,
  (paints: { shoe: string; sole: string; stripe: string; line: string }) => Shape[]
> = {
  sneaker: ({ shoe, sole, stripe }) => [
    [
      'path',
      shoe,
      {
        d: 'M-12 -12 Q-14 -2 -14 3 H22 Q27 3 25 -3 Q21 -9 8 -11 L4 -16 Q-6 -19 -12 -12 Z',
        'stroke-width': 3.5,
        'data-part': 'shoe',
      },
    ],
    [
      'path',
      sole,
      { d: 'M-16 3 H24 Q29 3 28 7 Q27 11 22 11 H-13 Q-17 11 -16 3 Z', 'stroke-width': 3.5 },
    ],
    ['path', stripe, { d: 'M-8 -3 Q4 -1 14 -6', 'stroke-width': 4, 'data-part': 'stripe' }],
    ['path', styles.line!, { d: 'M3 -13 L7 -8 M9 -12 L12 -8', 'stroke-width': 2.5 }],
  ],
  boot: ({ shoe, sole }) => [
    [
      'path',
      shoe,
      {
        d: 'M-11 -22 H7 V-10 Q19 -9 23 -2 Q25 3 22 4 H-13 Q-14 -6 -11 -22 Z',
        'stroke-width': 3.5,
        'data-part': 'shoe',
      },
    ],
    [
      'path',
      sole,
      { d: 'M-15 3 H24 Q28 3 27 7 Q26 11 21 11 H-12 Q-16 11 -15 3 Z', 'stroke-width': 3.5 },
    ],
    ['path', styles.line!, { d: 'M-11 -15 H7', 'stroke-width': 2.5 }],
  ],
  bare: ({ shoe }) => [
    [
      'path',
      shoe,
      {
        d: 'M-14 6 Q-16 -10 -2 -12 Q14 -12 22 -2 Q28 6 22 10 H-10 Q-15 10 -14 6 Z',
        'stroke-width': 3.5,
        'data-part': 'shoe',
      },
    ],
    ['path', styles.line!, { d: 'M13 3 Q15 7 14 10 M5 4 Q7 8 6 10', 'stroke-width': 2.5 }],
  ],
  paddle: ({ shoe }) => [
    [
      'path',
      shoe,
      {
        d: 'M-8 -2 Q8 -6 26 4 Q30 10 22 11 Q12 13 -6 10 Q-12 5 -8 -2 Z',
        'stroke-width': 3.5,
        'data-part': 'shoe',
      },
    ],
    ['path', styles.line!, { d: 'M10 4 L13 10 M18 5 L21 10', 'stroke-width': 2.5 }],
  ],
  toes: ({ line }) => [
    ['path', styles.line!, { d: 'M0 0 L20 10 M0 0 L10 12 M0 0 L-10 10', 'stroke-width': 8 }],
    [
      'path',
      styles.limb!,
      {
        d: 'M0 0 L20 10 M0 0 L10 12 M0 0 L-10 10',
        'stroke-width': 4,
        style: `--paint: ${line}`,
        'data-part': 'shoe',
      },
    ],
  ],
  tip: ({ line }) => [
    ['path', styles.line!, { d: 'M0 0 Q12 4 13 -4 Q13 -11 6 -9', 'stroke-width': 17 }],
    [
      'path',
      styles.limb!,
      {
        d: 'M0 0 Q12 4 13 -4 Q13 -11 6 -9',
        'stroke-width': 10,
        style: `--paint: ${line}`,
        'data-part': 'shoe',
      },
    ],
  ],
};

/** How far a creature leans back when scared, about its hips. */
export const LEAN = -10;

/** What a creature's burst or stop brings out, each hidden until then. */
export type CreatureProp =
  | 'lostShoe'
  | 'flag'
  | 'wrap'
  | 'question'
  | 'snack'
  | 'jets'
  | 'stream'
  | 'jam'
  | 'wind'
  | 'patch'
  | 'skid'
  | 'sprinkles'
  | 'drips'
  | 'puddle'
  | 'belt'
  | 'wasabi'
  | 'tears'
  | 'steam'
  | 'laser'
  | 'box'
  | 'knot'
  | 'ice'
  | 'fish'
  | 'chip'
  | 'chest'
  | 'fright'
  | 'hem'
  | 'plinth'
  | 'trail'
  | 'unwrap'
  | 'skis'
  | 'snow';

/**
 * Where a prop goes: on the ground, behind everything; under the body,
 * leaning with it; in front, leaning with it; or, by default, over it all.
 */
const LAYERS: Partial<Record<CreatureProp, 'ground' | 'under' | 'front'>> = {
  question: 'front',
  wrap: 'front',
  jets: 'front',
  jam: 'front',
  wasabi: 'front',
  tears: 'front',
  steam: 'front',
  box: 'front',
  knot: 'front',
  chest: 'front',
  fright: 'front',
  hem: 'under',
  drips: 'under',
  stream: 'ground',
  wind: 'ground',
  patch: 'ground',
  skid: 'ground',
  puddle: 'ground',
  belt: 'ground',
  laser: 'ground',
  ice: 'ground',
  chip: 'ground',
  plinth: 'ground',
  trail: 'ground',
  unwrap: 'ground',
  skis: 'ground',
  snow: 'ground',
};

/** Two puffs of steam shooting up from (0, 0). */
const PUFF =
  'M-16 0 Q-26 0 -24 -10 Q-26 -22 -12 -22 Q-8 -32 4 -28 Q16 -32 18 -20 Q28 -16 22 -6 ' +
  'Q22 0 12 0 Z';
const JETS: readonly Shape[] = [
  ['path', styles.line!, { d: 'M-14 4 V-4 M2 2 V-10 M16 4 V-4', 'stroke-width': 3 }],
  ['path', styles.paper!, { d: PUFF, 'stroke-width': 3, transform: 'translate(-14 -10)' }],
  [
    'path',
    styles.paper!,
    { d: PUFF, 'stroke-width': 3, transform: 'translate(16 -30) scale(0.8)' },
  ],
];

/** A sheet of printed paper, turned and placed by `transform`. */
const sheet = (transform: string): Shape[] => [
  ['path', styles.paper!, { d: 'M-14 -18 L14 -20 L16 18 L-12 20 Z', 'stroke-width': 3, transform }],
  [
    'path',
    styles.inkSoftLine!,
    { d: 'M-7 -8 H8 M-6 0 H8 M-6 8 H4', 'stroke-width': 2.5, transform },
  ],
];

/** Paper flying out behind the printer. */
const STREAM: readonly Shape[] = [
  ...sheet('translate(18 52) rotate(-8) scale(0.9)'),
  ...sheet('translate(40 88) rotate(14)'),
  ...sheet('translate(70 38) rotate(-20)'),
];

/** A crumpled sheet stuck in the printer's slot. */
const JAM: readonly Shape[] = [
  [
    'path',
    styles.paper!,
    {
      d: 'M118 104 L126 88 L136 96 L146 84 L154 98 L166 90 L164 106 L172 114 L156 118 L146 112 L134 120 L124 112 Z',
      'stroke-width': 3,
    },
  ],
  [
    'path',
    styles.line!,
    { d: 'M128 100 L136 108 M146 94 L150 106 M158 100 L162 110', 'stroke-width': 2.5 },
  ],
];

/** Wind lines behind the sticky note. */
const WIND: readonly Shape[] = [
  [
    'path',
    styles.line!,
    {
      d: 'M70 36 H34 Q20 36 22 26 Q26 16 36 22 M84 66 H22 M72 94 H38 Q24 94 26 106 Q30 114 38 108',
      'stroke-width': 4,
    },
  ],
];

/** A sticky smear in the note's colour, under its front foot. */
const PATCH: readonly Shape[] = [
  ['ellipse', styles.racer!, { cx: 158, cy: 189, rx: 26, ry: 5, 'stroke-width': 3 }],
  [
    'path',
    styles.line!,
    { d: 'M150 186 Q148 178 152 172 M166 186 Q168 180 164 174', 'stroke-width': 2.5 },
  ],
];

/** A banana peel flat on the ground, under the banana's feet. */
const SKID: readonly Shape[] = [
  [
    'path',
    styles.racer!,
    {
      d: 'M96 190 Q104 176 120 184 Q130 172 146 182 Q160 174 172 184 Q186 180 192 190 Q144 198 96 190 Z',
      'stroke-width': 3,
    },
  ],
  ['path', styles.line!, { d: 'M110 188 Q144 192 180 188', 'stroke-width': 2.5 }],
];

/** Sprinkles flying off the scoop, in the kit's colours. */
const SPRINKLES: readonly Shape[] = (
  [
    ['M86 40 L92 34', 'sun'],
    ['M104 18 L111 16', 'mint'],
    ['M80 62 L82 55', 'grape'],
    ['M124 8 L130 10', 'pink'],
    ['M70 30 L76 28', 'tomato'],
    ['M96 4 L100 -2', 'sea'],
  ] as const
).flatMap(([d, colour]) => inkUnder(d, 7.5, 3.5, styles.limb!, colour));

/** Drips hanging off the scoop's sides, outside the cone. */
const DRIPS: readonly Shape[] = [
  [
    'path',
    styles.racer!,
    {
      d: 'M86 88 Q82 108 93 114 Q104 108 100 88 Z M156 94 Q152 114 163 120 Q174 114 168 94 Z',
      'stroke-width': 3,
    },
  ],
];

/** A puddle in the scoop's colour, centred on (0, 0). */
const PUDDLE: readonly Shape[] = [
  ['ellipse', styles.racer!, { cx: 0, cy: 0, rx: 30, ry: 6, 'stroke-width': 3 }],
  ['path', styles.stripe!, { d: 'M8 -2 H18', 'stroke-width': 2.5 }],
];

/** A conveyor belt under the sushi's feet, its rollers showing. */
const BELT: readonly Shape[] = [
  ['rect', styles.shark!, { x: 8, y: 184, width: 224, height: 14, rx: 7, 'stroke-width': 3 }],
  ...[26, 66, 106, 146, 186, 214].map((cx): Shape => [
    'circle',
    styles.inkSoft!,
    { cx, cy: 191, r: 4, 'stroke-width': 2 },
  ]),
];

/** A dab of wasabi, centred on (0, 0). */
const WASABI: readonly Shape[] = [
  [
    'path',
    styles.mint!,
    { d: 'M-13 2 Q-16 -8 -6 -10 Q-2 -19 7 -12 Q16 -10 12 2 Z', 'stroke-width': 3 },
  ],
  ['circle', styles.paperFill!, { cx: 4, cy: -9, r: 2 }],
];

/** A tear at the outer corner of each of the sushi's eyes. */
const TEARS: readonly Shape[] = [
  [
    'path',
    styles.glass!,
    {
      d: 'M117 62 Q123 70 117 74 Q111 70 117 62 Z M164 61 Q170 69 164 73 Q158 69 164 61 Z',
      'stroke-width': 2.5,
    },
  ],
];

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

/** A red laser dot, centred on (0, 0), zipping along with lines behind it. */
const LASER: readonly Shape[] = [
  ['path', styles.line!, { d: 'M-34 -3 H-16 M-28 4 H-14', 'stroke-width': 3 }],
  ['circle', styles.tomato!, { cx: 0, cy: 0, r: 6, 'stroke-width': 2.5 }],
  ['circle', styles.paperFill!, { cx: -2, cy: -2, r: 1.8 }],
];

/** A cardboard box round the cat's legs, its flaps open. */
const BOX: readonly Shape[] = [
  ['path', styles.orange!, { d: 'M96 124 L84 104 L120 100 L124 124 Z', 'stroke-width': 3 }],
  ['path', styles.orange!, { d: 'M94 124 H170 L166 190 H98 Z', 'stroke-width': 4 }],
  ['path', styles.orange!, { d: 'M170 124 L190 106 L184 130 Z', 'stroke-width': 3 }],
  [
    'path',
    styles.line!,
    { d: 'M96 138 H168 M132 150 V176 M125 157 L132 150 L139 157', 'stroke-width': 3 },
  ],
];

/** The octopus's legs in a knot, below its mantle. */
const KNOT_PATH =
  'M100 100 Q82 142 116 150 Q152 160 150 128 Q146 104 124 118 Q102 134 128 162 ' +
  'Q148 180 164 152 Q178 126 160 100';
const KNOT: readonly Shape[] = [
  ['path', styles.line!, { d: KNOT_PATH, 'stroke-width': 17 }],
  ['path', styles.limb!, { d: KNOT_PATH, 'stroke-width': 10, style: '--paint: var(--racer)' }],
  ...(
    [
      [112, 140],
      [140, 126],
      [130, 156],
    ] as const
  ).map(([cx, cy]): Shape => ['circle', styles.tomatoSoft!, { cx, cy, r: 2.8, 'stroke-width': 2 }]),
];

/** A strip of ice the penguin slides along on its belly. */
const ICE: readonly Shape[] = [
  [
    'path',
    styles.glass!,
    {
      d: 'M44 186 Q180 180 324 186 Q332 192 322 195 Q180 199 40 195 Q34 190 44 186 Z',
      'stroke-width': 3,
    },
  ],
  ['path', styles.stripe!, { d: 'M180 188 H214 M232 189 H246', 'stroke-width': 2.5 }],
];

/** A fish, centred on (0, 0), facing right. */
const FISH: readonly Shape[] = [
  ['path', styles.seaBlue!, { d: 'M-14 0 L-25 -9 L-22 0 L-25 9 Z', 'stroke-width': 3 }],
  [
    'path',
    styles.seaBlue!,
    { d: 'M-15 0 Q-4 -11 10 -7 Q18 -4 21 0 Q18 4 10 7 Q-4 11 -15 0 Z', 'stroke-width': 3 },
  ],
  ['path', styles.stripe!, { d: 'M0 -4 Q6 -5 10 -3', 'stroke-width': 2 }],
  ['circle', styles.inkFill!, { cx: 13, cy: -1.5, r: 1.8 }],
];

/** Two chips on the ground, centred on (0, 0). */
const CHIP: readonly Shape[] = [
  ['path', styles.sun!, { d: 'M-17 -2 L13 -9 L15 -3 L-15 4 Z', 'stroke-width': 3 }],
  ['path', styles.sun!, { d: 'M-6 1 L18 3 L17 9 L-7 7 Z', 'stroke-width': 3 }],
];

/** The pigeon's chest, puffed up in its colour, with a sheen. */
const CHEST: readonly Shape[] = [
  ['ellipse', styles.racer!, { cx: 144, cy: 104, rx: 34, ry: 31, 'stroke-width': 4 }],
  ['path', styles.stripe!, { d: 'M152 84 Q166 90 170 104', 'stroke-width': 3, opacity: 0.6 }],
];

/** Startle lines either side of the ghost's head. */
const FRIGHT: readonly Shape[] = [
  [
    'path',
    styles.line!,
    {
      d: 'M78 30 L64 22 M78 46 L60 46 M86 14 L78 2 M182 30 L196 22 M182 46 L200 46 M174 14 L182 2',
      'stroke-width': 4,
    },
  ],
];

/** A fold of the ghost's sheet, caught under its front foot. */
const HEM: readonly Shape[] = [
  [
    'path',
    styles.paper!,
    { d: 'M148 146 Q158 168 166 188 L190 188 Q178 166 174 146 Z', 'stroke-width': 3 },
  ],
];

/** A stone plinth the gnome stands on, its top at the feet's line and 20 deep. */
const PLINTH: readonly Shape[] = [
  ['rect', styles.shark!, { x: 98, y: 194, width: 76, height: 16, 'stroke-width': 4 }],
  ['rect', styles.shark!, { x: 90, y: 188, width: 92, height: 8, rx: 2, 'stroke-width': 3 }],
  ['path', styles.line!, { d: 'M120 198 L126 204 L124 210', 'stroke-width': 2.5 }],
];

/** A bandage unrolling behind the mummy, from its waist. */
const TRAIL: readonly Shape[] = [
  [
    'path',
    styles.paper!,
    {
      d:
        'M112 160 Q60 150 20 174 Q-30 196 -110 180 L-112 190 Q-30 206 22 186 ' +
        'Q62 162 110 172 Z',
      'stroke-width': 3,
    },
  ],
  [
    'path',
    styles.line!,
    { d: 'M70 160 L68 170 M10 184 L12 194 M-60 188 L-58 198', 'stroke-width': 2.5 },
  ],
];

/** A bandage come loose from the mummy's waist, along the ground ahead. */
const UNWRAP: readonly Shape[] = [
  [
    'path',
    styles.paper!,
    {
      d: 'M150 118 Q190 136 196 184 L300 182 L300 194 L186 196 Q180 148 146 130 Z',
      'stroke-width': 3,
    },
  ],
  [
    'path',
    styles.line!,
    { d: 'M176 150 L186 146 M230 184 L230 195 M270 183 L270 194', 'stroke-width': 2.5 },
  ],
];

/** A ski in the yeti's colour, its tip curled up in front. */
const SKI = 'M36 188 H214 Q228 188 230 176 Q236 174 236 182 Q232 196 212 196 H36 Q30 192 36 188 Z';
const SKIS: readonly Shape[] = [
  ['path', styles.racer!, { d: SKI, 'stroke-width': 3, transform: 'translate(-18 -5)' }],
  ['path', styles.racer!, { d: SKI, 'stroke-width': 3 }],
];

/** A patch of snow behind the yeti, where it lies down. */
const SNOW: readonly Shape[] = [
  [
    'path',
    styles.paper!,
    {
      d: 'M-74 190 Q-64 174 0 178 Q70 170 152 180 Q180 184 176 193 Q100 202 -62 199 Q-80 197 -74 190 Z',
      'stroke-width': 3,
    },
  ],
  ['path', styles.glass!, { d: 'M-30 186 Q0 182 30 186 Q0 190 -30 186 Z', 'stroke-width': 2 }],
  ['path', styles.glass!, { d: 'M80 184 Q104 181 126 185 Q104 188 80 184 Z', 'stroke-width': 2 }],
];

/** The paints of a creature's feet, as `FEET` takes them. */
const footPaints = (spec: Spec) => ({
  shoe: FILLS[spec.shoes],
  sole: FILLS[spec.sole ?? 'paper'],
  stripe: spec.shoes === 'colour' ? styles.bandLine! : styles.racerLine!,
  line: LINES[spec.shoes],
});

const PROPS: Partial<Record<Creature, Partial<Record<CreatureProp, (spec: Spec) => Shape[]>>>> = {
  zombie: {
    // Its front shoe, centred on (0, 0), to fly and spin.
    lostShoe: (spec) =>
      FEET[spec.foot](footPaints(spec)).map(([tag, className, attributes]) => [
        tag,
        className,
        {
          ...Object.fromEntries(Object.entries(attributes).filter(([key]) => key !== 'data-part')),
          transform: 'translate(-5 -1)',
        },
      ]),
  },
  astronaut: { flag: () => [...FLAG] },
  villain: { wrap: () => [...WRAP] },
  alien: { question: () => [...QUESTION] },
  dinosaur: { snack: () => [...SNACK] },
  mug: { jets: () => [...JETS] },
  printer: { stream: () => [...STREAM], jam: () => [...JAM] },
  sticky: { wind: () => [...WIND], patch: () => [...PATCH] },
  banana: { skid: () => [...SKID] },
  icecream: { sprinkles: () => [...SPRINKLES], drips: () => [...DRIPS], puddle: () => [...PUDDLE] },
  sushi: {
    belt: () => [...BELT],
    wasabi: () => [...WASABI],
    tears: () => [...TEARS],
    steam: () => [...JETS],
  },
  cat: { laser: () => [...LASER], box: () => [...BOX] },
  octopus: { knot: () => [...KNOT] },
  penguin: { ice: () => [...ICE], fish: () => [...FISH] },
  pigeon: { chip: () => [...CHIP], chest: () => [...CHEST] },
  ghost: { fright: () => [...FRIGHT], hem: () => [...HEM] },
  gnome: { plinth: () => [...PLINTH] },
  mummy: { trail: () => [...TRAIL], unwrap: () => [...UNWRAP] },
  yeti: { skis: () => [...SKIS], snow: () => [...SNOW] },
};

export interface CreatureRunner extends Runner {
  readonly look: RacerLook & { readonly mount: Creature };
  /** Its body and face, leaning back when scared, as do its arms and extras. */
  readonly body: SVGGElement;
  /** Its eyes, brows and mouth, to blank. */
  readonly face: SVGGElement;
  /** Its back and front arm, each to turn about its shoulder. */
  readonly arms: readonly [SVGGElement, SVGGElement];
  /** Its back and front foot. */
  readonly shoes: readonly [SVGGElement, SVGGElement];
  /** What its burst or stop brings out, hidden until shown. */
  readonly props: Readonly<Partial<Record<CreatureProp, SVGGElement>>>;
  /** The printer's red light, to blink. */
  readonly light: SVGElement | null;
  /** The mug's wisps of steam, to hide while it's empty. */
  readonly wisps: readonly SVGElement[];
  /** The octopus's hanging tentacles, each its parts, back to front, to whirl or hide. */
  readonly tentacles: readonly (readonly SVGElement[])[];
  /** Stretches both arms forward, for what's out of reach. */
  setStretch(on: boolean): void;
  /** Bends forward from its hips by `degrees`, unless it leans back scared. */
  setBend(degrees: number): void;
}

const SVG = 'http://www.w3.org/2000/svg';

/** Everything off the grid's edges, so a clip of it less a shape is the rest. */
const OUTSIDE = 'M-200 -200 H440 V400 H-200 Z';

/** How many creatures have been drawn, so each drawing's clip ids are its own. */
let drawings = 0;

/**
 * A creature racing as `look` chose, from the canvas's Creature, back to
 * front: the cape, its back leg and foot, its back arm, its body and face,
 * its front leg and foot, its front arm, and the scarf, bow tie, number, top
 * hat and trophy. Everything but the legs leans from its hips. `face` is the
 * kit's look for the run, for the astronaut's and the villain's skin, and
 * the shark's legs.
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
  const defs = el.appendChild(document.createElementNS(SVG, 'defs'));
  const id = `creature-${++drawings}`;

  /** Everything that leans from the hips together. */
  const leaning: SVGGElement[] = [];
  const lean = (name: string, shapes: readonly Shape[] = []) => {
    const g = group(el, name, shapes);
    leaning.push(g);
    return g;
  };

  const [nx, ny] = spec.neck;
  if (look.extra === 'cape') {
    lean('cape', [
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

  // Legs sprint whatever the mood, the creature can't stop them: the front
  // foot planted on the line, the back one kicked up behind.
  const k = spec.footK ?? 1;
  const leg = (name: string, [x, y]: Point, back: boolean) => {
    const length = 179 - y;
    const w = Math.min(length, 42);
    const [knee, ankle, turn]: [Point, Point, number] = back
      ? [[x + 0.05 * w, y + 0.75 * length], [x - 0.62 * w, 179 - 0.42 * w], 62]
      : [[x + 0.6 * w, y + 0.45 * length], [x + 0.25 * w, RACER.feet - 11 * k], 0];
    const d = `M${at([x, y])} Q${at(knee)} ${at(ankle)}`;
    const holder = group(el, name, [
      ['path', styles.line!, { d, 'stroke-width': spec.legW + 7 }],
      ['path', styles.limb!, { d, 'stroke-width': spec.legW, 'data-part': 'legs' }],
    ]);
    paint(holder.children[1]!, spec.legs);
    const foot = group(holder, 'foot', FEET[spec.foot](footPaints(spec)));
    foot.dataset.foot = spec.foot;
    foot.setAttribute('transform', `translate(${at(ankle)}) rotate(${turn}) scale(${k})`);
    return foot;
  };
  const [h1, h2] = spec.hips;
  const hipX = (h1[0] + h2[0]) / 2;
  const hipY = (h1[1] + h2[1]) / 2;

  /** An arm: an ink line under a painted one, and a glove with its thumb; or a fin. */
  const handR = Math.round(spec.armW * 0.7 + 4);
  const thumbR = spec.noThumb || spec.fins ? 0 : Math.round(handR * 0.55);
  const arm = (parent: Element, name: string) => {
    const holder = group(parent, name);
    const [ink, line, thumb, hand] = draw(holder, [
      [
        'path',
        spec.fins ? FILLS[spec.arms] : styles.line!,
        { 'stroke-width': spec.fins ? 4 : spec.armW + 7 },
      ],
      ['path', styles.limb!, { 'stroke-width': spec.armW }],
      ['circle', FILLS[spec.hands], { r: thumbR, 'stroke-width': 3, 'data-part': 'thumb' }],
      ['circle', FILLS[spec.hands], { r: handR, 'stroke-width': 3, 'data-part': 'hand' }],
    ]) as [SVGElement, SVGElement, SVGElement, SVGElement];
    paint(line, spec.arms);
    show(line, !spec.fins);
    show(thumb, thumbR > 0);
    show(hand, !spec.fins);
    return { holder, ink, line, thumb, hand };
  };

  const backFoot = leg('back-leg', h1, true);
  const behind = lean('behind');
  const arms = [arm(behind, 'back-arm')];
  const body = lean('lean');

  // The body: each main part shaded, its shadow clipped to the part less
  // itself moved up and right.
  const own = group(body, 'own');
  BODIES[kind].forEach((part, i) => {
    if (!('shadow' in part)) {
      draw(own, [part]);
      return;
    }
    const clip = defs.appendChild(document.createElementNS(SVG, 'clipPath'));
    clip.id = `${id}-${i}`;
    const [dx, dy] = part.shadow;
    draw(clip, [
      [
        'path',
        '',
        { d: `${OUTSIDE} ${part.d}`, 'clip-rule': 'evenodd', transform: `translate(${dx} ${dy})` },
      ],
    ]);
    draw(own, [
      [
        'path',
        part.paint,
        { d: part.d, 'stroke-width': 0, ...(part.part && { 'data-part': part.part }) },
      ],
      ...(part.on ?? []),
      ['path', styles.shade!, { d: part.d, 'clip-path': `url(#${clip.id})`, 'data-part': 'shade' }],
      ['path', styles.line!, { d: part.d, 'stroke-width': 4 }],
    ]);
  });

  // The face: each eye's white, pupil, shine and lid; the brows, the mouth,
  // its tongue, teeth or fangs; shades with a glint; and sweat.
  const face = group(body, 'face');
  const eyes = spec.eyes.map(
    () =>
      draw(face, [
        ['ellipse', styles.paper!, { 'data-part': 'eye' }],
        ['ellipse', styles.inkFill!, { 'data-part': 'pupil' }],
        ['circle', styles.paperFill!, { 'data-part': 'shine' }],
        ['path', FILLS[spec.lid], { 'stroke-width': 3, 'data-part': 'lid' }],
      ]) as [SVGElement, SVGElement, SVGElement, SVGElement],
  );
  const [brows, mouth, tongue, teeth, fangs, shades, bridge, glint, sweat] = draw(face, [
    ['path', styles.line!, { 'stroke-width': 5, 'data-part': 'brows' }],
    ['path', styles.line!, { 'stroke-width': 4, 'data-part': 'mouth' }],
    ['path', styles.pinkFill!, { 'data-part': 'tongue' }],
    ['path', styles.paperFill!, { 'data-part': 'teeth' }],
    ['path', styles.paper!, { 'stroke-width': 2.5, 'data-part': 'fangs' }],
    ['path', styles.ink!, { 'stroke-width': 3, 'data-part': 'shades' }],
    ['path', styles.line!, { 'stroke-width': 4, 'data-part': 'bridge' }],
    ['path', styles.stripe!, { 'stroke-width': 3, 'data-part': 'glint' }],
    ['path', styles.glass!, { 'stroke-width': 3, 'data-part': 'sweat' }],
  ]) as SVGElement[];

  const frontFoot = leg('front-leg', h2, false);
  const front = lean('front');
  arms.push(arm(front, 'front-arm'));

  if (look.extra === 'scarf') {
    group(front, 'scarf', [
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
        'path',
        styles.line!,
        { d: `M${nx - 64} ${ny + 18} l-7 3 M${nx - 62} ${ny + 24} l-7 3`, 'stroke-width': 3 },
      ],
      [
        'rect',
        styles.band!,
        { x: nx - 22, y: ny - 6, width: 44, height: 13, rx: 6.5, 'stroke-width': 4 },
      ],
    ]);
  }
  if (look.extra === 'bowtie') {
    group(front, 'bowtie', [
      [
        'path',
        styles.band!,
        {
          d:
            `M${nx} ${ny} L${nx - 14} ${ny - 9} Q${nx - 16} ${ny} ${nx - 14} ${ny + 9} Z ` +
            `M${nx} ${ny} L${nx + 14} ${ny - 9} Q${nx + 16} ${ny} ${nx + 14} ${ny + 9} Z`,
          'stroke-width': 3,
        },
      ],
      ['circle', styles.band!, { cx: nx, cy: ny, r: 4.5, 'stroke-width': 3 }],
    ]);
  }
  if (look.extra === 'number') {
    const [x, y] = spec.chest;
    const roundel = group(front, 'number', [
      ['circle', styles.paper!, { cx: x, cy: y, r: 16, 'stroke-width': 3 }],
    ]);
    const text = roundel.appendChild(document.createElementNS(SVG, 'text'));
    text.setAttribute('class', styles.number!);
    text.setAttribute('x', String(x));
    text.setAttribute('y', String(y));
    text.textContent = String(number);
  }
  if (look.extra === 'tophat') {
    const [x, y] = spec.hat;
    const hat = group(front, 'tophat', [
      ['rect', styles.inkFill!, { x: 7, y: 2, width: 22, height: 24, rx: 2 }],
      ['rect', styles.band!, { x: 7, y: 15, width: 22, height: 6, 'stroke-width': 2 }],
      ['path', styles.stripe!, { d: 'M24 5 V13', 'stroke-width': 2, opacity: 0.6 }],
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
  front.append(trophy);

  // What a burst or a stop brings out: on the ground, or with the creature as it leans.
  const props: Partial<Record<CreatureProp, SVGGElement>> = {};
  for (const [name, shapes] of Object.entries(PROPS[kind] ?? {})) {
    const layer = LAYERS[name as CreatureProp];
    const prop = group(
      layer === 'front' ? front : layer === 'under' ? behind : el,
      name,
      shapes(spec),
    );
    if (layer === 'ground') el.insertBefore(prop, defs.nextSibling);
    show(prop, false);
    props[name as CreatureProp] = prop;
  }

  let current = { mood, pose, sweat: false, trophy: false, stretch: false, bend: 0 };

  /** Sets a path's `d`, showing it only when there is one. */
  const trace = (el: Element, d: string) => {
    el.setAttribute('d', d.trim() || 'M0 0');
    show(el, d.trim() !== '');
  };

  /** Draws the face, the arms and the lean for the current mood, pose, sweat and trophy. */
  const update = () => {
    const party = current.mood === 'party' || current.pose === 'party';
    const scared = current.mood === 'scared';
    const googly = look.extra === 'googly';
    const reach = spec.reach;
    const kk = spec.fins ? Math.max(reach, 0.7) * (spec.finK ?? 1) : reach;

    // Arms pump as it runs, the front hand forward at chest height and the
    // back one behind; scared, they flail; the zombie holds them out.
    const elbowAndHand = ([x, y]: Point, isFront: boolean): [Point, Point] => {
      const f = isFront ? 1 : -1;
      if (party) {
        if (current.trophy && reach === 1) {
          return [
            [x + 10 * f, y - 30],
            [spec.cup[0] + 22 * f, spec.cup[1] + 30],
          ];
        }
        const kp = spec.fins ? Math.max(reach, 0.5) : reach;
        return [
          [x + 14 * f * kp, y - 24 * kp],
          [x + 22 * f * kp, y - 52 * kp],
        ];
      }
      if (current.stretch) {
        return [
          [x + 14, y - 3],
          [x + 26, y - 6],
        ];
      }
      if (current.pose === 'pull') {
        return isFront
          ? [
              [x + 26 * kk, y - 18 * kk],
              [x + 20 * kk, y - 50 * kk],
            ]
          : [
              [x - 24 * kk, y - 16 * kk],
              [x - 34 * kk, y - 44 * kk],
            ];
      }
      if (current.pose === 'wave' && isFront) {
        return [
          [x + 24 * kk, y - 10 * kk],
          [x + 18 * kk, y - 46 * kk],
        ];
      }
      if (spec.zombieArms) {
        return isFront
          ? [
              [x + 30, y + 2],
              [x + 58, y - 2],
            ]
          : [
              [x + 36, y + 6],
              [x + 68, y + 4],
            ];
      }
      return isFront
        ? [
            [x - 2 * kk, y + 26 * kk],
            [x + 20 * kk, y + 12 * kk],
          ]
        : [
            [x - 22 * kk, y + 14 * kk],
            [x - 30 * kk, y - 2 * kk],
          ];
    };
    spec.shoulders.forEach((s, i) => {
      const [elbow, hand] = elbowAndHand(s, i === 1);
      const { ink, line, thumb, hand: glove } = arms[i]!;
      if (spec.fins) {
        // A fin: a leaf from the shoulder to where a hand would be.
        const dx = hand[0] - s[0];
        const dy = hand[1] - s[1];
        const length = Math.hypot(dx, dy) || 1;
        const [nx, ny] = [-dy / length, dx / length];
        const w = Math.min(13, Math.max(8, length * 0.34));
        const mid: Point = [(s[0] + hand[0]) / 2, (s[1] + hand[1]) / 2];
        ink.setAttribute(
          'd',
          `M${at([s[0] + nx * 9, s[1] + ny * 9])} Q${at([mid[0] + nx * w, mid[1] + ny * w])} ` +
            `${at(hand)} Q${at([mid[0] - nx * w, mid[1] - ny * w])} ${at([s[0] - nx * 9, s[1] - ny * 9])} Z`,
        );
        return;
      }
      const d = `M${at(s)} Q${at(elbow)} ${at(hand)}`;
      ink.setAttribute('d', d);
      line.setAttribute('d', d);
      glove.setAttribute('cx', String(round(hand[0])));
      glove.setAttribute('cy', String(round(hand[1])));
      thumb.setAttribute('cx', String(round(hand[0] - handR * 0.6)));
      thumb.setAttribute('cy', String(round(hand[1] - handR * 0.75)));
    });

    // Eyes: lidded when calm, sad lids when worried, wide open with tiny
    // pupils when scared, and a shine on every pupil. A person's face has
    // dark oval eyes; a robot's glow on its screen; googly eyes have no lids
    // and wobble.
    const middle = spec.eyes.reduce((sum, [x]) => sum + x, 0) / spec.eyes.length;
    spec.eyes.forEach(([x, y, size], i) => {
      const [white, pupil, gleam, lid] = eyes[i]!;
      const set = (shape: Element, values: Record<string, number>) => {
        for (const [key, value] of Object.entries(values))
          shape.setAttribute(key, String(round(value)));
      };
      if (spec.dots && !googly && !scared) {
        white.setAttribute('class', styles.ink!);
        set(white, { cx: x, cy: y, rx: size * 0.85, ry: size * 1.2, 'stroke-width': 3 });
        show(pupil, false);
        set(gleam, { cx: x - size * 0.25, cy: y - size * 0.45, r: 1.6 });
        show(gleam, true);
        trace(lid, '');
        return;
      }
      const er = spec.dots ? 7.5 : size;
      const grow = scared ? 1.15 : 1;
      let rx = er * 0.9 * grow;
      let ry = er * 1.12 * grow;
      let px = x + er * 0.28;
      let py = y + er * 0.14;
      let prx = er * (spec.pupil ?? 0.5);
      let pry = prx * 1.12;
      if (googly) {
        rx = er * 1.15;
        ry = rx;
        px = x + er * (i % 2 ? -0.3 : 0.38);
        py = y + er * 0.32;
        prx = er * 0.58;
        pry = prx;
      } else if (scared) {
        px = x;
        py = y;
        prx = er * 0.26;
        pry = prx;
      } else if (spec.slit && !party) {
        px = x + er * 0.25;
        py = y + er * 0.1;
        prx = er * 0.24;
        pry = er * 0.66;
      }
      white.setAttribute('class', spec.screen ? styles.glass! : styles.paper!);
      set(white, { cx: x, cy: y, rx, ry, 'stroke-width': googly ? 3.5 : 3 });
      set(pupil, { cx: px, cy: py, rx: prx, ry: pry });
      set(gleam, { cx: px - prx * 0.3 - 1, cy: py - pry * 0.45, r: Math.max(2, er * 0.17) });
      show(pupil, !spec.screen);
      show(gleam, !spec.screen);
      let d = '';
      if (!scared && !googly && (!party || spec.screen)) {
        const outerLeft = x < middle;
        let yl = y - ry * 0.3;
        let yr = yl;
        if (current.mood === 'worried') {
          const low = y - ry * 0.05;
          const high = y - ry * 0.65;
          yl = outerLeft ? low : high;
          yr = outerLeft ? high : low;
        } else if (current.mood === 'happy' || party) {
          yl = y - ry * 0.55;
          yr = yl;
        }
        const half = (yy: number) => rx * Math.sqrt(Math.max(0, 1 - ((yy - y) / ry) ** 2));
        d = `M${at([x - half(yl), yl])} A${round(rx)} ${round(ry)} 0 0 1 ${at([x + half(yr), yr])} Z`;
      }
      trace(lid, d);
    });

    // Brows: calm, low and level, the front one cocked a little higher;
    // worried, rising inside; scared, arched high; none at a party.
    let browPath = '';
    if (!party && !spec.noBrows) {
      for (const [x, y, size] of spec.eyes.slice(0, 2)) {
        const er = spec.dots ? 6 : size;
        const top = y - (spec.dots ? 9 : er * 1.12 * (scared ? 1.15 : 1));
        const w = er * 0.95;
        const inward = x < middle ? 1 : -1;
        const arch = (lift: number, peak: number, end = lift) =>
          `M${at([x - w, top - lift])} Q${at([x, top - peak])} ${at([x + w, top - end])} `;
        if (spec.eyes.length === 1) {
          browPath = scared
            ? arch(8, 20)
            : current.mood === 'worried'
              ? `M${at([x - w, top - 2])} L${at([x, top - 11])} L${at([x + w, top - 2])}`
              : current.mood === 'happy'
                ? arch(5, 14)
                : arch(3, 8, 7);
        } else if (scared) {
          browPath += arch(8, 18);
        } else if (current.mood === 'worried') {
          browPath += `M${at([x - inward * w, top - 2])} L${at([x + inward * w, top - 11])} `;
        } else if (current.mood === 'happy') {
          browPath += arch(5, 13);
        } else {
          const lift = x < middle ? 0 : 4;
          browPath += arch(2 + lift, 7 + lift, 3 + lift);
        }
      }
    }
    trace(brows, browPath);

    // Mouths: a smirk when calm, a wobble when worried, open with teeth and
    // a tongue when happy or scared, a wide grin at a party. Monsters,
    // sharks and dinosaurs show a row of pointy teeth.
    const [mx, my, mw] = spec.mouth;
    const fangRow = (y0: number, w: number) => {
      const step = (w * 0.8) / 5;
      let d = '';
      for (let i = 0; i < 5; i++) {
        d += `M${at([mx - w * 0.4 + i * step, y0])} l${round(step / 2)} ${round(step * 0.95)} l${round(step / 2)} ${round(-step * 0.95)} Z `;
      }
      return d;
    };
    let mouthPath: string;
    let open = false;
    let tonguePath = '';
    let teethPath = '';
    let fangPath = '';
    if (party || current.mood === 'happy') {
      const w = party ? mw * 1.15 : mw;
      mouthPath = `M${at([mx - w / 2, my])} Q${at([mx, my + w * 0.95])} ${at([mx + w / 2, my])} Z`;
      open = true;
      tonguePath = oval(mx + w * 0.05, my + w * 0.33, w * 0.2, w * 0.1);
      if (spec.teeth) fangPath = fangRow(my + 1, w);
      else {
        teethPath =
          `M${at([mx - w * 0.4, my + 1.5])} L${at([mx + w * 0.4, my + 1.5])} ` +
          `L${at([mx + w * 0.34, my + w * 0.13])} L${at([mx - w * 0.34, my + w * 0.13])} Z`;
      }
    } else if (scared) {
      const rx = mw * 0.3;
      const ry = mw * 0.42;
      const cy = my + mw * 0.18;
      mouthPath = oval(mx, cy, rx, ry);
      open = true;
      tonguePath = oval(mx, cy + ry * 0.48, rx * 0.6, ry * 0.3);
      if (spec.teeth) {
        const step = (rx * 1.4) / 3;
        for (let i = 0; i < 3; i++) {
          fangPath += `M${at([mx - rx * 0.7 + i * step, cy - ry * 0.72])} l${round(step / 2)} ${round(step)} l${round(step / 2)} ${round(-step)} Z `;
        }
      } else {
        teethPath =
          `M${at([mx - rx * 0.78, cy - ry * 0.6])} Q${at([mx, cy - ry * 0.95])} ${at([mx + rx * 0.78, cy - ry * 0.6])} ` +
          `L${at([mx + rx * 0.72, cy - ry * 0.4])} Q${at([mx, cy - ry * 0.62])} ${at([mx - rx * 0.72, cy - ry * 0.4])} Z`;
      }
    } else if (current.mood === 'worried') {
      mouthPath =
        `M${at([mx - mw / 2, my + 3])} Q${at([mx - mw / 4, my - 4])} ${at([mx, my + 2])} ` +
        `Q${at([mx + mw / 4, my + 7])} ${at([mx + mw / 2, my])}`;
      if (spec.tooth) fangPath = `M${at([mx - 4, my + 3])} h8 v8 h-8 Z`;
    } else if (spec.teeth) {
      // A toothy grin.
      mouthPath = `M${at([mx - mw / 2, my])} Q${at([mx, my + mw * 0.32])} ${at([mx + mw / 2, my - mw * 0.06])}`;
      fangPath = fangRow(my + mw * 0.1, mw);
    } else {
      // A sideways smirk, its front corner up.
      mouthPath = `M${at([mx - mw / 2, my + 1])} Q${at([mx + mw * 0.05, my + mw * 0.3])} ${at([mx + mw / 2, my - mw * 0.15])}`;
      if (spec.tooth) fangPath = `M${at([mx - 4, my + mw * 0.12])} h8 v9 h-8 Z`;
    }
    if (spec.screen) {
      tonguePath = '';
      teethPath = '';
      fangPath = '';
    }
    trace(mouth, mouthPath);
    mouth.setAttribute(
      'class',
      spec.screen ? (open ? styles.glow! : styles.glassLine!) : open ? styles.ink! : styles.line!,
    );
    trace(tongue, tonguePath);
    trace(teeth, teethPath);
    trace(fangs, fangPath);

    // Shades at a party, with a glint, bridged over the nose.
    let shadesPath = '';
    let glintPath = '';
    let bridgePath = '';
    if (party && !spec.screen) {
      const ends: [number, number, number][] = [];
      for (const [x, y, size] of spec.eyes.slice(0, 2)) {
        const er = spec.dots ? 7.5 : size;
        const w = spec.eyes.length === 1 ? er * 1.9 : er * 1.2;
        shadesPath +=
          `M${at([x - w, y - er * 0.7])} H${round(x + w)} L${at([x + w * 0.86, y + er * 0.5])} ` +
          `Q${at([x, y + er * 0.95])} ${at([x - w * 0.86, y + er * 0.5])} Z `;
        glintPath += `M${at([x - w * 0.45, y - er * 0.1])} L${at([x - w * 0.05, y - er * 0.5])} `;
        ends.push([x - w, x + w, y - er * 0.45]);
      }
      const [one, two] = ends;
      if (one && two) {
        bridgePath = `M${at([one[1], one[2]])} Q${at([(one[1] + two[0]) / 2, one[2] - 6])} ${at([two[0], two[2]])}`;
      }
    }
    trace(shades, shadesPath);
    trace(glint, glintPath);
    trace(bridge, bridgePath);

    const sweating = current.sweat || scared;
    trace(
      sweat,
      sweating
        ? spec.sweat
            .map(
              ([x, y]) =>
                `M${x} ${y} Q${x + 8} ${y + 13} ${x} ${y + 18} Q${x - 8} ${y + 13} ${x} ${y} Z`,
            )
            .join(' ')
        : '',
    );

    const tilt = current.pose === 'pull' ? LEAN : current.bend;
    for (const g of leaning) g.setAttribute('transform', `rotate(${tilt} ${hipX} ${hipY})`);
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
    shoes: [backFoot, frontFoot],
    props,
    light: own.querySelector<SVGElement>('[data-part="light"]'),
    wisps: [...own.querySelectorAll<SVGElement>('[data-part="wisps"]')],
    tentacles:
      kind === 'octopus'
        ? TENTACLES.map((_, i) => [...own.querySelectorAll<SVGElement>(`[data-tentacle="${i}"]`)])
        : [],
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
      if (next === current.mood) return;
      current = { ...current, mood: next };
      update();
    },
    setPose(next) {
      if (next === current.pose) return;
      current = { ...current, pose: next };
      update();
    },
    setSweat(on) {
      if (on === current.sweat) return;
      current = { ...current, sweat: on };
      update();
    },
    setTrophy(on) {
      if (on === current.trophy) return;
      current = { ...current, trophy: on };
      update();
    },
  };
}
