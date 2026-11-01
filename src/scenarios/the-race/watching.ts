// Runs The Race frame by frame and reads what the stage showed, for the
// tests in this folder.

import { expect } from 'vitest';
import { type Box, type ChosenLook, type Cue, type Note, type Scenario } from '../../scenario-kit';
import { dealLooks } from '../../scenario-kit/line-up';
import { createRandom } from '../../scenario-kit/random';
import { runShow, type ShowRecord } from '../../scenario-kit/testing';
import theRace from './index';
import { boxAt, faceAt, lane, tagBox } from './layout';
import {
  CREATURES,
  EXTRAS,
  MOUNTS,
  TRACK_PROPS,
  RACER_COLOURS,
  type Creature,
  type Kind,
} from './parts';
import styles from './the-race.module.css';
import {
  BURST,
  COURSES,
  leaderAt,
  noseAt,
  orderAt,
  planShow,
  STOP,
  type Course,
  type Ending,
  type Plan,
  type RaceEvent,
} from './plan';

export const ENDINGS: readonly Ending[] = ['photo', 'brake', 'surge'];

/** A label as it reads, without the soft hyphens that only break it on screen. */
export const read = (label: string) => label.replaceAll('\u00AD', '');

/** The six things on legs, as the feature names them, in the Line-up's order. */
export const THING_NAMES: Readonly<Record<string, Creature>> = {
  'coffee mug': 'mug',
  printer: 'printer',
  'sticky note': 'sticky',
  banana: 'banana',
  'ice cream': 'icecream',
  sushi: 'sushi',
};
export const THING_KINDS = Object.values(THING_NAMES);

/** The four animals and four spooky creatures of step 4, as the feature names them. */
export const NEW_NAMES: Readonly<Record<string, Creature>> = {
  cat: 'cat',
  octopus: 'octopus',
  penguin: 'penguin',
  pigeon: 'pigeon',
  ghost: 'ghost',
  gnome: 'gnome',
  mummy: 'mummy',
  yeti: 'yeti',
};

/** The box round every point of a path drawn in absolute M, L, H, V, Q and Z. */
export function bounds(d: string) {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const [, command, args] of d.matchAll(/([A-Za-z])([^A-Za-z]*)/g)) {
    const values = (args!.match(/-?[\d.]+/g) ?? []).map(Number);
    if (command === 'H') xs.push(...values);
    else if (command === 'V') ys.push(...values);
    else if ('MLQ'.includes(command!)) {
      values.forEach((value, i) => (i % 2 ? ys : xs).push(value));
    } else expect(command).toBe('Z');
  }
  return {
    left: Math.min(...xs),
    right: Math.max(...xs),
    top: Math.min(...ys),
    bottom: Math.max(...ys),
  };
}

/** Names up to 15 characters: the last is as long as the layout plans for. */
export const TEAM = [
  'Anna',
  'Ben',
  'Carla',
  'Dario',
  'Elena',
  'Fabio',
  'Giulia',
  'Annamaria Rossi',
];

export const names = (count: number) => TEAM.slice(0, count);

/** Show seconds per frame of the shared runs: coarse, so they stay quick. */
export const STEP = 1 / 10;

/** One racer as a frame drew them. */
export interface Drawn {
  readonly nose: number;
  readonly mood: string;
  readonly pose: string;
  readonly sweat: boolean;
  readonly gait: string;
  readonly stopped: boolean;
  readonly rotate: string;
  readonly scale: string;
  readonly leaf: boolean;
  readonly trophy: boolean;
  /** How high a hopper bounces, the ostrich's stride and where it looks, the rocket's flame. */
  readonly hop: number;
  readonly stride: number;
  readonly look: string;
  readonly flame: number | 'out' | null;
  /** The props it shows, as "egg smoke steam pickle". */
  readonly props: string;
  /** A creature's arms' swing, its blank screen, its bend, its stretch and its flag's x. */
  readonly flail: number;
  readonly blank: boolean;
  readonly bend: number;
  readonly stretch: boolean;
  readonly flag: number | null;
  /** How high it floats or hops on the Moon, in stage px. */
  readonly lift: number;
  /** The track's props it shows, as "cup seaweed swirls". */
  readonly track: string;
  /** The printer's light, on or off; how far the ice cream drips, 0 to 1; how far the banana's legs split. */
  readonly light: string;
  readonly drip: number;
  /** Whether the mug is empty, its steam gone. */
  readonly empty: boolean;
  readonly splits: number;
  /** How far the octopus's tentacles whirl, and the yeti's arms sweep, in degrees; whether its legs show. */
  readonly whirl: number;
  readonly sweep: number;
  readonly legs: boolean;
  /** How far the reindeer shakes its head, the blizzard's turn, and which of the tree's lights glow. */
  readonly shake: number;
  readonly spin: number;
  /** How many of a Christmas tree's lights are on. */
  readonly lit: number;
  /** How far an umbrella sways, in degrees. */
  readonly sway: number;
}

/** What the stage showed in one frame. */
export interface Frame {
  readonly time: number;
  readonly beat: string;
  readonly camera: number;
  readonly slow: boolean;
  readonly racers: Readonly<Record<string, Drawn>>;
  /** Who says what in a bubble on screen, and where its tail is. */
  readonly says: readonly {
    readonly person: string;
    readonly text: string;
    readonly x: number;
    readonly y: number;
  }[];
  /** How many speed lines are drawn. */
  readonly speedLines: number;
  /** Each name tag's size in stage pixels, by name. */
  readonly tagSizes: Readonly<Record<string, number>>;
  readonly flash: boolean;
  /** The photo's verdict and who it shows, back lane first, while it's up. */
  readonly photo: { readonly verdict: string; readonly names: readonly string[] } | null;
  readonly confetti: number;
}

export interface Watched {
  readonly record: ShowRecord;
  readonly frames: readonly Frame[];
  readonly plan: Plan;
  readonly team: readonly string[];
  readonly unlucky: string;
  /** Everyone's look, as given or dealt for the run. */
  readonly looks: ReadonlyMap<string, ChosenLook>;
}

/** Everyone in a show on `mount`, or as it, in the colours in turn, with a racing number. */
export const allOn = (team: readonly string[], mount: Kind) =>
  new Map<string, ChosenLook>(
    team.map((name, i) => [name, { mount, colour: RACER_COLOURS[i % 6]!, extra: 'number' }]),
  );

/** The elements a frame is read from. */
export function find(stage: HTMLElement) {
  const all = <T extends Element>(selector: string) => [...stage.querySelectorAll<T>(selector)];
  return {
    racers: all<HTMLElement>('[data-person]')
      .filter((el) => el.querySelector(':scope > svg') && !el.closest('[data-part="photo"]'))
      .map((holder) => {
        const svg = holder.querySelector<SVGSVGElement>(':scope > svg')!;
        return {
          name: holder.dataset.person!,
          holder,
          svg,
          leaf: svg.querySelector('[data-part="leaf"]'),
        };
      }),
    bubbles: all<HTMLElement>('[data-says]'),
    tagSizes: Object.fromEntries(
      all<HTMLElement>('[data-person][data-lines]').map((tag) => [
        tag.dataset.person!,
        parseFloat(tag.style.getPropertyValue('--tag-size')),
      ]),
    ),
    speedLines: all<SVGPathElement>('[data-part="speed-lines"] path'),
    card: stage.querySelector<HTMLElement>('[data-part="photo"]'),
    flash: stage.querySelector<HTMLElement>('[data-part="flash"]'),
    confetti: all<HTMLElement>('[data-part="confetti"]'),
  };
}

/** Runs the race and keeps what the stage showed each frame. */
export async function watch(
  team: readonly string[],
  {
    unlucky = team.at(-1)!,
    seed = 1,
    course = 'field',
    looks,
    cancelAt,
    reducedMotion = false,
    onStage,
  }: {
    unlucky?: string;
    seed?: number;
    /** The theme chosen on the Line-up. */
    course?: Course;
    looks?: ReadonlyMap<string, ChosenLook>;
    cancelAt?: number;
    reducedMotion?: boolean;
    /** Looks at the stage after each frame is read. */
    onStage?: (time: number, scene: HTMLElement) => void;
  } = {},
): Promise<Watched> {
  const frames: Frame[] = [];
  let found: ReturnType<typeof find> | undefined;
  const dealt = looks ?? dealLooks(theRace.lineUp!, team, createRandom(seed));
  const record = await runShow(theRace, {
    names: team,
    unlucky,
    seed,
    theme: course,
    looks: dealt,
    cancelAt,
    reducedMotion,
    step: STEP,
    onFrame: (time, stage) => {
      const scene = stage.firstElementChild as HTMLElement | null;
      // Once the show is over, the stage is empty.
      if (!scene) return;
      // The show keeps its elements from start to end: found once, in the first frame.
      found ??= find(stage);
      const racers: Record<string, Drawn> = {};
      for (const { name, holder, svg, leaf } of found.racers) {
        racers[name] = {
          nose: Number(holder.dataset.nose),
          mood: svg.dataset.mood!,
          pose: svg.dataset.pose!,
          sweat: svg.dataset.sweat === 'true',
          gait: holder.dataset.gait!,
          stopped: holder.dataset.stopped === 'true',
          rotate: svg.getAttribute('data-rotate') ?? '',
          scale: svg.getAttribute('data-scale') ?? '',
          leaf: !!leaf && leaf.getAttribute('display') !== 'none',
          trophy: svg.dataset.trophy === 'true',
          hop: Number(svg.dataset.hop ?? 0),
          stride: Number(svg.dataset.stride ?? 1),
          look: svg.dataset.look ?? '',
          flame:
            svg.dataset.flame === undefined
              ? null
              : svg.dataset.flame === 'out'
                ? 'out'
                : Number(svg.dataset.flame),
          props: svg.dataset.props ?? '',
          flail: Number(svg.dataset.flail ?? 0),
          blank: svg.dataset.blank === 'true',
          bend: Number(svg.dataset.bend ?? 0),
          stretch: svg.dataset.stretch === 'true',
          flag: svg.dataset.flag ? Number(svg.dataset.flag) : null,
          lift: Number(svg.dataset.lift ?? 0),
          track: svg.dataset.track ?? '',
          light: svg.dataset.light ?? '',
          drip: Number(svg.dataset.drip ?? 0),
          empty: svg.dataset.empty === 'true',
          splits: Number(svg.dataset.splits ?? 0),
          whirl: Number(svg.dataset.whirl ?? 0),
          sweep: Number(svg.dataset.sweep ?? 0),
          legs: svg.querySelector('[data-part="front-leg"]')?.getAttribute('display') !== 'none',
          shake: Number(svg.dataset.shake ?? 0),
          spin: Number(svg.dataset.spin ?? 0),
          lit: svg.querySelectorAll('[data-part="lights"]:not([display]) circle:not([display])')
            .length,
          sway: Number(svg.dataset.sway ?? 0),
        };
      }
      const says = found.bubbles
        .filter((el) => !el.hidden)
        .map((el) => ({
          person: el.dataset.person!,
          text: el.dataset.says!,
          x: Number(el.dataset.x),
          y: Number(el.dataset.y),
        }));
      const card = found.card;
      const photo =
        card && !card.hidden
          ? {
              verdict: card.querySelector('p:last-child')!.textContent!,
              names: [...card.querySelectorAll<HTMLElement>('[data-person]')].map(
                (el) => el.dataset.person!,
              ),
            }
          : null;
      frames.push({
        time,
        speedLines: found.speedLines.filter((path) => path.getAttribute('display') !== 'none')
          .length,
        tagSizes: found.tagSizes,
        flash: !(found.flash?.hidden ?? true),
        photo,
        confetti: found.confetti.filter((el) => !el.hidden).length,
        beat: scene.dataset.beat!,
        camera: Number(scene.dataset.camera),
        slow: scene.dataset.slow === 'true',
        racers,
        says,
      });
      onStage?.(time, scene);
    },
  });
  const plan = planShow(team, unlucky, createRandom(seed), course);
  return { record, frames, plan, team, unlucky, looks: dealt };
}

/** What `name` races as in `watched`. */
export const kindOf = (watched: Watched, name: string) => watched.looks.get(name)!.mount as Kind;

/** The captions shown, in order. */
export const captions = (watched: Watched) => watched.record.captions.map((each) => each.text);

/** The frames from `from` up to `to`, in show seconds. */
export const between = (watched: Watched, from: number, to: number) =>
  watched.frames.filter((frame) => frame.time >= from - 1e-9 && frame.time < to - 1e-9);
export const shownAt = (watched: Watched, text: string) =>
  watched.record.captions.find((each) => each.text === text)?.from;
export const saying = (frame: Frame, person: string, text: string) =>
  frame.says.some((said) => said.person === person && said.text === text);

/** `box` raised by `lift` stage px. */
export const raised = (box: Box, lift: number): Box => ({
  ...box,
  top: box.top - lift,
  bottom: box.bottom - lift,
});

export const overlap = (one: Box, two: Box) =>
  one.left < two.right && two.left < one.right && one.top < two.bottom && two.top < one.bottom;

/** The rider's head in a racer's drawing: the one picture in its holder that isn't an extra. */
export const headOf = (svg: SVGSVGElement) =>
  svg.querySelector<SVGSVGElement>('[data-part="lean"] > svg:not([data-part])')!;

/** Runs that more than one scenario reads, each run once, when first asked for. */
export const shared = (() => {
  const runs = new Map<string, Promise<Watched>>();
  const once = (key: string, run: () => Promise<Watched>) => {
    if (!runs.has(key)) runs.set(key, run());
    return runs.get(key)!;
  };
  return {
    eight: () => once('8', () => watch(names(8), { seed: 3 })),
    /**
     * Four people ending `ending`, Anna unlucky and the rival called `rival`.
     */
    ending: (ending: Ending, rival = 'Priya') =>
      once(`ending ${ending}`, () => {
        const team = ['Dario', 'Elena', 'Fabio', 'Anna'];
        let seed = 1;
        while (planShow(team, 'Anna', createRandom(seed)).ending !== ending) seed++;
        const plan = planShow(team, 'Anna', createRandom(seed));
        team[team.indexOf(plan.rival)] = rival;
        return watch(team, { unlucky: 'Anna', seed });
      }),
    count: (count: number) =>
      count === 8 ? shared.eight() : once(`count ${count}`, () => watch(names(count), { seed: 5 })),
    /**
     * Five people on `mount`, so the first event is a burst and the second
     * that burster's stop; whoever bursts is called `name`.
     */
    mount: (mount: Kind, name: string, reducedMotion = false) =>
      once(`mount ${mount} ${reducedMotion}`, () => {
        const team = ['Kofi', 'Luca', 'Mia', 'Nora', 'Omar'];
        // On the sports field, so both events are the racer's own.
        const seed = 7;
        const plan = planShow(team, team.at(-1)!, createRandom(seed));
        team[team.indexOf(plan.events[0]!.subject)] = name;
        return watch(team, { seed, looks: allOn(team, mount), reducedMotion });
      }),
    /**
     * Two people, both a `thing`, until its stop is over: the first event
     * is a burst and the second that burster's stop; whoever bursts is
     * called `name`.
     */
    thing: (thing: Creature, name: string, reducedMotion = false) =>
      once(`thing ${thing} ${reducedMotion}`, async () => {
        const team = ['Kofi', 'Luca'];
        const seed = 7;
        const plan = planShow(team, team.at(-1)!, createRandom(seed));
        team[team.indexOf(plan.events[0]!.subject)] = name;
        // Until "Phew!" is down, which is up for 1.1 s.
        const { at } = plan.events[1]!;
        const cancelAt = at + STOP.phew + 1.2;
        // The stop's caption is still up when the run stops, so the record has no end for it.
        let up = '';
        const watched = await watch(team, {
          seed,
          looks: allOn(team, thing),
          cancelAt,
          reducedMotion,
          onStage: (time) => {
            if (time >= at + 0.5 && !up) {
              up = document.querySelector('[data-kit="caption"]')!.textContent ?? '';
            }
          },
        });
        const captions = [...watched.record.captions, { text: up, from: at, to: cancelAt }];
        return { ...watched, record: { ...watched.record, captions } };
      }),
    /**
     * Six people, Anna unlucky: Ben's snail and Carla's duck burst, Carla's
     * duck stops, and it ends in a photo finish.
     */
    story: (reducedMotion = false) =>
      once(`story ${reducedMotion}`, () => {
        const team = ['Dario', 'Elena', 'Fabio', 'Giulia', 'Hana', 'Anna'];
        let seed = 1;
        const fits = (plan: Plan) =>
          plan.ending === 'photo' && plan.events.every((event) => event.subject !== 'Anna');
        while (!fits(planShow(team, 'Anna', createRandom(seed)))) seed++;
        const plan = planShow(team, 'Anna', createRandom(seed));
        team[team.indexOf(plan.events[0]!.subject)] = 'Ben';
        team[team.indexOf(plan.events[1]!.subject)] = 'Carla';
        const looks = allOn(team, 'chair');
        looks.set('Ben', { mount: 'snail', colour: 'tomato', extra: 'number' });
        looks.set('Carla', { mount: 'duck', colour: 'sun', extra: 'scarf' });
        return watch(team, { unlucky: 'Anna', seed, looks, reducedMotion });
      }),
    /**
     * `count` people with a 15-character name, unlucky, riders and creatures
     * taking turns, each with another extra.
     */
    mixed: (count: number) =>
      once(`mixed ${count}`, () => {
        const team = [...names(count - 1), 'Annamaria Rossi'];
        const looks = new Map<string, ChosenLook>(
          team.map((name, i) => [
            name,
            {
              mount: (i % 2 ? CREATURES : MOUNTS)[(Math.floor(i / 2) + count) % 8]!,
              colour: RACER_COLOURS[i % 8]!,
              extra: EXTRAS[i % EXTRAS.length]!,
            },
          ]),
        );
        return watch(team, { seed: 3, looks });
      }),
    /** Four people, Dario last and unlucky, as the dinosaur; the others a shark, a robot and a duck. */
    dinosaurWins: () =>
      once('dinosaur wins', () => {
        const looks = new Map<string, ChosenLook>([
          ['Anna', { mount: 'duck', colour: 'sun', extra: 'scarf' }],
          ['Ben', { mount: 'robot', colour: 'grape', extra: 'number' }],
          ['Carla', { mount: 'shark', colour: 'sea', extra: 'tophat' }],
          ['Dario', { mount: 'dinosaur', colour: 'mint', extra: 'bowtie' }],
        ]);
        return watch([...looks.keys()], { unlucky: 'Dario', seed: 2, looks });
      }),
    /** `count` people with a 15-character name, unlucky, on mounts in turn, in capes. */
    long: (count: number) =>
      once(`long ${count}`, () => {
        const team = [...names(count - 1), 'Annamaria Rossi'];
        const looks = new Map<string, ChosenLook>(
          team.map((name, i) => [
            name,
            { mount: MOUNTS[(i + count) % MOUNTS.length]!, colour: 'mint', extra: 'cape' },
          ]),
        );
        return watch(team, { seed: 11, looks });
      }),
  };
})();

/** Everyone with a look given, as the show first draws them, the last unlucky. */
export async function firstDrawn(looks: Map<string, ChosenLook>, seed = 4) {
  const team = [...looks.keys()];
  const drawn = new Map<string, SVGSVGElement>();
  await runShow(theRace, {
    names: team,
    unlucky: team.at(-1)!,
    seed,
    theme: 'field',
    looks,
    cancelAt: 0.2,
    step: STEP,
    onFrame: (_, stage) => {
      for (const name of team) {
        const svg = stage.querySelector<SVGSVGElement>(`[data-person="${name}"] svg`)!;
        if (!drawn.has(name)) drawn.set(name, svg.cloneNode(true) as SVGSVGElement);
      }
    },
  });
  return drawn;
}

/** The end of a path's `d`, as "x y". */
export const ends = (path: Element | null) =>
  path!
    .getAttribute('d')!
    .trim()
    .split(/[ A-Z]+/)
    .slice(-2)
    .join(' ');
/** Whether `svg` shows the reins. */
export const reined = (svg: SVGSVGElement) =>
  svg.querySelector('[data-part="reins"]')!.getAttribute('display') !== 'none';

/** Plans for seeds 1 to `seeds`. */
export function plans(team: readonly string[], unlucky: string, seeds = 20): Plan[] {
  return Array.from({ length: seeds }, (_, index) =>
    planShow(team, unlucky, createRandom(index + 1)),
  );
}

/** What the feature calls each track. */
export const COURSE_NAMES: Readonly<Record<string, Course>> = {
  'the sports field': 'field',
  'the office': 'office',
  'under the sea': 'sea',
  'the Moon': 'moon',
};

/** The first `runs` plans on `course`, and `fits` if given, from seed 1 on. */
export function plansOn(
  team: readonly string[],
  unlucky: string,
  course: Course,
  runs = 20,
  fits: (plan: Plan) => boolean = () => true,
): Plan[] {
  const found: Plan[] = [];
  for (let seed = 1; found.length < runs; seed++) {
    const plan = planShow(team, unlucky, createRandom(seed), course);
    if (fits(plan)) found.push(plan);
  }
  return found;
}

/** A race run with music on: the song it handed the kit, how it moved it, and its sounds. */
export interface Heard {
  readonly record: ShowRecord;
  readonly plan: Plan;
  readonly notes: readonly Note[];
  /** Each move of the song, at the show second of its frame. */
  readonly moves: readonly { time: number; beat: number; speed: number }[];
  readonly cues: readonly { time: number; cue: Cue }[];
}

/** Runs the race with a sound that keeps what the show asked of it. */
export async function listen(
  team: readonly string[],
  unlucky: string,
  seed = 1,
  course: Course = 'field',
): Promise<Heard> {
  let notes: readonly Note[] = [];
  const moves: { time: number | null; beat: number; speed: number }[] = [];
  const cues: { time: number | null; cue: Cue }[] = [];
  const listened: Scenario = {
    ...theRace,
    play: (show) =>
      theRace.play({
        ...show,
        sound: {
          play: (cue) => (cues.push({ time: null, cue }), () => undefined),
          stopAll() {},
          music(song) {
            notes = song;
            return { to: (beat, speed) => void moves.push({ time: null, beat, speed }) };
          },
        },
      }),
  };
  const record = await runShow(listened, {
    names: team,
    unlucky,
    seed,
    theme: course,
    looks: dealLooks(theRace.lineUp!, team, createRandom(seed)),
    onFrame(time) {
      for (const each of [...moves, ...cues]) each.time ??= time;
    },
  });
  return {
    record,
    plan: planShow(team, unlucky, createRandom(seed), course),
    notes,
    moves: moves.map(({ time, ...move }) => ({ time: time!, ...move })),
    cues: cues.map(({ time, cue }) => ({ time: time!, cue })),
  };
}

/** For each ending, the first plan from seed 1 on with `count` people that ends that way. */
export function plansByEnding(count: number): Plan[] {
  const team = names(count);
  return ENDINGS.map((ending) => {
    for (let seed = 1; ; seed++) {
      const plan = planShow(team, team.at(-1)!, createRandom(seed));
      if (plan.ending === ending) return plan;
    }
  });
}

/** A piece of text on the stage, and what carries it. */
export interface Sticker {
  readonly text: string;
  /** The sticker's own data attribute or part: what it is. */
  readonly what: string;
  readonly background: string;
  readonly colour: string;
  readonly border: string;
}

/** A run on one track, with what its stage showed beyond the frames. */
export interface OnTrack {
  readonly watched: Watched;
  readonly track: HTMLElement;
  /** The track's sky, as its style gives it. */
  readonly sky: string;
  /** Every piece of text seen on a sticker, and any seen on none. */
  readonly stickers: readonly Sticker[];
  readonly loose: readonly string[];
  /** The photo card, if it popped up. */
  readonly photo: HTMLElement | null;
  /** Each frame the coffee machine or the wet-floor sign was up, and where. */
  /** Where a track's prop stands or is held, each frame, and the hand holding it. */
  readonly standing: readonly {
    time: number;
    part: string;
    x: number;
    y: number;
    hand?: readonly [number, number];
  }[];
  /** Each frame a shadow was on the ground. */
  readonly shadows: readonly number[];
}

/** What may carry text: a sign, a name tag, a bubble, the caption or the photo card. */
export const KINDS = [
  ['sign', '[data-part="sign"] p'],
  ['tag', '[data-lines]'],
  ['bubble', '[data-says]'],
  ['caption', '[data-kit="caption"]'],
  ['photo', '[data-part="photo"]'],
] as const;
export const STICKERS = KINDS.map(([, selector]) => selector).join(', ');

/**
 * The borders the stylesheets give `el`, as written: jsdom can't split a
 * `border` shorthand that holds a `var(--…)`.
 */
export function borderOf(el: Element): string {
  const rules = [...document.styleSheets].flatMap((sheet) => [...sheet.cssRules]);
  return rules
    .filter(
      (rule): rule is CSSStyleRule => rule instanceof CSSStyleRule && el.matches(rule.selectorText),
    )
    .map(
      (rule) =>
        rule.style.getPropertyValue('border') || rule.style.getPropertyValue('border-color'),
    )
    .join(' ');
}

/** The texts already read on each element: a sticker keeps its look. */
export const readOn = new WeakMap<Element, Set<string>>();

/** Notes every shown piece of text in `root` not yet read, on its sticker or loose. */
export function readText(root: Element, stickers: Sticker[], loose: string[]) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent!.trim();
    const el = node.parentElement!;
    if (!text || readOn.get(el)?.has(text)) continue;
    if (el.closest('[hidden], [display="none"]')) continue;
    readOn.set(el, (readOn.get(el) ?? new Set()).add(text));
    // A racing number is on its paper roundel, on the racer.
    if (el.closest('svg text')) continue;
    const sticker = el.closest<HTMLElement>(STICKERS);
    if (!sticker) {
      loose.push(text);
      continue;
    }
    // The sticker's paper: the nearest box round the text with a background.
    let paper: Element = el;
    const clear = (box: Element) => getComputedStyle(box).backgroundColor === 'rgba(0, 0, 0, 0)';
    while (paper !== sticker && clear(paper)) paper = paper.parentElement!;
    const style = getComputedStyle(paper);
    stickers.push({
      text,
      what: KINDS.find(([, selector]) => sticker.matches(selector))![0],
      background: style.backgroundColor,
      colour: getComputedStyle(el).color || style.color,
      border: borderOf(paper),
    });
  }
}

/** Runs on each track, each run once, when first asked for. */
export const onTracks = new Map<string, Promise<OnTrack>>();

/** A cup in hand from this far into the coffee-machine stop. */
export const OWN_CUP = 0.3;

/** Who the track's own stop and burst happen to, as the feature names them. */
export const SUBJECTS: Readonly<Record<Course, Readonly<Record<RaceEvent['kind'], string>>>> = {
  field: { stop: 'Ben', burst: 'Ben' },
  office: { stop: 'Ben', burst: 'Ben' },
  sea: { stop: 'Marco', burst: 'Marco' },
  moon: { stop: 'Anna', burst: 'Anna' },
  autumn: { stop: 'Ben', burst: 'Carla' },
  christmas: { stop: 'Ben', burst: 'Carla' },
};

/**
 * Eight people on `course`, ending in a photo finish; off the sports field,
 * the track's own event is a `kind`, and happens to the feature's racer for
 * that track. The stage's props are read every frame; in a run with a stop,
 * its text every second and as the photo pops up.
 */
export function onTrack(course: Course, kind: 'burst' | 'stop' = 'stop'): Promise<OnTrack> {
  const key = `${course} ${kind}`;
  if (!onTracks.has(key)) {
    const team = names(8);
    const unlucky = team.at(-1)!;
    let seed = 1;
    const fits = (plan: Plan) =>
      plan.ending === 'photo' &&
      (course === 'field' || plan.events.some((e) => e.cause === 'track' && e.kind === kind));
    while (!fits(planShow(team, unlucky, createRandom(seed), course))) seed++;
    // Names are only labels to the plan: two swapped keep the same race.
    const own = planShow(team, unlucky, createRandom(seed), course).events.find(
      (event) => event.cause === 'track',
    );
    if (own) {
      const at = team.indexOf(own.subject);
      const theirs = team.indexOf(SUBJECTS[course][kind]);
      if (theirs >= 0) team[theirs] = own.subject;
      team[at] = SUBJECTS[course][kind];
    }
    const standing: {
      time: number;
      part: string;
      x: number;
      y: number;
      hand?: readonly [number, number];
    }[] = [];
    const shadows: number[] = [];
    const stickers: Sticker[] = [];
    const loose: string[] = [];
    let track: HTMLElement | undefined;
    let sky = '';
    let photo: HTMLElement | null = null;
    let read = -1;
    onTracks.set(
      key,
      watch(team, {
        seed,
        course,
        onStage: (time, scene) => {
          if (!track) {
            track = scene.querySelector<HTMLElement>('[data-part="track"]')!;
            sky = getComputedStyle(track).backgroundColor;
          }
          const card = scene.querySelector<HTMLElement>('[data-part="photo"]');
          const second = Math.floor(time + 1e-9);
          if (kind === 'stop' && (second > read || (card && !card.hidden && !photo))) {
            read = second;
            readText(scene, stickers, loose);
            const caption = document.querySelector('[data-kit="caption"]');
            if (caption) readText(caption, stickers, loose);
          }
          if (card && !card.hidden) photo = card;
          for (const part of [
            'machine',
            'wet-floor',
            'snowdrift',
            'sledge',
            'leaf-pile',
            'umbrella',
          ]) {
            const prop = scene.querySelector(`[data-part="${part}"]`);
            if (!prop || prop.getAttribute('display') === 'none') continue;
            const [, x, y] = prop.getAttribute('transform')!.match(/translate\((\S+) (\S+)\)/)!;
            // A rider's hand, or a creature's front one.
            const fist = prop
              .closest('svg[data-part]')
              ?.querySelector(
                '[data-part="hands"] circle, [data-part="front-arm"] [data-part="hand"]',
              );
            const hand = fist?.getAttribute('cx')
              ? ([Number(fist.getAttribute('cx')), Number(fist.getAttribute('cy'))] as const)
              : undefined;
            standing.push({ time, part, x: Number(x), y: Number(y), hand });
          }
          const shadow = scene.querySelector<HTMLElement>('[data-part="shadow"]');
          if (shadow && !shadow.hidden) shadows.push(time);
        },
      }).then((watched) => ({
        watched,
        track: track!,
        sky,
        stickers,
        loose,
        photo,
        standing,
        shadows,
      })),
    );
  }
  return onTracks.get(key)!;
}

/** A step, as a scenario's step functions take it. */
export type StepOf = (title: string, run: () => void | Promise<void>) => void;

/** Seaweed and snow are shaken off over this many seconds before "Phew!", and leaves climbed out of. */
export const OWN_SHAKE = 0.4;
/** A racer lands in Autumn's pile of leaves this far into its stop. */
export const OWN_LAND = 0.35;

/**
 * The steps of a track's own `kind` on `course`, from "When someone's event
 * is …", the `when` step, to what it does, for its caption.
 */
export function actOutOwnEvent(
  { When, Then, And }: { When: StepOf; Then: StepOf; And: StepOf },
  {
    course,
    kind,
    caption,
    when,
  }: { course: Course; kind: RaceEvent['kind']; caption: string; when: string },
) {
  let run: OnTrack;
  let event: RaceEvent;
  /** The racer's frames from `from` to `to` s into the event. */
  const during = (from: number, to: number) =>
    between(run.watched, event.at + from, event.at + to).map((frame) => ({
      ...frame,
      racer: frame.racers[event.subject]!,
    }));
  /** Whether the racer is further back once off again than as the event started. */
  const furtherBack = () => {
    const { plan } = run.watched;
    return (
      orderAt(plan, event.at + STOP.off).indexOf(event.subject) >
      orderAt(plan, event.at - 0.01).indexOf(event.subject)
    );
  };
  const says = (text: string) => during(0, 3).some((frame) => saying(frame, event.subject, text));
  const leads = () => leaderAt(run.watched.plan, event.at + BURST.seconds) === event.subject;
  /** Each time, aloft or not, a name tag is over another or over a face. */
  const tagsOver = () =>
    during(0, 2).flatMap((frame) => {
      const { team } = run.watched;
      const drawn = team.map((name, i) => {
        const at = lane(i, team.length);
        const kind = kindOf(run.watched, name);
        const { nose, lift } = frame.racers[name]!;
        return {
          name,
          face: raised(faceAt(kind, at, nose), lift),
          tag: raised(tagBox(name, kind, at, nose), lift),
        };
      });
      return drawn.flatMap((one) =>
        drawn
          .filter(
            (other) =>
              (one !== other && overlap(one.tag, other.tag)) || overlap(one.tag, other.face),
          )
          .map((other) => `${frame.time.toFixed(1)}: ${one.name}'s tag on ${other.name}`),
      );
    });
  When(when, async () => {
    run = await onTrack(course, kind);
    event = run.watched.plan.events.find((each) => each.cause === 'track')!;
    expect(event.kind).toBe(kind);
    expect(event.subject).toBe(SUBJECTS[course][kind]);
  });
  Then('the caption is "<caption>"', () => {
    const shown = run.watched.record.captions.find((each) => each.text === caption);
    expect(shown!.from).toBeCloseTo(event.at, 0);
  });
  And('<what>', () => {
    // Whatever the racer is, its own burst or stop doesn't happen.
    for (const frame of during(0, STOP.off)) {
      expect(frame.racer.props).toBe('');
      expect(frame.racer.leaf).toBe(false);
    }
    const key = `${course} ${kind}`;
    if (key === 'office stop') {
      const nose = noseAt(run.watched.plan, event.subject, event.at + STOP.seconds);
      const machine = run.standing.filter(
        (each) => each.time >= event.at && each.time < event.at + STOP.off,
      );
      expect(machine.length).toBeGreaterThan(10);
      expect(machine.every((each) => each.part === 'machine' && each.y === 0)).toBe(true);
      const by = machine.find((each) => each.time >= event.at + STOP.seconds)!;
      expect(by.x).toBeGreaterThan(nose - 400);
      expect(by.x).toBeLessThan(nose);
      const holding = during(OWN_CUP + 0.05, STOP.off - 0.05);
      expect(holding.every((frame) => frame.racer.track === 'cup')).toBe(true);
    }
    if (key === 'office burst') {
      const sign = run.standing.filter((each) => each.part === 'wet-floor');
      const at = sign.find((each) => each.time >= event.at)!;
      const index = run.watched.team.indexOf(event.subject);
      expect(at.y).toBeCloseTo(lane(index, 8).ground, 0);
      expect(at.x).toBeGreaterThan(noseAt(run.watched.plan, event.subject, event.at));
      const tilts = during(0, BURST.seconds).map((f) => parseFloat(f.racer.rotate || '0'));
      expect(Math.min(...tilts)).toBeLessThan(-5);
    }
    if (key === 'sea stop') {
      const wrapped = during(0.05, STOP.phew - 0.05);
      expect(wrapped.every((frame) => frame.racer.track === 'seaweed')).toBe(true);
      const free = during(STOP.phew + 0.05, STOP.off);
      expect(free.every((frame) => frame.racer.track === '')).toBe(true);
    }
    if (key === 'sea burst') {
      const carried = during(0.05, BURST.seconds);
      expect(carried.every((frame) => frame.racer.track === 'swirls')).toBe(true);
    }
    if (key === 'moon stop') {
      const lifts = during(0, STOP.off + 0.3).map((frame) => frame.racer.lift);
      expect(Math.max(...lifts)).toBeGreaterThan(5);
      expect(lifts.at(-1)).toBe(0);
      const up = during(0, STOP.off).filter((frame) => frame.racer.lift > 0);
      expect(up.every((frame) => run.shadows.includes(frame.time))).toBe(true);
      expect(tagsOver()).toEqual([]);
    }
    if (key === 'moon burst') {
      const lifts = during(0, 2).map((frame) => frame.racer.lift);
      expect(Math.max(...lifts)).toBeGreaterThan(5);
      // One hop: up, then down, once, over more than a second.
      const turns = lifts
        .slice(1)
        .map((lift, i) => Math.sign(lift - lifts[i]!))
        .filter((sign, i, all) => sign !== 0 && sign !== all[i - 1]);
      expect(turns).toEqual([1, -1]);
      expect(lifts.filter((lift) => lift > 0).length * STEP).toBeGreaterThan(1);
      expect(tagsOver()).toEqual([]);
    }
    if (key === 'christmas stop') {
      const piled = during(0.05, STOP.phew - 0.05);
      expect(piled.every((frame) => frame.racer.track === 'snowdrift')).toBe(true);
      const free = during(STOP.phew + 0.05, STOP.off);
      expect(free.every((frame) => frame.racer.track === '')).toBe(true);
      // Piling up: its top comes up from the ground, then stays.
      const drift = run.standing.filter((each) => each.part === 'snowdrift');
      expect(drift[0]!.y).toBeGreaterThan(drift.at(-1)!.y + 40);
      // And the racer wriggles free.
      const wriggle = during(STOP.phew - OWN_SHAKE, STOP.phew).map((frame) =>
        Math.abs(parseFloat(frame.racer.rotate || '0')),
      );
      expect(Math.max(...wriggle)).toBeGreaterThan(1);
      expect(TRACK_PROPS.snowdrift[0]![1]).toBe(styles.paper);
    }
    if (key === 'christmas burst') {
      const riding = during(0.05, BURST.seconds);
      expect(riding.every((frame) => frame.racer.track === 'sledge')).toBe(true);
      // Up on it: 22 px, or as high as it can go clear of the lanes behind.
      const lifts = riding.map((frame) => frame.racer.lift);
      expect(Math.max(...lifts)).toBeGreaterThan(8);
      expect(Math.max(...lifts)).toBeLessThanOrEqual(22);
      // It slides in under the racer from behind, and is red.
      const sledge = run.standing.filter((each) => each.part === 'sledge');
      expect(sledge[0]!.x).toBeLessThan(sledge.at(-1)!.x - 100);
      expect(TRACK_PROPS.sledge.map(([, className]) => className)).toContain(styles.tomato);
      expect(tagsOver()).toEqual([]);
    }
    if (key === 'autumn stop') {
      // It jumps, lands in the pile and stays in it until "Phew!".
      const jump = during(0, OWN_LAND).map((frame) => frame.racer.lift);
      expect(Math.max(...jump)).toBeGreaterThan(3);
      const inPile = during(0.05, STOP.phew - 0.05);
      expect(inPile.every((frame) => frame.racer.track.includes('leaf-pile'))).toBe(true);
      // The pile is round the racer until it climbs out, then stays where it
      // was along the track.
      const pile = run.standing.filter((each) => each.part === 'leaf-pile');
      const round = pile.filter((each) => each.time < event.at + STOP.phew);
      expect(round.length).toBeGreaterThan(10);
      expect(round.every((each) => each.x === 20)).toBe(true);
      const index = run.watched.team.indexOf(event.subject);
      const at = lane(index, 8);
      const kind = kindOf(run.watched, event.subject);
      const along = pile
        .filter((each) => each.time > event.at + STOP.phew)
        .map((each) => {
          const frame = run.watched.frames.find((f) => Math.abs(f.time - each.time) < 1e-6)!;
          const nose = frame.racers[event.subject]!.nose;
          return frame.camera + boxAt(kind, at, nose).left + each.x * at.k;
        });
      expect(along.length).toBeGreaterThan(1);
      expect(Math.max(...along) - Math.min(...along)).toBeLessThan(2);
      expect(Math.min(...pile.map((each) => each.x))).toBeLessThan(0);
      // Leaves fly up out of it as it lands.
      const flying = during(OWN_LAND, OWN_LAND + 0.8);
      expect(flying.some((frame) => frame.racer.track.includes('flying-leaves'))).toBe(true);
      expect(during(0, OWN_LAND - 0.05).some((f) => f.racer.track.includes('flying'))).toBe(false);
      // It climbs out, wriggling.
      const wriggle = during(STOP.phew - OWN_SHAKE, STOP.phew).map((frame) =>
        Math.abs(parseFloat(frame.racer.rotate || '0')),
      );
      expect(Math.max(...wriggle)).toBeGreaterThan(1);
      expect(TRACK_PROPS.leafPile[0]![1]).toBe(styles.orange);
      expect(tagsOver()).toEqual([]);
    }
    if (key === 'autumn burst') {
      const blown = during(0.05, BURST.seconds);
      expect(blown.every((frame) => frame.racer.track.includes('umbrella'))).toBe(true);
      // The umbrella in its waving hand.
      expect(blown.every((frame) => frame.racer.pose === 'wave')).toBe(true);
      const held = run.standing.filter((each) => each.part === 'umbrella' && each.hand);
      for (const { x, y, hand } of held) expect([x, y]).toEqual([...hand!]);
      // Off the ground, over its shadow: 30 px, or as high as it can go clear of the lanes behind.
      const lifts = blown.map((frame) => frame.racer.lift);
      expect(Math.max(...lifts)).toBeGreaterThan(8);
      expect(Math.max(...lifts)).toBeLessThanOrEqual(30);
      const up = during(0, BURST.seconds).filter((frame) => frame.racer.lift > 0);
      expect(up.every((frame) => run.shadows.includes(frame.time))).toBe(true);
      // Swaying in the wind, a tomato umbrella.
      expect(Math.max(...blown.map((frame) => Math.abs(frame.racer.sway)))).toBeGreaterThan(1);
      expect(TRACK_PROPS.umbrella.map(([, className]) => className)).toContain(styles.tomato);
      expect(tagsOver()).toEqual([]);
    }
    if (kind === 'stop') {
      expect(during(0.5, STOP.off).some((frame) => frame.racer.pose === 'wave')).toBe(true);
      expect(says('Phew!')).toBe(true);
      expect(furtherBack()).toBe(true);
    } else {
      expect(leads()).toBe(true);
      expect(says('Nooo!')).toBe(true);
    }
  });
}

/** Show seconds from `from` to `to`, every frame. */
export function* frames(from: number, to: number, step = 1 / 30) {
  for (let t = from; t <= to + 1e-9; t += step) yield t;
}

/** Every head count with seeds 1–40, on each track in turn, the last of the team unlucky. */
export function everyPlan(): { label: string; plan: Plan; team: string[]; unlucky: string }[] {
  const all = [];
  for (let count = 2; count <= 8; count++) {
    for (let seed = 1; seed <= 40; seed++) {
      const team = names(count);
      const unlucky = team.at(-1)!;
      const course = COURSES[seed % COURSES.length]!;
      all.push({
        label: `${count} people, seed ${seed}, ${course}`,
        plan: planShow(team, unlucky, createRandom(seed), course),
        team,
        unlucky,
      });
    }
  }
  return all;
}

/** Riders with every extra the kit hands out a cap, goggles or a snorkel to, and creatures. */
export const DRESSED = new Map<string, ChosenLook>([
  ['Anna', { mount: 'snail', colour: 'tomato', extra: 'number' }],
  ['Ben', { mount: 'chair', colour: 'mint', extra: 'tophat' }],
  ['Carla', { mount: 'duck', colour: 'pink', extra: 'scarf' }],
  ['Dario', { mount: 'shark', colour: 'sea', extra: 'tophat' }],
  ['Elena', { mount: 'gnome', colour: 'mint', extra: 'number' }],
  ['Fabio', { mount: 'dinosaur', colour: 'sun', extra: 'bowtie' }],
  ['Giulia', { mount: 'rocket', colour: 'orange', extra: 'googly' }],
  ['Hana', { mount: 'robot', colour: 'grape', extra: 'tophat' }],
]);
/** Everyone as the show first draws them on `course`. */
export async function dressedOn(course: Course) {
  const drawn = new Map<string, SVGSVGElement>();
  await runShow(theRace, {
    names: [...DRESSED.keys()],
    unlucky: 'Hana',
    seed: 4,
    theme: course,
    looks: DRESSED,
    cancelAt: 0.2,
    step: STEP,
    onFrame: (_, stage) => {
      for (const name of DRESSED.keys()) {
        const svg = stage.querySelector<SVGSVGElement>(`[data-person="${name}"] svg`)!;
        if (!drawn.has(name)) drawn.set(name, svg.cloneNode(true) as SVGSVGElement);
      }
    },
  });
  return [...drawn.values()];
}
/** Everyone at the start, and in the panel's drawing, on `course`. */
export function lineUpOn(course: Course) {
  const people = [...DRESSED].map(([name, look], index) => ({
    name,
    place: index + 1,
    look,
    chosen: index === 0,
  }));
  const lineUp = theRace.lineUp!;
  const start = lineUp.drawStart!({ people, theme: course });
  return [
    ...start.el.querySelectorAll<SVGSVGElement>('svg[data-person]'),
    ...people.map(
      ({ name, place, look }) => lineUp.draw(look, { name, place, theme: course }) as SVGSVGElement,
    ),
  ];
}
export const accessories = (svg: SVGSVGElement) =>
  svg.querySelectorAll('[data-part="cap"], [data-part="goggles"], [data-part="snorkel"]');
