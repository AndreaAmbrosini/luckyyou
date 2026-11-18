// The Claw's drawings, ported shape by shape from the Design canvas: the
// stall with its awning, rail, shelf and riser; the prize chute and its door;
// the "Out of reach" sign, the "At risk" plaque and the logo; the trolley and
// its cable; the claw in every pose; and the plush everyone is, built round
// the kit's head. Every colour comes from a class in the-claw.module.css.

import { head, stagePx, type Colour, type Head, type Look, type Mood } from '../../scenario-kit';
import { POSE, shelfSeats, shelfPitch, type ClawState, type Marks } from './layout';
import styles from './the-claw.module.css';

type Shape = readonly [tag: string, className: string, attributes: Record<string, string | number>];

const SVG = 'http://www.w3.org/2000/svg';

function draw(parent: Element, shapes: readonly Shape[]): SVGElement[] {
  return shapes.map(([tag, className, attributes]) => {
    const shape = parent.appendChild(document.createElementNS(SVG, tag)) as SVGElement;
    shape.setAttribute('class', className);
    for (const [key, value] of Object.entries(attributes)) shape.setAttribute(key, String(value));
    return shape;
  });
}

/** An SVG of `shapes` with `viewBox`. */
function drawing(viewBox: string, shapes: readonly Shape[] = []): SVGSVGElement {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('aria-hidden', 'true');
  draw(svg, shapes);
  return svg;
}

function group(parent: Element, name: string, shapes: readonly Shape[] = []): SVGGElement {
  const g = parent.appendChild(document.createElementNS(SVG, 'g'));
  g.dataset.part = name;
  draw(g, shapes);
  return g;
}

const part = (className: string, name?: string) => {
  const element = document.createElement('div');
  element.className = className;
  if (name) element.dataset.part = name;
  return element;
};

/** Shows `el` when `on`, hides it otherwise; writes only on a change. */
function show(el: Element, on: boolean) {
  const shown = !el.hasAttribute('display');
  if (shown === on) return;
  if (on) el.removeAttribute('display');
  else el.setAttribute('display', 'none');
}

/** Sets `el`'s attribute `name` to `value` when it changes. */
function set(el: Element, name: string, value: string) {
  if (el.getAttribute(name) !== value) el.setAttribute(name, value);
}

/** Display text the canvas sets smaller than the caption's size: the caption's size, drawn scaled. */
function smallDisplay(text: string, size: number, name?: string): HTMLElement {
  const words = part(styles.display!, name);
  words.textContent = text;
  words.style.scale = String(size / stagePx('--size-stage-caption'));
  return words;
}

/** The awning's 16 stripes, 80 wide from x 0, every other one in `odd`. */
function awning(odd: boolean): string {
  let d = '';
  for (let i = odd ? 1 : 0; i < 16; i += 2) {
    const x = i * 80;
    d += `M${x} -6 H${x + 80} V92 A40 22 0 0 1 ${x} 92 Z `;
  }
  return d.trim();
}

/** The steps the pile's back rows sit on: none in one row, one step in two, two in three. */
function riser(people: number): string | null {
  if (people <= 4) return null;
  return people <= 8 ? 'M18 554 H640 V664 H18 Z' : 'M18 472 H640 V664 H18 Z M18 568 H640';
}

/**
 * The shelf unit for `people`: an upright at x 872 from the first board to
 * the floor, a board for each tier up to the highest anyone sits on (always
 * the first), and from the third tier up a second upright at x 1000, the
 * boards over the two columns away from the chute only.
 */
export function shelfBoards(people: number): { tiers: number; d: string } {
  const pitch = shelfPitch(people);
  const tiers = Math.max(1, shelfSeats(people)[0]!.tier);
  const first = 664 - pitch;
  let d = `M872 ${first} H884 V664 H872 Z `;
  if (tiers >= 2) d += `M1000 ${664 - tiers * pitch} H1012 V${first} H1000 Z `;
  for (let k = 1; k <= tiers; k++) {
    const left = k <= 1 ? 872 : 1000;
    const top = 664 - k * pitch;
    d += `M${left} ${top} H1264 V${top + 11} H${left} Z `;
  }
  return { tiers, d: d.trim() };
}

/**
 * The stall for `people`, behind everything: the glass, the posts, the
 * riser, the shelf, the hangers and the sign's strings, the rail and its
 * stop, the awning, the base, and the chute's rim and mouth.
 */
export function machine(people: number): HTMLElement {
  const scene = part(styles.scene!, 'scene');
  const back = drawing('0 0 1280 720');
  back.setAttribute('class', styles.layer!);
  back.dataset.part = 'machine';
  const steps = riser(people);
  draw(back, [
    ['rect', styles.grape!, { x: -4, y: 90, width: 22, height: 580, 'stroke-width': 4 }],
    ['rect', styles.grape!, { x: 1262, y: 90, width: 22, height: 580, 'stroke-width': 4 }],
    ...(steps ? [['path', styles.sky!, { d: steps, 'stroke-width': 4 }] as Shape] : []),
    ['path', styles.bark!, { d: shelfBoards(people).d, 'stroke-width': 4 }],
    [
      'path',
      styles.line!,
      {
        d: 'M120 106 V130 M440 106 V130 M819 106 V120 M968 106 V136 M1192 106 V136',
        'stroke-width': 5,
      },
    ],
    ['rect', styles.tint!, { x: 14, y: 127, width: 800, height: 13, rx: 4, 'stroke-width': 4 }],
    ['rect', styles.tomato!, { x: 806, y: 116, width: 26, height: 36, rx: 7, 'stroke-width': 4 }],
    ['path', styles.tomato!, { d: awning(false), 'stroke-width': 4 }],
    ['path', styles.paper!, { d: awning(true), 'stroke-width': 4 }],
    ['rect', styles.grape!, { x: -4, y: 664, width: 1288, height: 60, 'stroke-width': 4 }],
    ['ellipse', styles.orange!, { cx: 730, cy: 506, rx: 66, ry: 18, 'stroke-width': 5 }],
    ['ellipse', styles.ink!, { cx: 730, cy: 509, rx: 52, ry: 11 }],
  ]);
  scene.append(back);
  return scene;
}

/** The sign over the shelf, at SIGN. */
export const SIGN = { left: 930, top: 132, width: 300, height: 52 } as const;
export const SIGN_WORDS = 'Out of reach';

/** The paper sign over the shelf, "Out of reach"; data-part="sign". */
export function sign(): HTMLElement {
  const el = part(styles.sign!, 'sign');
  el.append(smallDisplay(SIGN_WORDS, 34));
  return el;
}

export interface Chute {
  /** Its front wall, plate and door, in front of whoever falls in; data-part="chute". */
  readonly el: HTMLElement;
  /** Opens or shuts the door. */
  door(open: boolean): void;
  /** Moves it `dx` px sideways, as it rumbles. */
  rumble(dx: number): void;
}

/** The prize chute's front: the sun bin with "PRIZE" on it, and its door. */
export function chute(): Chute {
  const el = part(styles.layer!, 'chute');
  const front = drawing('0 0 1280 720', [
    [
      'path',
      styles.sun!,
      { d: 'M664 506 A66 18 0 0 0 796 506 L788 664 H672 Z', 'stroke-width': 5 },
    ],
    ['rect', styles.paper!, { x: 684, y: 536, width: 92, height: 40, rx: 9, 'stroke-width': 3 }],
  ]);
  front.setAttribute('class', styles.layer!);
  const shut = group(front, 'door-shut', [
    ['rect', styles.tint!, { x: 686, y: 588, width: 88, height: 72, rx: 10, 'stroke-width': 4 }],
    ['path', styles.line!, { d: 'M688 603 H772', 'stroke-width': 4 }],
    ['circle', styles.ink!, { cx: 730, cy: 640, r: 6 }],
  ]);
  const open = group(front, 'door-open', [
    ['rect', styles.ink!, { x: 686, y: 588, width: 88, height: 76, rx: 10 }],
    ['path', styles.tint!, { d: 'M682 590 H778 L770 570 H690 Z', 'stroke-width': 4 }],
  ]);
  el.append(front);
  const plate = el.appendChild(part(styles.plate!));
  plate.append(smallDisplay('PRIZE', 28));
  let opened: boolean | null = null;
  let moved = 0;
  return {
    el,
    door(on) {
      if (on === opened) return;
      opened = on;
      el.dataset.door = on ? 'open' : 'shut';
      show(shut, !on);
      show(open, on);
    },
    rumble(dx) {
      const rounded = Math.round(dx * 10) / 10;
      if (rounded === moved) return;
      moved = rounded;
      el.style.translate = rounded === 0 ? '' : `${rounded}px 0`;
    },
  };
}

export interface Plaque {
  /** data-part="plaque", the words in data-part="at-risk". */
  readonly el: HTMLElement;
  /** "At risk: `count`". */
  count(count: number): void;
  /** "Winner!". */
  win(): void;
}

/** The plaque's words before the count, and at the end. */
export const AT_RISK = 'At risk:';
export const WINNER = 'Winner!';

/** The sun plaque on the base, counting everyone not yet on the shelf. */
export function plaque(): Plaque {
  const el = part(styles.plaque!, 'plaque');
  const words = el.appendChild(smallDisplay('', 34, 'at-risk'));
  const say = (text: string) => {
    if (words.textContent !== text) words.textContent = text;
  };
  return { el, count: (count) => say(`${AT_RISK} ${count}`), win: () => say(WINNER) };
}

/** The app's logo beside the plaque: the star and "LuckyYou" on an ink plate. */
export function logo(): HTMLElement {
  const el = part(styles.logo!, 'logo');
  const star = drawing('0 0 40 40', [
    [
      'path',
      styles.sunFill!,
      {
        d: 'M20 2 L25.3 13.6 L38 15.2 L28.6 23.9 L31.1 36.4 L20 30.2 L8.9 36.4 L11.4 23.9 L2 15.2 L14.7 13.6 Z',
      },
    ],
  ]);
  star.setAttribute('class', styles.star!);
  el.style.scale = String(34 / stagePx('--size-stage-caption'));
  const words = el.appendChild(part(styles.lucky!));
  words.textContent = 'Lucky';
  const you = words.appendChild(document.createElement('span'));
  you.className = styles.you!;
  you.textContent = 'You';
  el.prepend(star);
  return el;
}

/** Where the claw's drawing sits round its hub's top centre, and its size. */
export const CLAW_BOX = { width: 260, height: 140, left: 130 } as const;

export interface Claw {
  /** The trolley and the cable, over the stage; data-part="trolley". */
  readonly trolley: SVGSVGElement;
  /** The prong, drawn behind whoever hangs in the claw; data-part="claw-back". */
  readonly back: SVGSVGElement;
  /** The fingers, the hub and the marks, in front of them; data-part="claw", data-pose and data-marks. */
  readonly front: SVGSVGElement;
  /** Draws the claw as `state` says. */
  set(state: ClawState): void;
}

/** Ticks beside both fingertips where they are with the fingers `out`: a twitch. */
function twitchMarks(out: number): string {
  const a = ((8.3 + out) * Math.PI) / 180;
  const tx = Math.round(18 + 97 * Math.sin(a));
  const ty = Math.round(24 + 97 * Math.cos(a));
  const tick = (s: number) =>
    `M${s * (tx + 16)} ${ty - 22} L${s * (tx + 32)} ${ty - 30} M${s * (tx + 20)} ${ty - 2} L${s * (tx + 38)} ${ty - 2}`;
  return `${tick(1)} ${tick(-1)}`;
}

/** The nearest named pose to fingers swung `out` degrees. */
function poseName(out: number): string {
  const poses = Object.entries(POSE) as [string, number][];
  return poses.reduce((near, each) =>
    Math.abs(each[1] - out) < Math.abs(near[1] - out) ? each : near,
  )[0];
}

/** The claw on its trolley: a hub on a cable, two fingers from its shoulders, a short prong behind. */
export function claw(): Claw {
  const trolley = drawing('0 0 1280 720');
  trolley.setAttribute('class', styles.layer!);
  trolley.dataset.part = 'trolley';
  const [cable] = draw(trolley, [['path', styles.line!, { 'stroke-width': 5 }]]);
  const car = group(trolley, 'car', [
    ['rect', styles.sun!, { x: -46, y: 118, width: 92, height: 32, rx: 9, 'stroke-width': 4 }],
    ['circle', styles.ink!, { cx: -26, cy: 130, r: 7 }],
    ['circle', styles.ink!, { cx: 26, cy: 130, r: 7 }],
    ['circle', styles.paper!, { cx: 0, cy: 140, r: 5, 'stroke-width': 3 }],
  ]);

  const box = `-${CLAW_BOX.left} 0 ${CLAW_BOX.width} ${CLAW_BOX.height}`;
  const back = drawing(box);
  back.setAttribute('class', styles.claw!);
  back.dataset.part = 'claw-back';
  draw(back, [
    ['path', styles.line!, { d: 'M0 26 V46 Q0 56 10 52', 'stroke-width': 13 }],
    ['path', styles.paperLine!, { d: 'M0 26 V46 Q0 56 10 52', 'stroke-width': 5 }],
  ]);
  const front = drawing(box);
  front.setAttribute('class', styles.claw!);
  front.setAttribute('role', 'img');
  front.removeAttribute('aria-hidden');
  front.dataset.part = 'claw';
  const finger = (name: string) =>
    group(front, name, [
      ['path', styles.line!, { d: 'M0 0 L30 26 Q54 62 14 96', 'stroke-width': 16 }],
      ['path', styles.paperLine!, { d: 'M0 0 L30 26 Q54 62 14 96', 'stroke-width': 7 }],
      ['circle', styles.sun!, { cx: 30, cy: 26, r: 6.5, 'stroke-width': 3 }],
    ]);
  const left = finger('finger-left');
  const right = finger('finger-right');
  draw(front, [
    [
      'path',
      styles.tomato!,
      { d: 'M-28 34 V14 Q-28 0 -14 0 H14 Q28 0 28 14 V34 Z', 'stroke-width': 4 },
    ],
    ['rect', styles.ink!, { x: -28, y: 20, width: 56, height: 8 }],
    ['circle', styles.sun!, { cx: -18, cy: 24, r: 8, 'stroke-width': 3 }],
    ['circle', styles.sun!, { cx: 18, cy: 24, r: 8, 'stroke-width': 3 }],
  ]);
  const strain = group(front, 'strain', [
    [
      'path',
      styles.line!,
      { d: 'M-46 0 L-60 -10 M46 0 L60 -10 M-36 -12 L-42 -26 M36 -12 L42 -26', 'stroke-width': 4 },
    ],
  ]);
  const [twitch] = draw(front, [['path', styles.line!, { 'stroke-width': 4 }]]);
  twitch!.dataset.part = 'twitch';

  const LABELS: Readonly<Record<string, string>> = {
    shut: 'The claw, shut on nothing',
    grip: 'The claw, holding one',
    gripBig: 'The claw, holding a big one',
    open: 'The claw, open',
    pair: 'The claw, one on each finger',
    wide: 'The claw, spread wide',
    wider: 'The claw, spread wide',
  };
  let drawn = '';
  return {
    trolley,
    back,
    front,
    set(state) {
      const key = JSON.stringify(state);
      if (key === drawn) return;
      drawn = key;
      const { x, hub, th, out, marks } = state;
      const a = (th * Math.PI) / 180;
      // The hub's top as it swings about its pivot under the trolley.
      const hubX = x + (hub - 134) * Math.sin(a);
      const hubY = 134 + (hub - 134) * Math.cos(a);
      set(cable!, 'd', `M${x.toFixed(1)} 148 L${hubX.toFixed(1)} ${(hubY + 2).toFixed(1)}`);
      set(car, 'transform', `translate(${x.toFixed(1)} 0)`);
      for (const el of [back, front]) {
        el.style.left = `${(x - CLAW_BOX.left).toFixed(1)}px`;
        el.style.top = `${hub.toFixed(1)}px`;
        el.style.transformOrigin = `${CLAW_BOX.left}px ${(134 - hub).toFixed(1)}px`;
        el.style.rotate = th === 0 ? '' : `${(-th).toFixed(2)}deg`;
      }
      set(right, 'transform', `translate(18 24) rotate(${-(out + state.twitch)})`);
      set(left, 'transform', `translate(-18 24) scale(-1 1) rotate(${-out})`);
      const pose = poseName(out);
      front.dataset.pose = pose;
      front.dataset.marks = marks;
      front.dataset.twitch = state.twitch.toFixed(2);
      front.dataset.x = x.toFixed(1);
      front.dataset.hub = hub.toFixed(1);
      front.dataset.th = th.toFixed(2);
      set(front, 'aria-label', LABELS[pose]!);
      show(strain, marks === ('strain' satisfies Marks));
      show(twitch!, marks === 'twitch');
      if (marks === 'twitch') set(twitch!, 'd', twitchMarks(out));
    },
  };
}

/** The plush's ears, by the accessory the kit dealt. */
const EARS = { cap: 'bear', goggles: 'bunny', snorkel: 'cat' } as const;

/** The ears' shapes, on the head's 100 grid. */
const EAR_SHAPES: Readonly<Record<'bear' | 'bunny' | 'cat', readonly Shape[]>> = {
  bear: [
    ['circle', styles.fur!, { cx: 23, cy: 21, r: 12, 'stroke-width': 4 }],
    ['circle', styles.fur!, { cx: 77, cy: 21, r: 12, 'stroke-width': 4 }],
  ],
  bunny: [
    [
      'ellipse',
      styles.fur!,
      { cx: 33, cy: 6, rx: 9, ry: 21, transform: 'rotate(-12 33 6)', 'stroke-width': 4 },
    ],
    [
      'ellipse',
      styles.fur!,
      { cx: 67, cy: 6, rx: 9, ry: 21, transform: 'rotate(12 67 6)', 'stroke-width': 4 },
    ],
  ],
  cat: [
    ['path', styles.fur!, { d: 'M19 36 L20 3 L45 17 Z', 'stroke-width': 4 }],
    ['path', styles.fur!, { d: 'M81 36 L80 3 L55 17 Z', 'stroke-width': 4 }],
  ],
};

export interface Plush {
  /** A box the size of the head, data-person; its drawings fill it, overflowing to its feet. */
  readonly el: HTMLElement;
  readonly face: Head;
  setMood(mood: Mood): void;
  /** Raises the arms, hiding the paws. */
  setRaised(on: boolean): void;
  setSweat(on: boolean): void;
  /** A bow in place of the loop: the prize. */
  setBow(on: boolean): void;
}

/**
 * A person as a plush toy: the kit's head on land, in a cap, the cap and
 * shirt both the plush's colour so they read as a hooded suit; behind it
 * the hang loop, the ears, the hood's rim and two paws; in front, two feet
 * and, for the prize, a bow.
 */
export function plush(look: Look): Plush {
  const colour: Colour = look.colour;
  const el = part(styles.plush!);
  el.style.setProperty('--plush', `var(--color-${colour})`);
  const ears = EARS[look.accessory];
  const behind = drawing('0 0 100 100');
  behind.setAttribute('class', styles.plushPart!);
  const loop = group(behind, 'loop', [
    ['path', styles.line!, { d: 'M43 13 Q50 -13 57 13', 'stroke-width': 9 }],
    ['path', styles.furLine!, { d: 'M43 13 Q50 -13 57 13', 'stroke-width': 3 }],
  ]);
  group(behind, `ears-${ears}`, EAR_SHAPES[ears]);
  draw(behind, [['circle', styles.fur!, { cx: 50, cy: 44, r: 34, 'stroke-width': 4 }]]);
  const paws = group(behind, 'paws', [
    [
      'ellipse',
      styles.fur!,
      { cx: 9, cy: 91, rx: 9, ry: 15, transform: 'rotate(20 9 91)', 'stroke-width': 4 },
    ],
    [
      'ellipse',
      styles.fur!,
      { cx: 91, cy: 91, rx: 9, ry: 15, transform: 'rotate(-20 91 91)', 'stroke-width': 4 },
    ],
  ]);
  const face = head(
    { skin: look.skin, accessory: 'cap', colour, ring: colour },
    { land: true, mood: 'worried' },
  );
  face.el.classList.add(styles.plushPart!);
  const before = drawing('0 0 100 100');
  before.setAttribute('class', styles.plushPart!);
  group(before, 'feet', [
    ['ellipse', styles.fur!, { cx: 33, cy: 113, rx: 14, ry: 8, 'stroke-width': 4 }],
    ['ellipse', styles.fur!, { cx: 67, cy: 113, rx: 14, ry: 8, 'stroke-width': 4 }],
  ]);
  const bow = group(before, 'bow', [
    ['path', styles.tomato!, { d: 'M50 8 L22 -10 Q14 6 24 20 Z', 'stroke-width': 4 }],
    ['path', styles.tomato!, { d: 'M50 8 L78 -10 Q86 6 76 20 Z', 'stroke-width': 4 }],
    ['circle', styles.sun!, { cx: 50, cy: 8, r: 8, 'stroke-width': 4 }],
  ]);
  show(bow, false);
  el.append(behind, face.el, before);
  let mood: Mood = 'worried';
  let raised = false;
  const arms = () => show(paws, !(raised || mood === 'party'));
  return {
    el,
    face,
    setMood(next) {
      mood = next;
      face.setMood(next);
      arms();
    },
    setRaised(on) {
      raised = on;
      face.setRaised(on);
      arms();
    },
    setSweat: (on) => face.setSweat(on),
    setBow(on) {
      show(bow, on);
      show(loop, !on);
    },
  };
}

/** Speed lines over the stage: behind whoever flies, and over whoever falls into the chute. */
export function lines(): { el: SVGSVGElement; set(d: string | null): void } {
  const el = drawing('0 0 1280 720');
  el.setAttribute('class', styles.layer!);
  el.dataset.part = 'lines';
  const [path] = draw(el, [['path', styles.line!, { 'stroke-width': 7 }]]);
  return {
    el,
    set(d) {
      show(path!, d !== null);
      if (d !== null) set(path!, 'd', d);
    },
  };
}

/** A four-pointed star `r` across at x, y. */
function star(x: number, y: number, r: number): string {
  const s = r * 0.3;
  return (
    `M${x} ${y - r} L${x + s} ${y - s} L${x + r} ${y} L${x + s} ${y + s} ` +
    `L${x} ${y + r} L${x - s} ${y + s} L${x - r} ${y} L${x - s} ${y - s} Z`
  );
}

/** The sparkles round the prize, each its own drawing so they can pop in; data-part="sparkle". */
export function sparkles(): SVGSVGElement[] {
  return [
    [612, 572, 22],
    [852, 548, 18],
    [860, 640, 14],
    [598, 650, 13],
  ].map(([x, y, r]) => {
    const el = drawing(`${x! - r! - 4} ${y! - r! - 4} ${2 * r! + 8} ${2 * r! + 8}`, [
      ['path', styles.sun!, { d: star(x!, y!, r!), 'stroke-width': 3 }],
    ]);
    el.setAttribute('class', styles.sparkle!);
    el.dataset.part = 'sparkle';
    el.style.left = `${x! - r! - 4}px`;
    el.style.top = `${y! - r! - 4}px`;
    el.style.width = `${2 * r! + 8}px`;
    el.style.height = `${2 * r! + 8}px`;
    return el;
  });
}
