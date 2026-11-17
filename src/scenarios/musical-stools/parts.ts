// Musical Stools' drawings: the party room, the gramophone, the stools, the
// Boss Throne and the spotlight. Every colour comes from a class in
// musical-stools.module.css.

import styles from './musical-stools.module.css';

type Shape = readonly [tag: string, className: string, attributes: Record<string, string | number>];

const SVG = 'http://www.w3.org/2000/svg';

function draw(parent: Element, shapes: readonly Shape[]): void {
  for (const [tag, className, attributes] of shapes) {
    const shape = parent.appendChild(document.createElementNS(SVG, tag));
    shape.setAttribute('class', className);
    for (const [key, value] of Object.entries(attributes)) shape.setAttribute(key, String(value));
  }
}

function drawing(
  className: string,
  width: number,
  height: number,
  shapes: readonly Shape[],
): SVGSVGElement {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', className);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  svg.setAttribute('aria-hidden', 'true');
  draw(svg, shapes);
  return svg;
}

const bunting = (): Shape[] => {
  const flags: Shape[] = [['path', styles.rope!, { d: 'M 0 6 Q 640 22 1280 6' }]];
  const fills = [styles.flagTomato!, styles.flagSun!, styles.flagMint!, styles.flagGrape!];
  for (let i = 0, x = 6; x < 1280; i++, x += 46) {
    const sag = 14 * Math.sin((Math.PI * (x + 20)) / 1280);
    flags.push([
      'path',
      fills[i % fills.length]!,
      { d: `M ${x} ${7 + sag} L ${x + 36} ${7 + sag} L ${x + 18} ${24 + sag} Z` },
    ]);
  }
  return flags;
};

const floor = (): Shape[] => {
  const boards: Shape[] = [];
  for (let row = 0, y = 300; y < 720; row++, y += 46) {
    boards.push(['path', styles.board!, { d: `M 0 ${y} H 1280` }]);
    for (let x = row % 2 ? 60 : 0; x < 1280; x += 120) {
      boards.push(['path', styles.board!, { d: `M ${x} ${y} V ${y + 46}` }]);
    }
  }
  return boards;
};

const walls = (): Shape[] => {
  const stripes: Shape[] = [];
  for (let x = 0; x < 1280; x += 160) {
    stripes.push(['rect', styles.stripe!, { x, y: 0, width: 80, height: 300 }]);
  }
  return stripes;
};

const plant = (x: number): Shape[] => [
  [
    'path',
    styles.leaf!,
    { d: `M ${x} 610 Q ${x - 46} 540 ${x - 30} 500 Q ${x - 2} 530 ${x} 610 Z` },
  ],
  [
    'path',
    styles.leaf!,
    { d: `M ${x} 610 Q ${x + 10} 520 ${x + 4} 470 Q ${x + 34} 530 ${x} 610 Z` },
  ],
  [
    'path',
    styles.leaf!,
    { d: `M ${x} 610 Q ${x + 52} 560 ${x + 44} 510 Q ${x + 14} 540 ${x} 610 Z` },
  ],
  ['path', styles.pot!, { d: `M ${x - 30} 606 H ${x + 30} L ${x + 22} 660 H ${x - 22} Z` }],
];

/** The room: wall, floor, bunting, rug, sofa and plants, as one drawing on the stage's grid. */
export function room(): SVGSVGElement {
  return drawing(styles.room!, 1280, 720, [
    ['rect', styles.wall!, { x: 0, y: 0, width: 1280, height: 300 }],
    ...walls(),
    ['rect', styles.floor!, { x: 0, y: 300, width: 1280, height: 420 }],
    ...floor(),
    ['path', styles.skirting!, { d: 'M 0 300 H 1280' }],
    ...bunting(),
    // The oval the marchers circle, as a rug.
    ['ellipse', styles.rug!, { cx: 640, cy: 470, rx: 600, ry: 222 }],
    ['ellipse', styles.rugInner!, { cx: 640, cy: 470, rx: 560, ry: 190 }],
    ['ellipse', styles.rugTrack!, { cx: 640, cy: 468, rx: 490, ry: 150 }],
    // The sofa along the back wall, where the safe ones sit.
    ['rect', styles.sofaBack!, { x: 250, y: 146, width: 980, height: 112, rx: 30 }],
    ['rect', styles.sofaSeat!, { x: 262, y: 238, width: 956, height: 52, rx: 18 }],
    ['rect', styles.sofaArm!, { x: 232, y: 176, width: 48, height: 122, rx: 22 }],
    ['rect', styles.sofaArm!, { x: 1200, y: 176, width: 48, height: 122, rx: 22 }],
    ...plant(70),
    ...plant(1210),
  ]);
}

export interface Gramophone {
  /** 180 × 230 grid; data-part="gramophone", data-state="playing|stutter|stopped". */
  readonly el: SVGSVGElement;
  /** Turn the record to `beat`. */
  spin(beat: number): void;
}

export function gramophone(): Gramophone {
  const el = drawing(styles.gramophone!, 180, 230, [
    ['rect', styles.cabinet!, { x: 22, y: 160, width: 136, height: 60, rx: 8 }],
    ['rect', styles.cabinetTrim!, { x: 34, y: 172, width: 112, height: 36, rx: 5 }],
    ['ellipse', styles.platter!, { cx: 90, cy: 156, rx: 66, ry: 15 }],
    ['ellipse', styles.record!, { cx: 90, cy: 152, rx: 58, ry: 12 }],
    ['ellipse', styles.label!, { cx: 90, cy: 152, rx: 18, ry: 4.5 }],
    ['ellipse', styles.groove!, { cx: 60, cy: 152, rx: 3, ry: 1 }],
    ['ellipse', styles.groove!, { cx: 120, cy: 152, rx: 3, ry: 1 }],
    ['path', styles.neck!, { d: 'M 90 152 C 78 120 90 96 108 78' }],
    ['path', styles.horn!, { d: 'M 100 86 L 70 14 Q 118 -10 168 30 Q 176 52 116 96 Z' }],
    ['ellipse', styles.bell!, { cx: 120, cy: 22, rx: 50, ry: 20, transform: 'rotate(26 120 22)' }],
    ['path', styles.arm!, { d: 'M 150 160 L 112 150' }],
  ]);
  el.dataset.part = 'gramophone';
  el.dataset.state = 'stopped';
  const grooves = [...el.querySelectorAll(`.${styles.groove}`)];
  const spin = (beat: number) => {
    const turn = beat * 0.9 * Math.PI;
    grooves.forEach((groove, i) => {
      const a = turn + i * Math.PI;
      groove.setAttribute('cx', (90 + 42 * Math.cos(a)).toFixed(1));
      groove.setAttribute('cy', (152 + 8.4 * Math.sin(a)).toFixed(1));
    });
  };
  return { el, spin };
}

/** A music note that drifts up from the gramophone's horn. */
export function note(): SVGSVGElement {
  return drawing(styles.note!, 30, 44, [
    ['ellipse', styles.noteHead!, { cx: 10, cy: 36, rx: 9, ry: 7, transform: 'rotate(-20 10 36)' }],
    ['path', styles.noteStem!, { d: 'M 18 34 V 6 Q 22 14 28 18' }],
  ]);
}

/** A stool seen from the front, 130 × 130, its cushion's centre at (65, 24). */
export function stool(): SVGSVGElement {
  const el = drawing(styles.stool!, 130, 130, [
    ['path', styles.leg!, { d: 'M 28 44 L 16 124' }],
    ['path', styles.leg!, { d: 'M 102 44 L 114 124' }],
    ['path', styles.leg!, { d: 'M 65 46 V 126' }],
    ['path', styles.rung!, { d: 'M 22 96 Q 65 112 108 96' }],
    ['path', styles.band!, { d: 'M 13 24 V 40 Q 65 66 117 40 V 24 Z' }],
    ['ellipse', styles.cushion!, { cx: 65, cy: 24, rx: 52, ry: 18 }],
    ['ellipse', styles.cushionTop!, { cx: 65, cy: 22, rx: 38, ry: 11 }],
    ['circle', styles.button!, { cx: 65, cy: 22, r: 4 }],
  ]);
  el.dataset.part = 'stool';
  return el;
}

/** The Boss Throne, 280 × 300: a tall tufted back, arms and a gold trim. */
export function throne(): SVGSVGElement {
  const tufts: Shape[] = [];
  for (const [x, y] of [
    [90, 80],
    [140, 60],
    [190, 80],
    [90, 130],
    [190, 130],
  ] as const) {
    tufts.push(['circle', styles.button!, { cx: x, cy: y, r: 6 }]);
  }
  const el = drawing(styles.throne!, 280, 300, [
    ['path', styles.throneBack!, { d: 'M 30 250 V 84 Q 30 8 140 8 Q 250 8 250 84 V 250 Z' }],
    ['path', styles.thronePanel!, { d: 'M 52 240 V 88 Q 52 30 140 30 Q 228 30 228 88 V 240 Z' }],
    ['path', styles.trim!, { d: 'M 30 84 Q 30 8 140 8 Q 250 8 250 84' }],
    [
      'path',
      styles.crown!,
      { d: 'M 112 12 L 118 -8 L 130 4 L 140 -14 L 150 4 L 162 -8 L 168 12 Z' },
    ],
    ...tufts,
    ['rect', styles.throneArm!, { x: 4, y: 176, width: 46, height: 96, rx: 20 }],
    ['rect', styles.throneArm!, { x: 230, y: 176, width: 46, height: 96, rx: 20 }],
    ['rect', styles.throneSeat!, { x: 14, y: 236, width: 252, height: 54, rx: 16 }],
    ['path', styles.trim!, { d: 'M 28 262 H 252' }],
  ]);
  el.dataset.part = 'throne';
  return el;
}

/** The spotlight: the room goes dark all round the oval. 1280 × 720, evenodd hole. */
export function spotlight(): SVGSVGElement {
  return drawing(styles.spotlight!, 1280, 720, [
    [
      'path',
      styles.dark!,
      {
        d: 'M 0 0 H 1280 V 720 H 0 Z M 40 468 a 600 232 0 1 0 1200 0 a 600 232 0 1 0 -1200 0 Z',
        'fill-rule': 'evenodd',
      },
    ],
  ]);
}
