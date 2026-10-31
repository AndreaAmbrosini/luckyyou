// Each track's postcard on the Line-up, from the Design canvas: its world in
// 120 by 46, sky, backdrop and ground; Christmas's, a tree on snow at dusk. Every colour comes from a class in
// the-race.module.css; a layer without an outline has a stroke width of 0.

import { drawing, type Shape } from './parts';
import type { Course } from './plan';
import styles from './the-race.module.css';

const R = (x: number, y: number, w: number, h: number) => `M${x} ${y} h${w} v${h} h${-w} Z `;
const E = (cx: number, cy: number, rx: number, ry: number) =>
  `M${cx - rx} ${cy} a${rx} ${ry} 0 1 0 ${2 * rx} 0 a${rx} ${ry} 0 1 0 ${-2 * rx} 0 Z `;
const O = (cx: number, cy: number, r: number) => E(cx, cy, r, r);
const T = (a: number, b: number, c: number, d: number, e: number, f: number) =>
  `M${a} ${b} L${c} ${d} L${e} ${f} Z `;
/** A four-pointed star. */
function S(x: number, y: number, r: number) {
  const q = Math.round((r / 3) * 10) / 10;
  return (
    `M${x} ${y - r} L${x + q} ${y - q} L${x + r} ${y} L${x + q} ${y + q} ` +
    `L${x} ${y + r} L${x - q} ${y + q} L${x - r} ${y} L${x - q} ${y - q} Z `
  );
}
/** One layer: a path in one class, its outline `width` wide. */
const L = (d: string, className: string, width = 0): Shape => [
  'path',
  className,
  { d, 'stroke-width': width },
];

const POSTCARDS: Readonly<Record<Course, readonly Shape[]>> = {
  field: [
    L(R(0, 0, 120, 46), styles.skyFill!),
    L('M10 14 a5 5 0 0 1 0 -10 h22 a5 5 0 0 1 0 10 Z', styles.paperFill!),
    L('M-2 4 Q30 16 62 4 Q94 16 124 4', styles.line!, 2),
    L(
      T(10, 6, 18, 8, 14, 15) + T(42, 8, 50, 6, 46, 15) + T(86, 8, 94, 7, 90, 15),
      styles.tomato!,
      1.5,
    ),
    L(
      T(26, 9, 34, 9, 30, 17) + T(70, 8, 78, 9, 74, 16) + T(104, 7, 112, 6, 108, 14),
      styles.sun!,
      1.5,
    ),
    L(R(-2, 30, 124, 18), styles.mint!, 2),
    L(R(-2, 24, 124, 5), styles.paper!, 1.5),
    L(R(-2, 38, 124, 2), styles.paperFill!),
  ],
  office: [
    L(R(0, 0, 120, 46), styles.paperFill!),
    L(R(8, 4, 40, 15) + R(72, 4, 40, 15), styles.glass!, 2),
    L('M28 4 V19 M8 11.5 H48 M92 4 V19 M72 11.5 H112', styles.line!, 1.5),
    L(O(60, 11, 6), styles.paper!, 1.5),
    L(R(-2, 21, 124, 10), styles.mintSoft!, 2),
    L(R(-2, 31, 124, 17), styles.shark!, 2),
    L(R(-2, 38, 124, 2.5), styles.sunFill!),
    L(R(30, 23, 6, 6), styles.sun!, 1),
  ],
  sea: [
    L(R(0, 0, 120, 46), styles.seaBlue!),
    L(
      'M-2 -2 H122 V5 Q112 9 102 5 T82 5 T62 5 T42 5 T22 5 T2 5 T-18 5 V-2 Z',
      styles.skyBlue!,
      1.5,
    ),
    L('M18 16 l8 -4 v8 Z M26 16 q7 -6 14 0 q-7 6 -14 0 Z', styles.orange!, 1.5),
    L(O(72, 15, 3) + O(78, 9, 2), styles.glass!, 1.2),
    L('M-2 26 H122', styles.line!, 1.5),
    L(O(10, 26, 3.5) + O(50, 26, 3.5) + O(90, 26, 3.5), styles.tomato!, 1.5),
    L(R(-2, 31, 124, 17), styles.sun!, 2),
    L(R(-2, 38, 124, 2.5), styles.orangeFill!),
  ],
  moon: [
    L(R(0, 0, 120, 46), styles.inkFill!),
    L(S(12, 8, 3) + S(46, 18, 2.5) + S(68, 6, 3) + S(84, 22, 2.5) + S(58, 24, 2), styles.sunFill!),
    L(O(28, 13, 5), styles.planet!, 1.5),
    L(E(28, 13, 10, 2.5), styles.ring!, 1.5),
    L(O(98, 13, 8), styles.earth!, 1.5),
    L(R(-2, 30, 124, 18), styles.shark!, 2),
    L(E(40, 40, 8, 2.5) + E(90, 36, 6, 2), styles.inkSoft!, 1.2),
    L(
      R(4, 37, 10, 2) + R(28, 37, 10, 2) + R(52, 37, 10, 2) + R(76, 37, 10, 2) + R(100, 37, 10, 2),
      styles.paperFill!,
    ),
  ],
  christmas: [
    L(R(0, 0, 120, 46), styles.seaBlue!),
    L(
      O(10, 6, 1.6) +
        O(30, 14, 1.6) +
        O(58, 5, 1.6) +
        O(72, 18, 1.6) +
        O(110, 6, 1.6) +
        O(50, 22, 1.6),
      styles.paperFill!,
    ),
    L(R(78, 18, 22, 13), styles.tomato!, 1.5),
    L(T(75, 19, 103, 19, 89, 10), styles.paper!, 1.5),
    L(R(85, 22, 8, 6), styles.sun!, 1),
    L(T(22, 31, 46, 31, 34, 17) + T(25, 22, 43, 22, 34, 8), styles.leaf!, 1.5),
    L(S(34, 7, 4), styles.sun!, 1),
    L(R(-2, 30, 124, 18), styles.snow!, 2),
  ],
};

/** `course`'s postcard, filling its box and cut to it. */
export function postcard(course: Course): SVGSVGElement {
  const svg = drawing(120, 46, POSTCARDS[course]);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  svg.dataset.part = 'postcard';
  svg.dataset.course = course;
  return svg;
}
