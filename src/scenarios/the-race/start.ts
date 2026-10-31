// The race's start on the Line-up (decision 0016), from the Design canvas:
// everyone waiting at the start line, a lane each, noses on the line, on the
// theme's track with a short version of its backdrop in a band above the
// lanes. The chosen person's lane and name tag are sun, and they wave. Every
// colour comes from a class in the-race.module.css; a layer without an
// outline has a stroke width of 0.

import { nameTag, START, type LineUpStart, type StartPerson } from '../../scenario-kit';
import { boxAt, startLane, START_TRACK, tagAt, tagSize } from './layout';
import { drawing, group, RACER, type Kind, type Pose, type Runner, type Shape } from './parts';
import { COURSES, type Course } from './plan';
import styles from './the-race.module.css';
import type { Mood } from '../../scenario-kit';

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
  { d, 'stroke-width': width, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' },
];

/** Each track's backdrop in the band above the lanes, 64 px tall. */
const BANDS: Readonly<Record<Course, () => Shape[]>> = {
  field() {
    let bunting = 'M-10 6';
    const flags = ['', '', '', ''];
    let n = 0;
    for (let x = -10; x < 1200; x += 300) {
      bunting += ` Q${x + 150} 34 ${x + 300} 6`;
      for (const t of [0.2, 0.4, 0.6, 0.8]) {
        const fx = Math.round(x + 300 * t);
        const fy = Math.round(6 * (1 - t) * (1 - t) + 2 * (1 - t) * t * 34 + 6 * t * t);
        flags[n % 4] += T(fx - 9, fy, fx + 9, fy, fx, fy + 18);
        n++;
      }
    }
    let rail = R(-10, 40, 1214, 10);
    for (let x = 30; x < 1194; x += 160) rail += R(x, 50, 10, 12);
    return [
      L(
        'M70 32 a12 12 0 0 1 0 -24 h70 a12 12 0 0 1 0 24 Z M830 30 a10 10 0 0 1 0 -20 h50 a10 10 0 0 1 0 20 Z',
        styles.paperFill!,
      ),
      L(bunting, styles.line!, 3),
      L(flags[0]!, styles.tomato!, 3),
      L(flags[1]!, styles.sun!, 3),
      L(flags[2]!, styles.grape!, 3),
      L(flags[3]!, styles.mint!, 3),
      L(rail, styles.paper!, 3),
    ];
  },
  office() {
    let seams = '';
    for (let x = 150; x < 1194; x += 200) seams += `M${x} 44 V62 `;
    return [
      L(R(30, 8, 220, 32) + R(690, 8, 220, 32), styles.glass!, 3),
      L('M140 8 V40 M30 24 H250 M800 8 V40 M690 24 H910', styles.line!, 3),
      L(O(520, 24, 15), styles.paper!, 3),
      L('M520 24 V14 M520 24 L527 28', styles.line!, 3),
      L(R(-10, 44, 1214, 20), styles.mintSoft!, 3),
      L(seams, styles.line!, 3),
      L(R(380, 46, 18, 15) + R(1010, 46, 18, 15), styles.sun!, 2),
    ];
  },
  sea() {
    let wave = 'M-10 -10 H1204 V10';
    for (let x = 1204; x > -50; x -= 40) wave += ` Q${x - 20} 22 ${x - 40} 10`;
    wave += ' V-10 Z';
    let weed = '';
    for (const x of [60, 420, 780, 1120]) {
      weed += `M${x} 62 q-8 -20 2 -36 q8 -14 0 -26 q14 16 4 32 q-6 14 4 30 Z `;
    }
    let floatsTomato = '';
    let floatsPaper = '';
    for (let x = 20, i = 0; x < 1194; x += 100, i++) {
      if (i % 2) floatsPaper += O(x, 54, 8);
      else floatsTomato += O(x, 54, 8);
    }
    return [
      L(wave, styles.skyBlue!, 3),
      L('M150 32 l22 -10 v20 Z M172 32 q18 -16 36 0 q-18 16 -36 0 Z', styles.orange!, 3),
      L('M900 28 l18 -8 v16 Z M918 28 q15 -13 30 0 q-15 13 -30 0 Z', styles.pink!, 3),
      L(O(198, 30, 2.5) + O(940, 26, 2), styles.inkFill!),
      L(O(330, 34, 7) + O(342, 20, 5) + O(600, 40, 6) + O(1000, 46, 6), styles.glass!, 2),
      L(weed, styles.leaf!, 3),
      L('M-10 54 H1204', styles.line!, 3),
      L(floatsTomato, styles.tomato!, 3),
      L(floatsPaper, styles.paper!, 3),
    ];
  },
  moon() {
    const stars = [
      [40, 14],
      [130, 44],
      [330, 10],
      [420, 40],
      [560, 20],
      [680, 48],
      [760, 12],
      [880, 40],
      [980, 16],
      [1170, 46],
    ]
      .map(([x = 0, y = 0]) => S(x, y, 7))
      .join('');
    return [
      L(stars, styles.sunFill!),
      L(O(240, 30, 13), styles.planet!, 3),
      L(E(240, 30, 28, 6), styles.ring!, 4),
      L(O(1100, 30, 22), styles.earth!, 3),
      L('M1084 22 q10 -10 20 0 q-4 10 -16 9 Z M1104 38 q12 -4 16 6 q-8 8 -18 3 Z', styles.leaf!, 2),
      L(
        E(150, 150, 30, 8) +
          E(520, 300, 38, 10) +
          E(900, 210, 28, 7) +
          E(300, 400, 34, 9) +
          E(1100, 380, 40, 10),
        styles.inkSoft!,
        3,
      ),
    ];
  },
};

/** Each track's ground and the lines between its lanes, whole or dashed. */
const GROUNDS: Readonly<Record<Course, { ground: string; lines: string; dashed: boolean }>> = {
  field: { ground: styles.grass!, lines: styles.paperFill!, dashed: false },
  office: { ground: styles.carpet!, lines: styles.sunFill!, dashed: false },
  sea: { ground: styles.sun!, lines: styles.orangeFill!, dashed: false },
  moon: { ground: styles.shark!, lines: styles.paperFill!, dashed: true },
};

/** Draws one racer in their look, as the Line-up does, with a mood and a pose. */
export type DrawRacer = (person: StartPerson, mood: Mood, pose: Pose) => Runner;

/** The race's start in `theme`, everyone in their look, in today's order from the back. */
export function startLine(
  { people, theme }: { readonly people: readonly StartPerson[]; readonly theme: string | null },
  drawRacer: DrawRacer,
): LineUpStart {
  const course = COURSES.find((each) => each === theme) ?? 'field';
  const count = people.length;
  const lanes = people.map((_, index) => startLane(index, count));
  const { nose: NOSE, line: LINE } = START_TRACK;

  const el = document.createElement('div');
  el.className = `${styles.startScene} ${styles[course]}`;
  el.dataset.part = 'start';
  el.dataset.course = course;

  // The ground, the backdrop band over its top, the lines between lanes,
  // the chosen lane, and the chequered start line.
  const { ground, lines, dashed } = GROUNDS[course];
  let between = '';
  for (const { top } of lanes.slice(1)) {
    if (dashed) for (let x = -10; x < START.width + 10; x += 60) between += R(x, top - 3, 32, 6);
    else between += R(-10, top - 3, START.width + 20, 6);
  }
  const chosen = lanes.find((_, index) => people[index]!.chosen);
  let ink = '';
  let paper = '';
  for (let row = 0, y = START_TRACK.top; y < START.height; y += 6, row++) {
    for (let column = 0; column < 2; column++) {
      if ((row + column) % 2) paper += R(LINE + column * 6, y, 6, 6);
      else ink += R(LINE + column * 6, y, 6, 6);
    }
  }
  const scene = el.appendChild(
    drawing(START.width, START.height, [
      L(R(-10, START_TRACK.top - 2, START.width + 20, 400), ground, 4),
    ]),
  );
  group(scene, 'band', BANDS[course]());
  group(scene, 'lines', [L(between || 'M0 0', lines)]);
  if (chosen) {
    group(scene, 'chosen', [L(R(0, chosen.top + 3, LINE, chosen.pitch - 6), styles.sun!, 3)]);
  }
  group(scene, 'start-line', [L(ink, styles.inkFill!), L(paper, styles.paperFill!)]);
  scene.classList.add(styles.full!);

  const sign = el.appendChild(document.createElement('p'));
  sign.className = styles.startSign!;
  sign.textContent = 'Start';
  // Ending just short of the panel, over the start line.
  sign.style.right = `${START.panel + 8}px`;

  // Back lane first, so each lane in front is drawn over the one behind.
  const places = people.map((person, index) => {
    const at = lanes[index]!;
    const runner = drawRacer(
      person,
      person.chosen ? 'happy' : 'calm',
      person.chosen ? 'wave' : 'hold',
    );
    const kind = runner.look.mount as Kind;
    const box = boxAt(kind, at, NOSE);
    const racer = el.appendChild(runner.el);
    racer.classList.add(styles.startRacer!);
    racer.dataset.person = person.name;
    racer.style.left = `${box.left}px`;
    racer.style.top = `${box.top}px`;
    racer.style.width = `${RACER.width * at.k}px`;
    racer.style.height = `${RACER.height * at.k}px`;
    return {
      box: { left: 104, top: at.top, width: LINE - 104, height: at.pitch },
      drawing: racer,
      tag: { kind, at },
    };
  });

  // Name tags over every racer, beside each face.
  people.forEach((person, index) => {
    const { kind, at } = places[index]!.tag;
    const tag = el.appendChild(nameTag(person.name, tagSize(at.k)));
    tag.classList.add(styles.tag!);
    if (person.chosen) tag.classList.add(styles.chosenTag!);
    tag.dataset.person = person.name;
    const { right, middle } = tagAt(kind, at, NOSE);
    tag.style.translate = `calc(${right}px - 100%) calc(${middle}px - 50%)`;
  });

  return { el, places: places.map(({ box, drawing: racer }) => ({ box, drawing: racer })) };
}
