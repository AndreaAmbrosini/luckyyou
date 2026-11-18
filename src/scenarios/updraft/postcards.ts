// The four drop zones: each one's postcard on the Line-up, 120 by 46, and its
// scenery on the stage, 1280 by 260 with the ground's surface on y = 120.
// A layer without an outline has a stroke width of 0.

import { drawing, GROUND_HEIGHT, SURFACE, type Shape } from './parts';
import styles from './updraft.module.css';

export const DROP_ZONES = ['meadow', 'rooftop', 'pier', 'crater'] as const;
export type DropZone = (typeof DROP_ZONES)[number];

/** Each drop zone's sky and floor, as colours from tokens.css, and the jumpers that suit it. */
export const THEMES: readonly {
  name: DropZone;
  label: string;
  ground: { sky: string; floor: string };
  suits: readonly string[];
}[] = [
  {
    name: 'meadow',
    label: 'Sunny meadow',
    ground: { sky: 'sky', floor: 'mint' },
    suits: ['chute', 'umbrella', 'dandelion', 'bedsheet', 'kite', 'balloons'],
  },
  {
    name: 'rooftop',
    label: 'Office roof',
    ground: { sky: 'mint-soft', floor: 'shark' },
    suits: ['coat', 'umbrella', 'pizza', 'newspaper', 'kite', 'chute'],
  },
  {
    name: 'pier',
    label: 'Windy pier',
    ground: { sky: 'sea', floor: 'sun' },
    suits: ['parasol', 'towel', 'gulls', 'flamingo', 'kite', 'balloons'],
  },
  {
    name: 'crater',
    label: 'Moon crater',
    ground: { sky: 'shark', floor: 'paper' },
    suits: ['saucer', 'chute', 'balloons', 'pizza', 'flamingo', 'bedsheet'],
  },
];

const R = (x: number, y: number, w: number, h: number) => `M${x} ${y} h${w} v${h} h${-w} Z `;
const E = (cx: number, cy: number, rx: number, ry: number) =>
  `M${cx - rx} ${cy} a${rx} ${ry} 0 1 0 ${2 * rx} 0 a${rx} ${ry} 0 1 0 ${-2 * rx} 0 Z `;
const O = (cx: number, cy: number, r: number) => E(cx, cy, r, r);
const T = (a: number, b: number, c: number, d: number, e: number, f: number) =>
  `M${a} ${b} L${c} ${d} L${e} ${f} Z `;
/** One layer: a path in one class, its outline `width` wide. */
const L = (d: string, className: string, width = 0): Shape => [
  'path',
  className,
  { d, 'stroke-width': width },
];

const POSTCARDS: Record<(typeof DROP_ZONES)[number], readonly Shape[]> = {
  meadow: [
    L(R(0, 0, 120, 46), styles.skyFill!),
    L(O(98, 11, 6), styles.sun!, 1.5),
    L('M10 14 a5 5 0 0 1 0 -10 h22 a5 5 0 0 1 0 10 Z', styles.paperFill!),
    L('M-2 32 Q20 16 46 30 T96 28 T124 30 V40 H-2 Z', styles.mintSoft!, 1.5),
    L(R(-2, 34, 124, 14), styles.mint!, 2),
    L('M44 8 Q60 -2 76 8 Q68 6 60 8 Q52 6 44 8 Z', styles.tomato!, 1.5),
    L('M46 9 L58 26 M74 9 L62 26 M60 8 V26', styles.line!, 1.2),
    L(O(60, 29, 3.5), styles.skin!, 1),
  ],
  rooftop: [
    L(R(0, 0, 120, 46), styles.mintSoft!),
    L(
      R(6, 12, 14, 24) + R(24, 6, 16, 30) + R(84, 10, 12, 26) + R(100, 14, 16, 22),
      styles.soft!,
      1.5,
    ),
    L(
      R(10, 16, 3, 3) +
        R(10, 24, 3, 3) +
        R(29, 12, 3, 3) +
        R(29, 20, 3, 3) +
        R(88, 16, 3, 3) +
        R(104, 20, 3, 3),
      styles.sun!,
    ),
    L(R(-2, 33, 124, 15), styles.shark!, 2),
    L(R(-2, 30, 124, 4), styles.paper!, 1.5),
    L('M46 12 Q60 2 74 12 Q60 8 46 12 Z', styles.sea!, 1.5),
    L('M60 12 V28', styles.line!, 1.5),
  ],
  pier: [
    L(R(0, 0, 120, 46), styles.seaFill!),
    L(O(24, 22, 8), styles.sun!, 1.5),
    L(
      'M0 20 q6 -4 12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0',
      styles.paperLine!,
      1.5,
    ),
    L(R(-2, 30, 124, 18), styles.sun!, 2),
    L('M16 30 V46 M40 30 V46 M64 30 V46 M88 30 V46 M112 30 V46', styles.line!, 1.5),
    L(R(10, 22, 5, 10) + R(100, 22, 5, 10), styles.bark!, 1.5),
    L('M64 8 q6 -6 12 0 q6 -6 12 0', styles.paperLine!, 2),
  ],
  crater: [
    L(R(0, 0, 120, 46), styles.shark!),
    L(
      T(10, 6, 12, 10, 8, 10) +
        T(34, 14, 36, 18, 32, 18) +
        T(70, 6, 72, 10, 68, 10) +
        T(52, 16, 54, 20, 50, 20),
      styles.sun!,
      1,
    ),
    L(O(96, 14, 9), styles.sea!, 1.5),
    L('M91 12 Q97 8 99 14 Q94 18 91 12 Z', styles.mint!),
    L('M-2 34 Q30 26 60 32 T124 32 V48 H-2 Z', styles.paper!, 2),
    L(E(30, 40, 10, 3) + E(86, 38, 8, 2.5), styles.softLine!, 1.5),
    L('M50 33 V14', styles.line!, 1.5),
    L('M50 14 L64 18 L50 22 Z', styles.tomato!, 1),
  ],
};

export function postcard(zone: DropZone): SVGElement {
  return drawing(120, 46, POSTCARDS[zone]);
}

/** A row of `count` shapes made by `make`, `step` apart from `from`. */
const row = (from: number, step: number, count: number, make: (x: number, k: number) => string) =>
  Array.from({ length: count }, (_, k) => make(from + step * k, k)).join(' ');

const FLOOR = SURFACE;
const SCENERY: Record<DropZone, readonly Shape[]> = {
  meadow: [
    L('M-2 120 Q150 30 330 96 T700 92 T1040 84 T1284 104 V120 Z', styles.mintSoft!, 3),
    L(R(100, 70, 14, 52), styles.bark!, 3),
    L(O(107, 56, 38), styles.mint!, 3),
    L(R(1130, 74, 12, 48), styles.bark!, 3),
    L(O(1136, 60, 32), styles.mint!, 3),
    L(R(-2, FLOOR, 1284, GROUND_HEIGHT - FLOOR), styles.mint!, 4),
    L(
      row(60, 150, 9, (x) => `M${x} 150 v-14`),
      styles.line!,
      3,
    ),
    L(
      row(60, 150, 9, (x) => O(x, 132, 7)),
      styles.tomato!,
      2,
    ),
    L(
      row(135, 150, 8, (x) => O(x, 190, 7)),
      styles.sun!,
      2,
    ),
    L(R(-2, 150, 1284, 6), styles.paperFill!),
  ],
  rooftop: [
    L(
      R(40, 40, 120, 82) +
        R(190, 12, 90, 110) +
        R(320, 56, 110, 66) +
        R(760, 30, 130, 92) +
        R(930, 60, 100, 62) +
        R(1060, 8, 120, 114),
      styles.soft!,
      3,
    ),
    L(
      row(58, 36, 3, (x) => R(x, 56, 14, 14) + R(x, 90, 14, 14)) +
        row(206, 28, 3, (x) => R(x, 28, 12, 12) + R(x, 60, 12, 12) + R(x, 92, 12, 12)) +
        row(780, 36, 3, (x) => R(x, 46, 14, 14) + R(x, 80, 14, 14)),
      styles.sun!,
    ),
    L(R(560, 52, 90, 50), styles.bark!, 3),
    L('M570 102 V122 M640 102 V122', styles.line!, 4),
    L('M560 52 L605 28 L650 52 Z', styles.shark!, 3),
    L(R(-2, FLOOR, 1284, GROUND_HEIGHT - FLOOR), styles.shark!, 4),
    L(R(-2, FLOOR - 4, 1284, 16), styles.paper!, 3),
    L(
      row(80, 160, 8, (x) => `M${x} 150 h60`),
      styles.paperLine!,
      4,
    ),
  ],
  pier: [
    L(R(-2, 78, 1284, 44), styles.seaFill!),
    L(
      row(0, 120, 11, (x) => `M${x} 92 q15 -10 30 0 t30 0`),
      styles.paperLine!,
      4,
    ),
    L(
      row(20, 150, 9, (x) => `M${x} 108 q15 -10 30 0 t30 0`),
      styles.paperLine!,
      3,
    ),
    L(T(1090, 120, 1170, 120, 1150, 20) + T(1090, 120, 1110, 20, 1150, 20), styles.paper!, 3),
    L(R(1108, 52, 40, 18) + R(1100, 86, 54, 18), styles.tomato!, 2),
    L(R(1104, 8, 52, 14), styles.sun!, 3),
    L(R(-2, FLOOR, 1284, GROUND_HEIGHT - FLOOR), styles.sun!, 4),
    L(
      row(40, 80, 17, (x) => `M${x} ${FLOOR} V${GROUND_HEIGHT}`),
      styles.line!,
      3,
    ),
    L(R(40, 90, 14, 50) + R(600, 90, 14, 50), styles.bark!, 3),
  ],
  crater: [
    L(O(1020, 50, 52), styles.sea!, 4),
    L(
      'M990 30 Q1010 14 1030 26 Q1012 46 990 30 Z M1010 66 Q1040 56 1050 76 Q1030 90 1010 66 Z',
      styles.mint!,
      2,
    ),
    L('M-2 120 Q200 84 420 112 T820 108 T1284 114 V130 H-2 Z', styles.paper!, 4),
    L(R(-2, FLOOR + 6, 1284, GROUND_HEIGHT - FLOOR), styles.paper!, 4),
    L(E(260, 170, 60, 14) + E(760, 190, 80, 18) + E(1100, 160, 46, 11), styles.softLine!, 4),
    L('M200 118 V20', styles.line!, 4),
    L('M200 20 L270 40 L200 62 Z', styles.tomato!, 3),
  ],
};

/** A drop zone's ground: the scenery, and the floor down to the bottom. */
export function scenery(zone: DropZone): SVGElement {
  const svg = drawing(1280, GROUND_HEIGHT, SCENERY[zone]);
  svg.setAttribute('preserveAspectRatio', 'none');
  return svg;
}

export function isDropZone(name: string | null): name is DropZone {
  return DROP_ZONES.some((zone) => zone === name);
}
