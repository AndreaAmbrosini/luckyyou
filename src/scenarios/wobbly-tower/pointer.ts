// The pointers: when each hops to whom, where it is on the way, and when it
// shows. Worked out from the plan's turns, so play.ts can draw it at any time.

import { gsap } from 'gsap';
import { pointerTip, tagBox, TOWER, type Point, type Spot } from './layout';
import { POINTER } from './parts';
import { hopInto, type Turn } from './plan';

/** Seconds the pointer takes to fade in or out. */
const FADE = 0.12;
/** How high the pointer hops between two people of the same row, at most. */
const HOP_HEIGHT = 40;
/** A tossed block flies at least this long, from the whoosh to the thunk. */
export const FLIGHT = 0.4;

/** How long the pointer takes to fade out from its stop over `turn`'s thrower, before the lift. */
export const fadeOf = (turn: Turn) => Math.min(FADE, Math.max(0, turn.lands - turn.stops - FLIGHT));

const ease = { hop: gsap.parseEase('power1.inOut') };

/** A stretch of show seconds. */
interface Span {
  readonly from: number;
  readonly to: number;
}

/** Where the pointer can be, at a spot or anywhere else. */
interface Anchor {
  readonly tip: Point;
  readonly row: Spot['row'] | null;
}

/** One hop of the pointer, from where it was to someone. */
interface Hop {
  readonly leaves: number;
  readonly arrives: number;
  readonly path: readonly Point[];
  /** How high it hops on the way. */
  readonly height: number;
}

/**
 * The pointers' hops, the stops they make and when they show, for the turns.
 * The first pointer picks the first turn of each round; the second, the
 * second turn of a pair. Each starts at `startTip`, over the paper blocks.
 * Each round a pointer fades in where it was as the round starts, hops to
 * each of the turn's decoys in turn and on to the thrower, `hopInto(i)`
 * seconds into stop i, and fades out before they lift the block. Between rows
 * it goes by the tower, and within a row it hops low enough that its box
 * stays clear of the tags.
 */
export function planHops(
  turns: readonly Turn[],
  spotOf: (name: string) => Spot,
  spots: readonly Spot[],
  startTip: Point,
) {
  const back = spots.filter((spot) => spot.row === 'back');
  const front = spots.filter((spot) => spot.row === 'front');
  const backTags = Math.max(...back.map((spot) => tagBox(spot).bottom));
  const frontTop = Math.min(...front.map((spot) => pointerTip(spot).y - POINTER.height));
  const heights: Record<Spot['row'], number> = {
    back: HOP_HEIGHT,
    front:
      back.length === 0 ? HOP_HEIGHT : Math.max(0, Math.min(HOP_HEIGHT, frontTop - backTags - 2)),
  };
  const route = (a: Anchor, b: Anchor): Pick<Hop, 'path' | 'height'> => {
    if (a.row && a.row === b.row) return { path: [a.tip, b.tip], height: heights[a.row] };
    const path = [a.tip, { x: TOWER.x, y: a.tip.y }, { x: TOWER.x, y: b.tip.y }, b.tip].filter(
      (point, index, all) =>
        index === 0 || point.x !== all[index - 1]!.x || point.y !== all[index - 1]!.y,
    );
    return { path, height: 0 };
  };

  const pointers = [0, 1].map(() => ({
    hops: [] as Hop[],
    stays: [] as { from: number; to: number; name: string }[],
    shows: [] as (Span & { fade: number })[],
    here: { tip: startTip, row: null } as Anchor,
  }));
  turns.forEach((turn, index) => {
    const second = index > 0 && turns[index - 1]!.round === turn.round;
    const pointer = pointers[second ? 1 : 0]!;
    const targets = [...turn.decoys, { name: turn.by, at: turn.stops }];
    pointer.shows.push({ from: turn.from, to: turn.stops, fade: fadeOf(turn) });
    targets.forEach(({ name, at }, i) => {
      const leaves = at - hopInto(i);
      // The stop before ends as the pointer leaves it.
      if (pointer.stays.length > 0) pointer.stays.at(-1)!.to = leaves;
      const spot = spotOf(name);
      const there: Anchor = { tip: pointerTip(spot), row: spot.row };
      pointer.hops.push({ leaves, arrives: at, ...route(pointer.here, there) });
      pointer.stays.push({ from: at, to: Infinity, name });
      pointer.here = there;
    });
  });

  return {
    /**
     * Where pointer `which`'s tip is at `t` (0 the first, 1 the second),
     * whom it's over, and how opaque it's drawn.
     */
    at(t: number, which = 0): { tip: Point; over: string; shown: number } {
      const { hops, stays, shows } = pointers[which]!;
      let tip = startTip;
      for (const hop of hops) {
        if (t < hop.leaves) break;
        tip =
          t < hop.arrives
            ? along(hop, ease.hop((t - hop.leaves) / (hop.arrives - hop.leaves)))
            : hop.path.at(-1)!;
      }
      const over = stays.find((stay) => t >= stay.from && t < stay.to)?.name ?? '';
      let shown = 0;
      for (const { from, to, fade } of shows) {
        // Gone by the lift, however its time is rounded.
        if (t < from || t >= to + fade - 1e-9) continue;
        const out = t < to ? 1 : 1 - (t - to) / fade;
        shown = Math.max(shown, Math.min(1, (t - from) / FADE, out));
      }
      return { tip, over, shown };
    },
  };
}

/** A point `u` (0 to 1) of the way along a hop's path, lifted on a curve `height` high. */
function along({ path, height }: Pick<Hop, 'path' | 'height'>, u: number): Point {
  const lengths = path.slice(1).map((point, index) => {
    const before = path[index]!;
    return Math.hypot(point.x - before.x, point.y - before.y);
  });
  const length = lengths.reduce((sum, each) => sum + each, 0);
  let point = path[0]!;
  let left = u * length;
  for (const [index, each] of lengths.entries()) {
    const a = path[index]!;
    const b = path[index + 1]!;
    if (left <= each || index === lengths.length - 1) {
      const part = each === 0 ? 1 : Math.min(1, left / each);
      point = { x: a.x + (b.x - a.x) * part, y: a.y + (b.y - a.y) * part };
      break;
    }
    left -= each;
  }
  return { x: point.x, y: point.y - height * Math.sin(Math.PI * u) };
}
