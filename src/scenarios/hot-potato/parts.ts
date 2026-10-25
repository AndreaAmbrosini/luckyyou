// Hot Potato's drawings, from the Design canvas: the potato with its six
// faces and burning sparkler, the field, the fuse, the crown, the pop's
// burst and the confetti. Every colour comes from a class in
// hot-potato.module.css.

import styles from './hot-potato.module.css';

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

export type Face = 'calm' | 'nervous' | 'relieved' | 'shocked' | 'squeezed' | 'smug';

export interface Potato {
  /** 120 × 110 grid, overflow visible; data-part="potato", data-face, data-sparkler, data-lit. */
  readonly el: SVGSVGElement;
  /** The spark at the sparkler's tip; data-part="spark". */
  readonly spark: SVGGElement;
  setFace(face: Face): void;
  /** 1 full … 0 the last spark; data-sparkler is the value rounded to 3 decimals. */
  setSparkler(left: number): void;
  /** Out: no spark, a smoke curl. */
  setLit(lit: boolean): void;
  /** The relit spark: bigger, with a second ring of rays. */
  setFlare(on: boolean): void;
  setSteam(on: boolean): void;
}

const eye = (cx: number, cy: number): Shape => ['circle', styles.inkFill, { cx, cy, r: 4.5 }];
const line = (d: string, width = 3.5): Shape => ['path', styles.ink, { d, 'stroke-width': width }];

const FACES: Record<Face, readonly Shape[]> = {
  calm: [eye(52, 58), eye(74, 56), line('M54 72 Q62 78 70 72')],
  nervous: [
    eye(52, 58),
    eye(74, 56),
    line('M44 46 L56 50 M82 44 L70 49'),
    line('M52 76 Q57 71 62 76 Q67 81 72 76'),
    ['path', styles.glass, { d: 'M100 30 Q106 40 100 44 Q94 40 100 30 Z', 'stroke-width': 3 }],
  ],
  relieved: [line('M46 58 Q52 52 58 58 M68 56 Q74 50 80 56'), line('M50 70 Q62 84 74 70')],
  shocked: [
    ['circle', styles.paper, { cx: 52, cy: 56, r: 8, 'stroke-width': 3 }],
    ['circle', styles.paper, { cx: 74, cy: 54, r: 8, 'stroke-width': 3 }],
    ['circle', styles.inkFill, { cx: 52, cy: 57, r: 3 }],
    ['circle', styles.inkFill, { cx: 74, cy: 55, r: 3 }],
    ['ellipse', styles.inkFill, { cx: 63, cy: 77, rx: 5, ry: 6 }],
  ],
  squeezed: [
    line('M46 52 L56 57 L46 62 M80 50 L70 55 L80 60'),
    line('M50 76 L55 72 L60 76 L65 72 L70 76 L75 72'),
  ],
  smug: [line('M45 56 H59 M67 54 H81'), line('M52 72 Q64 80 76 68')],
};

const RAYS =
  'M0 -26 V-20 M18 -18 L14 -14 M26 0 H20 M18 18 L14 14 M-18 -18 L-14 -14 M-26 0 H-20 M-18 18 L-14 14';
const FLARE_RAYS =
  'M0 -34 V-30 M26 -10 L30 -12 M-26 -10 L-30 -12 M10 -30 L12 -34 M-10 -30 L-12 -34';

const CURL_A = 'M28 18 q-7 -8 0 -16 q7 -8 0 -16';
const CURL_B = 'M102 26 q-7 -8 0 -16 q7 -8 0 -16';
const SMOKE = 'M72 -30 q-10 -10 0 -20 q10 -10 0 -22';

/** The potato, a stick of sparkler in its top, and a face that changes. */
export function potato(): Potato {
  const el = document.createElementNS(SVG, 'svg');
  el.setAttribute('viewBox', '0 0 120 110');
  el.setAttribute('aria-hidden', 'true');
  el.style.overflow = 'visible';
  el.dataset.part = 'potato';

  const steam = group(
    el,
    ['data-part', 'steam'],
    [
      ['path', styles.steamInk, { d: CURL_A, 'stroke-width': 9 }],
      ['path', styles.steamInk, { d: CURL_B, 'stroke-width': 9 }],
      ['path', styles.steamPaper, { d: CURL_A, 'stroke-width': 4 }],
      ['path', styles.steamPaper, { d: CURL_B, 'stroke-width': 4 }],
    ],
  );
  const smoke = group(
    el,
    ['data-part', 'smoke'],
    [
      ['path', styles.steamInk, { d: SMOKE, 'stroke-width': 10 }],
      ['path', styles.steamPaper, { d: SMOKE, 'stroke-width': 5 }],
    ],
  );

  const stick = el.appendChild(document.createElementNS(SVG, 'path'));
  stick.setAttribute('class', styles.ink);
  stick.setAttribute('stroke-width', '5');
  stick.dataset.part = 'stick';

  draw(el, [
    [
      'path',
      styles.skin,
      {
        d: 'M18 62 C8 36 32 18 62 22 C94 26 114 46 106 72 C98 96 58 102 34 94 C22 90 20 76 18 62 Z',
        'stroke-width': 5,
      },
    ],
    ['ellipse', styles.spot, { cx: 32, cy: 74, rx: 4, ry: 3 }],
    ['ellipse', styles.spot, { cx: 94, cy: 80, rx: 3.5, ry: 3 }],
    ['ellipse', styles.spot, { cx: 90, cy: 38, rx: 3, ry: 2.5 }],
  ]);

  const faces = new Map<Face, SVGGElement>();
  for (const face of Object.keys(FACES) as Face[]) {
    faces.set(face, group(el, ['data-face-part', face], FACES[face]));
  }

  const spark = group(
    el,
    ['data-part', 'spark'],
    [
      ['path', styles.tomatoLine, { d: RAYS, 'stroke-width': 3.5 }],
      ['path', styles.orangeLine, { d: FLARE_RAYS, 'stroke-width': 3.5 }],
      [
        'polygon',
        styles.sun,
        { points: '0,-16 4,-5 16,-4 6,3 10,15 0,8 -10,15 -6,3 -16,-4 -4,-5', 'stroke-width': 3 },
      ],
      ['circle', styles.tomatoFill, { cx: 0, cy: 0, r: 3.5 }],
    ],
  );
  const flareRays = spark.children[1] as SVGPathElement;
  flareRays.dataset.part = 'flare';

  let flare = false;
  let left = 1;
  const placeSpark = () => {
    const x = 65 + 9 * left;
    const y = 22 - 62 * left;
    stick.setAttribute('d', `M64 28 L${x} ${y}`);
    spark.setAttribute('transform', `translate(${x} ${y}) scale(${flare ? 1.7 : 1.1})`);
  };

  const api: Potato = {
    el,
    spark,
    setFace(face) {
      el.dataset.face = face;
      for (const [name, g] of faces) show(g, name === face);
    },
    setSparkler(value) {
      left = value;
      el.dataset.sparkler = String(Math.round(value * 1000) / 1000);
      placeSpark();
    },
    setLit(lit) {
      el.dataset.lit = String(lit);
      show(spark, lit);
      show(smoke, !lit);
    },
    setFlare(on) {
      flare = on;
      show(flareRays, on);
      placeSpark();
    },
    setSteam(on) {
      show(steam, on);
    },
  };
  api.setFace('calm');
  api.setSparkler(1);
  api.setLit(true);
  api.setFlare(false);
  api.setSteam(false);
  return api;
}

/** The sky, three clouds, and the grass from y 220 with an ink edge on top. */
export function field(): HTMLElement {
  const scene = part(styles.scene, 'scene');
  for (const cloud of [styles.cloud1, styles.cloud2, styles.cloud3]) {
    scene.append(part(`${styles.cloud} ${cloud}`));
  }
  scene.append(part(styles.grass));
  return scene;
}

export interface Fuse {
  /** A paper track with an ink rope in it; data-part="fuse", data-left. */
  readonly el: HTMLElement;
  /** The spark at the rope's end; data-part="fuse-spark". */
  readonly spark: SVGSVGElement;
  /** 1 full … 0 the last spark; data-left is the value rounded to 3 decimals. */
  setLeft(left: number): void;
}

/** The fuse across the top of the stage: `width` by `height` at `left`, `top`, burning from the right. */
export const FUSE = { left: 200, top: 160, width: 880, height: 18, spark: 48 } as const;

/** The fuse: a paper track, an ink rope as long as what's left, and a sun spark at its end. */
export function fuse(): Fuse {
  const el = part(styles.fuse, 'fuse');
  el.style.left = `${FUSE.left}px`;
  el.style.top = `${FUSE.top}px`;
  el.style.width = `${FUSE.width}px`;
  el.style.height = `${FUSE.height}px`;
  const rope = el.appendChild(part(styles.rope));
  const spark = drawing(FUSE.spark, FUSE.spark, [
    [
      'polygon',
      styles.fuseSpark,
      { points: '24,3 29,17 45,17 32,27 37,43 24,33 11,43 16,27 3,17 19,17', 'stroke-width': 5 },
    ],
  ]);
  spark.dataset.part = 'fuse-spark';
  spark.setAttribute('class', styles.fuseSparkAt);
  spark.setAttribute('width', String(FUSE.spark));
  spark.setAttribute('height', String(FUSE.spark));
  spark.style.top = `${(FUSE.height - FUSE.spark) / 2}px`;
  el.append(spark);
  const api: Fuse = {
    el,
    spark,
    setLeft(left) {
      el.dataset.left = String(Math.round(left * 1000) / 1000);
      rope.style.width = `${100 * left}%`;
      spark.style.left = `${left * FUSE.width - FUSE.spark / 2}px`;
    },
  };
  api.setLeft(1);
  return api;
}

/** A crown for a head on a 100 grid. */
export function crown(): SVGSVGElement {
  const svg = drawing(100, 100, [
    [
      'path',
      styles.sun,
      { d: 'M24 18 L24 -4 L37 8 L50 -10 L63 8 L76 -4 L76 18 Z', 'stroke-width': 4 },
    ],
  ]);
  svg.style.overflow = 'visible';
  svg.dataset.part = 'crown';
  return svg;
}

/** The pop: a star of 28 points, centred on 0,0. */
export function burst(): SVGSVGElement {
  const points: string[] = [];
  for (let k = 0; k < 28; k++) {
    const angle = -Math.PI / 2 + (k * Math.PI) / 14;
    const radius = k % 2 === 0 ? 150 : 100;
    const x = +(radius * Math.cos(angle)).toFixed(2);
    const y = +(radius * Math.sin(angle)).toFixed(2);
    points.push(`${x},${y}`);
  }
  const svg = drawing(300, 300, [
    ['polygon', styles.sun, { points: points.join(' '), 'stroke-width': 5 }],
  ]);
  svg.setAttribute('viewBox', '-150 -150 300 300');
  svg.style.overflow = 'visible';
  svg.dataset.part = 'burst';
  return svg;
}

/** `count` bits of confetti: rectangles and circles, turned at random. */
export function confetti(random: () => number, count: number): HTMLElement[] {
  const fills = [
    styles.confettiTomato,
    styles.confettiSun,
    styles.confettiMint,
    styles.confettiGrape,
    styles.confettiPink,
    styles.confettiOrange,
  ];
  return Array.from({ length: count }, (_, i) => {
    const shape = i % 2 === 0 ? styles.rect : styles.dot;
    const piece = part(`${styles.confetti} ${shape} ${fills[i % fills.length]}`, 'confetti');
    piece.style.transform = `rotate(${Math.round(random() * 90 - 45)}deg)`;
    return piece;
  });
}
