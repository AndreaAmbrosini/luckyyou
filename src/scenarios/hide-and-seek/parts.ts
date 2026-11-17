// The things Hide and Seek draws that aren't people: the living room, the
// furniture people hide behind, the seeker and her lens, the balcony board
// and the winner's crown. Shapes are drawn in a view box and coloured by
// classes in the stylesheet, which keeps every colour a token.

import styles from './hide-and-seek.module.css';
import { BOARD, HORIZON, SEEKER } from './layout';

type Shape = readonly [tag: string, className: string, attributes: Record<string, string | number>];

const SVG = 'http://www.w3.org/2000/svg';

function draw(viewBox: string, shapes: readonly Shape[], className: string): SVGSVGElement {
  const el = document.createElementNS(SVG, 'svg');
  el.setAttribute('viewBox', viewBox);
  el.setAttribute('aria-hidden', 'true');
  el.setAttribute('class', className);
  for (const [tag, name, attributes] of shapes) {
    const shape = el.appendChild(document.createElementNS(SVG, tag));
    shape.setAttribute('class', styles[name] ?? name);
    for (const [key, value] of Object.entries(attributes)) shape.setAttribute(key, String(value));
  }
  return el;
}

const rect = (c: string, x: number, y: number, width: number, height: number, rx = 4): Shape => [
  'rect',
  c,
  { x, y, width, height, rx },
];
const ellipse = (c: string, cx: number, cy: number, rx: number, ry: number, turn = 0): Shape => [
  'ellipse',
  c,
  { cx, cy, rx, ry, transform: `rotate(${turn} ${cx} ${cy})` },
];
const path = (c: string, d: string): Shape => ['path', c, { d }];
const line = (x1: number, y1: number, x2: number, y2: number): Shape => [
  'line',
  'stroke',
  { x1, y1, x2, y2 },
];
const curve = (d: string): Shape => ['path', 'stroke', { d }];
/** A pair of sneakers, in the hider's colour, poking out under the furniture. */
const shoes = (y: number, left = 44, right = 90): Shape[] => [
  rect('tell', left, y, 18, 9, 4),
  rect('tell', right, y, 18, 9, 4),
];

interface Piece {
  /** What of the hider shows: their sneakers, a hand, a cap or a sock. */
  readonly tell: 'sneakers' | 'hand' | 'cap' | 'sock';
  readonly shapes: readonly Shape[];
}

/**
 * Twelve pieces of living-room furniture, each in a 150 by 150 view box in
 * which a hider's head is 100 across with its face centred at (75, 82): every
 * piece is solid over x 25 to 125 and y 38 to 138, so only the tell shows.
 */
const FURNITURE: readonly Piece[] = [
  {
    tell: 'sneakers',
    shapes: [
      // Sofa with cushions
      rect('sky', 14, 36, 122, 72, 14),
      rect('sky', 8, 76, 30, 66, 10),
      rect('sky', 112, 76, 30, 66, 10),
      rect('sky', 28, 94, 94, 44, 8),
      line(75, 98, 75, 136),
      rect('tomato', 38, 50, 30, 30, 6),
      rect('sun', 84, 52, 28, 28, 6),
      rect('dark', 18, 138, 9, 8, 2),
      rect('dark', 123, 138, 9, 8, 2),
      ...shoes(139),
    ],
  },
  {
    tell: 'sneakers',
    shapes: [
      // Armchair with a throw
      rect('grape', 28, 30, 94, 94, 18),
      rect('grape', 12, 72, 34, 70, 12),
      rect('grape', 104, 72, 34, 70, 12),
      rect('pink', 40, 100, 70, 38, 8),
      path('orange', 'M30 32 L84 32 L90 62 L36 62 Z'),
      line(46, 40, 50, 58),
      line(62, 40, 66, 58),
      ...shoes(139),
    ],
  },
  {
    tell: 'cap',
    shapes: [
      // Tall bookcase with books
      rect('bark', 24, 18, 102, 128, 4),
      rect('dark', 31, 25, 88, 36, 2),
      rect('dark', 31, 65, 88, 36, 2),
      rect('dark', 31, 105, 88, 34, 2),
      rect('tomato', 35, 31, 10, 30, 1),
      rect('sun', 47, 35, 9, 26, 1),
      rect('mint', 58, 29, 11, 32, 1),
      rect('sky', 71, 33, 10, 28, 1),
      rect('pink', 83, 30, 9, 31, 1),
      rect('grape', 94, 34, 10, 27, 1),
      rect('orange', 106, 31, 10, 30, 1),
      rect('sea', 35, 72, 12, 29, 1),
      rect('sun', 49, 68, 9, 33, 1),
      rect('tomato', 60, 74, 11, 27, 1),
      rect('mint', 74, 70, 10, 31, 1),
      rect('grape', 86, 72, 12, 29, 1),
      rect('pink', 100, 68, 10, 33, 1),
      rect('orange', 36, 112, 14, 27, 1),
      rect('sky', 52, 110, 10, 29, 1),
      rect('sun', 64, 114, 12, 25, 1),
      rect('mint', 78, 110, 10, 29, 1),
      rect('tomato', 91, 113, 12, 26, 1),
      ellipse('tell', 75, 15, 17, 9),
    ],
  },
  {
    tell: 'sneakers',
    shapes: [
      // Dining table with a long cloth
      rect('bark', 8, 34, 134, 18, 4),
      rect('sky', 20, 50, 110, 92, 6),
      line(48, 56, 48, 136),
      line(75, 56, 75, 136),
      line(102, 56, 102, 136),
      rect('sun', 20, 126, 110, 12, 0),
      ...shoes(140, 42, 90),
    ],
  },
  {
    tell: 'hand',
    shapes: [
      // Big plant in a pot
      ellipse('mint', 40, 74, 16, 38, -25),
      ellipse('mint', 110, 74, 16, 38, 25),
      ellipse('mint', 75, 62, 18, 46, 0),
      ellipse('mint', 56, 84, 15, 34, -12),
      ellipse('mint', 94, 84, 15, 34, 12),
      line(75, 30, 75, 100),
      rect('tomato', 40, 100, 70, 12, 4),
      rect('tomato', 44, 108, 62, 38, 6),
      ellipse('skin', 120, 100, 10, 8),
    ],
  },
  {
    tell: 'hand',
    shapes: [
      // Chest of drawers
      rect('bark', 22, 32, 106, 114, 4),
      rect('orange', 28, 40, 94, 30, 3),
      rect('orange', 28, 74, 94, 30, 3),
      rect('orange', 28, 108, 94, 32, 3),
      ellipse('sun', 75, 55, 5, 5),
      ellipse('sun', 75, 89, 5, 5),
      ellipse('sun', 75, 124, 5, 5),
      ellipse('skin', 46, 30, 9, 7),
      ellipse('skin', 62, 28, 8, 7),
    ],
  },
  {
    tell: 'hand',
    shapes: [
      // Folding screen
      path('sun', 'M22 34 L56 28 L56 142 L22 148 Z'),
      path('orange', 'M56 28 L92 34 L92 148 L56 142 Z'),
      path('sun', 'M92 34 L128 28 L128 142 L92 148 Z'),
      ellipse('pink', 39, 70, 8, 8),
      ellipse('mint', 74, 84, 9, 9),
      ellipse('pink', 110, 70, 8, 8),
      line(39, 90, 39, 130),
      line(110, 90, 110, 130),
      ellipse('skin', 132, 92, 9, 7),
    ],
  },
  {
    tell: 'hand',
    shapes: [
      // Big cardboard box
      path('dark', 'M22 36 L44 18 L56 36 Z'),
      path('dark', 'M128 36 L106 18 L94 36 Z'),
      rect('bark', 26, 36, 98, 108, 3),
      rect('sun', 66, 36, 18, 108, 0),
      rect('paper', 32, 100, 24, 20, 2),
      ellipse('skin', 46, 34, 9, 7),
      ellipse('skin', 104, 34, 9, 7),
    ],
  },
  {
    tell: 'sock',
    shapes: [
      // Laundry basket piled with washing
      ellipse('sky', 52, 52, 26, 22, -10),
      ellipse('orange', 98, 50, 26, 22, 12),
      ellipse('pink', 75, 38, 24, 18, 0),
      rect('paper', 28, 60, 94, 84, 18),
      line(46, 68, 46, 138),
      line(62, 68, 62, 138),
      line(78, 68, 78, 138),
      line(94, 68, 94, 138),
      line(110, 68, 110, 138),
      path('tell', 'M104 48 L116 64 L108 74 L98 64 Z'),
    ],
  },
  {
    tell: 'sneakers',
    shapes: [
      // Coat rack with coats
      rect('bark', 72, 8, 6, 138, 2),
      path('orange', 'M26 34 L74 34 L78 144 L22 144 Z'),
      path('grape', 'M72 34 L124 34 L130 144 L72 144 Z'),
      line(50, 40, 50, 140),
      line(100, 40, 100, 140),
      ellipse('sun', 50, 36, 6, 4),
      ellipse('sun', 100, 36, 6, 4),
      ...shoes(143, 34, 96),
    ],
  },
  {
    tell: 'sock',
    shapes: [
      // Toy chest with the lid up
      rect('tomato', 28, 34, 94, 52, 6),
      rect('orange', 24, 78, 102, 68, 6),
      rect('ink', 24, 104, 102, 4, 0),
      ellipse('sun', 75, 98, 7, 7),
      path('tell', 'M44 80 L56 100 L46 110 L36 98 Z'),
    ],
  },
  {
    tell: 'sneakers',
    shapes: [
      // Blanket teepee
      path('paper', 'M8 146 L75 18 L142 146 Z'),
      path('mint', 'M30 104 L75 18 L120 104 L98 92 L75 108 L52 92 Z'),
      path('pink', 'M45 146 L75 72 L105 146 Z'),
      line(66, 3, 83, 27),
      line(84, 3, 67, 27),
      curve('M36 116 L49 108 L62 120 L75 108 L88 120 L101 108 L114 116'),
      ...shoes(140, 52, 82),
    ],
  },
];

export const FURNITURE_COUNT = FURNITURE.length;

/** A piece of furniture, scaled to the hider behind it, coloured for that hider. */
export function drawFurniture(index: number, skin: number, colour: string): HTMLElement {
  const piece = FURNITURE[index % FURNITURE.length]!;
  const el = document.createElement('div');
  el.className = styles.prop!;
  el.dataset.part = 'prop';
  el.dataset.tell = piece.tell;
  el.style.setProperty('--skin', `var(--color-skin-${skin})`);
  el.style.setProperty('--accent', `var(--color-${colour})`);
  const art = draw('0 0 150 150', piece.shapes, styles.art!);
  art.setAttribute('preserveAspectRatio', 'none');
  el.append(art);
  return el;
}

/** The seeker, seen from the front with her hands over her eyes, or from behind. */
export function drawSeeker(): HTMLElement {
  const seeker = document.createElement('div');
  seeker.className = styles.seeker!;
  seeker.dataset.part = 'seeker';
  seeker.dataset.pose = 'away';
  seeker.style.left = `${SEEKER.x}px`;
  seeker.style.top = `${SEEKER.top}px`;
  seeker.style.width = `${SEEKER.width}px`;
  seeker.append(
    draw(
      '0 0 190 90',
      [
        path('sea', 'M16 90 Q18 52 95 50 Q172 52 174 90 Z'),
        ellipse('seekerSkin', 95, 30, 27, 27),
        path('ink', 'M68 24 Q95 -4 122 24 Q95 10 68 24 Z'),
        ellipse('seekerSkin', 80, 30, 14, 11, -10),
        ellipse('seekerSkin', 110, 30, 14, 11, 10),
        line(72, 26, 88, 26),
        line(102, 26, 118, 26),
        path('seekerSkin', 'M84 56 Q95 66 106 56 Z'),
      ],
      `${styles.art} ${styles.front}`,
    ),
    draw(
      '0 0 190 90',
      [
        path('sea', 'M16 90 Q18 52 95 50 Q172 52 174 90 Z'),
        ellipse('seekerSkin', 67, 34, 5, 7),
        ellipse('seekerSkin', 123, 34, 5, 7),
        ellipse('ink', 95, 30, 28, 28),
        path('tomato', 'M66 28 Q95 -6 124 28 Q95 20 66 28 Z'),
        rect('tomato', 62, 26, 66, 7, 3),
      ],
      `${styles.art} ${styles.back}`,
    ),
  );
  return seeker;
}

/** The seeker's magnifying glass, its glass centred in the box. */
export function drawLens(): HTMLElement {
  const lens = document.createElement('div');
  lens.className = styles.lens!;
  lens.dataset.part = 'lens';
  lens.append(
    draw(
      '-80 -80 160 160',
      [
        ['line', 'handle', { x1: 48, y1: 48, x2: 90, y2: 90 }],
        ['circle', 'glass', { cx: 0, cy: 0, r: 64 }],
        ['circle', 'rim', { cx: 0, cy: 0, r: 64 }],
        ['path', 'shine', { d: 'M-40 -16 Q-32 -40 -10 -46' }],
      ],
      styles.art!,
    ),
  );
  return lens;
}

/** The living room: a wall with pictures, shelves and a lamp, planks and a rug. */
export function drawRoom(): SVGSVGElement {
  const planks: Shape[] = [];
  for (let x = 40; x < 1280; x += 160) planks.push(line(x, HORIZON, x - 70, 720));
  return draw(
    '0 0 1280 720',
    [
      rect('wall', 0, 0, 1280, HORIZON, 0),
      rect('floor', 0, HORIZON, 1280, 720 - HORIZON, 0),
      line(0, HORIZON, 1280, HORIZON),
      ...planks,
      // Left rug (under sofa zone):
      rect('rug', 80, 440, 480, 220, 24),
      rect('rugIn', 98, 458, 444, 184, 16),
      curve('M118 550 L168 480 L218 620 L268 480 L318 620 L368 480 L418 620 L468 480 L518 550'),
      // Left picture frame (landscape):
      rect('frame', 70, 94, 130, 80, 6),
      rect('sky', 80, 104, 110, 60, 3),
      path('hill', 'M80 164 L114 130 L136 150 L156 134 L190 164 Z'),
      // Center ceiling pendant lamp:
      line(640, 0, 640, 80),
      path('sun', 'M612 110 L668 110 L652 80 L628 80 Z'),
      ellipse('paper', 640, 110, 28, 6),
      // Left wall shelf with books/vases:
      rect('bark', 240, 140, 180, 10, 3),
      rect('pink', 252, 108, 28, 32, 4),
      rect('sun', 288, 104, 26, 36, 4),
      ellipse('sky', 340, 126, 10, 14),
      path('orange', 'M368 140 L374 114 L392 114 L398 140 Z'),
      // Center clock on wall:
      ellipse('frame', 640, 160, 22, 22),
      ellipse('paper', 640, 160, 18, 18),
      line(640, 160, 640, 148),
      line(640, 160, 650, 160),
      // Right wall shelf:
      rect('bark', 860, 140, 180, 10, 3),
      ellipse('paper', 888, 124, 14, 16),
      rect('mint', 920, 110, 24, 30, 4),
      rect('grape', 952, 116, 22, 24, 4),
      rect('tomato', 982, 104, 24, 36, 4),
      // Right picture frame (sun):
      rect('frame', 1080, 94, 130, 80, 6),
      rect('sky', 1090, 104, 110, 60, 3),
      ellipse('sun', 1145, 134, 16, 16),
    ],
    styles.room!,
  );
}

/** The balcony's board, at its own height and over the heads of those found. */
export function drawBoard(): HTMLElement {
  const board = document.createElement('div');
  board.className = styles.board!;
  board.style.top = `${BOARD.top}px`;
  board.style.height = `${BOARD.bottom - BOARD.top}px`;
  const label = board.appendChild(document.createElement('span'));
  label.textContent = 'FOUND · SAFE';
  return board;
}

export function drawCrown(): HTMLElement {
  const crown = document.createElement('div');
  crown.className = styles.crown!;
  crown.append(
    draw(
      '0 0 100 70',
      [
        path('sun', 'M8 62 L4 14 L30 38 L50 6 L70 38 L96 14 L92 62 Z'),
        ellipse('tomato', 50, 46, 7, 7),
        ellipse('sea', 24, 50, 5, 5),
        ellipse('mint', 76, 50, 5, 5),
      ],
      styles.art!,
    ),
  );
  return crown;
}
