// The pointer: when it hops to whom, where it is on the way, and when it
// shows. Worked out from the plan's turns, so play.ts can draw it at any time.

import { gsap } from 'gsap';
import { pointerTip, tagBox, TOWER, type Point, type Spot } from './layout';
import { POINTER } from './parts';
import type { Turn } from './plan';

/** Seconds the pointer takes to fade in or out. */
const FADE = 0.12;
/** The longest a hop takes: it waits where it is until then. */
const LONGEST_HOP = 0.6;
/**
 * How long the pointer rests on a decoy: at least `least`, and whatever the
 * hop on to the taker leaves over `hop` seconds.
 */
const DWELL = { least: 0.25, hop: 0.5 };
/** How long the pointer rests on a stop at `stops` before hopping on to the next at `next`. */
const restBetween = (stops: number, next: number) =>
  Math.max(DWELL.least, next - stops - DWELL.hop);
/** When the pointer hops on from `turn`'s decoy. */
export const movesOn = (turn: Turn) => turn.decoyStops! + restBetween(turn.decoyStops!, turn.stops);
/** How high the pointer hops between two people of the same row, at most. */
const HOP_HEIGHT = 40;
/**
 * A tossed block flies at least this long, from the whoosh to the thunk. What
 * the toss has beyond that goes first to the pointer fading out, up to FADE,
 * and then to holding the block overhead.
 */
export const FLIGHT = 0.4;

/** How long the pointer takes to fade out as `turn`'s taker is about to lift. */
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
 * The pointer's hops, the stops it makes and when it shows, for the turns.
 * It starts at `startTip`, over the paper blocks. Each turn it fades in
 * where it was as it leaves (the previous block's landing, or later so a hop
 * never drags on), hops to the decoy, rests there and hops on, or straight
 * to the taker, and fades out before they lift the block. Between rows it goes by the tower,
 * and within a row it hops low enough that its box stays clear of the tags.
 */
export function planHops(
  turns: readonly Turn[],
  stackStart: number,
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

  const hops: Hop[] = [];
  const stays: { from: number; to: number; name: string }[] = [];
  const shows: (Span & { fade: number })[] = [];
  let here: Anchor = { tip: startTip, row: null };
  turns.forEach((turn, index) => {
    const left = index === 0 ? stackStart : turns[index - 1]!.lands;
    const targets: { name: string; time: number }[] = turn.decoy
      ? [
          { name: turn.decoy, time: turn.decoyStops! },
          { name: turn.by, time: turn.stops },
        ]
      : [{ name: turn.by, time: turn.stops }];
    const leaves = Math.max(left, targets[0]!.time - LONGEST_HOP);
    // The stop before ends as this turn's pointer leaves.
    if (stays.length > 0) stays.at(-1)!.to = leaves;
    shows.push({ from: leaves, to: turn.stops, fade: fadeOf(turn) });
    let from = leaves;
    targets.forEach(({ name, time }, at) => {
      const spot = spotOf(name);
      const there: Anchor = { tip: pointerTip(spot), row: spot.row };
      hops.push({ leaves: from, arrives: time, ...route(here, there) });
      const rest = at < targets.length - 1 ? restBetween(time, targets[at + 1]!.time) : Infinity;
      stays.push({ from: time, to: time + rest, name });
      here = there;
      from = time + rest;
    });
  });

  return {
    /** Where the pointer's tip is at `t`, whom it's over, and how opaque it's drawn. */
    at(t: number): { tip: Point; over: string; shown: number } {
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
