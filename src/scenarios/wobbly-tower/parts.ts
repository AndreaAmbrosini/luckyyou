// Wobbly Tower's drawings, from the Design canvas: the "Your turn!" pointer,
// the blocks, the pigeon in two poses, the hard hat, the dust puffs, the
// speed lines and the field. Every colour comes from a class in
// wobbly-tower.module.css, or from the `var(--…)` a block is given.

import { BLOCK_HEIGHT, type Point } from './layout';
import styles from './wobbly-tower.module.css';

type Shape = readonly [tag: string, className: string, attributes: Record<string, string | number>];

const SVG = 'http://www.w3.org/2000/svg';

function draw(parent: Element, shapes: readonly Shape[]): void {
  for (const [tag, className, attributes] of shapes) {
    const shape = parent.appendChild(document.createElementNS(SVG, tag));
    shape.setAttribute('class', className);
    for (const [key, value] of Object.entries(attributes)) shape.setAttribute(key, String(value));
  }
}

/** An SVG of `shapes` on a `width` by `height` grid. */
function drawing(width: number, height: number, shapes: readonly Shape[]): SVGSVGElement {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('aria-hidden', 'true');
  draw(svg, shapes);
  return svg;
}

/** A group of `shapes` inside `parent`, marked by `attribute`. */
function group(
  parent: Element,
  attribute: [name: string, value: string],
  shapes: readonly Shape[],
): SVGGElement {
  const g = parent.appendChild(document.createElementNS(SVG, 'g'));
  g.setAttribute(attribute[0], attribute[1]);
  draw(g, shapes);
  return g;
}

const show = (el: Element, on: boolean) => {
  if (on) el.removeAttribute('display');
  else el.setAttribute('display', 'none');
};

const part = (className: string, name?: string) => {
  const element = document.createElement('div');
  element.className = className;
  if (name) element.dataset.part = name;
  return element;
};

/** The sky, three clouds, and the grass from y 330 with an ink edge on top. */
export function field(): HTMLElement {
  const scene = part(styles.scene, 'scene');
  for (const cloud of [styles.cloud1, styles.cloud2, styles.cloud3]) {
    scene.append(part(`${styles.cloud} ${cloud}`));
  }
  scene.append(part(styles.grass, 'grass'));
  return scene;
}

/** The pointer's size, in stage pixels at scale 1, and where its tip is. */
export const POINTER = {
  width: 150,
  height: 56,
  tip: { x: 75, y: 56 } as Point,
} as const;

export interface Pointer {
  /**
   * The "Your turn!" sign, absolutely positioned at its container's 0,0 and
   * POINTER.width × POINTER.height stage pixels big; data-part="pointer",
   * data-ghost. Put its tip on a point P with left = P.x − tip.x and top =
   * P.y − tip.y (for `pointerTip`: x − 75, y − 56). The whole body is above
   * the tip, so it covers P.x ± 75 and P.y − 56 … P.y.
   */
  readonly el: HTMLElement;
  readonly width: number;
  readonly height: number;
  /** The tip, from the sign's top left: bottom middle. */
  readonly tip: Point;
  /** A dashed, empty sign: where the pointer was or might go. */
  setGhost(on: boolean): void;
}

/** A short sign "Your turn!" on a tail that points down. */
export function pointer(): Pointer {
  const el = part(styles.pointer, 'pointer');
  el.style.width = `${POINTER.width}px`;
  el.style.height = `${POINTER.height}px`;
  const label = el.appendChild(document.createElement('p'));
  label.className = styles.pointerLabel;
  label.textContent = 'Your turn!';
  const tail = drawing(36, 20, [
    ['path', styles.pointerTail, { d: 'M2 2 L18 18 L34 2 Z', 'stroke-width': 4 }],
  ]);
  tail.setAttribute('class', styles.pointerTailSvg);
  el.append(tail);
  const api: Pointer = {
    el,
    width: POINTER.width,
    height: POINTER.height,
    tip: POINTER.tip,
    setGhost(on) {
      el.dataset.ghost = String(on);
    },
  };
  api.setGhost(false);
  return api;
}

/**
 * A block `width` wide and `height` high (a tower block's BLOCK_HEIGHT unless
 * asked otherwise), filled with `fill`, a `var(--color-…)`: the thrower's
 * shirt, or `var(--color-paper)`. Absolutely positioned at 0,0 of its
 * container, turning about its middle; data-part="block", data-fill.
 */
export function block(width: number, fill: string, height = BLOCK_HEIGHT): HTMLElement {
  const el = part(styles.block, 'block');
  el.style.width = `${width}px`;
  el.style.height = `${height}px`;
  el.style.setProperty('--block-fill', fill);
  el.dataset.fill = fill;
  return el;
}

export type Pose = 'perched' | 'flying';

export interface Pigeon {
  /** 90 × 70 grid, overflow visible, facing right; data-part="pigeon", data-pose. */
  readonly el: SVGSVGElement;
  /** Perched shows legs and a folded wing; flying a raised wing and no legs. */
  setPose(pose: Pose): void;
}

/** A pigeon, facing right. The feet stand on y 68 of its grid, near x 38. */
export function pigeon(): Pigeon {
  const el = drawing(90, 70, []);
  el.style.overflow = 'visible';
  el.dataset.part = 'pigeon';

  // Each pose has a layer behind the body (legs, tail) and one over it (wing).
  const behind = (pose: Pose, shapes: readonly Shape[]) =>
    group(el, ['data-pose-part', pose], shapes);
  const back: SVGGElement[] = [
    behind('perched', [
      ['path', styles.legs, { d: 'M30 58 V68 M46 58 V68', 'stroke-width': 5 }],
      ['path', styles.tail, { d: 'M14 36 L0 24 L2 46 Z', 'stroke-width': 4 }],
    ]),
    behind('flying', [['path', styles.tail, { d: 'M14 36 L0 30 L2 50 Z', 'stroke-width': 4 }]]),
  ];
  draw(el, [['ellipse', styles.bird, { cx: 38, cy: 42, rx: 28, ry: 18, 'stroke-width': 4 }]]);
  const front: SVGGElement[] = [
    behind('perched', [
      ['path', styles.ink, { d: 'M22 40 Q36 30 52 42', 'data-wing': '', 'stroke-width': 4 }],
    ]),
    behind('flying', [
      [
        'path',
        styles.wing,
        { d: 'M24 38 Q18 8 44 -8 Q50 16 56 38 Z', 'data-wing': '', 'stroke-width': 4 },
      ],
    ]),
  ];
  const poses: Record<Pose, SVGGElement[]> = {
    perched: [back[0]!, front[0]!],
    flying: [back[1]!, front[1]!],
  };
  draw(el, [
    ['circle', styles.bird, { cx: 64, cy: 22, r: 14, 'stroke-width': 4 }],
    ['path', styles.beak, { d: 'M76 18 L89 24 L76 29 Z', 'stroke-width': 4 }],
    ['circle', styles.inkFill, { cx: 67, cy: 19, r: 3.5 }],
  ]);

  const api: Pigeon = {
    el,
    setPose(pose) {
      el.dataset.pose = pose;
      for (const [name, layers] of Object.entries(poses)) {
        for (const g of layers) show(g, name === pose);
      }
    },
  };
  api.setPose('perched');
  return api;
}

/** A hard hat for a head on a 100 grid. */
export function hardHat(): SVGSVGElement {
  const svg = drawing(100, 100, [
    ['path', styles.sun, { d: 'M20 34 A30 30 0 0 1 80 34 Z', 'stroke-width': 4 }],
    ['path', styles.orange, { d: 'M44 6 H56 V34 H44 Z', 'stroke-width': 4 }],
    ['path', styles.sun, { d: 'M6 32 H94 Q94 40 86 40 H14 Q6 40 6 32 Z', 'stroke-width': 4 }],
  ]);
  svg.style.overflow = 'visible';
  svg.dataset.part = 'hard-hat';
  return svg;
}

/** A puff of dust `size` wide, absolutely positioned at 0,0 of its container. */
export function dust(size: number): HTMLElement {
  const el = part(styles.dust, 'dust');
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  return el;
}

/**
 * Three ink speed lines, one above the other, 90 by 40 stage pixels:
 * absolutely positioned at 0,0 of their container; data-part="speed-lines".
 */
export function speedLines(): HTMLElement {
  const el = part(styles.speedLines, 'speed-lines');
  for (let k = 0; k < 3; k++) el.append(part(styles.speedLine));
  return el;
}
