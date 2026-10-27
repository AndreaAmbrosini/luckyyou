// Don't Wake the Dog's drawings, from the Design canvas: the garden, the
// picket fence with its gate and the "At risk" sign on an arch, the dog in
// every state, its lead and hearts. Every colour comes from a class in
// dont-wake-the-dog.module.css; the Zs and the "!" are drawn as lines, so no
// font size is set outside the tokens.

import type { DogState, Marks } from './plan';
import { DOG } from './plan';
import styles from './dont-wake-the-dog.module.css';

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

/** An SVG of `shapes` on a `width` by `height` grid. */
function drawing(width: number, height: number, shapes: readonly Shape[] = []): SVGSVGElement {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
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

/** The sky, three clouds, and the grass from y 330 with an ink edge on top. */
export function garden(): HTMLElement {
  const scene = part(styles.scene, 'scene');
  for (const cloud of [styles.cloud1, styles.cloud2, styles.cloud3]) {
    scene.append(part(`${styles.cloud} ${cloud}`));
  }
  scene.append(part(styles.grass, 'grass'));
  return scene;
}

/** The gateway in the fence: no pickets from x 528 to 752. */
export const GATEWAY = { left: 528, right: 752 } as const;
/** The gate hangs from its left post, at x 564. */
const HINGE = 564;

/** The pickets either side of the gateway, every 52 px, 40 wide, from y 282 to 404. */
function pickets(): string {
  let d = '';
  for (let x = -6; x < 1290; x += 52) {
    if (x + 40 > GATEWAY.left && x < GATEWAY.right) continue;
    d += `M${x} 404 V300 L${x + 20} 282 L${x + 40} 300 V404 Z `;
  }
  return d.trim();
}

export interface Fence {
  /** The rails, pickets, gate, posts and arch, over the whole stage; data-part="fence". */
  readonly el: SVGSVGElement;
  /** The gate, swung from shut (0) to open (1). */
  swing(open: number): void;
}

/** The picket fence across the stage, with the gate and its posts in the gateway. */
export function fence(): Fence {
  const el = drawing(1280, 720, [
    ['rect', styles.paper, { x: -10, y: 318, width: 550, height: 16, 'stroke-width': 4 }],
    ['rect', styles.paper, { x: 740, y: 318, width: 550, height: 16, 'stroke-width': 4 }],
    ['rect', styles.paper, { x: -10, y: 372, width: 550, height: 16, 'stroke-width': 4 }],
    ['rect', styles.paper, { x: 740, y: 372, width: 550, height: 16, 'stroke-width': 4 }],
    ['path', styles.paper, { d: pickets(), 'stroke-width': 4 }],
  ]);
  el.dataset.part = 'fence';
  el.setAttribute('class', styles.layer!);
  const gate = group(el, 'gate', [
    ['rect', styles.sun, { x: 566, y: 324, width: 148, height: 14, 'stroke-width': 4 }],
    ['rect', styles.sun, { x: 566, y: 370, width: 148, height: 14, 'stroke-width': 4 }],
    [
      'path',
      styles.sun,
      {
        d:
          'M570 404 V302 L590 286 L610 302 V404 Z M620 404 V302 L640 286 L660 302 V404 Z ' +
          'M670 404 V302 L690 286 L710 302 V404 Z',
        'stroke-width': 4,
      },
    ],
    ['path', styles.line, { d: 'M574 380 L706 330', 'stroke-width': 6 }],
  ]);
  draw(el, [
    ['rect', styles.sun, { x: 540, y: 262, width: 24, height: 146, rx: 4, 'stroke-width': 4 }],
    ['rect', styles.sun, { x: 716, y: 262, width: 24, height: 146, rx: 4, 'stroke-width': 4 }],
  ]);
  let swung = -1;
  const swing = (open: number) => {
    const value = Math.round(Math.min(1, Math.max(0, open)) * 1000) / 1000;
    if (value === swung) return;
    swung = value;
    gate.dataset.open = String(value);
    // Swung in towards the garden, it looks narrower from the front.
    const scale = 1 - 0.7 * value;
    gate.setAttribute(
      'transform',
      `translate(${HINGE} 0) scale(${scale} 1) translate(${-HINGE} 0)`,
    );
  };
  swing(0);
  return { el, swing };
}

/** The sign on the arch over the gate. */
export const SIGN = { left: 490, top: 208, width: 300, height: 62 } as const;
/** The sign's words before the count. */
export const AT_RISK = 'At risk:';

export interface Sign {
  /** data-part="sign". */
  readonly el: HTMLElement;
  /** Shows "At risk: `count`". */
  count(count: number): void;
  /** Shows `text` instead: "Walkies!". */
  say(text: string): void;
}

/** The sun sign on the arch over the gate, with how many are still at risk. */
export function sign(): Sign {
  const el = part(styles.sign, 'sign');
  el.style.left = `${SIGN.left}px`;
  el.style.top = `${SIGN.top}px`;
  el.style.width = `${SIGN.width}px`;
  el.style.height = `${SIGN.height}px`;
  const words = el.appendChild(document.createElement('span'));
  const number = el.appendChild(part(styles.count!, 'at-risk'));
  const set = (label: string, value: string) => {
    if (words.textContent !== label) words.textContent = label;
    if (number.textContent !== value) number.textContent = value;
  };
  return {
    el,
    count: (count) => set(AT_RISK, String(count)),
    say: (text) => set(text, ''),
  };
}

/** Where the lying dog's 340 × 170 drawing sits; standing, it jumps to `stand`. */
export const DOG_AT = {
  x: 470,
  y: 360,
  width: 340,
  height: 170,
  stand: { x: 590, y: 405 },
} as const;
/** The head lifts this many degrees about this point of the drawing. */
export const LIFT = { degrees: 16, x: 130, y: 126 } as const;

/** A "Z" `size` high with its bottom left at x, y, as an ink line on a paper halo. */
function zed(x: number, y: number, size: number): Shape[] {
  const w = 0.62 * size;
  const h = 0.72 * size;
  const d = `M${x} ${y - h} H${x + w} L${x} ${y} H${x + w}`;
  const line = Math.round(0.16 * size);
  return [
    ['path', styles.halo, { d, 'stroke-width': line + 8 }],
    ['path', styles.line, { d, 'stroke-width': line }],
  ];
}

export interface Dog {
  /** The dog's drawing, placed on the stage; data-part="dog" and data-state. */
  readonly el: SVGSVGElement;
  /** The body that breathes: scale it up and down about its bottom. */
  readonly body: SVGGElement;
  /** Shows the dog in `state`, its head lifted `lift` (0 to 1), with `marks`. */
  set(state: DogState, lift: number, marks: Marks): void;
}

/** The sleepy dog, lying side-on with its head on its paws at the left end, as on the canvas. */
export function dog(): Dog {
  const el = drawing(340, 170);
  el.dataset.part = 'dog';
  el.setAttribute('class', styles.dog!);
  el.setAttribute('role', 'img');
  el.removeAttribute('aria-hidden');

  const lying = group(el, 'lying');
  const tailAsleep = group(lying, 'tail-flat', [
    ['path', styles.line, { d: 'M292 130 Q326 146 338 160', 'stroke-width': 15 }],
    ['path', styles.orangeLine, { d: 'M292 130 Q326 146 338 160', 'stroke-width': 7 }],
  ]);
  const tailUp = group(lying, 'tail-raised', [
    ['path', styles.line, { d: 'M294 118 Q336 112 328 70', 'stroke-width': 15 }],
    ['path', styles.orangeLine, { d: 'M294 118 Q336 112 328 70', 'stroke-width': 7 }],
  ]);
  const body = group(lying, 'body', [
    ['ellipse', styles.orangeFill, { cx: 190, cy: 122, rx: 112, ry: 42 }],
    ['path', styles.patchFill, { d: 'M168 88 Q200 74 236 86 Q228 106 198 106 Q176 104 168 88 Z' }],
    ['ellipse', styles.outline, { cx: 190, cy: 122, rx: 112, ry: 42, 'stroke-width': 5 }],
    ['ellipse', styles.orange, { cx: 262, cy: 124, rx: 50, ry: 38, 'stroke-width': 5 }],
  ]);
  draw(lying, [
    ['ellipse', styles.orange, { cx: 284, cy: 156, rx: 28, ry: 11, 'stroke-width': 4 }],
    ['ellipse', styles.orange, { cx: 112, cy: 160, rx: 30, ry: 10, 'stroke-width': 4 }],
    ['ellipse', styles.orange, { cx: 74, cy: 158, rx: 36, ry: 12, 'stroke-width': 4 }],
  ]);
  const thump = group(lying, 'thump', [
    [
      'path',
      styles.line,
      { d: 'M328 144 L322 132 M344 146 L354 138 M350 164 L362 166', 'stroke-width': 4 },
    ],
  ]);
  const headGroup = group(lying, 'head', [
    ['path', styles.line, { d: 'M130 92 Q140 122 130 152', 'stroke-width': 15 }],
    ['path', styles.collar, { d: 'M130 92 Q140 122 130 152', 'stroke-width': 8 }],
    ['circle', styles.orange, { cx: 86, cy: 112, r: 44, 'stroke-width': 5 }],
  ]);
  const earFlat = group(headGroup, 'ear-flat', [
    [
      'path',
      styles.patch,
      { d: 'M96 74 Q130 70 126 116 Q120 132 106 120 Q106 96 92 80 Z', 'stroke-width': 4 },
    ],
  ]);
  const earUp = group(headGroup, 'ear-up', [
    ['path', styles.patch, { d: 'M94 78 Q100 32 130 40 Q128 64 112 86 Z', 'stroke-width': 4 }],
  ]);
  draw(headGroup, [
    ['ellipse', styles.paper, { cx: 50, cy: 128, rx: 30, ry: 21, 'stroke-width': 4 }],
    ['ellipse', styles.ink, { cx: 26, cy: 120, rx: 9, ry: 8 }],
    ['path', styles.line, { d: 'M38 142 Q50 148 62 140', 'stroke-width': 3.5 }],
  ]);
  const leftShut = group(headGroup, 'left-shut', [
    ['path', styles.line, { d: 'M58 100 Q65 107 72 100', 'stroke-width': 4.5 }],
  ]);
  const rightShut = group(headGroup, 'right-shut', [
    ['path', styles.line, { d: 'M82 98 Q89 105 96 98', 'stroke-width': 4.5 }],
  ]);
  const leftHalf = group(headGroup, 'left-half', [
    ['path', styles.paper, { d: 'M58 101 A7 7 0 0 0 72 101 Z', 'stroke-width': 3 }],
    ['circle', styles.ink, { cx: 65, cy: 104, r: 3 }],
    ['path', styles.line, { d: 'M56 100 H74', 'stroke-width': 4.5 }],
  ]);
  const rightHalf = group(headGroup, 'right-half', [
    ['path', styles.paper, { d: 'M82 99 A7 7 0 0 0 96 99 Z', 'stroke-width': 3 }],
    ['circle', styles.ink, { cx: 89, cy: 102, r: 3 }],
    ['path', styles.line, { d: 'M80 98 H98', 'stroke-width': 4.5 }],
  ]);
  const open = group(headGroup, 'eyes-open', [
    ['circle', styles.paper, { cx: 65, cy: 98, r: 8, 'stroke-width': 3 }],
    ['circle', styles.ink, { cx: 68, cy: 95, r: 4 }],
    ['circle', styles.paper, { cx: 90, cy: 96, r: 8, 'stroke-width': 3 }],
    ['circle', styles.ink, { cx: 93, cy: 93, r: 4 }],
  ]);
  const twitch = group(headGroup, 'twitch', [
    [
      'path',
      styles.line,
      { d: 'M136 66 L148 54 M142 84 L158 80 M124 58 L126 44', 'stroke-width': 4 },
    ],
  ]);
  const sniff = group(headGroup, 'sniff', [
    ['path', styles.line, { d: 'M10 108 Q2 116 10 124 M0 100 Q-12 116 0 132', 'stroke-width': 4 }],
  ]);
  const zs = [
    group(lying, 'z1', zed(40, 58, 32)),
    group(lying, 'z2', zed(18, 20, 44)),
    group(lying, 'z3', zed(-8, -28, 58)),
  ];
  const bang = group(lying, 'bang', [
    ['rect', styles.sun, { x: 30, y: 6, width: 36, height: 50, rx: 10, 'stroke-width': 4 }],
    ['path', styles.line, { d: 'M48 16 V34', 'stroke-width': 7 }],
    ['circle', styles.ink, { cx: 48, cy: 44, r: 4.5 }],
  ]);

  const standing = group(el, 'standing');
  const up = group(standing, 'stand', [
    ['path', styles.line, { d: 'M44 80 Q16 66 22 30', 'stroke-width': 11 }],
    ['path', styles.orangeLine, { d: 'M44 80 Q16 66 22 30', 'stroke-width': 5 }],
    ...[52, 82, 130, 158].map((x): Shape => [
      'rect',
      styles.orange,
      { x, y: 100, width: 24, height: 50, rx: 11, 'stroke-width': 4 },
    ]),
    ['ellipse', styles.orange, { cx: 108, cy: 92, rx: 72, ry: 38, 'stroke-width': 4 }],
    ['ellipse', styles.paperFill, { cx: 112, cy: 110, rx: 40, ry: 13 }],
    ['path', styles.patchFill, { d: 'M96 64 Q118 54 140 66 Q132 80 116 80 Q102 78 96 64 Z' }],
    ['path', styles.line, { d: 'M154 64 Q164 96 186 98', 'stroke-width': 11 }],
    ['path', styles.collar, { d: 'M154 64 Q164 96 186 98', 'stroke-width': 6 }],
    ['circle', styles.orange, { cx: 180, cy: 58, r: 34, 'stroke-width': 4 }],
    [
      'path',
      styles.patch,
      { d: 'M166 28 Q142 30 146 72 Q152 86 164 76 Q168 52 174 32 Z', 'stroke-width': 3 },
    ],
    ['ellipse', styles.paper, { cx: 208, cy: 70, rx: 22, ry: 16, 'stroke-width': 3 }],
    ['ellipse', styles.ink, { cx: 226, cy: 63, rx: 8, ry: 7 }],
    ['circle', styles.ink, { cx: 186, cy: 48, r: 5.5 }],
    ['path', styles.line, { d: 'M206 84 Q216 90 226 80', 'stroke-width': 3 }],
    ['path', styles.pink, { d: 'M210 86 Q212 104 220 102 Q226 98 222 84 Z', 'stroke-width': 2.5 }],
  ]);
  up.setAttribute('transform', 'translate(330 -40) scale(-1.3 1.3)');
  group(standing, 'wag', [
    [
      'path',
      styles.line,
      { d: 'M316 -10 Q332 2 322 18 M332 -22 Q354 0 340 26', 'stroke-width': 4 },
    ],
  ]);

  const LABELS: Record<DogState, string> = {
    deep: 'The dog, deep asleep',
    light: 'The dog, sleeping lightly',
    restless: 'The dog, restless in its sleep',
    half: 'The dog, one eye half open',
    peek: 'The dog, peeking with both eyes',
    awake: 'The dog, wide awake',
    stand: 'The dog, up and wagging',
  };
  let drawn = '';
  const set = (state: DogState, lift: number, marks: Marks) => {
    const key = `${state}|${lift}|${marks}`;
    if (key === drawn) return;
    drawn = key;
    const look = DOG[state];
    el.dataset.state = state;
    el.dataset.marks = marks;
    el.setAttribute('aria-label', LABELS[state]);
    show(lying, state !== 'stand');
    show(standing, state === 'stand');
    show(tailAsleep, look.tail === 'flat');
    show(tailUp, look.tail === 'raised');
    show(earFlat, look.ears === 'flat');
    show(earUp, look.ears === 'up');
    show(leftShut, look.eyes === 'shut' || look.eyes === 'one-half');
    show(rightShut, look.eyes === 'shut');
    show(rightHalf, look.eyes === 'one-half' || look.eyes === 'both-half');
    show(leftHalf, look.eyes === 'both-half');
    show(open, look.eyes === 'open');
    zs.forEach((z, k) => show(z, k < look.zs));
    show(bang, look.bang);
    show(twitch, marks === 'twitch');
    show(sniff, marks === 'sniff');
    show(thump, marks === 'thump');
    el.dataset.lift = String(lift);
    headGroup.setAttribute(
      'transform',
      lift === 0 ? '' : `rotate(${LIFT.degrees * lift} ${LIFT.x} ${LIFT.y})`,
    );
  };
  set('deep', 0, 'none');
  return { el, body, set };
}

/** A lead from `from` (the collar) to `to` (the raised hand), in stage pixels; data-part="lead". */
export function lead(from: { x: number; y: number }, to: { x: number; y: number }): SVGSVGElement {
  const sag = { x: (from.x + to.x) / 2, y: Math.max(from.y, to.y) + 70 };
  const d = `M${to.x} ${to.y} Q${sag.x} ${sag.y} ${from.x} ${from.y}`;
  const svg = drawing(1280, 720, [
    ['path', styles.line, { d, 'stroke-width': 11 }],
    ['path', styles.leadLine, { d, 'stroke-width': 5 }],
  ]);
  svg.dataset.part = 'lead';
  svg.setAttribute('class', styles.layer!);
  return svg;
}

/** A pink heart, 34 × 32, at `x`, `y`; data-part="heart". */
export function heart(x: number, y: number): SVGSVGElement {
  const svg = drawing(32, 30, [
    [
      'path',
      styles.pink,
      { d: 'M16 28 L5 16 Q0 9 6 5 Q12 1 16 8 Q20 1 26 5 Q32 9 27 16 Z', 'stroke-width': 3 },
    ],
  ]);
  svg.dataset.part = 'heart';
  svg.setAttribute('class', styles.heart!);
  svg.style.left = `${x}px`;
  svg.style.top = `${y}px`;
  return svg;
}
