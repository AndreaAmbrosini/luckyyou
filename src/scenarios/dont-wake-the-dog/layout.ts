// Where everyone stands and walks. Those at risk stand on the grass either
// side of the gate, in one row up to 8 people and two from 9; a crosser steps
// back into the lane behind them, tiptoes to the dog, goes over its head or
// tail and along its back, and out through the gate to a spot behind the
// fence. In stage pixels (1280 × 720), from the handover's spike.

import { nameTag, speechAt, speechBox, STAGE, stagePx, type Box } from '../../scenario-kit';
import type { Key, Place, Plan } from './plan';

/** Where someone is, and how big their head is: the head's box is x − size/2 … x + size/2, y − 0.8·size … y + 0.2·size. */
export interface Spot {
  readonly x: number;
  readonly y: number;
  readonly size: number;
}

/** -1 for the left side of the stage, 1 for the right. */
export type Side = -1 | 1;

/**
 * The line of people at risk: in one row up to 8 people, from the inner
 * end of each side (x 440 and 840) outwards, at most 175 apart and no
 * further out than x 90 and 1190. From 9, two rows, alternating from the
 * inner end, which is in the back row, from x 430 and 850 to 60 and 1220.
 */
export const LINE = {
  one: { y: 620, inner: 440, outer: 90, apart: 175 },
  two: { back: 545, front: 660, inner: 430, outer: 60 },
} as const;

/** How many stand on the left: the first half of the line, the bigger one. */
export const leftCount = (people: number) => Math.ceil(people / 2);

/** Which side of the gate seat `index` of `people` is on. */
export const sideOfSeat = (index: number, people: number): Side =>
  index < leftCount(people) ? -1 : 1;

/** Whether `people` stand in two rows. */
export const twoRows = (people: number) => people >= 9;

/** Heads of those standing at risk: 120 with 6 or fewer at risk, 100 from 7. */
export const riskHead = (atRisk: number) => (atRisk <= 6 ? 120 : 100);

/** The final three grow this much where they stand, name tags and all. */
export const GROWN = 1.2;

/** Where seat `index` of `people` is, left to right along the line; its head is sized for `atRisk`. */
export function seat(index: number, people: number, atRisk = people): Spot {
  const left = leftCount(people);
  const side = sideOfSeat(index, people);
  const own = side === -1 ? left : people - left;
  // How far in from the inner end of its side: 0 for the innermost.
  const k = side === -1 ? left - 1 - index : index - left;
  const size = riskHead(atRisk);
  if (!twoRows(people)) {
    const { y, inner, outer, apart } = LINE.one;
    const step = own <= 1 ? 0 : Math.min(apart, (inner - outer) / (own - 1));
    return { x: mirror(side, inner - k * step), y, size };
  }
  const { back, front, inner, outer } = LINE.two;
  const step = own <= 1 ? 0 : (inner - outer) / (own - 1);
  return { x: mirror(side, inner - k * step), y: k % 2 === 0 ? back : front, size };
}

/** An x on the left side mirrored to `side`. */
const mirror = (side: Side, x: number) => (side === -1 ? x : STAGE.width - x);

/**
 * The lane behind the line: crossers tiptoe along it at `y`, heads `size`,
 * to its end on their side, x 430 or 850. With two rows it runs higher,
 * clear of the back row.
 */
export function lane(people: number): { y: number; size: number; end: (side: Side) => number } {
  const two = twoRows(people);
  return {
    y: two ? 415 : 480,
    size: two ? 90 : 100,
    end: (side) => mirror(side, 430),
  };
}

/** Over the dog's head (left) or tail (right), on its back behind it, and in the gateway. */
export const OVER: Readonly<Record<Side, Spot>> = {
  [-1]: { x: 520, y: 372, size: 98 },
  [1]: { x: 800, y: 392, size: 98 },
};
export const BACK: Spot = { x: 660, y: 432, size: 96 };
export const GATEWAY: Spot = { x: 640, y: 330, size: 90 };
/** The unlucky person at the end, hopped down in front of the dog. */
export const FRONT: Spot = { x: 520, y: 640, size: 130 };

/**
 * Behind the fence, the safe stand at `y` with heads `size`, the shirt
 * ending above the picket points; they walk along behind it at `walk`.
 * Spots fill from the outer end of each side, `apart` px apart at most, up
 * to `inner` from the stage's middle, clear of the arch.
 */
export const BEHIND = { y: 270, walk: 340, size: 84, outer: 70, inner: 470, apart: 135 } as const;

/** A name tag is this much of its head, and never under the kit's smallest. */
export const TAG_SHARE = 0.28;
export const tagSize = (size: number) =>
  Math.max(stagePx('--size-stage-tag-min'), Math.round(TAG_SHARE * size));

/** Space kept between neighbouring name tags. */
const TAG_GAP = 12;
/** A walking crosser's tag may be this wide, so a long name stays on one line. */
const WALKING_TAG = 260;

/** How wide a name tag may be, and its size: `nameTag`'s options. */
export interface TagFit {
  readonly size: number;
  readonly maxWidth: number;
}

/** How the kit sets a name tag: its size, the width it allows, its lines, and how wide and high it is drawn. */
export interface TagSet extends TagFit {
  readonly lines: 1 | 2;
  readonly width: number;
  readonly height: number;
}

/** How a show sets `name`'s tag for `fit`: the kit's sizes and its width as drawn. */
export type SetTag = (name: string, fit: TagFit) => TagSet;

/** The kit's name tag for `name`, on the chest of a head box, shrinking to 22 before it wraps. */
export const nameTagFor = (name: string, fit: TagFit): HTMLElement =>
  nameTag(name, { ...fit, chest: true });

/** What the kit set `el`, `name`'s tag, at, and its size estimated from its letters and lines. */
export function tagSetOf(name: string, el: HTMLElement): TagSet {
  const size = Number.parseFloat(el.style.getPropertyValue('--tag-size'));
  const maxWidth = Number.parseFloat(el.style.maxWidth);
  const lines = el.dataset.lines === '2' ? 2 : 1;
  return {
    size,
    maxWidth,
    lines,
    width: tagContentWidth(name, size, maxWidth, lines),
    height: (1.1 * lines + 0.15) * size + 2 * stagePx('--line'),
  };
}

const estimates = new Map<string, TagSet>();
/** How the kit sets `name`'s tag for `fit`, its size estimated, where nothing is drawn. */
export const estimateTag: SetTag = (name, fit) => {
  const key = `${name}|${fit.size}|${fit.maxWidth}`;
  let set = estimates.get(key);
  if (!set) estimates.set(key, (set = tagSetOf(name, nameTagFor(name, fit))));
  return set;
};

const graphemes = new Intl.Segmenter('en', { granularity: 'grapheme' });

/**
 * A name tag's width as the kit sets it, estimated where nothing can
 * measure it: a single line is as wide as its name (0.6 em a character, as
 * the kit counts without a canvas), the padding and the borders, and never
 * wider than `set`; two lines take all of `set`.
 */
export function tagContentWidth(name: string, size: number, set: number, lines: 1 | 2): number {
  if (lines === 2) return set;
  const letters = [...graphemes.segment(name)].length;
  return Math.min(set, Math.ceil(letters * 0.6 * size + 0.6 * size + 2 * stagePx('--line') + 2));
}

/** Which layer someone is drawn in: behind the fence, behind the dog, in front, or over everyone. */
export type Layer = 'fence' | 'dog' | 'front' | 'top';

/** A name tag as drawn at a moment: its fit, lines and the box it takes. */
export interface DrawnTag extends TagFit {
  readonly lines: 1 | 2;
  /** Moves the tag sideways to keep it on the stage. */
  readonly shift: number;
  readonly box: Box;
}

/** Seconds a seated head takes to change size: on growing for the final three, or to 120. */
export const GROW = 0.4;
/** A tiptoe bobs this high, once every `every` seconds; a hop rises `hop`. */
export const BOB = { height: 10, every: 0.16, hop: 90 } as const;

const PLACE_LAYER: Readonly<Record<Place, Layer>> = {
  seat: 'front',
  lane: 'front',
  'lane-end': 'front',
  over: 'front',
  back: 'dog',
  gateway: 'dog',
  behind: 'fence',
  fence: 'fence',
  front: 'top',
};

const sine = (u: number) => 0.5 - 0.5 * Math.cos(Math.PI * u);

/**
 * Where everyone is over the show, from `plan`: seated along the line at
 * risk, their heads 100 or 120 as the count says and the final three
 * GROWN from the spotlight; on their way past the dog, key by key; behind
 * the fence once safe; the unlucky person in front at the end. `setTag`
 * says how the show sets each tag; `calm` (reduced motion) drops the bob
 * and the hop's rise. Every tag is set before the show starts.
 */
export function placings(plan: Plan, setTag: SetTag = estimateTag, calm = false) {
  const people = plan.order.length;
  const index = new Map(plan.order.map((name, k) => [name, k]));
  const sideOf = (name: string) => sideOfSeat(index.get(name)!, people);
  const way = lane(people);
  const throughs = plan.turns.flatMap((turn) =>
    turn.through === null ? [] : [{ at: turn.through, by: turn.by }],
  );
  /** The moments seated heads change: as each crosser counts as safe, and at the spotlight. */
  const changes = [...new Set([...throughs.map((each) => each.at), plan.spotlight])]
    .filter((at) => Number.isFinite(at))
    .sort((a, b) => a - b);
  const stageAt = (t: number) => changes.filter((at) => at <= t + 1e-9).length;
  /** Who is seated at risk at stage k. */
  const risking = (k: number) => {
    const at = k === 0 ? -Infinity : changes[k - 1]!;
    const safe = new Set(
      throughs.filter((each) => each.at <= at + 1e-9).flatMap((each) => each.by),
    );
    return plan.order.filter((name) => !safe.has(name));
  };
  /** Each seat's spot and tag at stage k. */
  const seats = changes.length + 1;
  const seatings = Array.from({ length: seats }, (_, k) => {
    const names = risking(k);
    const grown = k > 0 && changes[k - 1]! >= plan.spotlight - 1e-9;
    const spots = new Map(
      names.map((name) => {
        const spot = seat(index.get(name)!, people, names.length);
        return [name, grown ? { ...spot, size: spot.size * GROWN } : spot];
      }),
    );
    const fits = new Map(
      names.map((name) => {
        const spot = spots.get(name)!;
        const neighbours = names
          .filter((other) => other !== name)
          .map((other) => spots.get(other)!)
          .filter((other) => !twoRows(people) || other.y === spot.y)
          .map((other) => Math.abs(other.x - spot.x) - TAG_GAP);
        const cap = Math.max(198, Math.round(2.2 * spot.size));
        return [
          name,
          { size: tagSize(spot.size), maxWidth: Math.floor(Math.min(cap, ...neighbours)) },
        ];
      }),
    );
    return { spots, fits };
  });
  const seatAt = (name: string, t: number): { spot: Spot; fit: TagFit } => {
    const k = stageAt(t);
    const now = seatings[k]!;
    const spot = now.spots.get(name) ?? seat(index.get(name)!, people, risking(k).length);
    const fit = now.fits.get(name) ?? { size: tagSize(spot.size), maxWidth: 198 };
    if (k === 0) return { spot, fit };
    const u = Math.min(1, (t - changes[k - 1]!) / GROW);
    const before = seatings[k - 1]!;
    const was = before.spots.get(name);
    if (u >= 1 || !was) return { spot, fit };
    const wasFit = before.fits.get(name)!;
    const mix = (a: number, b: number) => a + (b - a) * sine(u);
    return {
      spot: { x: spot.x, y: spot.y, size: mix(was.size, spot.size) },
      fit: { size: mix(wasFit.size, fit.size), maxWidth: mix(wasFit.maxWidth, fit.maxWidth) },
    };
  };

  // Behind the fence: each side's safe, outer first, in the order they get there.
  const behindFit = (count: number): TagFit => {
    const apart =
      count <= 1
        ? BEHIND.apart
        : Math.min(BEHIND.apart, (BEHIND.inner - BEHIND.outer) / (count - 1));
    return { size: tagSize(BEHIND.size), maxWidth: Math.max(110, Math.floor(apart - TAG_GAP)) };
  };
  const fenceX = new Map<string, number>();
  const fenceFit = new Map<string, TagFit>();
  for (const side of [-1, 1] as const) {
    const own = plan.safe.filter((name) => sideOf(name) === side);
    const fit = behindFit(own.length);
    const widths = own.map((name) => setTag(name, fit).width);
    const xs = fenceXs(widths, own.length);
    own.forEach((name, k) => {
      fenceX.set(name, mirror(side, xs[k]!));
      fenceFit.set(name, fit);
    });
  }

  /** Where `place` is for `name` at `t`, and their tag's fit there. */
  const placed = (name: string, place: Place, t: number): { spot: Spot; fit: TagFit } => {
    const side = sideOf(name);
    const walking = (spot: Spot) => ({
      spot,
      fit: { size: tagSize(spot.size), maxWidth: WALKING_TAG },
    });
    switch (place) {
      case 'seat':
        return seatAt(name, t);
      case 'lane':
        return walking({ x: seat(index.get(name)!, people).x, y: way.y, size: way.size });
      case 'lane-end':
        return walking({ x: way.end(side), y: way.y, size: way.size });
      case 'over':
        return walking(OVER[side]);
      case 'back':
        return walking(BACK);
      case 'gateway':
        return walking(GATEWAY);
      case 'behind':
        return {
          spot: { x: fenceX.get(name)!, y: BEHIND.walk, size: BEHIND.size },
          fit: fenceFit.get(name)!,
        };
      case 'fence':
        return {
          spot: { x: fenceX.get(name)!, y: BEHIND.y, size: BEHIND.size },
          fit: fenceFit.get(name)!,
        };
      case 'front':
        return { spot: FRONT, fit: { size: tagSize(FRONT.size), maxWidth: 360 } };
    }
  };

  /** The keys around `t` on `name`'s way: the last one passed and the next. */
  const around = (name: string, t: number): [Key | undefined, Key | undefined] => {
    const keys = plan.paths.get(name) ?? [];
    let k = 0;
    while (k < keys.length && keys[k]!.at <= t + 1e-9) k++;
    return [keys[k - 1], keys[k]];
  };

  const at = (
    name: string,
    t: number,
  ): { spot: Spot; fit: TagFit; layer: Layer; lines?: 1 | 2 } => {
    const [from, to] = around(name, t);
    if (!from || !to || from.place === to.place) {
      const place = from?.place ?? 'seat';
      return { ...placed(name, place, t), layer: PLACE_LAYER[place] };
    }
    const a = placed(name, from.place, from.at);
    const b = placed(name, to.place, to.at);
    const linear = (t - from.at) / (to.at - from.at);
    const u = to.tiptoe ? linear : sine(linear);
    const mix = (p: number, q: number) => p + (q - p) * u;
    let y = mix(a.spot.y, b.spot.y);
    if (to.tiptoe && !calm)
      y -= BOB.height * Math.abs(Math.sin((Math.PI * (t - from.at)) / BOB.every));
    if (to.hop && !calm) y -= BOB.hop * Math.sin(Math.PI * linear);
    const layer: Layer =
      to.place === 'front'
        ? 'top'
        : PLACE_LAYER[to.place] === 'fence'
          ? 'fence'
          : to.place === 'back' || to.place === 'gateway' || from.place === 'back'
            ? 'dog'
            : 'front';
    const linesOf = (fit: TagFit) => setTag(name, fit).lines;
    return {
      spot: { x: mix(a.spot.x, b.spot.x), y, size: mix(a.spot.size, b.spot.size) },
      fit: { size: mix(a.fit.size, b.fit.size), maxWidth: mix(a.fit.maxWidth, b.fit.maxWidth) },
      layer,
      lines: linesOf(a.fit) === 2 || linesOf(b.fit) === 2 ? 2 : 1,
    };
  };

  /** `name`'s tag as drawn at `t`. */
  const tag = (name: string, t: number): DrawnTag => {
    const now = at(name, t);
    const set = setTag(name, {
      size: Math.round(now.fit.size),
      maxWidth: Math.round(now.fit.maxWidth),
    });
    const lines = now.lines ?? set.lines;
    const width = lines === 2 && set.lines === 1 ? set.maxWidth : set.width;
    const shift = tagShift(now.spot, width);
    return {
      size: now.fit.size,
      maxWidth: now.fit.maxWidth,
      lines,
      shift,
      box: tagBox(
        now.spot,
        width,
        (1.1 * lines + 0.15) * now.fit.size + 2 * stagePx('--line'),
        shift,
      ),
    };
  };

  // Every tag set before the show.
  for (const name of plan.order) {
    for (const seating of seatings) {
      const fit = seating.fits.get(name);
      if (fit) setTag(name, fit);
    }
  }

  return {
    /** Where `name` is at `t`, and the layer they are drawn in. */
    at: (name: string, t: number) => {
      const { spot, layer } = at(name, t);
      return { spot, layer };
    },
    tag,
    /** Who stands at seat at `t` and is still at risk, with their seated spot. */
    seated: (t: number) => risking(stageAt(t)),
    /** Where `name` stands behind the fence. */
    fence: (name: string): Spot => ({ x: fenceX.get(name)!, y: BEHIND.y, size: BEHIND.size }),
  };
}

/** Where everyone is over a show: `placings`. */
export type Places = ReturnType<typeof placings>;

/**
 * Spots for `count` people along one side behind the fence, from the outer
 * end inwards, for tags `widths` wide: evenly up to BEHIND.apart apart, and
 * further where two tags would come closer than TAG_GAP; a side too long
 * for its room moves out, its outer tag just on the stage.
 */
function fenceXs(widths: readonly number[], count: number): number[] {
  const apart =
    count <= 1 ? BEHIND.apart : Math.min(BEHIND.apart, (BEHIND.inner - BEHIND.outer) / (count - 1));
  const xs: number[] = [];
  for (let k = 0; k < count; k++) {
    const even = BEHIND.outer + k * apart;
    const touching = k === 0 ? -Infinity : xs[k - 1]! + (widths[k - 1]! + widths[k]!) / 2 + TAG_GAP;
    xs.push(Math.max(even, touching));
  }
  const over = (xs.at(-1) ?? 0) - BEHIND.inner;
  if (over <= 0) return xs;
  const room = BEHIND.outer - Math.max(BEHIND.size / 2, (widths[0] ?? 0) / 2);
  return xs.map((x) => x - Math.min(over, room));
}

/** A head's box at `spot`. */
export function headBox(spot: Spot): Box {
  const top = spot.y - 0.8 * spot.size;
  return {
    left: spot.x - spot.size / 2,
    top,
    right: spot.x + spot.size / 2,
    bottom: top + spot.size,
  };
}

/** What is drawn of a person at `spot`: their face and shirt, on the kit's 100 grid 12 to 88 across and 15 to 112 down. */
export function bodyBox(spot: Spot): Box {
  const top = spot.y - 0.8 * spot.size;
  return {
    left: spot.x - 0.38 * spot.size,
    right: spot.x + 0.38 * spot.size,
    top: top + 0.15 * spot.size,
    bottom: top + 1.12 * spot.size,
  };
}

/** A person's face at `spot`: the circle of their head, on the kit's 100 grid at (50, 44), radius 29. */
export function faceBox(spot: Spot): Box {
  const top = spot.y - 0.8 * spot.size;
  return {
    left: spot.x - 0.29 * spot.size,
    right: spot.x + 0.29 * spot.size,
    top: top + 0.15 * spot.size,
    bottom: top + 0.73 * spot.size,
  };
}

/** A name tag `width` wide and `height` high on the chest at `spot`, moved `shift` sideways. */
export function tagBox(spot: Spot, width: number, height: number, shift = 0): Box {
  const top = spot.y - 0.04 * spot.size;
  return {
    left: spot.x + shift - width / 2,
    right: spot.x + shift + width / 2,
    top,
    bottom: top + height,
  };
}

/** How far to move a tag `width` wide sideways, so it stays on the stage. */
export function tagShift(spot: Spot, width: number): number {
  const left = spot.x - width / 2;
  const right = spot.x + width / 2;
  return Math.max(0, -left) + Math.min(0, STAGE.width - right);
}

export function overlap(one: Box, two: Box): boolean {
  return (
    one.left < two.right && two.left < one.right && one.top < two.bottom && two.top < one.bottom
  );
}

const union = (boxes: readonly Box[]): Box => ({
  left: Math.min(...boxes.map((box) => box.left)),
  right: Math.max(...boxes.map((box) => box.right)),
  top: Math.min(...boxes.map((box) => box.top)),
  bottom: Math.max(...boxes.map((box) => box.bottom)),
});

/** The lying dog's face on its drawing: the ends of its nose, muzzle and head circle. */
const FACE_POINTS = [
  [17, 120],
  [26, 112],
  [26, 128],
  [20, 128],
  [50, 107],
  [50, 149],
  [80, 128],
  [42, 112],
  [86, 68],
  [130, 112],
  [86, 156],
] as const;

/**
 * The dog's face on the stage: lying, its head down or lifted (the box
 * round both, so it holds whatever the lift); standing, its head at the
 * front of the jump.
 */
export function dogFace(standing = false): Box {
  if (standing) return { left: 616, right: 730, top: 396, bottom: 500 };
  const a = (16 * Math.PI) / 180;
  const lifted = FACE_POINTS.map(([x, y]) => {
    const [dx, dy] = [x - 130, y - 126];
    return [130 + dx * Math.cos(a) - dy * Math.sin(a), 126 + dx * Math.sin(a) + dy * Math.cos(a)];
  });
  const boxes = [FACE_POINTS, lifted].map((points) =>
    union(points.map(([x, y]) => ({ left: x!, right: x!, top: y!, bottom: y! }))),
  );
  const face = union(boxes);
  return {
    left: 470 + face.left,
    right: 470 + face.right,
    top: 360 + face.top,
    bottom: 360 + face.bottom,
  };
}

/** The caption sticker at the top: bubbles stay below it. */
export const CAPTION_BOTTOM = 116;
/** Space kept between a bubble and the stage's edge. */
const EDGE = 8;

/**
 * Where to anchor a bubble saying `text`: the nearest place to `prefer`
 * whose box is on the stage, below the caption and clear of everything in
 * `avoid`; beside `prefer` as the kit places it when nowhere is.
 */
export function bubbleAt(text: string, prefer: { x: number; y: number }, avoid: readonly Box[]) {
  const candidates: { x: number; y: number; d: number }[] = [];
  for (let x = 0; x <= STAGE.width; x += 16) {
    for (let y = 0; y <= STAGE.height; y += 12) {
      candidates.push({ x, y, d: Math.hypot(x - prefer.x, y - prefer.y) });
    }
  }
  candidates.sort((one, two) => one.d - two.d);
  for (const { x, y } of candidates) {
    const box = speechBox(text, { x, y });
    if (box.left < EDGE || box.right > STAGE.width - EDGE) continue;
    if (box.top < CAPTION_BOTTOM || box.bottom > STAGE.height - EDGE) continue;
    if (avoid.some((other) => overlap(box, other))) continue;
    return { x, y };
  }
  const beside = {
    left: prefer.x - 1,
    right: prefer.x + 1,
    top: prefer.y - 1,
    bottom: prefer.y + 1,
  };
  return speechAt(text, beside, avoid);
}
