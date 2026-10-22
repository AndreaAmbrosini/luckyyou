// The cartoon people every show uses: a head with a mood, an accessory and,
// in the water, a swim ring. Drawn as in the Design canvas's "Parts that every
// frame imports", on a 100 by 100 grid, with every colour from tokens.css.

import styles from './characters.module.css';
import { shuffle } from './random';

export type Mood = 'calm' | 'worried' | 'scared' | 'happy' | 'party';
export type Accessory = 'cap' | 'goggles' | 'snorkel';
export type Colour = 'tomato' | 'sun' | 'mint' | 'grape' | 'pink' | 'orange';

/** How one person looks for a whole show. */
export interface Look {
  readonly skin: 1 | 2 | 3 | 4 | 5 | 6;
  readonly accessory: Accessory;
  /** The cap's or the snorkel's colour. */
  readonly colour: Colour;
  readonly ring: Colour;
}

const SKINS = [1, 2, 3, 4, 5, 6] as const;
const ACCESSORIES: readonly Accessory[] = ['cap', 'goggles', 'snorkel'];
const COLOURS: readonly Colour[] = ['tomato', 'sun', 'mint', 'grape', 'pink', 'orange'];

/**
 * A look for each person, dealt from shuffled decks so skin tones,
 * accessories and colours vary as much as the head count allows.
 */
export function handOutLooks(names: readonly string[], random: () => number): Map<string, Look> {
  const skins = shuffle(SKINS, random);
  const accessories = shuffle(ACCESSORIES, random);
  const colours = shuffle(COLOURS, random);
  return new Map(
    names.map((name, index) => [
      name,
      {
        skin: skins[index % skins.length]!,
        accessory: accessories[index % accessories.length]!,
        colour: colours[index % colours.length]!,
        ring: colours[(index + 3) % colours.length]!,
      },
    ]),
  );
}

type Shape = readonly [tag: string, className: string, attributes: Record<string, string | number>];

interface Part {
  readonly name: string;
  readonly shapes: readonly Shape[];
  /** The moods it shows in; every mood when absent. */
  readonly moods?: readonly Mood[];
  /** Only drawn on a head with this accessory. */
  readonly accessory?: Accessory;
  /** Only drawn in this body; both when absent. */
  readonly body?: 'water' | 'land';
  /** Also shown whenever the arms are raised, in any mood. */
  readonly raised?: boolean;
  /** Only shown while the head sweats. */
  readonly sweat?: boolean;
}

const ALL_BUT_PARTY: readonly Mood[] = ['calm', 'worried', 'scared', 'happy'];

/** Back to front. */
const PARTS: readonly Part[] = [
  {
    // From the shoulders, for a person standing.
    name: 'land-arms',
    body: 'land',
    moods: ['happy', 'party'],
    raised: true,
    shapes: [
      ['path', styles.line, { d: 'M22 86 L2 6 M78 86 L98 6', 'stroke-width': 7 }],
      ['circle', styles.skin, { cx: 2, cy: 6, r: 6, 'stroke-width': 3 }],
      ['circle', styles.skin, { cx: 98, cy: 6, r: 6, 'stroke-width': 3 }],
    ],
  },
  {
    name: 'shirt',
    body: 'land',
    shapes: [
      ['path', styles.shirt, { d: 'M12 112 Q12 74 50 72 Q88 74 88 112 Z', 'stroke-width': 4 }],
    ],
  },
  {
    name: 'arms',
    body: 'water',
    moods: ['happy', 'party'],
    raised: true,
    shapes: [
      ['path', styles.line, { d: 'M24 60 L6 12 M76 60 L94 12', 'stroke-width': 7 }],
      ['circle', styles.skin, { cx: 6, cy: 12, r: 6, 'stroke-width': 3 }],
      ['circle', styles.skin, { cx: 94, cy: 12, r: 6, 'stroke-width': 3 }],
    ],
  },
  { name: 'face', shapes: [['circle', styles.skin, { cx: 50, cy: 44, r: 29, 'stroke-width': 4 }]] },
  {
    name: 'cap',
    accessory: 'cap',
    shapes: [['path', styles.accent, { d: 'M21.3 40 A29 29 0 0 1 78.7 40 Z', 'stroke-width': 4 }]],
  },
  {
    // Sunglasses take the goggles' place in the party mood.
    name: 'goggles',
    accessory: 'goggles',
    moods: ALL_BUT_PARTY,
    shapes: [
      ['path', styles.line, { d: 'M21 46 H79', 'stroke-width': 5 }],
      ['circle', styles.glass, { cx: 40, cy: 46, r: 9, 'stroke-width': 3 }],
      ['circle', styles.glass, { cx: 60, cy: 46, r: 9, 'stroke-width': 3 }],
    ],
  },
  {
    name: 'eyes',
    moods: ['calm', 'worried', 'happy'],
    shapes: [
      ['circle', styles.ink, { cx: 40, cy: 46, r: 3.6 }],
      ['circle', styles.ink, { cx: 60, cy: 46, r: 3.6 }],
    ],
  },
  {
    name: 'wide-eyes',
    moods: ['scared'],
    shapes: [
      ['circle', styles.white, { cx: 39, cy: 45, r: 8, 'stroke-width': 3 }],
      ['circle', styles.white, { cx: 61, cy: 45, r: 8, 'stroke-width': 3 }],
      ['circle', styles.ink, { cx: 39, cy: 46, r: 3.2 }],
      ['circle', styles.ink, { cx: 61, cy: 46, r: 3.2 }],
    ],
  },
  {
    name: 'brows',
    moods: ['worried', 'scared'],
    shapes: [['path', styles.line, { d: 'M31 35 L45 39 M69 35 L55 39', 'stroke-width': 4 }]],
  },
  {
    name: 'sunglasses',
    moods: ['party'],
    shapes: [
      [
        'path',
        styles.ink,
        {
          d:
            'M27 40 H47 V48 A7 7 0 0 1 40 55 H34 A7 7 0 0 1 27 48 Z ' +
            'M53 40 H73 V48 A7 7 0 0 1 66 55 H60 A7 7 0 0 1 53 48 Z M46 43 H54',
          'stroke-width': 3,
        },
      ],
    ],
  },
  {
    name: 'smile',
    moods: ['calm', 'happy'],
    shapes: [['path', styles.line, { d: 'M41 58 Q50 66 59 58', 'stroke-width': 4 }]],
  },
  {
    name: 'frown',
    moods: ['worried'],
    shapes: [['path', styles.line, { d: 'M42 63 Q50 57 58 63', 'stroke-width': 4 }]],
  },
  {
    name: 'scream',
    moods: ['scared'],
    shapes: [['ellipse', styles.ink, { cx: 50, cy: 61, rx: 6, ry: 7.5 }]],
  },
  {
    name: 'grin',
    moods: ['party'],
    shapes: [['path', styles.ink, { d: 'M37 56 Q50 74 63 56 Z', 'stroke-width': 3 }]],
  },
  {
    name: 'snorkel',
    accessory: 'snorkel',
    shapes: [
      ['path', styles.line, { d: 'M82 20 V56 Q82 64 72 62', 'stroke-width': 10 }],
      ['path', styles.accentLine, { d: 'M82 20 V56 Q82 64 72 62', 'stroke-width': 4 }],
    ],
  },
  {
    name: 'ring',
    body: 'water',
    shapes: [
      ['ellipse', styles.ring, { cx: 50, cy: 80, rx: 45, ry: 15, 'stroke-width': 4 }],
      ['path', styles.shine, { d: 'M17 76 Q28 70 44 69', 'stroke-width': 4 }],
    ],
  },
  {
    name: 'sweat',
    sweat: true,
    shapes: [
      [
        'path',
        styles.glass,
        {
          d: 'M84 24 Q90 34 84 38 Q78 34 84 24 Z M16 24 Q22 34 16 38 Q10 34 16 24 Z',
          'stroke-width': 3,
          'stroke-linejoin': 'round',
        },
      ],
    ],
  },
];

const SVG = 'http://www.w3.org/2000/svg';

export interface Head {
  /** Size it with width and height; it is drawn on a 100 by 100 grid. */
  readonly el: SVGSVGElement;
  setMood(mood: Mood): void;
  /** Shows or hides the swim ring. */
  setRing(on: boolean): void;
  /** Raises or lowers the arms, whatever the mood. */
  setRaised(on: boolean): void;
  /** Shows or hides sweat drops, whatever the mood. */
  setSweat(on: boolean): void;
}

/**
 * A cartoon head with `look`, in `mood` (calm unless given), with a swim
 * ring unless `ring` is false. On `land` it wears a shirt instead of a ring
 * and its arms start at the shoulders. Happy and party raise the arms, as
 * does `raised`; party swaps the eyes for sunglasses. `sweat` adds drops.
 */
export function head(
  look: Look,
  {
    mood = 'calm',
    ring = true,
    land = false,
    raised = false,
    sweat = false,
  }: { mood?: Mood; ring?: boolean; land?: boolean; raised?: boolean; sweat?: boolean } = {},
): Head {
  const el = document.createElementNS(SVG, 'svg');
  el.setAttribute('viewBox', '0 0 100 100');
  el.setAttribute('aria-hidden', 'true');
  el.setAttribute('class', styles.head);
  el.style.setProperty('--skin', `var(--color-skin-${look.skin})`);
  el.style.setProperty('--accent', `var(--color-${look.colour})`);
  el.style.setProperty('--ring', `var(--color-${look.ring})`);
  el.style.setProperty('--shirt', `var(--color-${look.ring})`);

  const body = land ? 'land' : 'water';
  const drawn = PARTS.filter(
    (part) =>
      (!part.accessory || part.accessory === look.accessory) && (!part.body || part.body === body),
  ).map((part) => {
    const group = el.appendChild(document.createElementNS(SVG, 'g'));
    group.dataset.part = part.name;
    for (const [tag, className, attributes] of part.shapes) {
      const shape = group.appendChild(document.createElementNS(SVG, tag));
      shape.setAttribute('class', className);
      for (const [key, value] of Object.entries(attributes)) shape.setAttribute(key, String(value));
    }
    return { part, group };
  });

  let current = { mood, ring, raised, sweat };
  const draw = () => {
    for (const { part, group } of drawn) {
      const shown =
        ((part.moods?.includes(current.mood) ?? true) || (part.raised && current.raised)) &&
        (part.name !== 'ring' || current.ring) &&
        (!part.sweat || current.sweat);
      if (shown) group.removeAttribute('display');
      else group.setAttribute('display', 'none');
    }
  };
  draw();

  return {
    el,
    setMood(next) {
      current = { ...current, mood: next };
      draw();
    },
    setRing(on) {
      current = { ...current, ring: on };
      draw();
    },
    setRaised(on) {
      current = { ...current, raised: on };
      draw();
    },
    setSweat(on) {
      current = { ...current, sweat: on };
      draw();
    },
  };
}
