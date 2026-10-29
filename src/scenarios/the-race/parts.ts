// The Race's drawings, from the Design canvas: the racer on each mount, with
// its extra, the rider's mood and pose, and the trophy. Every colour comes
// from a class in the-race.module.css; the racer's colour comes in as
// --racer and the hat band's and the scarf's as --band.

import { head, type Head, type Look, type Mood } from '../../scenario-kit';
import styles from './the-race.module.css';

export type Mount = 'snail' | 'duck' | 'chair' | 'caterpillar';
export type RacerColour = 'tomato' | 'sun' | 'mint' | 'grape' | 'pink' | 'orange';
export type Extra = 'googly' | 'tophat' | 'number' | 'scarf';
/** `hold`, the reins or the backrest; `pull`, leaning back on them; `wave`; `party`, arms up. */
export type Pose = 'hold' | 'pull' | 'wave' | 'party';

export const MOUNTS: readonly Mount[] = ['snail', 'duck', 'chair', 'caterpillar'];
export const RACER_COLOURS: readonly RacerColour[] = [
  'tomato',
  'sun',
  'mint',
  'grape',
  'pink',
  'orange',
];
export const EXTRAS: readonly Extra[] = ['googly', 'tophat', 'number', 'scarf'];

/** What the Line-up chooses for one racer. */
export interface RacerLook {
  readonly mount: Mount;
  readonly colour: RacerColour;
  readonly extra: Extra;
}

/** A racer's drawing: 240 by 200, facing right, the mount's feet at y 190. */
export const RACER = { width: 240, height: 200, feet: 190 } as const;

type Point = readonly [x: number, y: number];

/**
 * Per mount: the saddle, where the rider's shirt sits (the same height on
 * every mount, so heads line up); the nose; where the reins tie on, or null
 * where the rider holds on instead (`hold`); the hat; each googly eye (x, y,
 * radius, and the pupil's offset); and the racing number.
 */
export const SPEC: Readonly<
  Record<
    Mount,
    {
      saddle: Point;
      nose: number;
      reins: Point | null;
      hold?: Point;
      hat: Point;
      googly: readonly (readonly [number, number, number, number, number])[];
      roundel: Point;
    }
  >
> = {
  snail: {
    saddle: [100, 110],
    nose: 236,
    reins: [210, 122],
    hat: [216, 118],
    googly: [
      [197, 80, 11, 4, 3],
      [229, 84, 11, -3, 4],
    ],
    roundel: [100, 140],
  },
  duck: {
    saddle: [112, 110],
    nose: 240,
    reins: [198, 114],
    hat: [186, 70],
    googly: [[196, 88, 12, 4, 3]],
    roundel: [62, 140],
  },
  chair: {
    saddle: [104, 110],
    nose: 200,
    reins: null,
    hold: [163, 88],
    hat: [181, 36],
    googly: [
      [172, 62, 9, 3, 2],
      [190, 62, 9, -2, 3],
    ],
    roundel: [181, 88],
  },
  caterpillar: {
    saddle: [108, 110],
    nose: 218,
    reins: [178, 96],
    hat: [188, 88],
    googly: [
      [176, 108, 10, 3, 3],
      [198, 108, 10, -3, 4],
    ],
    roundel: [36, 132],
  },
};

/** The rider's head holder: 72 px, its foot 81 px down, where it leans from. */
export const RIDER = { size: 72, foot: 81, lean: -12 } as const;

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

/** An SVG of `shapes` on a `width` by `height` grid, drawn past its edges. */
export function drawing(width: number, height: number, shapes: readonly Shape[] = []) {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', styles.drawing!);
  draw(svg, shapes);
  return svg;
}

function group(parent: Element, name: string, shapes: readonly Shape[] = []): SVGGElement {
  const g = parent.appendChild(document.createElementNS(SVG, 'g'));
  g.dataset.part = name;
  draw(g, shapes);
  return g;
}

/** Shows `el` when `on`, hides it otherwise; writes only on a change. */
export function show(el: Element, on: boolean) {
  const shown = !el.hasAttribute('display');
  if (shown === on) return;
  if (on) el.removeAttribute('display');
  else el.setAttribute('display', 'none');
}

const MOUNT_SHAPES: Record<Mount, (eyes: boolean) => Shape[]> = {
  snail: (eyes) => [
    [
      'path',
      styles.shark!,
      {
        d: 'M22 188 Q20 166 50 164 L170 164 Q188 160 194 138 Q200 114 216 116 Q232 120 230 144 Q228 170 214 188 Z',
        'stroke-width': 4,
      },
    ],
    ['path', styles.line!, { d: 'M208 122 L198 88 M220 120 L228 92', 'stroke-width': 5 }],
    ...(eyes
      ? ([
          ['circle', styles.paper!, { cx: 197, cy: 82, r: 9, 'stroke-width': 3 }],
          ['circle', styles.ink!, { cx: 200, cy: 83, r: 4 }],
          ['circle', styles.paper!, { cx: 229, cy: 86, r: 9, 'stroke-width': 3 }],
          ['circle', styles.ink!, { cx: 232, cy: 87, r: 4 }],
        ] as Shape[])
      : []),
    ['path', styles.line!, { d: 'M210 152 Q219 160 228 149', 'stroke-width': 4 }],
    ['circle', styles.racer!, { cx: 100, cy: 138, r: 38, 'stroke-width': 4 }],
    [
      'path',
      styles.line!,
      {
        d: 'M100 138 m-6 0 a6 6 0 1 1 12 0 a13 13 0 1 1 -25 3 a20 20 0 1 1 39 -4 a28 28 0 1 1 -54 7',
        'stroke-width': 4,
      },
    ],
  ],
  duck: (eyes) => [
    ['path', styles.racer!, { d: 'M46 132 L20 102 Q44 106 64 124 Z', 'stroke-width': 4 }],
    ['rect', styles.board!, { x: 52, y: 168, width: 132, height: 10, rx: 5, 'stroke-width': 3 }],
    ['circle', styles.wheel!, { cx: 74, cy: 183, r: 7, 'stroke-width': 4, 'data-part': 'wheel' }],
    ['circle', styles.wheel!, { cx: 162, cy: 183, r: 7, 'stroke-width': 4, 'data-part': 'wheel' }],
    ['ellipse', styles.racer!, { cx: 116, cy: 140, rx: 80, ry: 32, 'stroke-width': 4 }],
    ['circle', styles.racer!, { cx: 186, cy: 98, r: 30, 'stroke-width': 4 }],
    ['path', styles.racer!, { d: 'M92 138 Q118 116 152 136 Q122 158 92 138 Z', 'stroke-width': 4 }],
    [
      'path',
      styles.orange!,
      { d: 'M212 92 Q240 94 240 104 Q228 116 210 112 Z', 'stroke-width': 4 },
    ],
    ...(eyes ? ([['circle', styles.ink!, { cx: 196, cy: 90, r: 5 }]] as Shape[]) : []),
  ],
  chair: () => [
    ['rect', styles.shark!, { x: 106, y: 122, width: 12, height: 54, 'stroke-width': 3 }],
    ['path', styles.line!, { d: 'M52 180 L112 174 L172 180', 'stroke-width': 7 }],
    ['circle', styles.shark!, { cx: 52, cy: 182, r: 8, 'stroke-width': 4, 'data-part': 'wheel' }],
    ['circle', styles.shark!, { cx: 112, cy: 182, r: 8, 'stroke-width': 4, 'data-part': 'wheel' }],
    ['circle', styles.shark!, { cx: 172, cy: 182, r: 8, 'stroke-width': 4, 'data-part': 'wheel' }],
    ['rect', styles.racer!, { x: 48, y: 104, width: 136, height: 22, rx: 11, 'stroke-width': 4 }],
    ['rect', styles.racer!, { x: 162, y: 34, width: 38, height: 76, rx: 14, 'stroke-width': 4 }],
  ],
  caterpillar: (eyes) => [
    [
      'path',
      styles.line!,
      {
        d: 'M36 150 V186 M72 148 V186 M108 150 V186 M144 148 V186 M186 144 V186',
        'stroke-width': 5,
      },
    ],
    ['circle', styles.racer!, { cx: 36, cy: 132, r: 22, 'stroke-width': 4 }],
    ['circle', styles.racer!, { cx: 72, cy: 128, r: 24, 'stroke-width': 4 }],
    ['circle', styles.racer!, { cx: 108, cy: 130, r: 24, 'stroke-width': 4 }],
    ['circle', styles.racer!, { cx: 144, cy: 128, r: 24, 'stroke-width': 4 }],
    ['path', styles.line!, { d: 'M176 92 L166 66 M200 90 L210 66', 'stroke-width': 5 }],
    ['circle', styles.racer!, { cx: 166, cy: 64, r: 6, 'stroke-width': 3 }],
    ['circle', styles.racer!, { cx: 210, cy: 64, r: 6, 'stroke-width': 3 }],
    ['circle', styles.racer!, { cx: 188, cy: 116, r: 30, 'stroke-width': 4 }],
    ...(eyes
      ? ([
          ['circle', styles.ink!, { cx: 178, cy: 110, r: 4.5 }],
          ['circle', styles.ink!, { cx: 198, cy: 110, r: 4.5 }],
        ] as Shape[])
      : []),
    ['path', styles.line!, { d: 'M176 126 Q188 140 202 126', 'stroke-width': 4 }],
  ],
};

/** The rider's scarf, on the head's 100 grid, under the chin and out behind. */
const SCARF: readonly Shape[] = [
  ['path', styles.band!, { d: 'M34 74 Q4 60 -36 72 L-32 88 Q2 78 34 84 Z', 'stroke-width': 4 }],
  ['path', styles.stripe!, { d: 'M-6 66 L-2 82 M-22 69 L-18 85', 'stroke-width': 5 }],
  ['rect', styles.band!, { x: 30, y: 68, width: 40, height: 13, rx: 6.5, 'stroke-width': 4 }],
];

const TROPHY: readonly Shape[] = [
  [
    'path',
    styles.line!,
    { d: 'M16 12 Q4 12 6 22 Q8 32 20 32 M56 12 Q68 12 66 22 Q64 32 52 32', 'stroke-width': 4 },
  ],
  ['path', styles.sun!, { d: 'M16 6 H56 V18 Q56 38 36 40 Q16 38 16 18 Z', 'stroke-width': 4 }],
  ['rect', styles.sun!, { x: 31, y: 39, width: 10, height: 9, 'stroke-width': 3 }],
  ['rect', styles.board!, { x: 20, y: 47, width: 32, height: 10, rx: 3, 'stroke-width': 3 }],
];

export interface Racer {
  /** 240 by 200 on its grid; size it with width and height. */
  readonly el: SVGSVGElement;
  readonly face: Head;
  /** The mount, without its rider, to wobble or spin. */
  readonly mount: SVGGElement;
  /** The rider's holder, leaning back when pulling. */
  readonly rider: SVGGElement;
  readonly look: RacerLook;
  setMood(mood: Mood): void;
  setPose(pose: Pose): void;
  setSweat(on: boolean): void;
  setTrophy(on: boolean): void;
}

/**
 * A racer on their mount, from the canvas's Racer: the mount in the
 * racer's colour, their extra, and the rider, the kit's head on land with a
 * shirt in the racer's colour, holding on in `pose`.
 */
export function racer(
  look: RacerLook,
  {
    face: faceLook,
    number,
    mood = 'calm',
    pose = 'hold',
  }: { face: Look; number: number; mood?: Mood; pose?: Pose },
): Racer {
  const spec = SPEC[look.mount];
  const [sx, sy] = spec.saddle;
  const el = drawing(RACER.width, RACER.height);
  el.dataset.part = 'racer';
  el.dataset.mount = look.mount;
  el.dataset.colour = look.colour;
  el.dataset.extra = look.extra;
  el.style.setProperty('--racer', `var(--color-${look.colour})`);
  el.style.setProperty('--band', `var(--color-${look.colour === 'sun' ? 'tomato' : 'sun'})`);

  const googly = look.extra === 'googly';
  const mount = group(el, 'mount', MOUNT_SHAPES[look.mount](!googly));

  if (look.extra === 'number') {
    const [x, y] = spec.roundel;
    const roundel = group(mount, 'number', [
      ['circle', styles.paper!, { cx: x, cy: y, r: 15.5, 'stroke-width': 3 }],
    ]);
    const text = roundel.appendChild(document.createElementNS(SVG, 'text'));
    text.setAttribute('class', styles.number!);
    text.setAttribute('x', String(x));
    text.setAttribute('y', String(y));
    text.textContent = String(number);
  }
  if (googly) {
    group(
      mount,
      'googly',
      spec.googly.flatMap(([x, y, r, px, py]) => {
        const k = r / 12;
        return [
          ['circle', styles.paper!, { cx: x, cy: y, r: 10.5 * k, 'stroke-width': 2.5 * k }],
          ['circle', styles.ink!, { cx: x + px * k, cy: y + py * k, r: 4.6 * k }],
        ] as Shape[];
      }),
    );
  }
  if (look.extra === 'tophat') {
    const [x, y] = spec.hat;
    const hat = group(mount, 'tophat', [
      ['rect', styles.ink!, { x: 7, y: 2, width: 22, height: 24, rx: 2, 'stroke-width': 2 }],
      ['rect', styles.band!, { x: 7, y: 15, width: 22, height: 6, 'stroke-width': 2 }],
      ['rect', styles.inkFill!, { x: 1, y: 24, width: 34, height: 7, rx: 3.5 }],
    ]);
    hat.setAttribute('transform', `translate(${x - 18} ${y - 30})`);
  }

  // The rider: the kit's head in a holder that leans from the shirt's foot.
  const rider = group(el, 'rider');
  rider.setAttribute('transform', `translate(${sx - 36} ${sy - RIDER.foot})`);
  const lean = group(rider, 'lean');
  const face = head(faceLook, { mood, ring: false, land: true });
  face.el.style.setProperty('--shirt', `var(--color-${look.colour})`);
  face.el.setAttribute('width', String(RIDER.size));
  face.el.setAttribute('height', String(RIDER.size));
  lean.append(face.el);
  if (look.extra === 'scarf') {
    const scarf = lean.appendChild(drawing(100, 100, SCARF));
    scarf.dataset.part = 'scarf';
    scarf.setAttribute('width', String(RIDER.size));
    scarf.setAttribute('height', String(RIDER.size));
  }

  // Arms, reins and hands, over the rider and the mount.
  const hands = group(el, 'hands');
  const [arms, reins] = draw(hands, [
    ['path', styles.line!, { d: 'M0 0', 'stroke-width': 5 }],
    ['path', styles.line!, { d: 'M0 0', 'stroke-width': 4 }],
  ]) as [SVGElement, SVGElement];
  reins.dataset.part = 'reins';
  const fists = draw(hands, [
    ['circle', styles.skin!, { cx: 0, cy: 0, r: 4.5, 'stroke-width': 2.5 }],
    ['circle', styles.skin!, { cx: 0, cy: 0, r: 4.5, 'stroke-width': 2.5 }],
  ]);
  hands.style.setProperty('--skin', `var(--color-skin-${faceLook.skin})`);

  const trophy = drawing(72, 60, TROPHY);
  trophy.dataset.part = 'trophy';
  trophy.setAttribute('x', String(sx - 36));
  trophy.setAttribute('y', String(sy - 132));
  trophy.setAttribute('width', '72');
  trophy.setAttribute('height', '60');
  el.append(trophy);
  show(trophy, false);

  let current = { mood, pose };
  const setPose = (next: Pose) => {
    current = { ...current, pose: next };
    const party = next === 'party' || current.mood === 'party';
    const held: Point[] = [];
    let armPath = '';
    let reinPath = '';
    if (next === 'hold') {
      const hand = spec.hold ?? [sx + 50, sy - 8];
      armPath = `M${sx + 20} ${sy - 19} L${hand[0]} ${hand[1]}`;
      held.push(hand);
      if (spec.reins) {
        const sag = Math.max(hand[1], spec.reins[1]) + 16;
        const mid = Math.round((hand[0] + spec.reins[0]) / 2);
        reinPath = `M${hand[0]} ${hand[1]} Q${mid} ${sag} ${spec.reins[0]} ${spec.reins[1]}`;
      }
    } else if (next === 'wave') {
      const hand: Point = [sx + 38, sy - 76];
      armPath = `M${sx + 20} ${sy - 19} L${hand[0]} ${hand[1]}`;
      held.push(hand);
    } else if (next === 'pull') {
      const one: Point = [sx + 28, sy - 4];
      const two: Point = [sx + 22, sy - 1];
      armPath =
        `M${sx + 16} ${sy - 23} L${one[0]} ${one[1]} ` +
        `M${sx - 23} ${sy - 14} L${two[0]} ${two[1]}`;
      held.push(one, two);
      if (spec.reins) reinPath = `M${one[0]} ${one[1]} L${spec.reins[0]} ${spec.reins[1]}`;
    }
    arms.setAttribute('d', armPath || 'M0 0');
    show(arms, armPath !== '');
    reins.setAttribute('d', reinPath || 'M0 0');
    show(reins, reinPath !== '' && !party);
    fists.forEach((fist, i) => {
      const hand = held[i];
      show(fist, hand !== undefined);
      if (hand) {
        fist.setAttribute('cx', String(hand[0]));
        fist.setAttribute('cy', String(hand[1]));
      }
    });
    lean.setAttribute(
      'transform',
      next === 'pull' ? `rotate(${RIDER.lean} 36 ${RIDER.foot})` : 'rotate(0 36 81)',
    );
    el.dataset.pose = next;
  };

  const racerDrawn: Racer = {
    el,
    face,
    mount,
    rider,
    look,
    setMood(next) {
      current = { ...current, mood: next };
      face.setMood(next);
      el.dataset.mood = next;
      setPose(current.pose);
    },
    setPose,
    setSweat(on) {
      face.setSweat(on);
      el.dataset.sweat = String(on);
    },
    setTrophy(on) {
      show(trophy, on);
      el.dataset.trophy = String(on);
    },
  };
  racerDrawn.setMood(mood);
  racerDrawn.setPose(pose);
  return racerDrawn;
}
