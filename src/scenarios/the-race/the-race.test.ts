import { loadFeature } from '@amiceli/vitest-cucumber';
import { describe, expect, it } from 'vitest';
import {
  handOutLooks,
  speechBox,
  START,
  type Box,
  type ChosenLook,
  type Cue,
  type Mood,
  type Note,
  type Scenario,
} from '../../scenario-kit';
import { pitchOf } from '../../scenario-kit/music';
import { dealLooks } from '../../scenario-kit/line-up';
import { createRandom } from '../../scenario-kit/random';
import { describeSpec, runShow, type ShowRecord } from '../../scenario-kit/testing';
import theRace from './index';
import { eventCaption } from './play';
import { faceAt, lane, startLane, START_TRACK, tagAt, tagBox } from './layout';
import { raceMusic } from './music';
import { creature, CREATURE_SPEC } from './creature';
import {
  CREATURES,
  EXTRAS,
  isCreature,
  MOUNTS,
  TRACK_PROPS,
  RACER,
  RACER_COLOURS,
  racer,
  RIDER,
  SPEC,
  type Creature,
  type Kind,
  type Mount,
  type RacerColour,
} from './parts';
import styles from './the-race.module.css';
import css from './the-race.module.css?raw';
import {
  BURST,
  CAMERA,
  cameraAt,
  COURSES,
  crossingOf,
  eventCount,
  leaderAt,
  LENGTH,
  noseAt,
  lineAt,
  orderAt,
  planShow,
  spacing,
  STOP,
  type Course,
  type Ending,
  type Plan,
  type RaceEvent,
} from './plan';

const ENDINGS: readonly Ending[] = ['photo', 'brake', 'surge'];

/** A label as it reads, without the soft hyphens that only break it on screen. */
const read = (label: string) => label.replaceAll('\u00AD', '');

/** The six things on legs, as the feature names them, in the Line-up's order. */
const THING_NAMES: Readonly<Record<string, Creature>> = {
  'coffee mug': 'mug',
  printer: 'printer',
  'sticky note': 'sticky',
  banana: 'banana',
  'ice cream': 'icecream',
  sushi: 'sushi',
};
const THING_KINDS = Object.values(THING_NAMES);

/** The four animals and four spooky creatures of step 4, as the feature names them. */
const NEW_NAMES: Readonly<Record<string, Creature>> = {
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
function bounds(d: string) {
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
const TEAM = ['Anna', 'Ben', 'Carla', 'Dario', 'Elena', 'Fabio', 'Giulia', 'Annamaria Rossi'];

const names = (count: number) => TEAM.slice(0, count);

/** Show seconds per frame of the shared runs: coarse, so they stay quick. */
const STEP = 1 / 10;

/** One racer as a frame drew them. */
interface Drawn {
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
  readonly twinkle: string;
}

/** What the stage showed in one frame. */
interface Frame {
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

interface Watched {
  readonly record: ShowRecord;
  readonly frames: readonly Frame[];
  readonly plan: Plan;
  readonly team: readonly string[];
  readonly unlucky: string;
  /** Everyone's look, as given or dealt for the run. */
  readonly looks: ReadonlyMap<string, ChosenLook>;
}

/** Everyone in a show on `mount`, or as it, in the colours in turn, with a racing number. */
const allOn = (team: readonly string[], mount: Kind) =>
  new Map<string, ChosenLook>(
    team.map((name, i) => [name, { mount, colour: RACER_COLOURS[i % 6]!, extra: 'number' }]),
  );

/** The elements a frame is read from. */
function find(stage: HTMLElement) {
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
async function watch(
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
          twinkle: svg.dataset.twinkle ?? '',
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
const kindOf = (watched: Watched, name: string) => watched.looks.get(name)!.mount as Kind;

/** The captions shown, in order. */
const captions = (watched: Watched) => watched.record.captions.map((each) => each.text);

/** The frames from `from` up to `to`, in show seconds. */
const between = (watched: Watched, from: number, to: number) =>
  watched.frames.filter((frame) => frame.time >= from - 1e-9 && frame.time < to - 1e-9);
const shownAt = (watched: Watched, text: string) =>
  watched.record.captions.find((each) => each.text === text)?.from;
const saying = (frame: Frame, person: string, text: string) =>
  frame.says.some((said) => said.person === person && said.text === text);

/** `box` raised by `lift` stage px. */
const raised = (box: Box, lift: number): Box => ({
  ...box,
  top: box.top - lift,
  bottom: box.bottom - lift,
});

const overlap = (one: Box, two: Box) =>
  one.left < two.right && two.left < one.right && one.top < two.bottom && two.top < one.bottom;

/** The rider's head in a racer's drawing: the one picture in its holder that isn't an extra. */
const headOf = (svg: SVGSVGElement) =>
  svg.querySelector<SVGSVGElement>('[data-part="lean"] > svg:not([data-part])')!;

/** Runs that more than one scenario reads, each run once, when first asked for. */
const shared = (() => {
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
async function firstDrawn(looks: Map<string, ChosenLook>, seed = 4) {
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
const ends = (path: Element | null) =>
  path!
    .getAttribute('d')!
    .trim()
    .split(/[ A-Z]+/)
    .slice(-2)
    .join(' ');
/** Whether `svg` shows the reins. */
const reined = (svg: SVGSVGElement) =>
  svg.querySelector('[data-part="reins"]')!.getAttribute('display') !== 'none';

/** Plans for seeds 1 to `seeds`. */
function plans(team: readonly string[], unlucky: string, seeds = 20): Plan[] {
  return Array.from({ length: seeds }, (_, index) =>
    planShow(team, unlucky, createRandom(index + 1)),
  );
}

/** What the feature calls each track. */
const COURSE_NAMES: Readonly<Record<string, Course>> = {
  'the sports field': 'field',
  'the office': 'office',
  'under the sea': 'sea',
  'the Moon': 'moon',
};

/** The first `runs` plans on `course`, and `fits` if given, from seed 1 on. */
function plansOn(
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
interface Heard {
  readonly record: ShowRecord;
  readonly plan: Plan;
  readonly notes: readonly Note[];
  /** Each move of the song, at the show second of its frame. */
  readonly moves: readonly { time: number; beat: number; speed: number }[];
  readonly cues: readonly { time: number; cue: Cue }[];
}

/** Runs the race with a sound that keeps what the show asked of it. */
async function listen(team: readonly string[], unlucky: string, seed = 1): Promise<Heard> {
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
    theme: 'field',
    looks: dealLooks(theRace.lineUp!, team, createRandom(seed)),
    onFrame(time) {
      for (const each of [...moves, ...cues]) each.time ??= time;
    },
  });
  return {
    record,
    plan: planShow(team, unlucky, createRandom(seed)),
    notes,
    moves: moves.map(({ time, ...move }) => ({ time: time!, ...move })),
    cues: cues.map(({ time, cue }) => ({ time: time!, cue })),
  };
}

/** For each ending, the first plan from seed 1 on with `count` people that ends that way. */
function plansByEnding(count: number): Plan[] {
  const team = names(count);
  return ENDINGS.map((ending) => {
    for (let seed = 1; ; seed++) {
      const plan = planShow(team, team.at(-1)!, createRandom(seed));
      if (plan.ending === ending) return plan;
    }
  });
}

/** A piece of text on the stage, and what carries it. */
interface Sticker {
  readonly text: string;
  /** The sticker's own data attribute or part: what it is. */
  readonly what: string;
  readonly background: string;
  readonly colour: string;
  readonly border: string;
}

/** A run on one track, with what its stage showed beyond the frames. */
interface OnTrack {
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
  readonly standing: readonly { time: number; part: string; x: number; y: number }[];
  /** Each frame a shadow was on the ground. */
  readonly shadows: readonly number[];
}

/** What may carry text: a sign, a name tag, a bubble, the caption or the photo card. */
const KINDS = [
  ['sign', '[data-part="sign"] p'],
  ['tag', '[data-lines]'],
  ['bubble', '[data-says]'],
  ['caption', '[data-kit="caption"]'],
  ['photo', '[data-part="photo"]'],
] as const;
const STICKERS = KINDS.map(([, selector]) => selector).join(', ');

/**
 * The borders the stylesheets give `el`, as written: jsdom can't split a
 * `border` shorthand that holds a `var(--…)`.
 */
function borderOf(el: Element): string {
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
const readOn = new WeakMap<Element, Set<string>>();

/** Notes every shown piece of text in `root` not yet read, on its sticker or loose. */
function readText(root: Element, stickers: Sticker[], loose: string[]) {
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
const onTracks = new Map<string, Promise<OnTrack>>();

/** A cup in hand from this far into the coffee-machine stop. */
const OWN_CUP = 0.3;

/** Who the track's own stop and burst happen to, as the feature names them. */
const SUBJECTS: Readonly<Record<Course, Readonly<Record<RaceEvent['kind'], string>>>> = {
  field: { stop: 'Ben', burst: 'Ben' },
  office: { stop: 'Ben', burst: 'Ben' },
  sea: { stop: 'Marco', burst: 'Marco' },
  moon: { stop: 'Anna', burst: 'Anna' },
  christmas: { stop: 'Ben', burst: 'Carla' },
};

/**
 * Eight people on `course`, ending in a photo finish; off the sports field,
 * the track's own event is a `kind`, and happens to the feature's racer for
 * that track. The stage's props are read every frame; in a run with a stop,
 * its text every second and as the photo pops up.
 */
function onTrack(course: Course, kind: 'burst' | 'stop' = 'stop'): Promise<OnTrack> {
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
    const standing: { time: number; part: string; x: number; y: number }[] = [];
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
          for (const part of ['machine', 'wet-floor', 'snowdrift', 'sledge']) {
            const prop = scene.querySelector(`[data-part="${part}"]`);
            if (!prop || prop.getAttribute('display') === 'none') continue;
            const [, x, y] = prop.getAttribute('transform')!.match(/translate\((\S+) (\S+)\)/)!;
            standing.push({ time, part, x: Number(x), y: Number(y) });
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
type StepOf = (title: string, run: () => void | Promise<void>) => void;

/** Seaweed and snow are shaken off over this many seconds before "Phew!". */
const OWN_SHAKE = 0.4;

/**
 * The steps of a track's own `kind` on `course`, from "When someone's event
 * is …", the `when` step, to what it does, for its caption.
 */
function actOutOwnEvent(
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
function* frames(from: number, to: number, step = 1 / 30) {
  for (let t = from; t <= to + 1e-9; t += step) yield t;
}

/** Every head count with seeds 1–40, on each track in turn, the last of the team unlucky. */
function everyPlan(): { label: string; plan: Plan; team: string[]; unlucky: string }[] {
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

describeSpec(await loadFeature('./the-race.feature'), ({ Rule }) => {
  Rule('Its card', ({ RuleScenario }) => {
    RuleScenario('The picker shows The Race', ({ Then, And }) => {
      Then('its name is {string}', (_, name: string) => expect(theRace.name).toBe(name));
      And('its description is {string}', (_, text: string) =>
        expect(theRace.description).toBe(text),
      );
      And('its picture is 🏁', () => expect(theRace.card).toEqual({ emoji: '🏁' }));
      And('it takes {int} to {int} people', (_, min: number, max: number) =>
        expect(theRace.people).toEqual({ min, max }),
      );
      And('it has a line-up', () => expect(theRace.lineUp).toBeDefined());
    });
  });

  Rule('Its line-up', ({ RuleScenario, RuleScenarioOutline }) => {
    RuleScenario('Racers as pictures, by kind', ({ When, Then, And }) => {
      const lineUp = theRace.lineUp!;
      const option = (label: string) => lineUp.options.find((each) => each.label === label)!;
      const listed = (text: string) => [...text.matchAll(/"([^"]+)"/g)].map(([, x]) => x);
      // Its first racers: "Four animals and four spooky creatures" adds more after them.
      const holds = (group: string, held: string) => {
        const choices = option('Racer').choices.filter((choice) => choice.group === group);
        const names = listed(held);
        expect(choices.slice(0, names.length).map((choice) => read(choice.label))).toEqual(names);
      };
      When('the Line-up opens for The Race', () => {
        expect(lineUp.heading).toBe('Line up the racers');
        expect(lineUp.start).toBe('Start the race');
      });
      Then('its first option is {string}, its choices in groups, as tabs', (_, label: string) => {
        const first = lineUp.options[0]!;
        expect(first.label).toBe(label);
        // Still `mount`, so stored looks keep their ride.
        expect(first.name).toBe('mount');
        // In groups, each a tab: "Six things on legs" says their order.
        for (const choice of first.choices) expect(choice.group, choice.name).toBeTruthy();
        expect(new Set(first.choices.map((choice) => choice.group)).size).toBeGreaterThan(1);
      });
      And('the group "Rides" holds {any}', (_, held: string) => holds('Rides', held));
      And('the group "Animals" holds {any}', (_, held: string) => holds('Animals', held));
      And('the group "Spooky" holds {any}', (_, held: string) => holds('Spooky', held));
      And('the group "Space" holds {any}', (_, held: string) => holds('Space', held));
      And(
        'each racer is shown as the chosen person racing as it, in their colour and extra, calm, its name under it',
        () => {
          const racer = option('Racer');
          expect(racer.drawn).toBe(true);
          for (const { name } of racer.choices) {
            const drawn = lineUp.draw(
              { mount: name, colour: 'mint', extra: 'number' },
              { name: 'Anna', place: 3 },
            ) as SVGSVGElement;
            expect(drawn.dataset).toMatchObject({ mount: name, colour: 'mint', mood: 'calm' });
            expect(drawn.querySelector('text')!.textContent).toBe('3');
          }
        },
      );
      And(
        '"Colour" offers the same swatches as before, and "Extra" a picture of each extra, each named for screen readers',
        () => {
          expect(lineUp.options.map((each) => each.name)).toEqual(['mount', 'colour', 'extra']);
          const colours = option('Colour').choices;
          expect(colours.map((choice) => choice.name)).toEqual([...RACER_COLOURS]);
          for (const choice of colours) expect(choice.swatch).toBe(choice.name);
          expect(colours.find((choice) => choice.name === 'shark')!.label).toBe('Grey');
          const extras = option('Extra').choices;
          expect(extras.map((choice) => choice.label)).toEqual([
            'Googly eyes',
            'Top hat',
            'Number',
            'Scarf',
            'Cape',
            'Bow tie',
          ]);
          for (const choice of extras) {
            const picture = choice.picture!();
            expect(picture.querySelector(`[data-part="${choice.name}"]`)).not.toBeNull();
            expect(picture.getAttribute('aria-hidden')).toBe('true');
          }
        },
      );
    });

    RuleScenario('Its themes, and the racers that suit each', ({ When, Then, And }) => {
      const lineUp = theRace.lineUp!;
      const labelOf = (name: string) =>
        read(lineUp.options[0]!.choices.find((choice) => choice.name === name)!.label);
      When('the Line-up opens for The Race', () => {
        expect(lineUp.themes).toBeDefined();
      });
      Then(
        'its themes are {any}, after "Surprise", each a postcard of its track',
        (_, themes: string) => {
          const labels = [...themes.matchAll(/"([^"]+)"/g)].map(([, label]) => label);
          // The four tracks come first; "Christmas is a theme" says what follows.
          const tracks = lineUp.themes!.slice(0, labels.length);
          expect(tracks.map((theme) => theme.label)).toEqual(labels);
          expect(lineUp.themes!.map((theme) => theme.name)).toEqual([...COURSES]);
          for (const theme of lineUp.themes!) {
            const picture = theme.picture() as SVGSVGElement;
            expect(picture.dataset).toMatchObject({ part: 'postcard', course: theme.name });
            expect(picture.getAttribute('viewBox')).toBe('0 0 120 46');
            expect(picture.getAttribute('aria-hidden')).toBe('true');
          }
        },
      );
      And(
        "each theme's tab holds, in this order:",
        (_, table: { theme: string; racers: string }[]) => {
          expect(table.map((row) => row.theme)).toEqual(
            lineUp.themes!.slice(0, table.length).map((each) => each.label),
          );
          for (const row of table) {
            const theme = lineUp.themes!.find((each) => each.label === row.theme)!;
            expect(theme.suits!.map(labelOf), row.theme).toEqual(row.racers.split(', '));
          }
        },
      );
    });

    /** Everyone at The Race's start, with looks dealt from a seed, `chosen` the one chosen. */
    function startOf(people: readonly string[], theme: Course, chosen: number) {
      const looks = dealLooks(theRace.lineUp!, people, createRandom(7));
      const scene = {
        people: people.map((name, index) => ({
          name,
          place: index + 1,
          look: looks.get(name)!,
          chosen: index === chosen,
        })),
        theme,
      };
      return { scene, ...theRace.lineUp!.drawStart!(scene) };
    }

    RuleScenario('The Line-up is the start line', ({ Given, When, Then, And }) => {
      let people: string[] = [];
      let theme: Course;
      let start: ReturnType<typeof startOf>;
      const CHOSEN = 2;
      const kindOf = (index: number) => start.scene.people[index]!.look.mount as Kind;
      const racers = () => [...start.el.querySelectorAll<SVGSVGElement>('svg[data-person]')];
      const tags = () => [...start.el.querySelectorAll<HTMLElement>('div[data-person]')];
      /** Where person `index`'s name tag is, from its name, as the race sizes it. */
      const tagOf = (index: number) =>
        tagBox(people[index]!, kindOf(index), startLane(index, people.length), START_TRACK.nose);
      const overlaps = (
        one: { top: number; bottom: number },
        two: { top: number; bottom: number },
      ) => one.top < two.bottom && two.top < one.bottom;
      /** The people whose name tags a span from `top` to `bottom` is level with. */
      const levelWith = (top: number, bottom: number) =>
        people.filter((_, index) => overlaps({ top, bottom }, tagOf(index)));
      Given('{int} people, with {string} chosen', (_, count: number, label: string) => {
        people = names(count);
        theme = theRace.lineUp!.themes!.find((each) => each.label === label)!.name as Course;
      });
      When('the Line-up opens for The Race', () => {
        start = startOf(people, theme, CHOSEN);
      });
      Then(
        "everyone waits at the start line, a lane each, in today's order, noses on the line, on the office track with its backdrop above the lanes",
        () => {
          expect((start.el as HTMLElement).dataset).toMatchObject({
            part: 'start',
            course: 'office',
          });
          expect(start.el.classList).toContain(styles.office);
          expect(racers().map((each) => each.dataset.person)).toEqual(people);
          expect(start.places).toHaveLength(people.length);
          start.places.forEach(({ drawing }, index) => {
            const at = startLane(index, people.length);
            expect(drawing).toBe(racers()[index]);
            // A lane each, one under the other, under the backdrop's band.
            expect(at.top).toBeGreaterThanOrEqual(START_TRACK.top);
            expect(at.top + at.pitch).toBeLessThanOrEqual(START.height + 0.01);
            // Feet in the lane, the nose just short of the line.
            const el = drawing as SVGSVGElement;
            const k = parseFloat(el.style.width) / RACER.width;
            const kind = kindOf(index);
            const nose = isCreature(kind) ? CREATURE_SPEC[kind].nose : SPEC[kind].nose;
            expect(parseFloat(el.style.left) + nose * k).toBeCloseTo(START_TRACK.nose);
            const feet = parseFloat(el.style.top) + RACER.feet * k;
            expect(feet).toBeGreaterThan(at.top);
            expect(feet).toBeLessThan(at.top + at.pitch);
          });
          expect(START_TRACK.nose).toBeLessThan(START_TRACK.line);
          const band = start.el.querySelector('[data-part="band"]')!;
          expect(band.children.length).toBeGreaterThan(0);
          expect(start.el.querySelector('[data-part="start-line"]')).not.toBeNull();
        },
      );
      And(
        "each racer's name tag is beside the face, and their die and pin are at the left, level with the tag",
        () => {
          expect(tags().map((each) => each.dataset.person)).toEqual(people);
          tags().forEach((tag, index) => {
            const at = startLane(index, people.length);
            const { right, middle } = tagAt(kindOf(index), at, START_TRACK.nose);
            expect(tag.style.translate).toBe(`calc(${right}px - 100%) calc(${middle}px - 50%)`);
            expect(right).toBeLessThan(faceAt(kindOf(index), at, START_TRACK.nose).left);
          });
          start.places.forEach(({ box }, index) => {
            // Room for a die and a pin, each --target-min, with gaps round them.
            expect(box.left).toBeGreaterThanOrEqual(2 * 44 + 16);
            expect(box.left + box.width).toBeLessThanOrEqual(START_TRACK.line);
            expect(box.height).toBeGreaterThanOrEqual(44);
            expect(box.top).toBeGreaterThanOrEqual(0);
            // The Line-up centres the die and the pin on the box: level with
            // this person's tag and face, and no one else's tag.
            const middle = box.top + box.height / 2;
            expect(levelWith(middle - 22, middle + 22)).toEqual([people[index]]);
            expect(levelWith(box.top, box.top + box.height)).toEqual([people[index]]);
            const face = faceAt(kindOf(index), startLane(index, people.length), START_TRACK.nose);
            expect(overlaps({ top: middle - 22, bottom: middle + 22 }, face)).toBe(true);
            const next = start.places[index + 1];
            if (next) expect(next.box.top).toBeCloseTo(box.top + box.height);
          });
        },
      );
      And(
        "the chosen person's row, level with their name tag, is sun, as is the tag, and they wave",
        () => {
          const row = start.el.querySelector('[data-part="chosen"] path')!;
          expect(row.getAttribute('class')).toBe(styles.sun);
          const [, y, height] = row.getAttribute('d')!.match(/^M0 ([\d.]+) h[\d.]+ v([\d.]+)/)!;
          const [top, bottom] = [Number(y), Number(y) + Number(height)];
          expect(levelWith(top, bottom)).toEqual([people[CHOSEN]]);
          // Behind every racer.
          expect(
            row.compareDocumentPosition(racers()[0]!) & Node.DOCUMENT_POSITION_FOLLOWING,
          ).toBeTruthy();
          tags().forEach((tag, index) => {
            expect(tag.classList.contains(styles.chosenTag!)).toBe(index === CHOSEN);
          });
          expect(css).toMatch(/\.chosenTag \{\s*background-color: var\(--color-sun\);/);
          racers().forEach((racer, index) => {
            expect(racer.dataset.pose).toBe(index === CHOSEN ? 'wave' : 'hold');
            expect(racer.dataset.mood).toBe(index === CHOSEN ? 'happy' : 'calm');
          });
        },
      );
      And('the panel sits over the track ahead of the line', () => {
        // The Line-up lays its panel over the grid's right START.panel px.
        expect(START_TRACK.line + 12).toBeLessThanOrEqual(START.width - START.panel);
        const sign = start.el.querySelector<HTMLElement>(`.${styles.startSign}`)!;
        expect(sign).toHaveTextContent('Start');
        expect(parseFloat(sign.style.right)).toBeGreaterThan(START.panel);
      });
    });

    RuleScenario('The start line fits the window', ({ Given, When, Then, And }) => {
      // jsdom has no layout: e2e/line-up.spec.ts measures this Line-up in a
      // real 1280 by 800 window. Here: the start keeps inside its grid.
      const lineUp = theRace.lineUp!;
      let people: string[] = [];
      let start: ReturnType<typeof startOf>;
      Given(
        '{int} people, a 15-character name among them, in a 1280 by 800 window',
        (_, count: number) => {
          people = [...names(count - 1), 'Maria-Elena Ros'];
          expect(people.at(-1)).toHaveLength(15);
        },
      );
      When('the Line-up opens for The Race', () => {
        expect(people.length).toBeLessThanOrEqual(theRace.people.max);
        start = startOf(people, 'field', 0);
      });
      Then(
        "the postcards, every lane, the panel's tabs, every colour and extra, and both buttons are in view without scrolling",
        () => {
          for (const { box } of start.places) {
            expect(box.top).toBeGreaterThanOrEqual(0);
            expect(box.top + box.height).toBeLessThanOrEqual(START.height + 0.01);
          }
          const [, colour, extra] = lineUp.options;
          // Two rows of four swatches and two of three extras beside the racers.
          expect(colour!.choices).toHaveLength(8);
          expect(extra!.choices).toHaveLength(6);
          expect(lineUp.themes!.length + 1).toBeLessThanOrEqual(8);
        },
      );
      And(
        "the open tab's first eight racers are in view, and any more scroll inside the panel",
        () => {
          // Measured in e2e/line-up.spec.ts.
          expect(lineUp.options[0]!.drawn).toBe(true);
        },
      );
    });

    RuleScenario('Each racer looks as chosen', ({ Given, When, Then, And }) => {
      const looks = new Map<string, ChosenLook>();
      let drawn: Map<string, SVGSVGElement>;
      const shirt = (svg: SVGSVGElement) => headOf(svg).style.getPropertyValue('--shirt');
      Given(
        'Anna chose the duck, sun and the scarf, and Ben the office chair, grape and googly eyes',
        () => {
          looks.set('Anna', { mount: 'duck', colour: 'sun', extra: 'scarf' });
          looks.set('Ben', { mount: 'chair', colour: 'grape', extra: 'googly' });
          looks.set('Carla', { mount: 'snail', colour: 'mint', extra: 'number' });
        },
      );
      When('the show runs', async () => {
        drawn = await firstDrawn(looks);
      });
      Then('Anna rides a sun duck on a skateboard, in a sun shirt, with a scarf', () => {
        const anna = drawn.get('Anna')!;
        expect(anna.dataset).toMatchObject({ mount: 'duck', colour: 'sun', extra: 'scarf' });
        expect(anna.style.getPropertyValue('--racer')).toBe('var(--color-sun)');
        expect(anna.querySelectorAll('[data-part="wheel"]')).toHaveLength(2);
        expect(shirt(anna)).toBe('var(--color-sun)');
        expect(anna.querySelector('[data-part="scarf"]')).not.toBeNull();
      });
      And(
        'Ben rides a grape office chair backwards, holding its backrest, in a grape shirt, with googly eyes on the backrest',
        () => {
          const ben = drawn.get('Ben')!;
          expect(ben.dataset).toMatchObject({ mount: 'chair', colour: 'grape', extra: 'googly' });
          expect(shirt(ben)).toBe('var(--color-grape)');
          const [x, y] = SPEC.chair.hold!;
          expect(ben.querySelector('[data-part="hands"] path')!.getAttribute('d')).toContain(
            `L${x} ${y}`,
          );
          expect(ben.querySelector('[data-part="reins"]')!.getAttribute('display')).toBe('none');
          for (const eye of ben.querySelectorAll('[data-part="googly"] circle')) {
            const cx = Number(eye.getAttribute('cx'));
            const cy = Number(eye.getAttribute('cy'));
            expect(cx).toBeGreaterThan(162);
            expect(cx).toBeLessThan(200);
            expect(cy).toBeGreaterThan(34);
            expect(cy).toBeLessThan(110);
          }
        },
      );
      And(
        "each rider's head keeps the skin tone and accessory the kit hands out for the run",
        () => {
          const random = createRandom(4);
          planShow(['Anna', 'Ben', 'Carla'], 'Carla', random);
          const faces = handOutLooks(['Anna', 'Ben', 'Carla'], random);
          for (const [name, svg] of drawn) {
            const head = headOf(svg);
            const face = faces.get(name)!;
            expect(head.style.getPropertyValue('--skin')).toBe(`var(--color-skin-${face.skin})`);
            expect(head.querySelector(`[data-part="${face.accessory}"]`)).not.toBeNull();
          }
        },
      );
    });

    RuleScenario("A racing number is their place in today's list", ({ Given, When, Then }) => {
      const looks = new Map<string, ChosenLook>();
      let drawn: Map<string, SVGSVGElement>;
      Given(`Carla is third in today's list and chose "Number"`, () => {
        looks.set('Anna', { mount: 'duck', colour: 'sun', extra: 'scarf' });
        looks.set('Ben', { mount: 'chair', colour: 'grape', extra: 'number' });
        looks.set('Carla', { mount: 'caterpillar', colour: 'pink', extra: 'number' });
      });
      When('the show runs', async () => {
        drawn = await firstDrawn(looks);
      });
      Then('her mount wears a paper roundel with {string}', (_, number: string) => {
        const roundel = drawn.get('Carla')!.querySelector('[data-part="number"]')!;
        expect(roundel.querySelector('circle')).not.toBeNull();
        expect(roundel.textContent).toBe(number);
      });
    });

    RuleScenario('Each new ride looks as chosen', ({ Given, When, Then, And }) => {
      const looks = new Map<string, ChosenLook>();
      let drawn: Map<string, SVGSVGElement>;
      Given(
        'Anna chose the space hopper, Ben the ostrich, Carla the rocket and Dario the sandwich',
        () => {
          looks.set('Anna', { mount: 'hopper', colour: 'sea', extra: 'number' });
          looks.set('Ben', { mount: 'ostrich', colour: 'shark', extra: 'cape' });
          looks.set('Carla', { mount: 'rocket', colour: 'orange', extra: 'bowtie' });
          looks.set('Dario', { mount: 'sandwich', colour: 'pink', extra: 'scarf' });
        },
      );
      When('the show runs', async () => {
        drawn = await firstDrawn(looks);
      });
      const arm = (name: string) => drawn.get(name)!.querySelector('[data-part="hands"] path');
      Then('Anna sits on the hopper and holds its horns', () => {
        const anna = drawn.get('Anna')!;
        expect(anna.dataset.mount).toBe('hopper');
        expect(ends(arm('Anna'))).toBe(SPEC.hopper.hold!.join(' '));
        expect(reined(anna)).toBe(false);
        // The hand is on a horn's tip, the horn's end at (146, 84).
        const horns = anna.querySelector('[data-part="mount"] path')!.getAttribute('d')!;
        expect(horns).toContain('146 84');
      });
      And("Ben holds reins tied to the ostrich's neck", () => {
        const ben = drawn.get('Ben')!;
        expect(ben.dataset.mount).toBe('ostrich');
        expect(reined(ben)).toBe(true);
        const [x, y] = SPEC.ostrich.reins!;
        expect(ends(ben.querySelector('[data-part="reins"]'))).toBe(`${x} ${y}`);
        // On the neck, which runs from (150, 126) up to the head at (180, 70).
        expect(x).toBeGreaterThan(150);
        expect(x).toBeLessThan(184);
        expect(y).toBeGreaterThan(70);
        expect(y).toBeLessThan(126);
      });
      And('Carla sits astride the rocket and holds its handlebar', () => {
        const carla = drawn.get('Carla')!;
        expect(carla.dataset.mount).toBe('rocket');
        expect(ends(arm('Carla'))).toBe(SPEC.rocket.hold!.join(' '));
        expect(reined(carla)).toBe(false);
        // The handlebar rises from the rocket's top to (164, 94).
        const bar = [...carla.querySelectorAll('[data-part="mount"] path')].at(-1)!;
        expect(ends(bar)).toBe('164 94');
        // Astride: the shirt's foot is on the rocket's top, at y 110.
        expect(SPEC.rocket.saddle[1]).toBe(110);
      });
      And('Dario sits on the top slice and holds reins tied to its cocktail stick', () => {
        const dario = drawn.get('Dario')!;
        expect(dario.dataset.mount).toBe('sandwich');
        expect(reined(dario)).toBe(true);
        const [x, y] = SPEC.sandwich.reins!;
        expect(ends(dario.querySelector('[data-part="reins"]'))).toBe(`${x} ${y}`);
        // On the stick, from (196, 110) up to (200, 82).
        expect(x).toBeGreaterThanOrEqual(196);
        expect(x).toBeLessThanOrEqual(200);
        expect(y).toBeGreaterThanOrEqual(82);
        expect(y).toBeLessThanOrEqual(110);
      });
      And(
        "each mount and shirt is in the colour chosen, and every rider's head sits at the same height in its lane",
        () => {
          const rows = [...drawn].map(([name, svg]) => {
            const { colour } = looks.get(name)!;
            expect(svg.style.getPropertyValue('--racer')).toBe(`var(--color-${colour})`);
            expect(headOf(svg).style.getPropertyValue('--shirt')).toBe(`var(--color-${colour})`);
            return svg
              .querySelector('[data-part="rider"]')!
              .getAttribute('transform')!
              .split(' ')[1];
          });
          expect(new Set(rows).size).toBe(1);
          for (const count of [2, 4, 8]) {
            for (let i = 0; i < count; i++) {
              const tops = MOUNTS.map((mount) => faceAt(mount, lane(i, count), 900).top);
              expect(new Set(tops).size).toBe(1);
            }
          }
        },
      );
    });

    RuleScenario('A cape and a bow tie', ({ Given, When, Then, And }) => {
      const looks = new Map<string, ChosenLook>();
      let drawn: Map<string, SVGSVGElement>;
      Given('Anna chose the cape and Ben the bow tie', () => {
        looks.set('Anna', { mount: 'duck', colour: 'sun', extra: 'cape' });
        looks.set('Ben', { mount: 'snail', colour: 'mint', extra: 'bowtie' });
        looks.set('Carla', { mount: 'chair', colour: 'grape', extra: 'number' });
      });
      When('the show runs', async () => {
        drawn = await firstDrawn(looks);
      });
      /** The rider's parts in `lean`, back to front. */
      const layers = (name: string) =>
        [...drawn.get(name)!.querySelector('[data-part="lean"]')!.children].map(
          (child) => (child as SVGElement).dataset.part ?? 'head',
        );
      Then("Anna's cape flies out behind the rider's shoulders", () => {
        expect(layers('Anna')).toEqual(['cape', 'head']);
        const cape = drawn.get('Anna')!.querySelector('[data-part="cape"] path')!;
        const xs = [...cape.getAttribute('d')!.matchAll(/(-?\d+) (-?\d+)/g)].map(([, x]) => +x!);
        // From the shoulders on the head's grid, out behind the head's left edge.
        expect(Math.max(...xs)).toBeGreaterThanOrEqual(30);
        expect(Math.min(...xs)).toBeLessThan(-30);
      });
      And('Ben wears a bow tie at the collar', () => {
        expect(layers('Ben')).toEqual(['head', 'bowtie']);
        const knot = drawn.get('Ben')!.querySelector('[data-part="bowtie"] circle')!;
        expect([knot.getAttribute('cx'), knot.getAttribute('cy')]).toEqual(['50', '80']);
      });
      And('each is in sun, or in tomato on a sun shirt, as the scarf is', () => {
        expect(drawn.get('Anna')!.style.getPropertyValue('--band')).toBe('var(--color-tomato)');
        expect(drawn.get('Ben')!.style.getPropertyValue('--band')).toBe('var(--color-sun)');
        // Drawn in the scarf's class, which takes --band.
        const scarf = racer(
          { mount: 'duck', colour: 'sun', extra: 'scarf' },
          { face: handOutLooks(['Anna'], createRandom(1)).get('Anna')!, number: 1 },
        ).el.querySelector('[data-part="scarf"] path')!;
        for (const [name, part] of [
          ['Anna', 'cape'],
          ['Ben', 'bowtie'],
        ] as const) {
          for (const shape of drawn.get(name)!.querySelectorAll(`[data-part="${part}"] > *`)) {
            expect(shape.getAttribute('class')).toBe(scarf.getAttribute('class'));
          }
        }
      });
    });

    RuleScenario('Each creature looks as chosen', ({ Given, When, Then, And }) => {
      const looks = new Map<string, ChosenLook>();
      let drawn: Map<string, SVGSVGElement>;
      Given(
        'Femi chose the zombie in pink with "Number", and Giulia the shark with feet in sea with the top hat',
        () => {
          looks.set('Femi', { mount: 'zombie', colour: 'pink', extra: 'number' });
          looks.set('Giulia', { mount: 'shark', colour: 'sea', extra: 'tophat' });
          looks.set('Carla', { mount: 'snail', colour: 'mint', extra: 'scarf' });
        },
      );
      When('the show runs', async () => {
        drawn = await firstDrawn(looks);
      });
      Then(
        'Femi races as a zombie in a pink shirt, arms out in front, with a paper roundel on its chest',
        () => {
          const femi = drawn.get('Femi')!;
          expect(femi.dataset).toMatchObject({ part: 'creature', mount: 'zombie' });
          expect(femi.style.getPropertyValue('--racer')).toBe('var(--color-pink)');
          expect(femi.querySelector('[data-part="shirt"]')!.getAttribute('class')).toBe(
            styles.racer,
          );
          // Both arms reach forward of the front shoulder, level with the shoulders.
          const [x, y] = CREATURE_SPEC.zombie.shoulders[1];
          for (const which of ['back', 'front']) {
            const [hx, hy] = ends(femi.querySelector(`[data-part="${which}-arm"] path`))
              .split(' ')
              .map(Number);
            expect(hx).toBeGreaterThan(x);
            expect(Math.abs(hy! - y)).toBeLessThan(10);
          }
          const roundel = femi.querySelector('[data-part="number"]')!;
          expect(roundel.textContent).toBe('1');
          const [cx, cy] = CREATURE_SPEC.zombie.chest;
          expect(roundel.querySelector('circle')!.getAttribute('cx')).toBe(String(cx));
          expect(roundel.querySelector('circle')!.getAttribute('cy')).toBe(String(cy));
        },
      );
      And('Giulia races as a sea-coloured shark on two legs in sneakers, wearing a top hat', () => {
        const giulia = drawn.get('Giulia')!;
        expect(giulia.dataset).toMatchObject({ part: 'creature', mount: 'shark' });
        expect(giulia.style.getPropertyValue('--racer')).toBe('var(--color-sea)');
        const legs = [...giulia.querySelectorAll('path[data-part="legs"]')];
        expect(legs.map((leg) => leg.getAttribute('d')!.match(/M/g))).toEqual([['M'], ['M']]);
        const shoes = giulia.querySelectorAll('[data-part="shoe"]');
        expect(shoes).toHaveLength(2);
        for (const shoe of shoes) expect(shoe.getAttribute('class')).toBe(styles.racer);
        expect(giulia.querySelector('[data-part="tophat"]')).not.toBeNull();
      });
      And('neither has a rider or a mount', () => {
        for (const name of ['Femi', 'Giulia']) {
          const svg = drawn.get(name)!;
          expect(svg.querySelector('[data-part="rider"], [data-part="mount"]')).toBeNull();
        }
      });
    });

    /** Where each creature wears its colour: the parts of it so named. */
    const WEARS: Record<string, { creature: Creature; parts: string[] }> = {
      zombie: { creature: 'zombie', parts: ['shirt'] },
      robot: { creature: 'robot', parts: ['body', 'antenna'] },
      shark: { creature: 'shark', parts: ['body'] },
      astronaut: { creature: 'astronaut', parts: ['backpack', 'panel'] },
      monster: { creature: 'monster', parts: ['fur'] },
      villain: { creature: 'villain', parts: ['cape', 'collar'] },
      alien: { creature: 'alien', parts: ['head', 'arms', 'legs'] },
      dinosaur: { creature: 'dinosaur', parts: ['body'] },
      'coffee mug': { creature: 'mug', parts: ['mug', 'handle'] },
      printer: { creature: 'printer', parts: ['cover', 'tray'] },
      'sticky note': { creature: 'sticky', parts: ['note'] },
      banana: { creature: 'banana', parts: ['peel'] },
      'ice cream': { creature: 'icecream', parts: ['scoop'] },
      sushi: { creature: 'sushi', parts: ['fish'] },
      cat: { creature: 'cat', parts: ['fur'] },
      octopus: { creature: 'octopus', parts: ['body', 'tentacles'] },
      penguin: { creature: 'penguin', parts: ['back', 'fins'] },
      pigeon: { creature: 'pigeon', parts: ['neck', 'fins'] },
      ghost: { creature: 'ghost', parts: ['dots', 'shoe'] },
      gnome: { creature: 'gnome', parts: ['hat'] },
      mummy: { creature: 'mummy', parts: ['sweatband', 'shoe'] },
      yeti: { creature: 'yeti', parts: ['earmuffs'] },
    };
    /** The six things on legs, as the feature names them. */
    const THINGS = Object.keys(THING_NAMES);
    /** Each set of creatures in tomato in one race, as the show first draws them. */
    const inTomato = new Map<string, Promise<Map<string, SVGSVGElement>>>();
    const tomato = (names: readonly string[]) => {
      const key = names.join();
      if (!inTomato.has(key)) {
        inTomato.set(
          key,
          firstDrawn(
            new Map(
              names.map((name) => {
                const mount = WEARS[name]!.creature;
                return [mount, { mount, colour: 'tomato', extra: 'scarf' }];
              }),
            ),
          ),
        );
      }
      return inTomato.get(key)!;
    };
    /** Checks that each part `name` wears its colour in is tomato. */
    const wearsTomato = (svg: SVGSVGElement, name: string) => {
      expect(svg.style.getPropertyValue('--racer')).toBe('var(--color-tomato)');
      for (const part of WEARS[name]!.parts) {
        const shapes =
          part === 'arms'
            ? [...svg.querySelectorAll<SVGElement>('[data-part$="-arm"] > :nth-child(2)')]
            : part === 'fins'
              ? // Flippers and wings: each arm's leaf.
                [...svg.querySelectorAll<SVGElement>('[data-part$="-arm"] > :first-child')]
              : [...svg.querySelectorAll<SVGElement>(`[data-part="${part}"]`)].filter(
                  (shape) => shape.tagName !== 'g',
                );
        expect(shapes.length, part).toBeGreaterThan(0);
        for (const shape of shapes) {
          const painted =
            shape.getAttribute('class') === styles.racer ||
            shape.style.getPropertyValue('--paint') === 'var(--racer)';
          expect(painted, `${name} ${part}`).toBe(true);
        }
      }
    };

    RuleScenarioOutline(
      'Where a <creature> wears its colour',
      ({ When, Then }, { creature: kind }) => {
        let svg: SVGSVGElement;
        When('someone races as a <creature> in tomato', async () => {
          // All eight in one race.
          const eight = Object.keys(WEARS).filter(
            (name) => !THINGS.includes(name) && !(name in NEW_NAMES),
          );
          svg = (await tomato(eight)).get(WEARS[kind]!.creature)!;
        });
        Then('<where> is tomato', () => wearsTomato(svg, kind));
      },
    );

    RuleScenarioOutline('Where a <thing> wears its colour', ({ When, Then }, { thing }) => {
      let svg: SVGSVGElement;
      When('someone races as a <thing> in tomato', async () => {
        svg = (await tomato(THINGS)).get(WEARS[thing]!.creature)!;
      });
      Then('<where> is tomato', () => wearsTomato(svg, thing));
    });

    RuleScenario("The astronaut and the villain have the kit's faces", ({ When, Then }) => {
      const looks = new Map<string, ChosenLook>([
        ['Anna', { mount: 'astronaut', colour: 'sea', extra: 'scarf' }],
        ['Ben', { mount: 'villain', colour: 'grape', extra: 'number' }],
        ['Carla', { mount: 'duck', colour: 'sun', extra: 'scarf' }],
      ]);
      let drawn: Map<string, SVGSVGElement>;
      When('someone races as the astronaut or the villain', async () => {
        drawn = await firstDrawn(looks);
      });
      Then('its face has the skin tone the kit hands out for the run', () => {
        const random = createRandom(4);
        planShow([...looks.keys()], 'Carla', random);
        const faces = handOutLooks([...looks.keys()], random);
        for (const name of ['Anna', 'Ben']) {
          const svg = drawn.get(name)!;
          expect(svg.style.getPropertyValue('--skin')).toBe(
            `var(--color-skin-${faces.get(name)!.skin})`,
          );
          expect(svg.querySelector('[data-part="skin"]')!.getAttribute('class')).toBe(styles.skin);
        }
      });
    });

    /** `kind` in tomato with a scarf, as the show draws it, `mood`. */
    const modern = (kind: Creature, mood: Mood = 'calm') => {
      const face = handOutLooks(['Anna'], createRandom(1)).get('Anna')!;
      return creature({ mount: kind, colour: 'tomato', extra: 'scarf' }, { face, number: 1, mood });
    };
    /** Whether `el` and everything round it up to `root` is shown. */
    const visible = (el: Element | null, root: Element) => {
      for (let at = el; at && at !== root; at = at.parentElement) {
        if (at.getAttribute('display') === 'none') return false;
      }
      return !!el;
    };
    /** Every number in `text`, in order. */
    const numbers = (text: string) => (text.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
    /** A path's points, as [x, y] pairs: every pair of numbers in it. */
    const points = (d: string) => {
      const all = numbers(d);
      return all.flatMap((_, i) => (i % 2 ? [] : [[all[i]!, all[i + 1]!] as const]));
    };
    /** A foot's place: its ankle, how far it's turned, and its size. */
    const footAt = (foot: Element) => {
      const [x, y, turn, k] = numbers(foot.getAttribute('transform')!);
      return { x: x!, y: y!, turn: turn!, k: k! };
    };

    RuleScenario('Creatures are modern cartoons', ({ When, Then, And }) => {
      let all: ReturnType<typeof modern>[];
      When('someone races as any creature', () => {
        all = CREATURES.map((kind) => modern(kind));
      });
      Then(
        'each main part of its body has a flat shadow on its lower left, ink at 18%, and most have a white highlight on the upper right',
        () => {
          const rule = /\.shade\s*{([^}]*)}/.exec(css)![1]!;
          expect(rule).toMatch(/fill:\s*var\(--color-ink\)/);
          expect(rule).toMatch(/opacity:\s*0?\.18/);
          let highlighted = 0;
          for (const { el, look } of all) {
            const kind = look.mount;
            const shades = [...el.querySelectorAll('[data-part="own"] [data-part="shade"]')];
            expect(shades.length, kind).toBeGreaterThan(0);
            for (const shade of shades) {
              expect(shade.getAttribute('class')).toBe(styles.shade);
              // The part less itself moved up and right, so what's left is its lower left.
              const id = /url\(#(.+)\)/.exec(shade.getAttribute('clip-path')!)![1]!;
              const clip = el.querySelector(`clipPath[id="${id}"] path`)!;
              expect(clip.getAttribute('d')).toContain(shade.getAttribute('d'));
              expect(clip.getAttribute('clip-rule')).toBe('evenodd');
              const [dx, dy] = numbers(clip.getAttribute('transform')!);
              expect(dx, kind).toBeGreaterThan(0);
              expect(dy, kind).toBeLessThan(0);
              // Its outline over it.
              expect(shade.nextElementSibling!.getAttribute('d')).toBe(shade.getAttribute('d'));
              expect(shade.nextElementSibling!.getAttribute('class')).toBe(styles.line);
            }
            const [h1, h2] = CREATURE_SPEC[kind].hips;
            const highlights = [...el.querySelectorAll('[data-part="highlight"]')];
            if (highlights.length) highlighted++;
            for (const highlight of highlights) {
              expect(highlight.getAttribute('class')).toBe(styles.stripe);
              expect(Number(highlight.getAttribute('opacity'))).toBeLessThanOrEqual(0.8);
              const line = points(highlight.getAttribute('d')!);
              expect(Math.max(...line.map(([x]) => x)), kind).toBeGreaterThan((h1[0] + h2[0]) / 2);
              const middle = line.reduce((sum, [, y]) => sum + y, 0) / line.length;
              expect(middle, kind).toBeLessThan(h1[1] - 40);
            }
          }
          expect(highlighted).toBeGreaterThan(CREATURES.length / 2);
        },
      );
      And('each pupil has a white shine', () => {
        for (const one of all) {
          for (const mood of ['calm', 'worried', 'scared', 'happy'] as const) {
            one.setMood(mood);
            // A pupil, or a person's dark eye, which is all pupil; a robot's screen has none.
            for (const eye of one.face.querySelectorAll('[data-part="eye"]')) {
              const pupil = eye.nextElementSibling!;
              const shine = pupil.nextElementSibling!;
              const dark = visible(pupil, one.el) || eye.getAttribute('class') === styles.ink;
              expect(dark, `${one.look.mount} ${mood}`).toBe(!CREATURE_SPEC[one.look.mount].screen);
              expect(shine.getAttribute('data-part')).toBe('shine');
              expect(shine.getAttribute('class')).toBe(styles.paperFill);
              expect(visible(shine, one.el)).toBe(dark);
            }
          }
          one.setMood('calm');
        }
      });
      And('its arms bend at the elbow and end in gloves, paws, tentacle tips or fins', () => {
        for (const { el, look } of all) {
          const spec = CREATURE_SPEC[look.mount];
          for (const which of ['back', 'front']) {
            const holder = el.querySelector(`[data-part="${which}-arm"]`)!;
            const d = holder.querySelector('path')!.getAttribute('d')!;
            const hand = holder.querySelector('[data-part="hand"]');
            const thumb = holder.querySelector('[data-part="thumb"]');
            if (spec.fins) {
              // A leaf from the shoulder.
              expect(d.match(/Q/g)).toHaveLength(2);
              expect(d.endsWith('Z')).toBe(true);
              expect(visible(hand, el)).toBe(false);
            } else {
              // Shoulder, elbow, hand.
              expect(d, look.mount).toMatch(/^M\S+ \S+ Q\S+ \S+ \S+ \S+$/);
              expect(visible(hand, el)).toBe(true);
              // A glove has a thumb; a paw doesn't.
              expect(visible(thumb, el)).toBe(!spec.noThumb);
            }
          }
        }
      });
      And('it sprints: its front foot planted, its back foot kicked up behind', () => {
        for (const { look, shoes } of all) {
          const [back, front] = shoes.map(footAt);
          expect(front!.turn, look.mount).toBe(0);
          expect(front!.y + 11 * front!.k, look.mount).toBeCloseTo(RACER.feet, 5);
          expect(back!.turn, look.mount).toBeGreaterThan(45);
          expect(back!.y, look.mount).toBeLessThan(front!.y);
          expect(back!.x, look.mount).toBeLessThan(front!.x);
        }
      });
      And(
        'it fills the same box as before, its feet on the same line and its face at the same height',
        () => {
          // Its face and nose where they were, so tags and bubbles don't move.
          const places = CREATURES.map((kind) => [
            kind,
            [CREATURE_SPEC[kind].face, CREATURE_SPEC[kind].nose],
          ]);
          expect(Object.fromEntries(places)).toEqual({
            zombie: [130, 206],
            robot: [130, 176],
            shark: [188, 228],
            astronaut: [130, 180],
            monster: [130, 196],
            villain: [130, 172],
            alien: [130, 176],
            dinosaur: [162, 220],
            // The things on legs, from the canvas.
            mug: [139, 170],
            printer: [131, 180],
            sticky: [131, 170],
            banana: [134, 186],
            icecream: [131, 172],
            sushi: [141, 192],
            // The animals and spooky creatures, from the canvas.
            cat: [137, 189],
            octopus: [130, 178],
            penguin: [130, 177],
            pigeon: [167, 204],
            ghost: [131, 176],
            gnome: [130, 168],
            mummy: [130, 160],
            yeti: [130, 188],
            // Christmas's things on legs, from the canvas.
            snowman: [131, 163],
            gingerbread: [131, 160],
            tree: [130, 182],
          });
          for (const { el, look } of all) {
            expect(el.getAttribute('viewBox')).toBe(`0 0 ${RACER.width} ${RACER.height}`);
            // Its eyes in the 72 px box a rider's head fills, which stands on y 110.
            for (const [, y] of CREATURE_SPEC[look.mount].eyes) {
              expect(y).toBeGreaterThan(110 - RIDER.foot);
              expect(y).toBeLessThan(110 - RIDER.foot + RIDER.size);
            }
          }
        },
      );
    });

    RuleScenarioOutline(
      "A <creature>'s face when it is <mood>",
      ({ When, Then }, { creature: kind, mood }) => {
        let one: ReturnType<typeof modern>;
        const part = (name: string) => [...one.face.querySelectorAll(`[data-part="${name}"]`)];
        const shownPart = (name: string) => part(name).filter((el) => visible(el, one.el));
        /** Each brow's points. */
        const brows = () =>
          shownPart('brows').flatMap((el) =>
            el
              .getAttribute('d')!
              .split('M')
              .filter((each) => each.trim())
              .map(points),
          );
        When('a <creature> is <mood>', () => {
          one = modern(kind as Creature, mood as Mood);
          expect(one.el.dataset.mood).toBe(mood);
        });
        Then('<face>', () => {
          const eyes = CREATURE_SPEC[kind as Creature].eyes;
          const middle = eyes.reduce((sum, [x]) => sum + x, 0) / eyes.length;
          const mouth = part('mouth')[0]!;
          const d = mouth.getAttribute('d')!;
          switch (`${kind} ${mood}`) {
            case 'zombie calm': {
              // Half shut: each lid's edge level, between the eye's top and its middle.
              const lids = shownPart('lid');
              expect(lids).toHaveLength(eyes.length);
              lids.forEach((lid, i) => {
                const y = eyes[i]![1];
                const ry = Number(part('eye')[i]!.getAttribute('ry'));
                const all = numbers(lid.getAttribute('d')!);
                const [left, right] = [all[1]!, all.at(-1)!];
                expect(left).toBeCloseTo(right, 5);
                expect(left).toBeGreaterThan(y - ry);
                expect(left).toBeLessThan(y);
              });
              // The front brow higher.
              const [back, front] = brows();
              expect(Math.min(...front!.map(([, y]) => y))).toBeLessThan(
                Math.min(...back!.map(([, y]) => y)),
              );
              // A smirk: open, its front corner up.
              const line = points(d);
              expect(d).not.toContain('Z');
              expect(line.at(-1)![1]).toBeLessThan(line[0]![1]);
              break;
            }
            case 'zombie worried': {
              for (const [i, lid] of shownPart('lid').entries()) {
                const all = numbers(lid.getAttribute('d')!);
                const [left, right] = [all[1]!, all.at(-1)!];
                // Lower on the outside.
                if (eyes[i]![0] < middle) expect(left).toBeGreaterThan(right);
                else expect(right).toBeGreaterThan(left);
              }
              expect(brows()).toHaveLength(2);
              for (const brow of brows()) {
                // Each brow ends higher, nearer the middle.
                const [start, end] = [brow[0]!, brow.at(-1)!];
                expect(end[1]).toBeLessThan(start[1]);
                expect(Math.abs(end[0] - middle)).toBeLessThan(Math.abs(start[0] - middle));
              }
              expect(d.match(/Q/g)).toHaveLength(2);
              expect(d).not.toContain('Z');
              break;
            }
            case 'zombie scared': {
              const calm = modern('zombie');
              part('eye').forEach((eye, i) => {
                const before = calm.face.querySelectorAll('[data-part="eye"]')[i]!;
                const rx = Number(eye.getAttribute('rx'));
                expect(rx).toBeGreaterThan(Number(before.getAttribute('rx')));
                expect(Number(part('pupil')[i]!.getAttribute('rx'))).toBeLessThan(rx * 0.3);
              });
              expect(shownPart('lid')).toHaveLength(0);
              expect(d).toMatch(/ a.* a.*Z$/);
              expect(mouth.getAttribute('class')).toBe(styles.ink);
              break;
            }
            case 'zombie happy':
              expect(d).toMatch(/Z$/);
              expect(mouth.getAttribute('class')).toBe(styles.ink);
              expect(shownPart('teeth')).toHaveLength(1);
              expect(shownPart('tongue')).toHaveLength(1);
              break;
            case 'zombie party':
              expect(shownPart('shades')).toHaveLength(1);
              expect(part('shades')[0]!.getAttribute('class')).toBe(styles.ink);
              expect(shownPart('glint')).toHaveLength(1);
              expect(d).toMatch(/Z$/);
              expect(mouth.getAttribute('class')).toBe(styles.ink);
              break;
            case 'monster calm':
              expect(shownPart('fangs')).toHaveLength(1);
              expect(part('fangs')[0]!.getAttribute('d')!.match(/M/g)).toHaveLength(5);
              expect(d).not.toContain('Z');
              break;
            case 'robot calm':
              expect(one.el.querySelector('[data-part="screen"]')!.getAttribute('class')).toBe(
                styles.ink,
              );
              for (const eye of part('eye')) expect(eye.getAttribute('class')).toBe(styles.glass);
              expect(shownPart('pupil')).toHaveLength(0);
              expect(mouth.getAttribute('class')).toBe(styles.glassLine);
              expect(shownPart('brows')).toHaveLength(0);
              break;
            default:
              throw new Error(`No face for a ${kind} ${mood}`);
          }
        });
      },
    );

    /** The paints the feature names, as the classes a shoe or its stripe is drawn in, in tomato. */
    const SHOE_PAINTS: Record<string, string> = {
      tomato: styles.racer!,
      'ink-soft': styles.inkSoft!,
      ink: styles.ink!,
      grey: styles.shark!,
      glass: styles.glass!,
      'light blue': styles.glass!,
      white: styles.paper!,
    };
    const STRIPE_PAINTS: Record<string, string> = {
      tomato: styles.racerLine!,
      sun: styles.bandLine!,
    };

    RuleScenarioOutline(
      'A <creature> runs in <feet>',
      ({ When, Then }, { creature: kind, feet }) => {
        let one: ReturnType<typeof modern>;
        When('someone races as a <creature> in tomato', () => {
          one = modern(kind as Creature);
          expect(one.el.style.getPropertyValue('--racer')).toBe('var(--color-tomato)');
        });
        Then('it runs in <feet>', () => runsOn(one, feet));
      },
    );

    /** Checks that `one` runs on `feet`, as the feature words them. */
    const runsOn = (one: ReturnType<typeof modern>, feet: string) => {
      const shod = /^(\S+) (sneakers|boots)(?: with a (\S+) stripe)?$/.exec(feet);
      const bare = /^big bare feet, (.+)$/.exec(feet);
      // Tips, paddles and toes: the foot, and its shoe's class or the paint of its line.
      const other: Record<string, [string, string]> = {
        'two tentacles with curled tips': ['tip', 'var(--racer)'],
        'orange flat feet': ['paddle', styles.orange!],
        'pink toes': ['toes', 'var(--color-pink)'],
      };
      expect(one.shoes).toHaveLength(2);
      if (other[feet]) {
        const [foot, paint] = other[feet];
        for (const each of one.shoes) {
          expect(each.dataset.foot).toBe(foot);
          const shoe = each.querySelector<SVGElement>('[data-part="shoe"]')!;
          expect(
            paint.startsWith('var(')
              ? shoe.style.getPropertyValue('--paint')
              : shoe.getAttribute('class'),
          ).toBe(paint);
        }
        return;
      }
      const paint = (shod ?? bare)?.[1];
      expect(paint, feet).toBeDefined();
      const foot = shod ? (shod[2] === 'sneakers' ? 'sneaker' : 'boot') : 'bare';
      for (const each of one.shoes) {
        expect(each.dataset.foot).toBe(foot);
        const shoe = each.querySelector('[data-part="shoe"]')!;
        expect(shoe.getAttribute('class')).toBe(SHOE_PAINTS[paint!]);
        const stripe = each.querySelector('[data-part="stripe"]');
        if (shod?.[3]) expect(stripe!.getAttribute('class')).toBe(STRIPE_PAINTS[shod[3]]);
        else expect(stripe).toBeNull();
        if (bare) expect(footAt(each).k).toBeGreaterThan(1);
      }
    };

    RuleScenario('Six things on legs', ({ When, Then, And }) => {
      const choices = theRace.lineUp!.options[0]!.choices;
      const listed = (text: string) => [...text.matchAll(/"([^"]+)"/g)].map(([, x]) => x);
      When('the Line-up opens for The Race', () => {
        expect(theRace.lineUp!.options[0]!.label).toBe('Racer');
      });
      Then('the group "Things on legs" holds {any}', (_, held: string) => {
        // Its first six: "Four racers for Christmas" adds more after them.
        const things = choices.filter((choice) => choice.group === 'Things on legs').slice(0, 6);
        expect(things.map((choice) => choice.label)).toEqual(listed(held));
        expect(things.map((choice) => choice.name)).toEqual(THING_KINDS);
      });
      And('the tabs read {any}, in that order', (_, tabs: string) => {
        expect([...new Set(choices.map((choice) => choice.group))]).toEqual(listed(tabs));
      });
    });

    RuleScenario('A thing on legs runs like the others', ({ When, Then, And }) => {
      let all: ReturnType<typeof modern>[];
      When(
        'someone races as a coffee mug, a printer, a sticky note, a banana, an ice cream or a sushi',
        () => {
          all = THING_KINDS.map((kind) => modern(kind));
        },
      );
      Then(
        'it runs on dark legs in white sneakers striped in its colour, and its arms end in white gloves',
        () => {
          for (const { el, look, shoes } of all) {
            const kind = look.mount;
            for (const leg of el.querySelectorAll<SVGElement>('path[data-part="legs"]')) {
              expect(leg.style.getPropertyValue('--paint'), kind).toBe('var(--color-ink-soft)');
            }
            for (const shoe of shoes) {
              expect(shoe.dataset.foot, kind).toBe('sneaker');
              expect(shoe.querySelector('[data-part="shoe"]')!.getAttribute('class')).toBe(
                styles.paper,
              );
              expect(shoe.querySelector('[data-part="stripe"]')!.getAttribute('class')).toBe(
                styles.racerLine,
              );
            }
            for (const which of ['back', 'front']) {
              const holder = el.querySelector(`[data-part="${which}-arm"]`)!;
              for (const part of ['hand', 'thumb']) {
                const glove = holder.querySelector(`[data-part="${part}"]`);
                expect(visible(glove, el), `${kind} ${part}`).toBe(true);
                expect(glove!.getAttribute('class')).toBe(styles.paper);
              }
            }
          }
        },
      );
      And('its face is on the thing itself', () => {
        for (const { el, look } of all) {
          // No head: every eye on a main part of its body.
          const parts = [...el.querySelectorAll('[data-part="own"] [data-part="shade"]')].map(
            (shade) => bounds(shade.getAttribute('d')!),
          );
          for (const [x, y] of CREATURE_SPEC[look.mount].eyes) {
            const on = parts.some(
              (box) => x > box.left && x < box.right && y > box.top && y < box.bottom,
            );
            expect(on, `${look.mount} eye at ${x} ${y}`).toBe(true);
          }
        }
      });
    });

    RuleScenario('Four animals and four spooky creatures', ({ When, Then, And }) => {
      const choices = theRace.lineUp!.options[0]!.choices;
      const listed = (text: string) => [...text.matchAll(/"([^"]+)"/g)].map(([, x]) => x);
      /** The racers in `group` after `last`, which ends `held`. */
      const after = (group: string, held: string) => {
        const names = listed(held);
        const last = names.pop()!;
        const labels = choices
          .filter((choice) => choice.group === group)
          .map((choice) => choice.label);
        expect(labels.slice(labels.indexOf(last) + 1)).toEqual(names);
        return names;
      };
      When('the Line-up opens for The Race', () => {
        expect(theRace.lineUp!.options[0]!.label).toBe('Racer');
      });
      Then('the group "Animals" also holds {any}', (_, held: string) => {
        expect(after('Animals', held)).toEqual(['Cat', 'Octopus', 'Penguin', 'Pigeon']);
      });
      And('the group "Spooky" also holds {any}', (_, held: string) => {
        expect(after('Spooky', held)).toEqual(['Ghost', 'Mummy', 'Yeti', 'Garden gnome']);
      });
    });

    RuleScenarioOutline(
      'Where a <creature> wears its colour, and its feet',
      ({ When, Then, And }, { creature: name, feet }) => {
        let svg: SVGSVGElement;
        When('someone races as a <creature> in tomato', async () => {
          svg = (await tomato(Object.keys(NEW_NAMES))).get(NEW_NAMES[name]!)!;
        });
        Then('<where> is tomato', () => wearsTomato(svg, name));
        And('it runs on <feet>', () => runsOn(modern(NEW_NAMES[name]!), feet));
      },
    );

    RuleScenario("The gnome has the kit's face", ({ When, Then }) => {
      const looks = new Map<string, ChosenLook>([
        ['Anna', { mount: 'gnome', colour: 'tomato', extra: 'scarf' }],
        ['Ben', { mount: 'duck', colour: 'sun', extra: 'scarf' }],
      ]);
      let drawn: Map<string, SVGSVGElement>;
      When('someone races as the garden gnome', async () => {
        drawn = await firstDrawn(looks);
      });
      Then('its face and hands have the skin tone the kit hands out for the run', () => {
        const random = createRandom(4);
        planShow([...looks.keys()], 'Ben', random);
        const faces = handOutLooks([...looks.keys()], random);
        const svg = drawn.get('Anna')!;
        expect(svg.style.getPropertyValue('--skin')).toBe(
          `var(--color-skin-${faces.get('Anna')!.skin})`,
        );
        const skin = [...svg.querySelectorAll('[data-part="skin"], [data-part="hand"]')];
        // Its face, its nose and both hands.
        expect(skin).toHaveLength(4);
        for (const part of skin) expect(part.getAttribute('class')).toBe(styles.skin);
      });
    });
  });

  Rule("The track is the theme's", ({ RuleScenario, RuleScenarioOutline }) => {
    const team = names(8);
    const unlucky = team.at(-1)!;
    const own = (plan: Plan) => plan.events.filter((event) => event.cause === 'track');

    /** The track each run with seeds 1 to `seeds` is on, as its stage draws it. */
    async function tracksRun(seeds: number, theme?: string) {
      const courses: string[] = [];
      for (let seed = 1; seed <= seeds; seed++) {
        let course = '';
        await runShow(theRace, {
          names: team,
          unlucky,
          seed,
          theme,
          cancelAt: 0.1,
          onFrame: (_, stage) => {
            course ||= stage.querySelector<HTMLElement>('[data-part="track"]')!.dataset.course!;
          },
        });
        courses.push(course);
      }
      return courses;
    }

    RuleScenario('The race runs on the theme chosen', ({ Given, When, Then }) => {
      let theme: Course;
      let runs: string[];
      Given('{string} is chosen on the Line-up', (_, label: string) => {
        theme = theRace.lineUp!.themes!.find((each) => each.label === label)!.name as Course;
      });
      When('the show runs with {int} different random seeds', async (_, seeds: number) => {
        runs = await tracksRun(seeds, theme);
      });
      Then('every run is under the sea', () => {
        expect(runs).toEqual(runs.map(() => 'sea'));
        expect(theme).toBe('sea');
      });
    });

    RuleScenario('In the lab, every theme comes up', ({ Given, When, Then }) => {
      let runs: string[];
      Given('{int} people', (_, count: number) => expect(team).toHaveLength(count));
      When(
        'the show runs in the lab with {int} different random seeds',
        async (_, seeds: number) => {
          runs = await tracksRun(seeds);
        },
      );
      Then(
        'each run is on one of the themes, and each theme comes up in at least {int} runs',
        (_, least: number) => {
          const themes = theRace.lineUp!.themes!.map((each) => each.name);
          for (const course of runs) expect(themes).toContain(course);
          for (const theme of themes) {
            expect(runs.filter((course) => course === theme).length, theme).toBeGreaterThanOrEqual(
              least,
            );
          }
        },
      );
    });

    RuleScenarioOutline(
      '<track> has a stop and a burst of its own',
      ({ Given, When, Then, And }, { track }) => {
        let runs: Plan[];
        Given('8 people, on <track>', () => undefined);
        When('the show runs with {int} different random seeds', (_, seeds: number) => {
          runs = plansOn(team, unlucky, COURSE_NAMES[track]!, seeds);
        });
        Then(
          `in every run, one event before "Final stretch!" is the track's own stop or burst`,
          () => {
            for (const plan of runs) {
              expect(own(plan)).toHaveLength(1);
              expect(own(plan)[0]!.at).toBeLessThan(plan.times.stretch);
            }
          },
        );
        And('both come up across the runs', () => {
          const kinds = new Set(runs.flatMap((plan) => own(plan).map((event) => event.kind)));
          expect(kinds).toEqual(new Set(['burst', 'stop']));
        });
      },
    );

    RuleScenarioOutline('What <track> looks like', ({ When, Then, And }, { track: name }) => {
      const course = COURSE_NAMES[name]!;
      let run: OnTrack;
      When('the show runs on <track>', async () => {
        run = await onTrack(course);
      });
      Then('the ground is <ground>, and paper name tags read clearly on it', () => {
        const ground = run.track.querySelector('[data-part="ground"]')!;
        const fill = {
          field: styles.grass,
          office: styles.carpet,
          sea: styles.sun,
          moon: styles.dust,
          christmas: styles.snow,
        };
        expect(ground.querySelector(`.${fill[course]}`)).not.toBeNull();
        expect(!!ground.querySelector('[data-part="craters"]')).toBe(course === 'moon');
        const tags = run.stickers.filter((sticker) => sticker.what === 'tag');
        expect(tags.length).toBeGreaterThan(0);
        for (const tag of tags) {
          expect(tag.background).toBe('var(--color-paper)');
          expect(tag.border).toContain('var(--color-ink)');
        }
      });
      And('behind the track is <backdrop>', () => {
        const skies = { field: 'sky', office: 'paper', sea: 'sea', moon: 'ink', christmas: 'sea' };
        expect(run.sky).toBe(`var(--color-${skies[course]})`);
        const parts = {
          field: ['flags', 'posts'],
          office: ['wall', 'panels', 'plant'],
          sea: ['surface', 'fish', 'seaweed', 'floats'],
          moon: ['space'],
          christmas: ['night', 'hills', 'village', 'lights'],
        };
        for (const part of parts[course]) {
          expect(run.track.querySelector(`[data-part="${part}"]`), part).not.toBeNull();
        }
        expect(run.track.querySelectorAll(`.${styles.cloud}`)).toHaveLength(
          course === 'field' ? 2 : 0,
        );
      });
      And('the lanes are split by <lines>, and the distances are <signs>', () => {
        const fills = {
          field: styles.paperFill,
          office: styles.sunFill,
          sea: styles.orangeFill,
          moon: styles.paperFill,
          christmas: styles.glassFill,
        };
        const lines = [...run.track.querySelectorAll('[data-part="lines"] path')];
        expect(lines.length).toBeGreaterThan(0);
        for (const line of lines) {
          expect(line.getAttribute('class')).toBe(fills[course]);
          // Dashes are short: 44 px each, with gaps between.
          expect(line.getAttribute('d')!.includes('h44 ')).toBe(course === 'moon');
        }
        const signs = [...run.track.querySelectorAll('[data-part="sign"]')];
        expect(signs).toHaveLength(5);
        for (const sign of signs) {
          expect(!!sign.querySelector(`.${styles.post}`)).toBe(
            ['field', 'sea', 'moon'].includes(course),
          );
          expect(sign.querySelector('p')!.classList.contains(styles.note!)).toBe(
            course === 'office',
          );
        }
      });
    });

    RuleScenario('The photo shows the track', ({ Given, When, Then }) => {
      let run: OnTrack;
      Given('a photo finish on the Moon', async () => {
        run = await onTrack('moon');
      });
      When('the photo pops up', () => {
        expect(run.photo).not.toBeNull();
      });
      Then("it shows the Moon's ground and its finish line behind the two racers", () => {
        const view = run.photo!.firstElementChild as HTMLElement;
        expect(view.dataset.course).toBe('moon');
        expect(view.classList).toContain(styles.moon);
        const picture = view.querySelector(':scope > svg')!;
        expect(picture.querySelector('rect')!.getAttribute('class')).toBe(styles.shark);
        expect(picture.querySelector(`.${styles.inkFill}`)).not.toBeNull();
        const racers = [...view.querySelectorAll('[data-person]')];
        expect(racers).toHaveLength(2);
        for (const racer of racers) {
          expect(picture.compareDocumentPosition(racer) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
            Node.DOCUMENT_POSITION_FOLLOWING,
          );
        }
      });
    });

    RuleScenario('Every track reads over a screen share', ({ When, Then, And }) => {
      const runs: OnTrack[] = [];
      When('the show runs on each track at {int} people', async () => {
        for (const course of COURSES) runs.push(await onTrack(course));
      });
      Then(
        'every caption, sign and name tag is ink text on a paper or sun sticker with an ink outline',
        () => {
          for (const run of runs) {
            const what = new Set(run.stickers.map((sticker) => sticker.what));
            for (const each of ['caption', 'sign', 'tag', 'bubble']) expect(what).toContain(each);
            for (const sticker of run.stickers) {
              expect(['var(--color-paper)', 'var(--color-sun)'], sticker.text).toContain(
                sticker.background,
              );
              expect(sticker.colour, sticker.text).toBe('var(--color-ink)');
              expect(sticker.border, sticker.text).toContain('var(--color-ink)');
            }
          }
        },
      );
      And("on the Moon's dark sky, nothing but those stickers carries text", () => {
        const moon = runs.find((run) => run.watched.plan.course === 'moon')!;
        expect(moon.sky).toBe('var(--color-ink)');
        for (const run of runs) expect(run.loose, run.watched.plan.course).toEqual([]);
      });
    });

    RuleScenarioOutline('On <track>, <caption>', (steps, { track: where, event: kind, caption }) =>
      actOutOwnEvent(steps, {
        course: COURSE_NAMES[where]!,
        kind: kind as RaceEvent['kind'],
        caption,
        when: "someone's event is <track>'s own <event>",
      }),
    );

    RuleScenario('The sports field keeps the events it has', ({ When, Then }) => {
      let runs: Plan[];
      When('the show runs on the sports field', () => {
        runs = [2, 5, 8].flatMap((count) => plansOn(names(count), names(count).at(-1)!, 'field'));
      });
      Then("every event is a racer's own burst or stop", () => {
        for (const plan of runs) expect(own(plan)).toEqual([]);
      });
    });

    RuleScenarioOutline(
      'On <track>, the unlucky person still crosses first',
      ({ Given, When, Then }, { track }) => {
        let runs: Plan[];
        Given('8 people, on <track>', () => undefined);
        When('the show runs with {int} different random seeds', (_, seeds: number) => {
          runs = plansOn(team, unlucky, COURSE_NAMES[track]!, seeds);
        });
        Then("the first nose over the finish line is always the unlucky person's", () => {
          for (const plan of runs) {
            const crossing = crossingOf(plan, unlucky);
            expect(crossing).not.toBeNull();
            expect(crossing!).toBeLessThanOrEqual(plan.times.finish + 1e-9);
            for (const name of team.filter((each) => each !== unlucky)) {
              const theirs = crossingOf(plan, name);
              if (theirs !== null) expect(theirs).toBeGreaterThan(crossing!);
            }
          }
        });
      },
    );

    RuleScenario('Every track keeps the show inside the limit', ({ When, Then }) => {
      let runs: Plan[];
      When('the show runs at 2, 5 and 8 people on each track, with each ending', () => {
        runs = [2, 5, 8].flatMap((count) =>
          COURSES.flatMap((course) =>
            ENDINGS.flatMap((ending) =>
              plansOn(names(count), names(count).at(-1)!, course, 1, (p) => p.ending === ending),
            ),
          ),
        );
      });
      Then('each run lasts between {int} and {int} seconds', (_, least: number, most: number) => {
        expect(runs).toHaveLength(3 * COURSES.length * ENDINGS.length);
        for (const plan of runs) {
          expect(plan.times.end, `${plan.course} ${plan.ending}`).toBeGreaterThanOrEqual(least);
          expect(plan.times.end, `${plan.course} ${plan.ending}`).toBeLessThanOrEqual(most);
        }
      });
    });
  });

  Rule('Christmas', ({ RuleScenario, RuleScenarioOutline }) => {
    const lineUp = theRace.lineUp!;
    const team = names(8);
    const unlucky = team.at(-1)!;
    const own = (plan: Plan) => plan.events.filter((event) => event.cause === 'track');
    const christmas = () => lineUp.themes!.find((each) => each.name === 'christmas')!;

    RuleScenario('Christmas is a theme', ({ When, Then, And }) => {
      When('the Line-up opens for The Race', () => {
        expect(lineUp.themes).toBeDefined();
      });
      Then('"Christmas" is a theme, after "Moon", its postcard a tree on snow at dusk', () => {
        const labels = lineUp.themes!.map((theme) => theme.label);
        expect(labels.indexOf('Christmas')).toBe(labels.indexOf('Moon') + 1);
        const picture = christmas().picture() as SVGSVGElement;
        expect(picture.dataset).toMatchObject({ part: 'postcard', course: 'christmas' });
        const classes = [...picture.querySelectorAll('path')].map((path) =>
          path.getAttribute('class'),
        );
        // Dusk, the tree with its star, and snow on the ground, last.
        expect(classes[0]).toBe(styles.seaBlue);
        expect(classes).toContain(styles.leaf);
        expect(classes).toContain(styles.sun);
        expect(classes.at(-1)).toBe(styles.snow);
      });
      And(`with Christmas chosen, the racer option's first tab is "Christmas"`, () => {
        // specs/line-up.feature: a theme's suits are its first tab, named for it.
        expect(christmas().label).toBe('Christmas');
        expect(christmas().suits!.length).toBeGreaterThan(0);
      });
    });

    RuleScenario('What Christmas looks like', ({ When, Then, And }) => {
      let run: OnTrack;
      When('the show runs on Christmas', async () => {
        run = await onTrack('christmas');
      });
      Then(
        'the ground is snow, the lanes split by light blue lines, and paper name tags read clearly on it',
        () => {
          const ground = run.track.querySelector('[data-part="ground"]')!;
          expect(ground.querySelector(`.${styles.snow}`)).not.toBeNull();
          expect(css).toMatch(/\.snow \{\s*fill: var\(--color-paper\);/);
          const lines = [...run.track.querySelectorAll('[data-part="lines"] path')];
          expect(lines.length).toBeGreaterThan(0);
          for (const line of lines) expect(line.getAttribute('class')).toBe(styles.glassFill);
          expect(css).toMatch(/\.glassFill \{\s*fill: var\(--color-glass\);/);
          const tags = run.stickers.filter((sticker) => sticker.what === 'tag');
          expect(tags.length).toBeGreaterThan(0);
          for (const tag of tags) expect(tag.background).toBe('var(--color-paper)');
        },
      );
      And(
        'behind the track is a snowy village at dusk: white hills, two houses with lit windows, pines, a big tree with a star, and a crescent moon',
        () => {
          expect(run.sky).toBe('var(--color-sea)');
          const back = run.track.querySelector('[data-part="backdrop"]')!;
          const first = (part: string) => back.querySelector(`[data-part="${part}"]`);
          const tile = (part: string) =>
            [...first(part)!.children[0]!.children].map((shape) => ({
              part: shape.getAttribute('data-part'),
              className: shape.getAttribute('class'),
            }));
          expect(tile('hills').map((shape) => shape.className)).toEqual([
            styles.paperFill,
            styles.line,
          ]);
          const village = tile('village');
          expect(village.filter((shape) => shape.part === 'house').map((s) => s.className)).toEqual(
            [styles.tomato, styles.mint],
          );
          expect(village.filter((shape) => shape.part === 'windows')).toHaveLength(2);
          for (const part of ['pines', 'tree', 'baubles', 'star']) {
            expect(village.map((shape) => shape.part)).toContain(part);
          }
          expect(tile('night').map((shape) => shape.part)).toContain('moon');
          // The houses' windows, the star and the moon are lit: sun.
          expect(village.find((shape) => shape.part === 'star')!.className).toBe(styles.sun);
        },
      );
      And(
        'fairy lights run along the edge of the track, and each distance is a paper sign by a candy cane',
        () => {
          const bulbs = [...run.track.querySelector('[data-part="lights"]')!.children[0]!.children];
          expect(bulbs.map((bulb) => bulb.getAttribute('class'))).toEqual([
            styles.tomato,
            styles.sun,
            styles.mint,
            styles.pink,
          ]);
          const signs = [...run.track.querySelectorAll<HTMLElement>('[data-part="sign"]')];
          expect(signs).toHaveLength(5);
          for (const sign of signs) {
            const board = sign.querySelector('p')!;
            const distance = board.textContent!.endsWith(' m');
            expect(!!sign.querySelector('[data-part="cane"]'), board.textContent!).toBe(distance);
            expect(board.classList.contains(styles.sunBoard!)).toBe(!distance);
            expect(sign.querySelector(`.${styles.post}`)).toBeNull();
          }
          const cane = signs[1]!.querySelector('[data-part="cane"]')!;
          expect([...cane.children].map((stroke) => stroke.getAttribute('class'))).toEqual([
            styles.line,
            styles.stripe,
            styles.caneStripe,
          ]);
          expect(css).toMatch(/\.caneStripe \{\s*fill: none;\s*stroke: var\(--color-tomato\);/);
        },
      );
    });

    RuleScenario('Christmas has a stop and a burst of its own', ({ Given, When, Then, And }) => {
      let runs: Plan[];
      Given('8 people, on Christmas', () => undefined);
      When('the show runs with {int} different random seeds', (_, seeds: number) => {
        runs = plansOn(team, unlucky, 'christmas', seeds);
      });
      Then(
        `in every run, one event before "Final stretch!" is Christmas's own stop or burst`,
        () => {
          for (const plan of runs) {
            expect(own(plan)).toHaveLength(1);
            expect(own(plan)[0]!.at).toBeLessThan(plan.times.stretch);
          }
        },
      );
      And('both come up across the runs', () => {
        const kinds = new Set(runs.flatMap((plan) => own(plan).map((event) => event.kind)));
        expect(kinds).toEqual(new Set(['burst', 'stop']));
      });
    });

    RuleScenarioOutline('On Christmas, <caption>', (steps, { event: kind, caption }) =>
      actOutOwnEvent(steps, {
        course: 'christmas',
        kind: kind as RaceEvent['kind'],
        caption,
        when: "someone's event is Christmas's own <event>",
      }),
    );

    /** Riders with every extra the kit hands out a cap, goggles or a snorkel to, and creatures. */
    const DRESSED = new Map<string, ChosenLook>([
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
    async function dressedOn(course: Course) {
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
    function lineUpOn(course: Course) {
      const people = [...DRESSED].map(([name, look], index) => ({
        name,
        place: index + 1,
        look,
        chosen: index === 0,
      }));
      const start = lineUp.drawStart!({ people, theme: course });
      return [
        ...start.el.querySelectorAll<SVGSVGElement>('svg[data-person]'),
        ...people.map(
          ({ name, place, look }) =>
            lineUp.draw(look, { name, place, theme: course }) as SVGSVGElement,
        ),
      ];
    }
    const accessories = (svg: SVGSVGElement) =>
      svg.querySelectorAll('[data-part="cap"], [data-part="goggles"], [data-part="snorkel"]');

    RuleScenario('Everyone wears a Santa hat', ({ When, Then, And }) => {
      let drawn: SVGSVGElement[] = [];
      When('the show runs on Christmas, or its Line-up shows Christmas', async () => {
        drawn = [...(await dressedOn('christmas')), ...lineUpOn('christmas')];
        expect(drawn).toHaveLength(3 * DRESSED.size);
      });
      Then(
        'every rider wears a Santa hat instead of the cap, goggles or snorkel the kit hands out, and a top hat stays on the mount',
        () => {
          for (const svg of drawn.filter((each) => each.dataset.part === 'racer')) {
            const lean = svg.querySelector('[data-part="lean"]')!;
            expect(
              lean.querySelector(':scope > [data-part="santa"] [data-part="hat"]'),
            ).not.toBeNull();
            expect(accessories(svg)).toHaveLength(0);
            expect(!!svg.querySelector('[data-part="mount"] [data-part="tophat"]')).toBe(
              svg.dataset.extra === 'tophat',
            );
          }
        },
      );
      And('every creature wears one where its top hat goes, instead of the top hat', () => {
        for (const svg of drawn.filter((each) => each.dataset.part === 'creature')) {
          const kind = svg.dataset.mount as Creature;
          if (kind === 'gnome') continue;
          const hat = svg.querySelector('[data-part="santa"]')!;
          const [x, y] = CREATURE_SPEC[kind].hat;
          expect(hat.getAttribute('transform'), kind).toBe(`translate(${x} ${y})`);
          expect(hat.querySelector(`.${styles.shade}`)).not.toBeNull();
          expect(svg.querySelector('[data-part="tophat"]'), kind).toBeNull();
        }
      });
      And("the garden gnome's own hat gets a white brim and a bobble instead", () => {
        const gnomes = drawn.filter((each) => each.dataset.mount === 'gnome');
        expect(gnomes).toHaveLength(3);
        for (const gnome of gnomes) {
          const brim = gnome.querySelector('[data-part="santa"]')!;
          expect([...brim.children].map((shape) => shape.getAttribute('class'))).toEqual([
            styles.paper,
            styles.paper,
          ]);
          expect(brim.querySelector(`.${styles.tomato}`)).toBeNull();
          expect(gnome.querySelector('[data-part="hat"]')).not.toBeNull();
        }
      });
      And('on any other theme, nobody wears one', async () => {
        for (const course of COURSES.filter((each) => each !== 'christmas')) {
          const others = [...(await dressedOn(course)), ...lineUpOn(course)];
          for (const svg of others) {
            expect(svg.querySelector('[data-part="santa"]'), course).toBeNull();
            if (svg.dataset.part === 'racer') expect(accessories(svg), course).toHaveLength(1);
          }
        }
      });
    });

    RuleScenario('The winner gets a present', ({ Given, When, Then, And }) => {
      let watched: Watched;
      let flakes: boolean[] = [];
      Given('the unlucky person is {string}, on Christmas', async (_, name: string) => {
        const people = ['Dario', 'Elena', 'Fabio', name];
        let seed = 1;
        while (planShow(people, name, createRandom(seed), 'christmas').ending !== 'brake') seed++;
        const { win } = planShow(people, name, createRandom(seed), 'christmas').times;
        watched = await watch(people, {
          unlucky: name,
          seed,
          course: 'christmas',
          onStage: (time, scene) => {
            if (time < win + 0.5 || flakes.length) return;
            flakes = [...scene.querySelectorAll<HTMLElement>('[data-part="confetti"]')].map(
              (piece) => piece.dataset.flake === 'true',
            );
          },
        });
      });
      When('she has crossed the line', () => {
        expect(crossingOf(watched.plan, 'Anna')!).toBeLessThanOrEqual(watched.plan.times.finish);
      });
      Then(
        'the caption is {string}, with a fanfare and confetti with snowflakes in it',
        (_, caption: string) => {
          const { win } = watched.plan.times;
          expect(watched.record.captions.at(-1)).toMatchObject({ text: caption });
          expect(watched.record.captions.at(-1)!.from).toBeCloseTo(win, 1);
          // Sound isn't recorded: play.ts cues the fanfare as the caption comes.
          expect(between(watched, win + 0.5, Infinity).every((f) => f.confetti > 20)).toBe(true);
          expect(flakes.filter(Boolean).length).toBeGreaterThan(5);
          expect(flakes.filter((flake) => !flake).length).toBeGreaterThan(5);
          expect(css).toMatch(/\.flake \{\s*border-radius: var\(--radius-pill\);/);
        },
      );
      And(
        'Anna holds up a present, red with a gold ribbon and bow, where the trophy would be',
        () => {
          for (const frame of between(watched, watched.plan.times.win + STEP, Infinity)) {
            expect(frame.racers.Anna).toMatchObject({ trophy: true, mood: 'party' });
          }
          const face = handOutLooks(['Anna'], createRandom(1)).get('Anna')!;
          const look = watched.looks.get('Anna') as unknown as Parameters<typeof racer>[0];
          const dress = { costume: 'santa', prize: 'present' } as const;
          const drawn = isCreature(look.mount)
            ? creature(look as never, { face, number: 4, dress })
            : racer(look, { face, number: 4, dress });
          const plain = isCreature(look.mount)
            ? creature(look as never, { face, number: 4 })
            : racer(look, { face, number: 4 });
          const present = drawn.el.querySelector('[data-part="present"]')!;
          const trophy = plain.el.querySelector('[data-part="trophy"]')!;
          expect(drawn.el.querySelector('[data-part="trophy"]')).toBeNull();
          expect(present.getAttribute('x')).toBe(trophy.getAttribute('x'));
          expect(present.getAttribute('y')).toBe(trophy.getAttribute('y'));
          const classes = [...present.children].map((shape) => shape.getAttribute('class'));
          expect(classes.slice(0, 2)).toEqual([styles.tomato, styles.tomato]);
          expect(classes.slice(2, 5)).toEqual([styles.sun, styles.sun, styles.sun]);
        },
      );
      And(
        'whoever balances the trophy balances the present, the dinosaur and the pigeon on top of their Santa hat',
        () => {
          const face = handOutLooks(['Anna'], createRandom(1)).get('Anna')!;
          const dress = { costume: 'santa', prize: 'present' } as const;
          for (const kind of CREATURES) {
            const { reach, cup, hat } = CREATURE_SPEC[kind];
            const one = creature(
              { mount: kind, colour: 'sun', extra: 'scarf' },
              { face, number: 1, dress },
            );
            const top = Number(one.el.querySelector('[data-part="present"]')!.getAttribute('y'));
            if (kind === 'dinosaur' || kind === 'pigeon') {
              // Its bottom on the hat's cone and tail, which reach 54 and 60 over the brim's bottom.
              expect(top + 57, kind).toBeGreaterThan(hat[1] - 60);
              expect(top + 57, kind).toBeLessThan(hat[1] - 15);
            } else {
              expect(top, kind).toBe(cup[1]);
            }
            if (reach < 1 && reach > 0) expect(['dinosaur', 'pigeon', 'gnome']).toContain(kind);
          }
        },
      );
    });

    RuleScenario(
      'On Christmas, the unlucky person still crosses first',
      ({ Given, When, Then }) => {
        let runs: Plan[];
        Given('8 people, on Christmas', () => undefined);
        When('the show runs with {int} different random seeds', (_, seeds: number) => {
          runs = plansOn(team, unlucky, 'christmas', seeds);
        });
        Then("the first nose over the finish line is always the unlucky person's", () => {
          for (const plan of runs) {
            const crossing = crossingOf(plan, unlucky);
            expect(crossing).not.toBeNull();
            expect(crossing!).toBeLessThanOrEqual(plan.times.finish + 1e-9);
            for (const name of team.filter((each) => each !== unlucky)) {
              const theirs = crossingOf(plan, name);
              if (theirs !== null) expect(theirs).toBeGreaterThan(crossing!);
            }
          }
        });
      },
    );
  });

  Rule("Christmas's own racers", ({ RuleScenario, RuleScenarioOutline }) => {
    const lineUp = theRace.lineUp!;
    const choices = lineUp.options[0]!.choices;
    const listed = (text: string) => [...text.matchAll(/"([^"]+)"/g)].map(([, x]) => x);
    /** The four racers, as the feature names them. */
    const XMAS: Readonly<Record<string, Kind>> = {
      reindeer: 'reindeer',
      snowman: 'snowman',
      gingerbread: 'gingerbread',
      'Christmas tree': 'tree',
    };
    const face = handOutLooks(['Anna'], createRandom(1)).get('Anna')!;
    /** `kind` in `colour`, calm, as the show draws it, in the theme's `dress` if given. */
    const drawnAs = (
      kind: Kind,
      colour: RacerColour = 'tomato',
      dress?: Parameters<typeof creature>[1]['dress'],
    ) =>
      isCreature(kind)
        ? creature({ mount: kind, colour, extra: 'scarf' }, { face, number: 1, dress })
        : racer({ mount: kind, colour, extra: 'scarf' }, { face, number: 1, dress });
    /** Every shape in `svg` named `part`, but its groups. */
    const partsOf = (svg: Element, part: string) =>
      [...svg.querySelectorAll<SVGElement>(`[data-part="${part}"]`)].filter(
        (shape) => shape.tagName !== 'g',
      );
    RuleScenario('Four racers for Christmas', ({ When, Then, And }) => {
      /** The racers in `group` after `last`, which ends `held`. */
      const after = (group: string, held: string) => {
        const names = listed(held);
        const last = names.pop()!;
        const labels = choices
          .filter((choice) => choice.group === group)
          .map((choice) => read(choice.label));
        expect(labels.slice(labels.indexOf(last) + 1)).toEqual(names);
      };
      When('the Line-up opens for The Race', () => {
        expect(lineUp.options[0]!.label).toBe('Racer');
      });
      Then('the group "Rides" also holds {any}', (_, held: string) => after('Rides', held));
      And('the group "Things on legs" also holds {any}', (_, held: string) =>
        after('Things on legs', held),
      );
      And('with Christmas chosen, its tab holds {any}', (_, held: string) => {
        const christmas = lineUp.themes!.find((each) => each.name === 'christmas')!;
        const labelOf = (name: string) =>
          read(choices.find((choice) => choice.name === name)!.label);
        expect(christmas.suits!.map(labelOf)).toEqual(listed(held));
      });
    });

    RuleScenario('The reindeer', ({ Given, When, Then, And }) => {
      const looks = new Map<string, ChosenLook>();
      let ivo: SVGSVGElement;
      Given('Ivo chose the reindeer in grape', () => {
        looks.set('Ivo', { mount: 'reindeer', colour: 'grape', extra: 'number' });
        looks.set('Anna', { mount: 'duck', colour: 'sun', extra: 'scarf' });
      });
      When('the show runs', async () => {
        ivo = (await firstDrawn(looks)).get('Ivo')!;
      });
      Then(
        'Ivo rides a brown reindeer with cream antlers, a red nose, a gold collar with a bell, and a grape blanket under him',
        () => {
          expect(ivo.dataset).toMatchObject({ part: 'racer', mount: 'reindeer' });
          const mount = ivo.querySelector('[data-part="mount"]')!;
          // Its body, head and muzzle in bark, its legs and neck painted bark.
          expect(mount.querySelectorAll(`ellipse.${styles.bark}`)).toHaveLength(3);
          for (const leg of partsOf(mount, 'legs').filter((shape) => shape.style.length)) {
            expect(leg.style.getPropertyValue('--paint')).toBe('var(--color-bark)');
          }
          const antlers = partsOf(mount, 'antlers').map((shape) =>
            shape.style.getPropertyValue('--paint'),
          );
          expect(antlers).toContain('var(--color-tomato-soft)');
          expect(partsOf(mount, 'nose')[0]!.getAttribute('class')).toBe(styles.tomato);
          expect(partsOf(mount, 'collar')[0]!.getAttribute('class')).toBe(styles.sunLine);
          expect(partsOf(mount, 'bell')[0]!.getAttribute('class')).toBe(styles.sun);
          expect(ivo.style.getPropertyValue('--racer')).toBe('var(--color-grape)');
          const blanket = partsOf(mount, 'blanket')[0]!;
          expect(blanket.getAttribute('class')).toBe(styles.racer);
          // Under him: the blanket's top edge is the saddle, where the shirt sits.
          const { top, bottom } = bounds(blanket.getAttribute('d')!);
          expect(top).toBeLessThanOrEqual(SPEC.reindeer.saddle[1]);
          expect(bottom).toBeGreaterThan(SPEC.reindeer.saddle[1]);
        },
      );
      And(
        "he holds reins tied to its collar, in a grape shirt, his head at the same height as every rider's",
        () => {
          expect(reined(ivo)).toBe(true);
          const [x, y] = SPEC.reindeer.reins!;
          expect(ends(ivo.querySelector('[data-part="reins"]'))).toBe(`${x} ${y}`);
          // Where the canvas ties them: up the neck from the collar, under the head.
          expect(x).toBeGreaterThan(178);
          expect(y).toBeLessThan(114);
          expect(y).toBeGreaterThan(90);
          expect(headOf(ivo).style.getPropertyValue('--shirt')).toBe('var(--color-grape)');
          expect(SPEC.reindeer.saddle[1]).toBe(SPEC.snail.saddle[1]);
          for (const count of [2, 8]) {
            const at = lane(count - 1, count);
            expect(faceAt('reindeer', at, 900).top).toBe(faceAt('snail', at, 900).top);
          }
        },
      );
    });

    RuleScenario('Three things on legs for Christmas', ({ When, Then, And }) => {
      let drawn: Record<'snowman' | 'gingerbread' | 'tree', ReturnType<typeof creature>>;
      /** Its legs' paint, and each foot's kind and its shoe's class. */
      const legsAndFeet = (one: ReturnType<typeof creature>) => ({
        legs: [...one.el.querySelectorAll<SVGElement>('path[data-part="legs"]')].map((leg) =>
          leg.style.getPropertyValue('--paint'),
        ),
        feet: one.shoes.map((shoe) => [
          shoe.dataset.foot,
          shoe.querySelector('[data-part="shoe"]')!.getAttribute('class'),
        ]),
      });
      const dark = {
        legs: ['var(--color-ink-soft)', 'var(--color-ink-soft)'],
        feet: [
          ['sneaker', styles.paper],
          ['sneaker', styles.paper],
        ],
      };
      /** The fills of its shaded parts, back to front. */
      const fills = (one: ReturnType<typeof creature>) =>
        [...one.el.querySelectorAll('[data-part="own"] [data-part="shade"]')].map((shade) => {
          const d = shade.getAttribute('d');
          return [...shade.parentElement!.children]
            .find((each) => each.getAttribute('d') === d)!
            .getAttribute('class');
        });
      When('someone races as a snowman, a gingerbread or a Christmas tree', () => {
        drawn = {
          snowman: creature(
            { mount: 'snowman', colour: 'tomato', extra: 'scarf' },
            { face, number: 1 },
          ),
          gingerbread: creature(
            { mount: 'gingerbread', colour: 'tomato', extra: 'scarf' },
            { face, number: 1 },
          ),
          tree: creature({ mount: 'tree', colour: 'tomato', extra: 'scarf' }, { face, number: 1 }),
        };
      });
      Then(
        'the snowman is two snowballs with a carrot nose, on dark legs in white sneakers',
        () => {
          const { snowman } = drawn;
          expect(fills(snowman)).toEqual([styles.paper, styles.paper]);
          const carrot = partsOf(snowman.el, 'carrot')[0]!;
          expect(carrot.getAttribute('class')).toBe(styles.orange);
          // Its point is the snowman's nose.
          expect(bounds(carrot.getAttribute('d')!).right).toBe(CREATURE_SPEC.snowman.nose);
          expect(legsAndFeet(snowman)).toEqual(dark);
        },
      );
      And(
        'the gingerbread is a cookie with white icing, on cookie legs and feet, its hands cookie too',
        () => {
          const { gingerbread } = drawn;
          expect(fills(gingerbread)).toEqual([styles.bark, styles.bark]);
          const icing = partsOf(gingerbread.el, 'icing');
          expect(icing).toHaveLength(2);
          for (const line of icing) expect(line.getAttribute('class')).toBe(styles.stripe);
          expect(legsAndFeet(gingerbread)).toEqual({
            legs: ['var(--color-bark)', 'var(--color-bark)'],
            feet: [
              ['bare', styles.bark],
              ['bare', styles.bark],
            ],
          });
          const hands = partsOf(gingerbread.el, 'hand');
          expect(hands).toHaveLength(2);
          for (const hand of hands) expect(hand.getAttribute('class')).toBe(styles.bark);
        },
      );
      And(
        'the Christmas tree is two green tiers with a gold garland and a star on top, on dark legs in white sneakers',
        () => {
          const { tree } = drawn;
          expect(fills(tree)).toEqual([styles.leaf, styles.leaf]);
          const garland = partsOf(tree.el, 'garland').map((line) => line.getAttribute('class'));
          expect(garland).toEqual([styles.line, styles.sunLine]);
          const star = partsOf(tree.el, 'star')[0]!;
          expect(star.getAttribute('class')).toBe(styles.sun);
          // On top: over the top tier's tip at y 12.
          expect(bounds(star.getAttribute('d')!).bottom).toBeLessThan(24);
          expect(bounds(star.getAttribute('d')!).top).toBeLessThan(12);
          expect(legsAndFeet(tree)).toEqual(dark);
        },
      );
      And('at Christmas, the tree wears its Santa hat instead of its star', () => {
        const dress = { costume: 'santa', prize: 'present' } as const;
        const tree = creature(
          { mount: 'tree', colour: 'sun', extra: 'tophat' },
          { face, number: 1, dress },
        );
        expect(tree.el.querySelector('[data-part="star"]')).toBeNull();
        const [x, y] = CREATURE_SPEC.tree.hat;
        expect(tree.el.querySelector('[data-part="santa"]')!.getAttribute('transform')).toBe(
          `translate(${x} ${y})`,
        );
        // Every other Christmas racer keeps what it has and wears the hat too.
        for (const kind of ['reindeer', 'snowman', 'gingerbread'] as const) {
          expect(
            drawnAs(kind, 'sun', dress).el.querySelector('[data-part="santa"]'),
            kind,
          ).not.toBeNull();
        }
      });
    });

    RuleScenarioOutline('Where a <racer> wears its colour', ({ When, Then }, { racer: called }) => {
      let svg: SVGSVGElement;
      /** Where each wears its colour: its parts so named. */
      const WEARS: Readonly<Record<string, readonly string[]>> = {
        reindeer: ['blanket'],
        snowman: ['buttons', 'hand'],
        gingerbread: ['buttons'],
        'Christmas tree': ['baubles'],
      };
      When('someone races as a <racer> in tomato', () => {
        svg = drawnAs(XMAS[called]!).el;
      });
      Then('<where> is tomato', () => {
        expect(svg.style.getPropertyValue('--racer')).toBe('var(--color-tomato)');
        for (const part of WEARS[called]!) {
          const shapes = partsOf(svg, part);
          expect(shapes.length, part).toBeGreaterThanOrEqual(part === 'blanket' ? 1 : 2);
          for (const shape of shapes) {
            expect(shape.getAttribute('class'), `${called} ${part}`).toBe(styles.racer);
          }
        }
      });
    });

    /** Five people on the reindeer, or two as a thing, the burst and stop `name`'s. */
    const run = (called: string, name: string, reducedMotion = false) => {
      const kind = XMAS[called]!;
      return isCreature(kind)
        ? shared.thing(kind, name, reducedMotion)
        : shared.mount(kind, name, reducedMotion);
    };

    RuleScenarioOutline(
      'A <racer> bursts ahead',
      ({ When, Then, And }, { racer: called, name, burst }) => {
        let watched: Watched;
        When("someone's <racer> bursts ahead", async () => {
          watched = await run(called, name);
        });
        Then(`the caption is "<name>'s <racer> <burst>!"`, () => {
          expect(captions(watched)).toContain(`${name}'s ${called} ${burst}!`);
          expect(watched.plan.events[0]).toMatchObject({ kind: 'burst', subject: name });
        });
        And('<what>, and it shoots into the lead, shouting "Nooo!", or its rider does', () => {
          const { at } = watched.plan.events[0]!;
          const during = between(watched, at, at + BURST.seconds).map(
            (frame) => frame.racers[name]!,
          );
          const before = between(watched, at - 0.5, at).map((frame) => frame.racers[name]!);
          /** How long the burst shows `prop`, in seconds. */
          const showing = (prop: string) =>
            during.filter((racer) => racer.props.split(' ').includes(prop)).length * STEP;
          const prop = {
            reindeer: 'spray',
            snowman: 'blizzard',
            gingerbread: 'crumbs',
            tree: 'lights',
          }[XMAS[called] as 'reindeer'];
          expect(showing(prop), prop).toBeGreaterThanOrEqual(BURST.seconds - 2 * STEP);
          for (const racer of before) expect(racer.props).not.toContain(prop);
          switch (XMAS[called]) {
            case 'reindeer': {
              // Up off the snow, gliding most of the burst.
              expect(before.every((racer) => racer.hop === 0)).toBe(true);
              const high = during.filter((racer) => racer.hop > 25);
              expect(high.length * STEP).toBeGreaterThanOrEqual(0.4);
              break;
            }
            case 'snowman':
              // The swirl whirls round.
              expect(Math.max(...during.map((racer) => racer.spin))).toBeGreaterThan(180);
              break;
            case 'gingerbread':
              break;
            case 'tree':
              // Both sets of lights glow in turn.
              expect(new Set(during.map((racer) => racer.twinkle))).toEqual(new Set(['a', 'b']));
              break;
          }
          // Gone once the burst is over.
          const done = between(watched, at + BURST.seconds + 0.1, at + BURST.seconds + 0.5);
          for (const frame of done) expect(frame.racers[name]!.props).not.toContain(prop);
          expect(leaderAt(watched.plan, at)).not.toBe(name);
          expect(leaderAt(watched.plan, at + BURST.seconds)).toBe(name);
          const shouting = watched.frames.filter((frame) => saying(frame, name, 'Nooo!'));
          expect(shouting[0]!.time).toBeGreaterThanOrEqual(at);
          expect(shouting[0]!.time).toBeLessThan(at + 0.5);
        });
      },
    );

    RuleScenarioOutline('A <racer> stops', ({ When, Then, And }, { racer: called, name, stop }) => {
      let watched: Watched;
      /** The stopped racer, frame by frame from the stop to the next event or the run's end. */
      const during = () => {
        const { at } = watched.plan.events[1]!;
        return watched.frames
          .filter((frame) => frame.time >= at && frame.time < at + spacing(5))
          .map((frame) => ({ ...frame, racer: frame.racers[name]!, since: frame.time - at }));
      };
      When("someone's <racer> stops", async () => {
        watched = await run(called, name);
      });
      Then(`the caption is "<name>'s <racer> <stop>!"`, () => {
        expect(captions(watched)).toContain(`${name}'s ${called} ${stop}!`);
        expect(watched.plan.events[1]).toMatchObject({ kind: 'stop', subject: name });
      });
      And('<what>, and it drops back while the camera goes on', () => {
        const stopped = during().filter((frame) => frame.racer.stopped);
        expect(stopped.length).toBeGreaterThan(10);
        const before = stopped.filter((frame) => frame.since < STOP.phew);
        /** How long the stop shows `prop`, in seconds. */
        const showing = (prop: string) =>
          stopped.filter((frame) => frame.racer.props.split(' ').includes(prop)).length * STEP;
        const kind = XMAS[called]!;
        if (kind === 'reindeer') {
          // Lights round its antlers, shaken off by "Phew!".
          expect(showing('tangle')).toBeGreaterThanOrEqual(1);
          expect(Math.max(...before.map((frame) => frame.racer.shake))).toBeGreaterThan(5);
          const phewed = stopped.filter((frame) => frame.since >= STOP.phew);
          for (const frame of phewed) expect(frame.racer.props).not.toContain('tangle');
        } else {
          // What falls off lies on the ground while it bends for it.
          const prop = { snowman: 'carrot', gingerbread: 'gumdrop', tree: 'bauble' }[
            kind as 'snowman'
          ];
          expect(showing(prop)).toBeGreaterThanOrEqual(0.8);
          const bending = before.filter(
            (frame) => frame.racer.bend > 20 && frame.racer.props.includes(prop),
          );
          expect(bending.length * STEP).toBeGreaterThanOrEqual(0.5);
        }
        const first = stopped[0]!;
        const last = stopped.at(-1)!;
        expect(last.racer.nose).toBeLessThan(first.racer.nose - 200);
        expect(last.camera).toBeGreaterThan(first.camera + 300);
      });
      And('it waves, says "Phew!", and sets off again further back, or its rider does', () => {
        const frames = during();
        const waving = frames.filter(
          ({ racer }) => racer.stopped && racer.pose === 'wave' && racer.bend === 0,
        );
        expect(waving.length).toBeGreaterThan(0);
        expect(frames.some((frame) => saying(frame, name, 'Phew!'))).toBe(true);
        const off = frames.find((frame) => frame.since > STOP.off + 0.1)!;
        expect(off.racer.stopped).toBe(false);
        expect(off.racer.gait).toBe('on');
        expect(off.racer.props).toBe('');
        expect([off.racer.bend, off.racer.shake]).toEqual([0, 0]);
        const { at } = watched.plan.events[1]!;
        expect(orderAt(watched.plan, at + STOP.off).indexOf(name)).toBeGreaterThan(
          orderAt(watched.plan, at - 0.01).indexOf(name),
        );
      });
    });

    RuleScenario(
      'With reduced motion, the Christmas racers keep still too',
      ({ Given, When, Then }) => {
        const watched: Record<string, Watched> = {};
        Given('reduced motion is on', () => undefined);
        When('the show runs', async () => {
          watched.Giulia = await run('snowman', 'Giulia', true);
          watched.Jonas = await run('Christmas tree', 'Jonas', true);
        });
        Then(
          "the blizzard's swirl doesn't spin, and the tree's lights come on without twinkling",
          () => {
            /** `name` through their burst. */
            const bursting = (name: string) => {
              const { at } = watched[name]!.plan.events[0]!;
              return between(watched[name]!, at, at + BURST.seconds).map(
                (frame) => frame.racers[name]!,
              );
            };
            const giulia = bursting('Giulia');
            expect(giulia.every((racer) => racer.props.includes('blizzard'))).toBe(true);
            for (const racer of watched.Giulia!.frames.map((frame) => frame.racers.Giulia!)) {
              expect(racer.spin).toBe(0);
            }
            // Every light glowing at once, all through the burst.
            const jonas = bursting('Jonas');
            expect(jonas.every((racer) => racer.props.includes('lights'))).toBe(true);
            expect(new Set(jonas.map((racer) => racer.twinkle))).toEqual(new Set(['ab']));
          },
        );
      },
    );
  });

  Rule('The unlucky person crosses first', ({ RuleScenario, RuleScenarioOutline }) => {
    RuleScenarioOutline(
      '<count> people, the unlucky person <position> in the list',
      ({ Given, When, Then, And }, { count, position }) => {
        const team = names(Number(count));
        let unlucky: string;
        let runs: Plan[];
        Given('<count> people, with the unlucky person <position> in the list', () => {
          unlucky = position === 'first' ? team[0]! : team.at(-1)!;
        });
        When('the show runs with {int} different random seeds', (_, seeds: number) => {
          runs = plans(team, unlucky, seeds);
        });
        Then("the first nose over the finish line is always the unlucky person's", () => {
          for (const plan of runs) {
            const crossing = crossingOf(plan, unlucky);
            expect(crossing).not.toBeNull();
            expect(crossing!).toBeLessThanOrEqual(plan.times.finish + 1e-9);
          }
        });
        And("nobody else's nose reaches the line before theirs", () => {
          for (const plan of runs) {
            const crossing = crossingOf(plan, unlucky)!;
            for (const name of team.filter((each) => each !== unlucky)) {
              const theirs = crossingOf(plan, name);
              if (theirs !== null) expect(theirs).toBeGreaterThan(crossing);
            }
          }
        });
      },
    );

    RuleScenario(
      'Whatever reaches furthest, the unlucky person is over first',
      ({ Given, When, Then, And }) => {
        const team = names(8);
        const unlucky = team.at(-1)!;
        let short: number;
        let past: number;
        let runs: Plan[];
        Given(
          "{int} people, the unlucky person's racer leaning back {int} px short of its nose as it leads",
          (_, __: number, px: number) => {
            short = px;
          },
        );
        And("everyone else's hands reaching {int} px past their noses", (_, px: number) => {
          past = px;
        });
        When('the show runs with {int} different random seeds', (_, seeds: number) => {
          const reach = (name: string) =>
            name === unlucky ? { least: -short, most: 0 } : { least: 0, most: past };
          runs = Array.from({ length: seeds }, (_, index) =>
            planShow(team, unlucky, createRandom(index + 1), 'field', reach),
          );
        });
        Then(
          "all of the unlucky person's racer is over the line before anyone else's hands reach it",
          () => {
            expect(new Set(runs.map((plan) => plan.ending))).toEqual(new Set(ENDINGS));
            const step = 1 / 120;
            for (const plan of runs) {
              let over: number | null = null;
              for (let t = plan.times.stretch; t <= plan.times.end && over === null; t += step) {
                const line = lineAt(plan, t);
                for (const name of team.filter((each) => each !== unlucky)) {
                  expect(noseAt(plan, name, t) + past, `${plan.ending} ${name}`).toBeLessThan(line);
                }
                if (noseAt(plan, unlucky, t) - short >= line) over = t;
              }
              expect(over, plan.ending).not.toBeNull();
            }
          },
        );
      },
    );

    RuleScenario('Nobody wins out of nowhere', ({ Given, When, Then, And }) => {
      const team = names(8);
      const unlucky = team.at(-1)!;
      let runs: Plan[];
      Given('{int} people', () => undefined);
      When('the show runs with {int} different random seeds', (_, seeds: number) => {
        runs = plans(team, unlucky, seeds);
      });
      Then('from "Final stretch!" on, the unlucky person is always among the front three', () => {
        for (const plan of runs) {
          for (const t of frames(plan.times.stretch, plan.crossing)) {
            expect(orderAt(plan, t).indexOf(unlucky), `${plan.ending} at ${t}`).toBeLessThan(3);
          }
        }
      });
      And('in the photo finish and the late brake, among the front two', () => {
        for (const plan of runs.filter((each) => each.ending !== 'surge')) {
          for (const t of frames(plan.times.stretch, plan.crossing)) {
            expect(orderAt(plan, t).indexOf(unlucky), `${plan.ending} at ${t}`).toBeLessThan(2);
          }
        }
      });
    });

    RuleScenario('Who leads gives nothing away', ({ Given, When, Then, And }) => {
      const team = names(8);
      const unlucky = team.at(-1)!;
      let runs: Plan[];
      Given('{int} people, with the same unlucky person every time', () => undefined);
      When('the show runs with {int} different random seeds', (_, seeds: number) => {
        runs = plans(team, unlucky, seeds);
      });
      Then('the first to take the lead is at least {int} different people', (_, least: number) => {
        const first = new Set(runs.map((plan) => leaderAt(plan, plan.times.go + 0.3)));
        expect(first.size).toBeGreaterThanOrEqual(least);
      });
      And(
        'the unlucky person leads before the final stretch in some runs and not in others',
        () => {
          const leads = runs.map((plan) =>
            [...frames(plan.times.go + 0.1, plan.times.stretch)].some(
              (t) => leaderAt(plan, t) === unlucky,
            ),
          );
          expect(leads).toContain(true);
          expect(leads).toContain(false);
        },
      );
      And(
        'the others in the front group of the final stretch are at least {int} different people across the runs',
        (_, least: number) => {
          const others = new Set(
            runs.flatMap((plan) =>
              orderAt(plan, plan.times.stretch + 1.5)
                .slice(0, 3)
                .filter((name) => name !== unlucky),
            ),
          );
          expect(others.size).toBeGreaterThanOrEqual(least);
        },
      );
    });
  });

  Rule('Winning is losing', ({ RuleScenario }) => {
    RuleScenario('The leader is scared, rider or creature', ({ Given, When, Then, And }) => {
      let watched: Watched;
      /** Frames while the race is on, with nobody stopped. */
      const racing = () =>
        watched.frames.filter(
          (frame) =>
            frame.time > watched.plan.times.go + 0.2 &&
            frame.time < watched.plan.times.finish &&
            Object.values(frame.racers).every((racer) => !racer.stopped),
        );
      const front = (frame: Frame) => Math.max(...Object.values(frame.racers).map((r) => r.nose));
      /** Who is in front in each racing frame, and whether they are a creature. */
      const leaders = () =>
        racing().map((frame) => {
          const [name, racer] = Object.entries(frame.racers).find(
            ([, each]) => each.nose === front(frame),
          )!;
          return { time: frame.time, racer, creature: isCreature(kindOf(watched, name)) };
        });
      Given('{int} people, four riders and four creatures', (_, count: number) => {
        expect(count).toBe(8);
      });
      When('the show runs', async () => {
        watched = await shared.mixed(8);
        const kinds = [...watched.looks.values()].map((look) => isCreature(look.mount as Kind));
        expect(kinds.filter(Boolean)).toHaveLength(4);
      });
      Then('whoever is in front looks scared and sweats', () => {
        for (const { time, racer } of leaders()) {
          expect(racer.mood, `${time}`).toBe('scared');
          expect(racer.sweat).toBe(true);
        }
      });
      And(
        'a rider in front leans back and pulls on the reins, or holds on tight on the chair',
        () => {
          const riders = leaders().filter((leader) => !leader.creature);
          expect(riders.length).toBeGreaterThan(0);
          for (const { racer } of riders) expect(racer.pose).toBe('pull');
        },
      );
      And('a creature in front leans back and flails its arms, while its legs keep running', () => {
        const creatures = leaders().filter((leader) => leader.creature);
        expect(creatures.length).toBeGreaterThan(0);
        for (const { racer } of creatures) {
          expect(racer.pose).toBe('pull');
          expect(racer.gait).not.toBe('off');
        }
        // Swinging both ways.
        const flails = new Set(creatures.map(({ racer }) => Math.sign(racer.flail)));
        expect(flails.has(-1) && flails.has(1)).toBe(true);
      });
      And("whoever is within a mount's length behind them looks worried", () => {
        for (const frame of racing()) {
          for (const racer of Object.values(frame.racers)) {
            const behind = front(frame) - racer.nose;
            if (behind > 0 && behind <= LENGTH) expect(racer.mood, `${frame.time}`).toBe('worried');
          }
        }
      });
      And('everyone further back looks happy, some of them waving', () => {
        let waving = 0;
        for (const frame of racing()) {
          for (const racer of Object.values(frame.racers)) {
            if (front(frame) - racer.nose <= LENGTH) continue;
            expect(racer.mood, `${frame.time}`).toBe('happy');
            expect(racer.flail).toBe(0);
            if (racer.pose === 'wave') waving++;
          }
        }
        expect(waving).toBeGreaterThan(0);
      });
    });
  });

  Rule('One thing at a time', ({ RuleScenario, RuleScenarioOutline }) => {
    RuleScenario('The start', ({ When, Then, And }) => {
      let watched: Watched;
      When('the show runs', async () => {
        watched = await shared.eight();
      });
      Then(
        'everyone waits at the start line, noses on it, with the caption {string}',
        (_, caption: string) => {
          const { go } = watched.plan.times;
          expect(watched.record.captions[0]!.text).toBe(caption);
          expect(watched.record.captions[0]!.from).toBeLessThanOrEqual(STEP);
          for (const frame of watched.frames.filter((each) => each.time <= go)) {
            for (const racer of Object.values(frame.racers)) expect(racer.nose).toBe(420);
            expect(frame.camera).toBe(0);
          }
        },
      );
      And(
        'at {string} they spring off together and the camera starts to follow the leaders',
        (_, caption: string) => {
          const { go } = watched.plan.times;
          expect(watched.record.captions[1]).toMatchObject({ text: caption });
          expect(watched.record.captions[1]!.from).toBeCloseTo(go, 1);
          const off = watched.frames.find((frame) => frame.time > go + 0.25)!;
          for (const racer of Object.values(off.racers)) expect(racer.nose).toBeGreaterThan(440);
          expect(off.camera).toBeGreaterThan(0);
          const later = watched.frames.find((frame) => frame.time > go + 2)!;
          expect(later.camera - off.camera).toBeGreaterThan(200);
        },
      );
    });

    RuleScenarioOutline(
      'With <count> people there are <events> events before the final stretch',
      ({ Given, When, Then, And }, { count, events }) => {
        let watched: Watched;
        Given('<count> people', () => undefined);
        When('the show runs', async () => {
          watched = await shared.count(Number(count));
        });
        Then(
          '<events> things happen before "Final stretch!", one at a time, each with a caption of its own',
          () => {
            const said = captions(watched);
            const between = said.slice(said.indexOf('Go!') + 1, said.indexOf('Final stretch!'));
            expect(between).toHaveLength(Number(events));
            expect(watched.plan.events).toHaveLength(Number(events));
            expect(new Set(between).size).toBe(between.length);
            watched.plan.events.forEach((event, i) => {
              expect(between[i]).toContain(event.subject);
              const shown = watched.record.captions.find((each) => each.text === between[i])!;
              expect(shown.from).toBeCloseTo(event.at, 0);
            });
          },
        );
        And('each starts 2.5 seconds or more after the one before', () => {
          const times = watched.plan.events.map((event) => event.at);
          times.slice(1).forEach((time, i) => expect(time - times[i]!).toBeGreaterThanOrEqual(2.5));
        });
      },
    );

    RuleScenarioOutline('A <mount> bursts ahead', ({ When, Then, And }, { mount, name, burst }) => {
      let watched: Watched;
      When("someone's <mount> bursts ahead", async () => {
        watched = await shared.mount(mount as Mount, name);
      });
      Then(`the caption is "<name>'s <mount> <burst>!"`, () => {
        expect(captions(watched)).toContain(`${name}'s ${mount} ${burst}!`);
        expect(watched.plan.events[0]).toMatchObject({ kind: 'burst', subject: name });
      });
      And('it shoots into the lead, its rider shouting "Nooo!"', () => {
        const { at } = watched.plan.events[0]!;
        expect(leaderAt(watched.plan, at)).not.toBe(name);
        expect(leaderAt(watched.plan, at + 0.9)).toBe(name);
        const shouting = watched.frames.filter((frame) =>
          frame.says.some((said) => said.person === name && said.text === 'Nooo!'),
        );
        expect(shouting[0]!.time).toBeGreaterThanOrEqual(at);
        expect(shouting[0]!.time).toBeLessThan(at + 0.5);
        expect(shouting.length * STEP).toBeGreaterThanOrEqual(1);
      });
    });

    RuleScenarioOutline('A <mount> stops', ({ When, Then, And }, { mount, name, stop }) => {
      let watched: Watched;
      /** The stopped racer, frame by frame from the stop to the next event. */
      const during = () => {
        const { at } = watched.plan.events[1]!;
        return watched.frames
          .filter((frame) => frame.time >= at && frame.time < at + spacing(5))
          .map((frame) => ({ ...frame, racer: frame.racers[name]!, since: frame.time - at }));
      };
      When("someone's <mount> stops", async () => {
        watched = await shared.mount(mount as Mount, name);
      });
      Then(`the caption is "<name>'s <mount> <stop>!"`, () => {
        expect(captions(watched)).toContain(`${name}'s ${mount} ${stop}!`);
        expect(watched.plan.events[1]).toMatchObject({ kind: 'stop', subject: name });
      });
      And('<what>, and it drops back while the camera goes on', () => {
        const stopped = during().filter((frame) => frame.racer.stopped);
        expect(stopped.length).toBeGreaterThan(10);
        if (mount === 'snail') {
          expect(stopped.filter((frame) => frame.since > 0.3).every((f) => f.racer.leaf)).toBe(
            true,
          );
        }
        if (mount === 'duck') {
          const tilts = stopped.map((frame) => parseFloat(frame.racer.rotate || '0'));
          expect(Math.min(...tilts)).toBeLessThan(-15);
          expect(tilts.at(-1)).toBe(0);
        }
        if (mount === 'chair') {
          const flips = stopped
            .map((frame) => Math.sign(parseFloat(frame.racer.scale || '1')))
            .filter((sign, i, all) => i > 0 && sign !== all[i - 1]);
          expect(flips).toHaveLength(4);
        }
        if (mount === 'caterpillar') {
          const dozing = stopped.filter((frame) =>
            frame.says.some((said) => said.person === name && said.text === 'Zzz…'),
          );
          expect(dozing.length * STEP).toBeGreaterThanOrEqual(1);
          expect(stopped.every((frame) => frame.racer.gait === 'off')).toBe(true);
        }
        const first = stopped[0]!;
        const last = stopped.at(-1)!;
        expect(last.racer.nose).toBeLessThan(first.racer.nose - 200);
        expect(last.camera).toBeGreaterThan(first.camera + 300);
      });
      And('its rider waves, says "Phew!", and the mount sets off again further back', () => {
        const frames = during();
        expect(frames.some((frame) => frame.racer.stopped && frame.racer.pose === 'wave')).toBe(
          true,
        );
        const phew = frames.filter((frame) =>
          frame.says.some((said) => said.person === name && said.text === 'Phew!'),
        );
        expect(phew.length * STEP).toBeGreaterThanOrEqual(1);
        const off = frames.find((frame) => frame.since > STOP.off + 0.1)!;
        expect(off.racer.stopped).toBe(false);
        expect(off.racer.gait).toBe('on');
        const { at } = watched.plan.events[1]!;
        expect(orderAt(watched.plan, at + STOP.off).indexOf(name)).toBeGreaterThan(
          orderAt(watched.plan, at - 0.01).indexOf(name),
        );
      });
    });

    RuleScenarioOutline(
      'A new <ride> bursts ahead',
      ({ When, Then, And }, { ride, name, burst }) => {
        let watched: Watched;
        /** The burster, frame by frame from just before the burst to its end. */
        const bursting = () => {
          const { at } = watched.plan.events[0]!;
          return watched.frames
            .filter((frame) => frame.time >= at && frame.time < at + BURST.seconds)
            .map((frame) => frame.racers[name]!);
        };
        When("someone's <ride> bursts ahead", async () => {
          watched = await shared.mount(ride as Mount, name);
        });
        Then(`the caption is "<name>'s <ride> <burst>!"`, () => {
          expect(captions(watched)).toContain(`${name}'s ${ride} ${burst}!`);
          expect(watched.plan.events[0]).toMatchObject({ kind: 'burst', subject: name });
        });
        And('<what>, and it shoots into the lead, its rider shouting "Nooo!"', () => {
          const during = bursting();
          const before = watched.frames.find(
            (frame) => frame.time < watched.plan.events[0]!.at && frame.time > 1,
          )!.racers[name]!;
          if (ride === 'hopper') {
            const hops = during.map((racer) => racer.hop);
            expect(Math.max(...hops)).toBeGreaterThan(35);
            // Big bounces: up, down to the ground, and up again.
            const landed = hops.findIndex(
              (hop, i) => i > hops.indexOf(Math.max(...hops)) && hop < 5,
            );
            expect(landed).toBeGreaterThan(0);
            expect(Math.max(...hops.slice(landed))).toBeGreaterThan(35);
          }
          if (ride === 'ostrich') {
            expect(before.stride).toBe(1);
            const strides = during.map((racer) => racer.stride);
            // Wider than it walks, the legs swinging from one side to the other.
            expect(Math.max(...strides)).toBeGreaterThan(1.5);
            expect(Math.min(...strides)).toBeLessThan(0);
          }
          if (ride === 'rocket') {
            expect(before.flame).toBeGreaterThan(0.8);
            expect(before.flame).toBeLessThan(1.2);
            expect(during.every((racer) => racer.flame === 2)).toBe(true);
          }
          if (ride === 'sandwich') {
            expect(before.props).not.toContain('steam');
            expect(during.every((racer) => racer.props.includes('steam'))).toBe(true);
          }
          const { at } = watched.plan.events[0]!;
          expect(leaderAt(watched.plan, at)).not.toBe(name);
          expect(leaderAt(watched.plan, at + BURST.seconds)).toBe(name);
          expect(
            watched.frames.some((frame) => frame.time < at + 0.5 && saying(frame, name, 'Nooo!')),
          ).toBe(true);
        });
      },
    );

    RuleScenarioOutline('A new <ride> stops', ({ When, Then, And }, { ride, name, stop }) => {
      let watched: Watched;
      /** The stopped racer, frame by frame from the stop to the next event. */
      const during = () => {
        const { at } = watched.plan.events[1]!;
        return watched.frames
          .filter((frame) => frame.time >= at && frame.time < at + spacing(5))
          .map((frame) => ({ ...frame, racer: frame.racers[name]!, since: frame.time - at }));
      };
      When("someone's <ride> stops", async () => {
        watched = await shared.mount(ride as Mount, name);
      });
      Then(`the caption is "<name>'s <ride> <stop>!"`, () => {
        expect(captions(watched)).toContain(`${name}'s ${ride} ${stop}!`);
        expect(watched.plan.events[1]).toMatchObject({ kind: 'stop', subject: name });
      });
      And('<what>, and it drops back while the camera goes on', () => {
        const stopped = during().filter((frame) => frame.racer.stopped);
        expect(stopped.length).toBeGreaterThan(10);
        if (ride === 'hopper') {
          expect(Math.max(...stopped.map((frame) => frame.racer.hop))).toBeGreaterThan(20);
          // On the spot: never forward on screen, while the camera goes on.
          stopped.slice(1).forEach((frame, i) => {
            expect(frame.racer.nose).toBeLessThanOrEqual(stopped[i]!.racer.nose + 1e-6);
          });
        }
        if (ride === 'ostrich') {
          const laid = stopped.filter((frame) => frame.racer.props.includes('egg'));
          expect(laid.length).toBeGreaterThan(10);
          expect(stopped.some((frame) => frame.racer.look === 'back')).toBe(true);
          expect(stopped.every((frame) => frame.racer.stride === 1)).toBe(true);
        }
        if (ride === 'rocket') {
          expect(stopped.every((frame) => frame.racer.flame === 'out')).toBe(true);
          expect(stopped[0]!.racer.props).toContain('smoke');
          expect(stopped.at(-1)!.racer.props).not.toContain('smoke');
        }
        if (ride === 'sandwich') {
          const dropped = stopped.filter((frame) => frame.racer.props.includes('pickle'));
          expect(dropped.length).toBeGreaterThan(10);
          // Picked up again before it sets off.
          expect(stopped.at(-1)!.racer.props).not.toContain('pickle');
          expect(stopped.every((frame) => frame.racer.gait === 'off')).toBe(true);
        }
        const first = stopped[0]!;
        const last = stopped.at(-1)!;
        expect(last.racer.nose).toBeLessThan(first.racer.nose - 200);
        expect(last.camera).toBeGreaterThan(first.camera + 300);
      });
      And('its rider waves, says "Phew!", and the mount sets off again further back', () => {
        const frames = during();
        expect(frames.some((frame) => frame.racer.stopped && frame.racer.pose === 'wave')).toBe(
          true,
        );
        expect(frames.some((frame) => saying(frame, name, 'Phew!'))).toBe(true);
        const off = frames.find((frame) => frame.since > STOP.off + 0.1)!;
        expect(off.racer.stopped).toBe(false);
        expect(off.racer.gait).toBe('on');
        expect(off.racer.props).toBe('');
        if (ride === 'rocket') expect(off.racer.flame).not.toBe('out');
      });
    });

    RuleScenarioOutline(
      'A <creature> bursts ahead',
      ({ When, Then, And }, { creature: kind, name, burst }) => {
        let watched: Watched;
        When("someone's <creature> bursts ahead", async () => {
          watched = await shared.mount(kind as Creature, name);
        });
        Then(`the caption is "<name>'s <creature> <burst>!"`, () => {
          expect(captions(watched)).toContain(`${name}'s ${kind} ${burst}!`);
          expect(watched.plan.events[0]).toMatchObject({ kind: 'burst', subject: name });
        });
        And('it shoots into the lead, shouting "Nooo!"', () => {
          const { at } = watched.plan.events[0]!;
          expect(leaderAt(watched.plan, at)).not.toBe(name);
          expect(leaderAt(watched.plan, at + 0.9)).toBe(name);
          const shouting = watched.frames.filter((frame) => saying(frame, name, 'Nooo!'));
          expect(shouting[0]!.time).toBeGreaterThanOrEqual(at);
          expect(shouting[0]!.time).toBeLessThan(at + 0.5);
          expect(shouting.length * STEP).toBeGreaterThanOrEqual(1);
        });
      },
    );

    RuleScenarioOutline(
      'A <creature> stops',
      ({ When, Then, And }, { creature: kind, name, stop }) => {
        let watched: Watched;
        /** The stopped creature, frame by frame from the stop to the next event. */
        const during = () => {
          const { at } = watched.plan.events[1]!;
          return watched.frames
            .filter((frame) => frame.time >= at && frame.time < at + spacing(5))
            .map((frame) => ({ ...frame, racer: frame.racers[name]!, since: frame.time - at }));
        };
        When("someone's <creature> stops", async () => {
          watched = await shared.mount(kind as Creature, name);
        });
        Then(`the caption is "<name>'s <creature> <stop>!"`, () => {
          expect(captions(watched)).toContain(`${name}'s ${kind} ${stop}!`);
          expect(watched.plan.events[1]).toMatchObject({ kind: 'stop', subject: name });
        });
        And('<what>, and it drops back while the camera goes on', () => {
          const stopped = during().filter((frame) => frame.racer.stopped);
          expect(stopped.length).toBeGreaterThan(10);
          /** How long the stop shows `prop`, in seconds. */
          const showing = (prop: string) =>
            stopped.filter((frame) => frame.racer.props.split(' ').includes(prop)).length * STEP;
          if (kind === 'zombie') {
            expect(showing('lostShoe')).toBeGreaterThanOrEqual(1);
            expect(Math.max(...stopped.map((frame) => frame.racer.hop))).toBeGreaterThan(8);
          }
          if (kind === 'robot') {
            expect(stopped[0]!.racer.blank).toBe(true);
            expect(stopped.at(-1)!.racer.blank).toBe(false);
          }
          if (kind === 'shark') {
            expect(stopped.filter((frame) => frame.racer.bend > 20).length * STEP).toBeGreaterThan(
              1,
            );
          }
          if (kind === 'astronaut') {
            expect(showing('flag')).toBeGreaterThanOrEqual(1);
            // Planted: it stays where it went in while the astronaut drops back.
            const planted = stopped.filter((frame) => frame.racer.flag !== null);
            const along = planted.map((frame) => {
              const k = lane(watched.team.indexOf(name), watched.team.length).k;
              const left = frame.racer.nose - CREATURE_SPEC.astronaut.nose * k;
              return left + frame.racer.flag! * k + frame.camera;
            });
            expect(Math.max(...along) - Math.min(...along)).toBeLessThan(2);
          }
          if (kind === 'monster') {
            const hics = stopped.filter((frame) => saying(frame, name, 'Hic!'));
            expect(hics.length * STEP).toBeGreaterThanOrEqual(1);
            expect(hics.some((frame) => frame.racer.hop > 8)).toBe(true);
            expect(
              stopped
                .filter((frame) => !saying(frame, name, 'Hic!'))
                .every((f) => f.racer.hop === 0),
            ).toBe(true);
          }
          if (kind === 'villain') {
            expect(showing('wrap')).toBeGreaterThanOrEqual(1);
            const flips = stopped
              .map((frame) => Math.sign(parseFloat(frame.racer.scale || '1')))
              .filter((sign) => sign !== 0)
              .filter((sign, i, all) => i > 0 && sign !== all[i - 1]);
            // Once round: facing back, then forward again.
            expect(flips).toHaveLength(2);
          }
          if (kind === 'alien') expect(showing('question')).toBeGreaterThanOrEqual(1);
          if (kind === 'dinosaur') {
            expect(showing('snack')).toBeGreaterThanOrEqual(1);
            const reaching = stopped.filter((frame) => frame.racer.props.includes('snack'));
            expect(reaching.every((frame) => frame.racer.stretch)).toBe(true);
          }
          const first = stopped[0]!;
          const last = stopped.at(-1)!;
          expect(last.racer.nose).toBeLessThan(first.racer.nose - 200);
          expect(last.camera).toBeGreaterThan(first.camera + 300);
        });
        And('it waves, says "Phew!", and sets off again further back', () => {
          const frames = during();
          const waving = frames.filter(
            ({ racer }) =>
              racer.stopped && racer.pose === 'wave' && !racer.stretch && racer.bend === 0,
          );
          expect(waving.length).toBeGreaterThan(0);
          const phew = frames.filter((frame) => saying(frame, name, 'Phew!'));
          expect(phew.length * STEP).toBeGreaterThanOrEqual(1);
          const off = frames.find((frame) => frame.since > STOP.off + 0.1)!;
          expect(off.racer.stopped).toBe(false);
          expect(off.racer.gait).toBe('on');
          expect(off.racer.props).toBe('');
          const { at } = watched.plan.events[1]!;
          expect(orderAt(watched.plan, at + STOP.off).indexOf(name)).toBeGreaterThan(
            orderAt(watched.plan, at - 0.01).indexOf(name),
          );
        });
      },
    );

    RuleScenarioOutline('A <thing> bursts ahead', ({ When, Then, And }, { thing, name, burst }) => {
      let watched: Watched;
      When("someone's <thing> bursts ahead", async () => {
        watched = await shared.thing(THING_NAMES[thing]!, name);
      });
      Then(`the caption is "<name>'s <thing> <burst>!"`, () => {
        expect(captions(watched)).toContain(`${name}'s ${thing} ${burst}!`);
        expect(watched.plan.events[0]).toMatchObject({ kind: 'burst', subject: name });
      });
      And('<what>, and it shoots into the lead, shouting "Nooo!"', () => {
        const { at } = watched.plan.events[0]!;
        const during = between(watched, at, at + BURST.seconds).map((frame) => frame.racers[name]!);
        /** How long the burst shows `prop`, in seconds. */
        const showing = (prop: string) =>
          during.filter((racer) => racer.props.split(' ').includes(prop)).length * STEP;
        const props: Partial<Record<Creature, string>> = {
          mug: 'jets',
          printer: 'stream',
          sticky: 'wind',
          banana: 'skid',
          icecream: 'sprinkles',
          sushi: 'belt',
        };
        const prop = props[THING_NAMES[thing]!]!;
        expect(showing(prop), prop).toBeGreaterThanOrEqual(BURST.seconds - 2 * STEP);
        const tilts = during.map((racer) => parseFloat(racer.rotate || '0'));
        // A sticky note flutters both ways; a banana skids, tilted back.
        if (thing === 'sticky note') {
          expect(Math.max(...tilts)).toBeGreaterThan(4);
          expect(Math.min(...tilts)).toBeLessThan(-4);
        }
        if (thing === 'banana') expect(Math.min(...tilts)).toBeLessThan(-6);
        // Gone once the burst is over.
        const after = between(watched, at + BURST.seconds + 0.1, at + BURST.seconds + 0.5);
        for (const frame of after) expect(frame.racers[name]!.props).not.toContain(prop);
        expect(leaderAt(watched.plan, at)).not.toBe(name);
        expect(leaderAt(watched.plan, at + 0.9)).toBe(name);
        const shouting = watched.frames.filter((frame) => saying(frame, name, 'Nooo!'));
        expect(shouting[0]!.time).toBeGreaterThanOrEqual(at);
        expect(shouting[0]!.time).toBeLessThan(at + 0.5);
        expect(shouting.length * STEP).toBeGreaterThanOrEqual(1);
      });
    });

    RuleScenarioOutline('A <thing> stops', ({ When, Then, And }, { thing, name, stop }) => {
      let watched: Watched;
      /** The stopped thing, frame by frame from the stop to the end of the run. */
      const during = () => {
        const { at } = watched.plan.events[1]!;
        return watched.frames
          .filter((frame) => frame.time >= at)
          .map((frame) => ({ ...frame, racer: frame.racers[name]!, since: frame.time - at }));
      };
      When("someone's <thing> stops", async () => {
        watched = await shared.thing(THING_NAMES[thing]!, name);
      });
      Then(`the caption is "<name>'s <thing> <stop>!"`, () => {
        expect(captions(watched)).toContain(`${name}'s ${thing} ${stop}!`);
        expect(watched.plan.events[1]).toMatchObject({ kind: 'stop', subject: name });
      });
      And('<what>, and it drops back while the camera goes on', () => {
        const stopped = during().filter((frame) => frame.racer.stopped);
        expect(stopped.length).toBeGreaterThan(10);
        const before = stopped.filter((frame) => frame.since < STOP.phew);
        /** How long the stop shows `prop`, in seconds. */
        const showing = (prop: string) =>
          stopped.filter((frame) => frame.racer.props.split(' ').includes(prop)).length * STEP;
        /** How long the stop is as `test` says, in seconds. */
        const lasting = (test: (frame: (typeof stopped)[number]) => boolean) =>
          stopped.filter(test).length * STEP;
        switch (THING_NAMES[thing]) {
          case 'mug':
            // Tipped forward to peer inside, and no steam: it's empty.
            expect(lasting((frame) => frame.racer.bend > 20)).toBeGreaterThanOrEqual(1);
            expect(before.every((frame) => frame.racer.empty)).toBe(true);
            break;
          case 'printer': {
            expect(showing('jam')).toBeGreaterThanOrEqual(1);
            const lights = new Set(before.map((frame) => frame.racer.light));
            expect(lights).toEqual(new Set(['on', 'off']));
            expect(stopped.at(-1)!.racer.light).toBe('on');
            break;
          }
          case 'sticky':
            // One foot stuck on the patch, tugging back at it.
            expect(showing('patch')).toBeGreaterThanOrEqual(1);
            expect(Math.min(...before.map((frame) => frame.racer.bend))).toBeLessThan(-8);
            break;
          case 'banana': {
            expect(lasting((frame) => frame.racer.splits > 50)).toBeGreaterThanOrEqual(1);
            expect(Math.min(...before.map((frame) => frame.racer.hop))).toBeLessThan(-15);
            // Back up, with a spring.
            const up = stopped.filter((frame) => frame.since >= STOP.phew);
            expect(up.every((frame) => frame.racer.splits === 0)).toBe(true);
            expect(Math.max(...up.map((frame) => frame.racer.hop))).toBeGreaterThan(8);
            break;
          }
          case 'icecream': {
            expect(showing('drips')).toBeGreaterThanOrEqual(1);
            expect(showing('puddle')).toBeGreaterThanOrEqual(1);
            // It droops, then firms up again.
            const drips = before.map((frame) => frame.racer.drip);
            const peak = drips.indexOf(Math.max(...drips));
            expect(drips[peak]).toBeGreaterThan(0.8);
            expect(drips.at(-1)!).toBeLessThan(drips[peak]! - 0.5);
            break;
          }
          case 'sushi':
            expect(showing('wasabi')).toBeGreaterThanOrEqual(1);
            expect(showing('tears')).toBeGreaterThanOrEqual(1);
            expect(showing('steam')).toBeGreaterThanOrEqual(1);
            break;
          default:
            throw new Error(`No stop for a ${thing}`);
        }
        const first = stopped[0]!;
        const last = stopped.at(-1)!;
        expect(last.racer.nose).toBeLessThan(first.racer.nose - 200);
        expect(last.camera).toBeGreaterThan(first.camera + 300);
      });
      And('it waves, says "Phew!", and sets off again further back', () => {
        const frames = during();
        const waving = frames.filter(
          ({ racer }) => racer.stopped && racer.pose === 'wave' && racer.bend === 0,
        );
        expect(waving.length).toBeGreaterThan(0);
        const phew = frames.filter((frame) => saying(frame, name, 'Phew!'));
        expect(phew.length * STEP).toBeGreaterThanOrEqual(1);
        const off = frames.find((frame) => frame.since > STOP.off + 0.1)!;
        expect(off.racer.stopped).toBe(false);
        expect(off.racer.gait).toBe('on');
        expect(off.racer.props).toBe('');
        expect([off.racer.bend, off.racer.splits, off.racer.drip]).toEqual([0, 0, 0]);
        const { at } = watched.plan.events[1]!;
        expect(orderAt(watched.plan, at + STOP.off).indexOf(name)).toBeGreaterThan(
          orderAt(watched.plan, at - 0.01).indexOf(name),
        );
      });
    });

    RuleScenarioOutline(
      'A new <creature> bursts ahead',
      ({ When, Then, And }, { creature: called, name, burst }) => {
        const kind = NEW_NAMES[called]!;
        let watched: Watched;
        When("someone's <creature> bursts ahead", async () => {
          watched = await shared.thing(kind, name);
        });
        Then(`the caption is "<name>'s <creature> <burst>!"`, () => {
          expect(captions(watched)).toContain(`${name}'s ${called} ${burst}!`);
          expect(watched.plan.events[0]).toMatchObject({ kind: 'burst', subject: name });
        });
        And('<what>, and it shoots into the lead, shouting "Nooo!"', () => {
          const { at } = watched.plan.events[0]!;
          const during = between(watched, at, at + BURST.seconds).map(
            (frame) => frame.racers[name]!,
          );
          /** How long the burst shows `prop`, in seconds. */
          const showing = (prop: string) =>
            during.filter((racer) => racer.props.split(' ').includes(prop)).length * STEP;
          const most = (values: number[]) => Math.max(...values);
          const least = (values: number[]) => Math.min(...values);
          const tilts = during.map((racer) => parseFloat(racer.rotate || '0'));
          const props: Partial<Record<Creature, string>> = {
            cat: 'laser',
            penguin: 'ice',
            pigeon: 'chip',
            ghost: 'fright',
            mummy: 'trail',
            yeti: 'skis',
          };
          const prop = props[kind];
          if (prop) expect(showing(prop), prop).toBeGreaterThanOrEqual(BURST.seconds - 2 * STEP);
          switch (kind) {
            case 'cat':
              // It crouches after the dot.
              expect(most(during.map((racer) => racer.bend))).toBeGreaterThan(8);
              break;
            case 'octopus':
              expect(most(during.map((racer) => racer.whirl))).toBeGreaterThan(15);
              break;
            case 'penguin':
              // Down on its belly, then up again.
              expect(most(tilts)).toBeGreaterThan(60);
              expect(tilts.at(-1)!).toBeLessThan(most(tilts));
              break;
            case 'pigeon':
              // Its head bobs, back and forth.
              expect(most(tilts)).toBeGreaterThan(3);
              expect(least(tilts)).toBeLessThan(-3);
              break;
            case 'ghost':
              // It jumps, and its sheet flaps.
              expect(most(during.map((racer) => racer.hop))).toBeGreaterThan(20);
              expect(most(tilts)).toBeGreaterThan(3);
              expect(least(tilts)).toBeLessThan(-3);
              break;
            case 'gnome':
              // Bent low, in long, low steps.
              expect(least(during.map((racer) => racer.bend))).toBeGreaterThan(10);
              expect(most(during.map((racer) => racer.hop))).toBeGreaterThan(4);
              expect(most(during.map((racer) => racer.hop))).toBeLessThan(10);
              break;
            case 'mummy':
              // Spinning along.
              expect(most(tilts) - least(tilts)).toBeGreaterThan(300);
              break;
            case 'yeti':
              expect(least(during.map((racer) => racer.bend))).toBeGreaterThan(5);
              break;
            default:
              throw new Error(`No burst for a ${called}`);
          }
          // Gone once the burst is over.
          const after = between(watched, at + BURST.seconds + 0.1, at + BURST.seconds + 0.5);
          for (const frame of after) {
            const racer = frame.racers[name]!;
            if (prop) expect(racer.props).not.toContain(prop);
            expect([racer.rotate, racer.whirl, racer.bend]).toEqual(['', 0, 0]);
          }
          expect(leaderAt(watched.plan, at)).not.toBe(name);
          expect(leaderAt(watched.plan, at + 0.9)).toBe(name);
          const shouting = watched.frames.filter((frame) => saying(frame, name, 'Nooo!'));
          expect(shouting[0]!.time).toBeGreaterThanOrEqual(at);
          expect(shouting[0]!.time).toBeLessThan(at + 0.5);
          expect(shouting.length * STEP).toBeGreaterThanOrEqual(1);
        });
      },
    );

    RuleScenarioOutline(
      'A new <creature> stops',
      ({ When, Then, And }, { creature: called, name, stop }) => {
        const kind = NEW_NAMES[called]!;
        let watched: Watched;
        /** The stopped creature, frame by frame from the stop to the end of the run. */
        const during = () => {
          const { at } = watched.plan.events[1]!;
          return watched.frames
            .filter((frame) => frame.time >= at)
            .map((frame) => ({ ...frame, racer: frame.racers[name]!, since: frame.time - at }));
        };
        When("someone's <creature> stops", async () => {
          watched = await shared.thing(kind, name);
        });
        Then(`the caption is "<name>'s <creature> <stop>!"`, () => {
          expect(captions(watched)).toContain(`${name}'s ${called} ${stop}!`);
          expect(watched.plan.events[1]).toMatchObject({ kind: 'stop', subject: name });
        });
        And('<what>, and it drops back while the camera goes on', () => {
          const stopped = during().filter((frame) => frame.racer.stopped);
          expect(stopped.length).toBeGreaterThan(10);
          const before = stopped.filter((frame) => frame.since < STOP.phew);
          /** How long the stop shows `prop`, in seconds. */
          const showing = (prop: string) =>
            stopped.filter((frame) => frame.racer.props.split(' ').includes(prop)).length * STEP;
          /** How long the stop is as `test` says, in seconds. */
          const lasting = (test: (frame: (typeof stopped)[number]) => boolean) =>
            stopped.filter(test).length * STEP;
          const tilts = before.map((frame) => parseFloat(frame.racer.rotate || '0'));
          switch (kind) {
            case 'cat':
              // Sitting in the box, its legs out of sight.
              expect(showing('box')).toBeGreaterThanOrEqual(1);
              expect(lasting((frame) => !frame.racer.legs)).toBeGreaterThanOrEqual(1);
              break;
            case 'octopus': {
              const knotted = stopped.filter((frame) => frame.racer.props.includes('knot'));
              expect(knotted.length * STEP).toBeGreaterThanOrEqual(0.8);
              expect(knotted.every((frame) => !frame.racer.legs)).toBe(true);
              // Then it whirls them free.
              const free = before.filter((frame) => frame.since > knotted.at(-1)!.since);
              expect(Math.max(...free.map((frame) => frame.racer.whirl))).toBeGreaterThan(15);
              break;
            }
            case 'penguin':
              // The fish falls, and it bends down for it.
              expect(showing('fish')).toBeGreaterThanOrEqual(1);
              expect(lasting((frame) => frame.racer.bend > 20)).toBeGreaterThanOrEqual(0.6);
              break;
            case 'pigeon':
              expect(showing('chest')).toBeGreaterThanOrEqual(1);
              expect(Math.max(...tilts)).toBeGreaterThan(3);
              expect(Math.min(...tilts)).toBeLessThan(-3);
              break;
            case 'ghost':
              // Down on its front, and up again by "Phew!".
              expect(showing('hem')).toBeGreaterThanOrEqual(1);
              expect(
                lasting((frame) => parseFloat(frame.racer.rotate || '0') > 45),
              ).toBeGreaterThanOrEqual(0.6);
              expect(tilts.at(-1)!).toBeLessThan(15);
              break;
            case 'gnome': {
              // Up on a plinth, stock-still.
              const statue = stopped.filter((frame) => frame.racer.props.includes('plinth'));
              expect(statue.length * STEP).toBeGreaterThanOrEqual(1);
              for (const { racer } of statue) {
                expect(racer.hop).toBeGreaterThan(15);
                expect([racer.rotate, racer.flail, racer.gait]).toEqual(['', 0, 'off']);
              }
              expect(new Set(statue.map((frame) => frame.racer.hop)).size).toBe(1);
              break;
            }
            case 'mummy':
              // The bandage comes off, then it turns to wind it back on.
              expect(showing('unwrap')).toBeGreaterThanOrEqual(1);
              expect(Math.max(...tilts)).toBeGreaterThan(180);
              break;
            case 'yeti':
              // On its back in the snow, sweeping its arms and legs.
              expect(showing('snow')).toBeGreaterThanOrEqual(1);
              expect(Math.min(...tilts)).toBeLessThan(-80);
              expect(Math.max(...before.map((frame) => frame.racer.sweep))).toBeGreaterThan(20);
              expect(tilts.at(-1)!).toBeGreaterThan(Math.min(...tilts));
              break;
            default:
              throw new Error(`No stop for a ${called}`);
          }
          const first = stopped[0]!;
          const last = stopped.at(-1)!;
          expect(last.racer.nose).toBeLessThan(first.racer.nose - 200);
          expect(last.camera).toBeGreaterThan(first.camera + 300);
        });
        And('it waves, says "Phew!", and sets off again further back', () => {
          const frames = during();
          const waving = frames.filter(
            ({ racer }) =>
              racer.stopped && racer.pose === 'wave' && racer.bend === 0 && racer.rotate === '',
          );
          expect(waving.length).toBeGreaterThan(0);
          const phew = frames.filter((frame) => saying(frame, name, 'Phew!'));
          expect(phew.length * STEP).toBeGreaterThanOrEqual(1);
          const off = frames.find((frame) => frame.since > STOP.off + 0.1)!;
          expect(off.racer.stopped).toBe(false);
          expect(off.racer.gait).toBe('on');
          expect(off.racer.props).toBe('');
          expect(off.racer.legs).toBe(true);
          expect([off.racer.bend, off.racer.hop, off.racer.whirl, off.racer.sweep]).toEqual([
            0, 0, 0, 0,
          ]);
          expect(off.racer.rotate).toBe('');
          const { at } = watched.plan.events[1]!;
          expect(orderAt(watched.plan, at + STOP.off).indexOf(name)).toBeGreaterThan(
            orderAt(watched.plan, at - 0.01).indexOf(name),
          );
        });
      },
    );
  });

  Rule('The final stretch, and a slow last moment', ({ RuleScenario }) => {
    RuleScenario('Full speed to the line', ({ Given, When, Then, And }) => {
      let watched: Watched;
      Given('{int} people', () => undefined);
      When('"Final stretch!" appears', async () => {
        watched = await shared.eight();
        const shown = watched.record.captions.find((each) => each.text === 'Final stretch!')!;
        expect(shown.from).toBeCloseTo(watched.plan.times.stretch, 1);
      });
      Then('the heartbeat starts, and comes quicker and quicker until the line', () => {
        // Sound isn't recorded: play.ts cues a heartbeat at each of these.
        const { heartbeats, times } = watched.plan;
        expect(heartbeats[0]! - times.stretch).toBeCloseTo(0.2, 9);
        expect(heartbeats.at(-1)!).toBeLessThan(times.finish);
        const gaps = heartbeats.slice(1).map((time, i) => time - heartbeats[i]!);
        gaps.slice(1).forEach((gap, i) => expect(gap).toBeLessThanOrEqual(gaps[i]! + 1e-9));
        expect(gaps.at(-1)!).toBeLessThan(gaps[0]!);
      });
      And('the front two or three close up and swap places once', () => {
        const { plan } = watched;
        const { stretch, slow } = plan.times;
        const fronts = watched.frames
          .filter((frame) => frame.time >= stretch && frame.time < slow)
          .map((frame) => orderAt(plan, frame.time).slice(0, 3).join());
        const changes = fronts.filter((front, i) => i > 0 && front !== fronts[i - 1]);
        expect(changes).toHaveLength(1);
        const spread = (t: number) => {
          const noses = orderAt(plan, t).map(
            (name) => watched.frames.find((frame) => frame.time >= t)!.racers[name]!.nose,
          );
          return noses[0]! - noses[2]!;
        };
        expect(spread(stretch + 1.5)).toBeLessThan(spread(stretch) - 40);
      });
      And('the camera keeps its speed, and the finish line comes in from the right', () => {
        const { plan } = watched;
        const { stretch, slow } = plan.times;
        for (let t = stretch; t < slow - 0.1; t += 0.25) {
          expect((cameraAt(plan, t + 0.1) - cameraAt(plan, t)) / 0.1).toBeCloseTo(CAMERA.speed, 5);
        }
        expect(lineAt(plan, stretch)).toBeGreaterThan(1280);
        expect(lineAt(plan, slow)).toBeLessThan(1280);
      });
    });

    RuleScenario('Only the last moment is slow', ({ When, Then, And }) => {
      let watched: Watched;
      When("the front reaches a mount's length from the finish line", async () => {
        watched = await shared.eight();
        const { plan } = watched;
        const leaderNose = (t: number) =>
          watched.frames.find((frame) => frame.time >= t)!.racers[orderAt(plan, t)[0]!]!.nose;
        const gap = lineAt(plan, plan.times.slow) - leaderNose(plan.times.slow);
        expect(gap).toBeGreaterThan(0);
        expect(gap).toBeLessThanOrEqual(1.4 * LENGTH);
      });
      Then(
        'everything slows to a quarter of its speed, the camera, the racers and their gaits, for 1.2 to 1.6 seconds',
        () => {
          const { plan, frames } = watched;
          const slow = frames.filter((frame) => frame.slow);
          const seconds = slow.length * STEP;
          expect(seconds).toBeGreaterThanOrEqual(1.2);
          expect(seconds).toBeLessThanOrEqual(1.6);
          const mid = plan.times.slow + 0.5;
          expect((cameraAt(plan, mid + 0.1) - cameraAt(plan, mid)) / 0.1).toBeCloseTo(
            CAMERA.speed * CAMERA.slow,
            5,
          );
          for (const frame of slow) {
            for (const racer of Object.values(frame.racers)) {
              expect(['slow', 'off']).toContain(racer.gait);
            }
          }
        },
      );
      And('nothing before that is slowed', () => {
        const { plan, frames } = watched;
        const before = frames.filter((frame) => frame.time < plan.times.slow - 1e-6);
        expect(before.every((frame) => !frame.slow)).toBe(true);
        for (const frame of before) {
          for (const racer of Object.values(frame.racers)) expect(racer.gait).not.toBe('slow');
        }
      });
    });
  });

  Rule('The last moment could go three ways', ({ RuleScenario }) => {
    RuleScenario('The ending, over many runs', ({ Given, When, Then }) => {
      let runs: Plan[];
      Given('{int} people', () => undefined);
      When('the show runs with {int} different random seeds', (_, seeds: number) => {
        runs = plans(names(8), names(8).at(-1)!, seeds);
      });
      Then('about half end in a photo finish, and the rest in a late brake or a surge', () => {
        const share = (ending: Ending) => runs.filter((plan) => plan.ending === ending).length;
        expect(share('photo') / runs.length).toBeGreaterThanOrEqual(0.35);
        expect(share('photo') / runs.length).toBeLessThanOrEqual(0.65);
        expect(share('brake')).toBeGreaterThan(0);
        expect(share('surge')).toBeGreaterThan(0);
      });
    });

    RuleScenario('Photo finish', ({ Given, When, Then, And }) => {
      let watched: Watched;
      Given('the unlucky person is {string}, side by side with {string} at the line', async () => {
        watched = await shared.ending('photo', 'Priya');
        expect(orderAt(watched.plan, watched.plan.times.finish).slice(0, 2).sort()).toEqual([
          'Anna',
          'Priya',
        ]);
      });
      When('their noses cross', () => {
        const crossing = crossingOf(watched.plan, 'Anna')!;
        expect(crossing).toBeLessThanOrEqual(watched.plan.times.finish);
        expect(crossingOf(watched.plan, 'Priya')).toBeNull();
      });
      Then(
        'everything freezes, the stage flashes once, and the caption is {string}',
        (_, caption: string) => {
          const { finish, win } = watched.plan.times;
          const frozen = between(watched, finish + STEP, win);
          for (const frame of frozen) {
            expect(frame.camera).toBe(frozen[0]!.camera);
            for (const [name, racer] of Object.entries(frame.racers)) {
              expect(racer.nose).toBe(frozen[0]!.racers[name]!.nose);
              expect(racer.gait).toBe('off');
            }
          }
          const flashes = watched.frames.filter((frame) => frame.flash);
          expect(flashes.length).toBeGreaterThan(0);
          expect(flashes.length * STEP).toBeLessThanOrEqual(0.3 + 1e-9);
          expect(flashes[0]!.time).toBeGreaterThanOrEqual(finish - 1e-9);
          expect(flashes[0]!.time).toBeLessThanOrEqual(finish + STEP + 1e-9);
          expect(shownAt(watched, caption)).toBeCloseTo(finish, 1);
        },
      );
      And("a photo pops up showing the two side-on at the line, Anna's nose over it first", () => {
        const { finish, win } = watched.plan.times;
        const up = watched.frames.filter((frame) => frame.photo);
        expect(up[0]!.time).toBeGreaterThanOrEqual(finish + 0.3 - 1e-9);
        expect(up.at(-1)!.time).toBeLessThan(win);
        expect(up.length * STEP).toBeGreaterThanOrEqual(1.5);
        const lanes = watched.team.filter((name) => name === 'Anna' || name === 'Priya');
        expect(up[0]!.photo!.names).toEqual(lanes);
      });
      And('it says {string}', (_, verdict: string) => {
        expect(watched.frames.find((frame) => frame.photo)!.photo!.verdict).toBe(verdict);
      });
    });

    RuleScenario('Late brake', ({ Given, When, Then, And }) => {
      let watched: Watched;
      Given(
        'the unlucky person is {string}, just behind {string} at the start of the slow moment',
        async () => {
          watched = await shared.ending('brake', 'Ben');
          expect(orderAt(watched.plan, watched.plan.times.slow).slice(0, 2)).toEqual([
            'Ben',
            'Anna',
          ]);
        },
      );
      When('the slow moment starts', () => undefined);
      Then(
        'the caption is {string} and Ben stops short of the line, saying {string}',
        (_, caption: string, phew: string) => {
          const { slow, finish, win } = watched.plan.times;
          expect(shownAt(watched, caption)).toBeCloseTo(slow, 1);
          expect(crossingOf(watched.plan, 'Ben')).toBeNull();
          const ben = between(watched, slow, win).map((frame) => frame.racers.Ben!.nose);
          expect(ben.at(-1)!).toBeLessThan(ben[0]! - 60);
          expect(between(watched, slow + 0.5, finish).every((f) => saying(f, 'Ben', phew))).toBe(
            true,
          );
        },
      );
      And('the caption is {string} as Anna sails past him and over the line', (_, text: string) => {
        const { slow, finish } = watched.plan.times;
        const shown = shownAt(watched, text)!;
        expect(shown).toBeGreaterThan(slow);
        expect(shown).toBeLessThan(finish);
        expect(orderAt(watched.plan, finish)[0]).toBe('Anna');
        expect(crossingOf(watched.plan, 'Anna')!).toBeLessThanOrEqual(finish);
      });
    });

    RuleScenario('Surge', ({ Given, When, Then, And }) => {
      let watched: Watched;
      Given(
        'the unlucky person is {string}, third behind two others at the start of the slow moment',
        async () => {
          watched = await shared.ending('surge');
          expect(orderAt(watched.plan, watched.plan.times.slow).indexOf('Anna')).toBe(2);
        },
      );
      When('the slow moment starts', () => undefined);
      Then(
        "the caption is Anna's mount bursting ahead, as in an event, and she shouts {string}",
        (_, shout: string) => {
          const { slow, finish } = watched.plan.times;
          const surge = { kind: 'burst', subject: 'Anna', cause: 'racer', at: slow } as const;
          const said = eventCaption(surge, kindOf(watched, 'Anna'));
          const shown = watched.record.captions.find((each) => each.text === said)!;
          expect(shown.from).toBeCloseTo(slow, 1);
          expect(between(watched, slow + 0.2, finish).every((f) => saying(f, 'Anna', shout))).toBe(
            true,
          );
        },
      );
      And('she passes both and crosses first', () => {
        const { slow, finish } = watched.plan.times;
        const [first, second] = orderAt(watched.plan, slow);
        const crossing = crossingOf(watched.plan, 'Anna')!;
        expect(crossing).toBeLessThanOrEqual(finish);
        expect(orderAt(watched.plan, crossing).indexOf('Anna')).toBe(0);
        for (const passed of [first!, second!]) {
          const theirs = crossingOf(watched.plan, passed);
          if (theirs !== null) expect(theirs).toBeGreaterThan(crossing);
        }
      });
    });
  });

  Rule('The winner gets the trophy', ({ RuleScenario }) => {
    RuleScenario('The win', ({ Given, When, Then, And }) => {
      let watched: Watched;
      Given('the unlucky person is {string}', async () => {
        watched = await shared.ending('photo', 'Priya');
      });
      When('she has crossed the line', () => undefined);
      Then('the caption is {string}, with a fanfare and confetti', (_, caption: string) => {
        const { win } = watched.plan.times;
        expect(watched.record.captions.at(-1)).toMatchObject({ text: caption });
        expect(watched.record.captions.at(-1)!.from).toBeCloseTo(win, 1);
        // Sound isn't recorded: play.ts cues the fanfare as the caption comes.
        expect(between(watched, win + 0.5, Infinity).every((f) => f.confetti > 20)).toBe(true);
        expect(between(watched, 0, win).every((f) => f.confetti === 0)).toBe(true);
      });
      And('Anna holds a trophy over her head, in the party mood', () => {
        for (const frame of between(watched, watched.plan.times.win + STEP, Infinity)) {
          expect(frame.racers.Anna).toMatchObject({ trophy: true, mood: 'party', pose: 'party' });
        }
      });
      And('everyone else celebrates', () => {
        const last = watched.frames.at(-1)!;
        for (const [name, racer] of Object.entries(last.racers)) {
          if (name === 'Anna') continue;
          expect(racer.trophy).toBe(false);
          expect(racer.mood === 'party' || (racer.mood === 'happy' && racer.pose === 'wave')).toBe(
            true,
          );
        }
      });
    });

    RuleScenario('A creature wins', ({ Given, When, Then, And }) => {
      let watched: Watched;
      Given('the unlucky person is {string}, racing as the dinosaur', async (_, name: string) => {
        watched = await shared.dinosaurWins();
        expect(watched.unlucky).toBe(name);
        expect(watched.looks.get(name)!.mount).toBe('dinosaur');
      });
      When('Dario has crossed the line', () => {
        expect(crossingOf(watched.plan, 'Dario')!).toBeLessThanOrEqual(watched.plan.times.finish);
      });
      Then('the caption is {string}, with a fanfare and confetti', (_, caption: string) => {
        const { win } = watched.plan.times;
        expect(watched.record.captions.at(-1)).toMatchObject({ text: caption });
        expect(watched.record.captions.at(-1)!.from).toBeCloseTo(win, 1);
        expect(between(watched, win + 0.5, Infinity).every((f) => f.confetti > 20)).toBe(true);
      });
      And(
        'the dinosaur balances the trophy on its head, waving its tiny arms, in the party mood',
        () => {
          const after = between(watched, watched.plan.times.win + STEP, Infinity);
          for (const frame of after) {
            expect(frame.racers.Dario).toMatchObject({
              trophy: true,
              mood: 'party',
              pose: 'party',
            });
          }
          expect(new Set(after.map((frame) => Math.sign(frame.racers.Dario!.flail)))).toEqual(
            new Set([-1, 0, 1]),
          );
          // The trophy's base sits on the top of its head, at y 22.
          const [, top] = CREATURE_SPEC.dinosaur.cup;
          expect(Math.abs(top + 57 - 22)).toBeLessThanOrEqual(4);
        },
      );
      And('a shark balances it on its fin, and every other creature holds it over its head', () => {
        const face = handOutLooks(['Dario'], createRandom(1)).get('Dario')!;
        for (const kind of CREATURES) {
          const one = creature({ mount: kind, colour: 'sun', extra: 'scarf' }, { face, number: 1 });
          one.setMood('party');
          one.setPose('party');
          one.setTrophy(true);
          const [x, y] = CREATURE_SPEC[kind].cup;
          if (kind === 'shark') {
            // Its base on the fin, which rises from (104, 46) to its tip at (92, 2).
            expect(x).toBeGreaterThan(92);
            expect(x).toBeLessThan(138);
            expect(y + 57).toBeGreaterThan(2);
            expect(y + 57).toBeLessThan(46);
          } else if (!['dinosaur', 'pigeon', 'gnome'].includes(kind)) {
            // "A pigeon or a gnome wins" says where theirs goes.
            expect(handsOf(one), kind).toEqual([
              [x - 22, y + 30],
              [x + 22, y + 30],
            ]);
          }
        }
      });
    });

    /** Where a creature's hands are, or its fins' tips. */
    const handsOf = (one: ReturnType<typeof creature>) =>
      CREATURE_SPEC[one.look.mount].fins
        ? [...one.el.querySelectorAll('[data-part$="-arm"] > path:first-child')].map(
            // A leaf: M root Q bulge tip Q bulge root Z.
            (leaf) =>
              leaf
                .getAttribute('d')!
                .match(/-?[\d.]+/g)!
                .slice(4, 6)
                .map(Number),
          )
        : [...one.el.querySelectorAll('[data-part="hand"]')].map((hand) => [
            Number(hand.getAttribute('cx')),
            Number(hand.getAttribute('cy')),
          ]);

    RuleScenario('A pigeon or a gnome wins', ({ When, Then, And }) => {
      const face = handOutLooks(['Anna'], createRandom(1)).get('Anna')!;
      /** `kind` as it is once it has crossed the line first. */
      const winning = (kind: Creature) => {
        const one = creature({ mount: kind, colour: 'sun', extra: 'scarf' }, { face, number: 1 });
        one.setMood('party');
        one.setPose('party');
        one.setTrophy(true);
        expect(one.el.dataset).toMatchObject({ trophy: 'true', mood: 'party' });
        return one;
      };
      /** The trophy's base, 57 below its top. */
      const base = (kind: Creature) => CREATURE_SPEC[kind].cup[1] + 57;
      When('a pigeon or a garden gnome has crossed the line first', () => {
        expect(CREATURE_SPEC.pigeon.reach).toBeLessThan(1);
        expect(CREATURE_SPEC.gnome.reach).toBeLessThan(1);
      });
      Then(
        'the pigeon balances the trophy on its head, and the gnome on the tip of its hat',
        () => {
          // The pigeon's head is a circle round (162, 46) of radius 26; the gnome's hat peaks near (130, -26).
          expect(CREATURE_SPEC.pigeon.cup[0]).toBe(162);
          expect(Math.abs(base('pigeon') - (46 - 26))).toBeLessThanOrEqual(4);
          expect(CREATURE_SPEC.gnome.cup[0]).toBe(130);
          expect(Math.abs(base('gnome') - -26)).toBeLessThanOrEqual(4);
          // Their short wings and arms wave below it.
          for (const kind of ['pigeon', 'gnome'] as const) {
            for (const [, hy] of handsOf(winning(kind))) {
              expect(hy! - CREATURE_SPEC[kind].cup[1], kind).toBeGreaterThan(40);
            }
          }
        },
      );
      And(
        'the penguin holds it up in its flippers, and every other new creature over its head',
        () => {
          for (const kind of Object.values(NEW_NAMES)) {
            if (kind === 'pigeon' || kind === 'gnome') continue;
            const [x, y] = CREATURE_SPEC[kind].cup;
            expect(handsOf(winning(kind)), kind).toEqual([
              [x - 22, y + 30],
              [x + 22, y + 30],
            ]);
          }
        },
      );
    });

    RuleScenario('The name holds still at the end', ({ Given, When, Then }) => {
      let watched: Watched;
      Given('the unlucky person is {string}', () => undefined);
      When('the show runs', async () => {
        watched = await shared.ending('brake', 'Ben');
      });
      Then(
        '{string} is on stage, not moving, for the last {number} seconds',
        (_, name: string, seconds: number) => {
          const last = between(watched, watched.record.duration - seconds, Infinity);
          expect(last.length * STEP).toBeGreaterThanOrEqual(seconds - STEP);
          for (const frame of last) {
            const racer = frame.racers[name]!;
            expect(racer.nose).toBe(last[0]!.racers[name]!.nose);
            expect(racer.gait).toBe('off');
            expect(racer.rotate).toBe('');
            expect(racer.scale).toBe('');
          }
        },
      );
    });
  });

  Rule('Its music follows the race', ({ RuleScenario }) => {
    /** A show second just before `time`. */
    const before = (time: number) => time - 1e-6;
    let heard: Promise<Heard> | undefined;
    /** One run at 8 people, Anna unlucky, shared by the scenarios that watch the show. */
    const heardRace = () => (heard ??= listen(names(8), 'Anna'));
    const lead = (notes: readonly Note[]) => notes.filter((note) => note.voice === 'lead');

    RuleScenario('A drum roll, then the galop from "Go!"', ({ When, Then, And }) => {
      let race: Heard;
      When('the show runs with music on', async () => {
        race = await heardRace();
        expect(race.record.outcome).toBe('finished');
      });
      Then(
        `a snare roll swells under "On your marks…" and leads into the galop's first bar on "Go!"`,
        () => {
          const { times } = race.plan;
          const roll = race.notes.filter((note) => note.at < -1);
          expect(roll.length).toBeGreaterThan(8);
          expect(new Set(roll.map((note) => note.voice))).toEqual(new Set(['snare']));
          roll.forEach((note, i) => {
            if (i > 0) expect(note.level!).toBeGreaterThan(roll[i - 1]!.level!);
          });
          // The roll, then a pickup into the first bar, all under "On your marks…".
          const marks = race.record.captions.find((each) => each.text === 'On your marks…')!;
          const [first] = race.moves;
          expect(first!.time).toBeLessThanOrEqual(marks.to);
          expect(first!.beat).toBeLessThanOrEqual(roll[0]!.at);
          expect(lead(race.notes.filter((note) => note.at < 0)).map((note) => note.at)).toEqual([
            -1, -0.5,
          ]);
          // On "Go!" the song is at the first bar's first beat.
          const go = race.record.captions.find((each) => each.text === 'Go!')!;
          expect(go.from).toBeCloseTo(times.go, 1);
          expect(raceMusic(race.plan).at(times.go).beat).toBeCloseTo(0, 9);
          expect(race.notes.filter((note) => note.at === 0).map((note) => note.voice)).toEqual(
            expect.arrayContaining(['lead', 'bass', 'kick']),
          );
        },
      );
      And(
        'the galop plays at 4.2 to 4.6 beats a second, 4 beats a bar, until "Final stretch!"',
        () => {
          const [least, most, bar] = [4.2, 4.6, 4];
          const { times } = race.plan;
          const stretchAt = raceMusic(race.plan).at(times.stretch).beat;
          const galop = race.moves.filter((move) => move.beat > 0 && move.beat < stretchAt - 1);
          expect(galop.length).toBeGreaterThan(100);
          const { speed } = galop[0]!;
          for (const move of galop) expect(move.speed).toBe(speed);
          expect(speed).toBeGreaterThanOrEqual(least);
          expect(speed).toBeLessThanOrEqual(most);
          // Bass and kicks on a bar's first and third beats, snares on the others.
          const inGalop = race.notes.filter((note) => note.at >= 0 && note.at < stretchAt);
          const beatsOf = (voice: string) =>
            new Set(inGalop.filter((note) => note.voice === voice).map((note) => note.at % bar));
          expect(beatsOf('bass')).toEqual(new Set([0, 2]));
          expect(beatsOf('kick')).toEqual(new Set([0, 2]));
          expect(beatsOf('snare')).toEqual(new Set([1, 3]));
          // The galop's tune stops at the stretch.
          const tune = lead(inGalop);
          expect(Math.max(...tune.map((note) => note.at + note.beats))).toBeLessThanOrEqual(
            stretchAt,
          );
        },
      );
    });

    RuleScenario('The final stretch starts on a bar', ({ When, Then }) => {
      let runs: Plan[];
      When('the show runs at every head count from 2 to 8, with each ending', () => {
        runs = Array.from({ length: 7 }, (_, i) => plansByEnding(i + 2)).flat();
      });
      Then('"Final stretch!" comes on the first beat of a bar', () => {
        for (const plan of runs) {
          // The galop itself gets there: it is fitted to whole bars.
          const { beat } = raceMusic(plan).at(before(plan.times.stretch));
          const label = `${plan.setOff.length} people, ${plan.ending}`;
          expect(beat / 4 - Math.round(beat / 4), label).toBeCloseTo(0, 4);
          expect(beat, label).toBeGreaterThan(4);
        }
      });
    });

    RuleScenario(
      'The final stretch is faster, and leaves the low end to the heartbeat',
      ({ When, Then, And }) => {
        let runs: Plan[];
        When('"Final stretch!" appears', () => {
          runs = [2, 5, 8].flatMap(plansByEnding);
        });
        Then("the galop's minor strain plays, four bars in the stretch's time", () => {
          for (const plan of runs) {
            const { times } = plan;
            const score = raceMusic(plan);
            const start = score.at(times.stretch);
            expect(start.speed).toBeGreaterThan(score.at(times.go).speed);
            // Four bars, from "Final stretch!" to the slow moment.
            expect(score.at(before(times.slow)).beat - start.beat).toBeCloseTo(16, 4);
            const strain = score.notes.filter(
              (note) => note.at >= start.beat && note.at < start.beat + 16,
            );
            // In A minor: its bass on A and E, its tune ending on A.
            const bass = strain.filter((note) => note.voice === 'bass').map((note) => note.pitch);
            expect(new Set(bass)).toEqual(new Set([pitchOf('A2'), pitchOf('E3')]));
            expect(lead(strain).at(-1)!.pitch).toBe(pitchOf('A4'));
          }
        });
        And('no kick drum plays until the line', () => {
          for (const plan of runs) {
            const score = raceMusic(plan);
            const stretchAt = score.at(plan.times.stretch).beat;
            const kicks = score.notes.filter(
              (note) => note.voice === 'kick' && note.at >= stretchAt,
            );
            expect(kicks).toEqual([]);
          }
        });
      },
    );

    RuleScenario('The slow last moment slows the music too', ({ When, Then }) => {
      let runs: Plan[];
      When('the slow moment starts', () => {
        runs = Array.from({ length: 7 }, (_, i) => plansByEnding(i + 2)).flat();
      });
      Then(
        "the music plays a run down, an octave lower, at a quarter of the stretch's speed, until the line",
        () => {
          for (const plan of runs) {
            const { times } = plan;
            const score = raceMusic(plan);
            const slow = score.at(times.slow);
            const label = `${plan.setOff.length} people, ${plan.ending}`;
            expect(slow.speed / score.at(times.stretch).speed, label).toBeCloseTo(0.25, 2);
            const run = lead(score.notes.filter((note) => note.at >= slow.beat));
            const pitches = run.map((note) => note.pitch!);
            pitches.forEach((pitch, i) => i > 0 && expect(pitch).toBeLessThan(pitches[i - 1]!));
            // The galop's own run down, an octave up.
            const galop = lead(score.notes.filter((note) => note.at < slow.beat))
              .map((note) => note.pitch!)
              .join(' ');
            expect(galop).toContain(pitches.map((pitch) => pitch + 12).join(' '));
            // Its last note ends at the line.
            const end = Math.max(...run.map((note) => note.at + note.beats));
            expect(score.at(before(times.finish)).beat, label).toBeCloseTo(end, 4);
          }
        },
      );
    });

    RuleScenario('Silence from the line to the fanfare', ({ Given, When, Then, And }) => {
      let race: Heard;
      Given('the unlucky person is {string}', async (_, name: string) => {
        race = await heardRace();
        expect(race.record.captions.at(-1)!.text).toBe(`${name} wins!`);
      });
      When('the slow last moment ends at the line', () => {
        expect(race.moves.at(-1)!.time).toBeGreaterThan(race.plan.times.finish);
      });
      Then('the music stops', () => {
        const { times } = race.plan;
        const atLine = raceMusic(race.plan).at(before(times.finish)).beat;
        const last = Math.max(...race.notes.map((note) => note.at + note.beats));
        expect(last).toBeLessThanOrEqual(atLine + 1e-4);
        const atTheLine = race.moves.filter((move) => move.beat >= atLine - 1e-6);
        expect(atTheLine.length).toBeGreaterThan(30);
        for (const move of atTheLine) expect(move.speed).toBe(0);
      });
      And('the fanfare plays with {string}, as before', (_, text: string) => {
        const win = race.record.captions.find((each) => each.text === text)!;
        const fanfare = race.cues.find((each) => each.cue === 'fanfare')!;
        expect(fanfare.time).toBe(win.from);
        expect(win.from).toBeGreaterThan(race.plan.times.finish);
      });
    });
  });

  Rule('It reads without sound', ({ RuleScenario }) => {
    RuleScenario('Captions tell the race, a thing at a time', ({ Given, When, Then }) => {
      let watched: Watched;
      Given(
        "{int} people, the unlucky person is {string}, Ben's snail and Carla's duck burst ahead, Carla's duck stops, and it ends in a photo finish",
        () => undefined,
      );
      When('the show runs', async () => {
        watched = await shared.story();
      });
      Then('the captions include, in this order:', (_, table: { caption: string }[]) => {
        const said = captions(watched);
        let from = 0;
        for (const { caption } of table) {
          const at = said.indexOf(caption, from);
          expect(at, caption).toBeGreaterThanOrEqual(from);
          from = at + 1;
        }
      });
    });

    RuleScenario('Each caption stays up long enough to read', ({ When, Then }) => {
      let runs: Watched[];
      When('the show runs', async () => {
        runs = [await shared.eight(), await shared.story(), await shared.ending('brake', 'Ben')];
      });
      Then('every caption stays on screen for at least 1 second', () => {
        for (const { record } of runs) {
          for (const { text, from, to } of record.captions) {
            expect(to - from, text).toBeGreaterThanOrEqual(1 - 1e-9);
          }
        }
      });
    });

    RuleScenario('Racers are drawn as big as the lanes allow', ({ When, Then, And }) => {
      const heads = (count: number) =>
        Array.from({ length: count }, (_, i) => RIDER.size * lane(i, count).k);
      let eight: Watched;
      When('the show runs at 8 and at 4 people', async () => {
        eight = await shared.eight();
      });
      Then(
        'at 8 people, heads are {int} pixels or more and name tags {int} pixels or more, on the 1280 by 720 stage',
        (_, head: number, tag: number) => {
          expect(Math.min(...heads(8))).toBeGreaterThanOrEqual(head);
          for (const frame of eight.frames) {
            expect(Object.keys(frame.tagSizes)).toHaveLength(8);
            for (const size of Object.values(frame.tagSizes)) {
              expect(size).toBeGreaterThanOrEqual(tag);
            }
          }
        },
      );
      And('at 4 people, heads are {int} pixels or more', (_, head: number) => {
        expect(Math.min(...heads(4))).toBeGreaterThanOrEqual(head);
      });
      And("every rider's head sits at the same height in its lane, whatever the mount", () => {
        for (const count of [2, 4, 8]) {
          for (let i = 0; i < count; i++) {
            const tops = MOUNTS.map((mount) => faceAt(mount, lane(i, count), 900).top);
            expect(new Set(tops).size).toBe(1);
          }
        }
      });
    });

    RuleScenario('Name tags sit beside the face', ({ When, Then, And }) => {
      let runs: Watched[];
      /** Each racer's face and tag in each frame. */
      const boxes = (watched: Watched, frame: Frame) =>
        watched.team.map((name, i) => {
          const at = lane(i, watched.team.length);
          const mount = (watched.looks.get(name)!.mount ?? 'snail') as Mount;
          const { nose, lift } = frame.racers[name]!;
          return {
            name,
            face: raised(faceAt(mount, at, nose), lift),
            tag: raised(tagBox(name, mount, at, nose), lift),
          };
        });
      When('the show runs at 8, at 4 and at 2 people, a 15-character name among them', async () => {
        runs = await Promise.all([8, 4, 2].map((count) => shared.long(count)));
        for (const { team } of runs) expect(team).toContain('Annamaria Rossi');
      });
      Then(
        "each name tag sits beside its rider's face, behind it, level with it, and moves with them",
        () => {
          for (const watched of runs) {
            for (const frame of watched.frames) {
              for (const { face, tag } of boxes(watched, frame)) {
                expect(tag.right).toBeLessThanOrEqual(face.left);
                expect(face.left - tag.right).toBeLessThan(6);
                const middle = (tag.top + tag.bottom) / 2;
                expect(middle).toBeGreaterThan(face.top);
                expect(middle).toBeLessThan(face.bottom);
              }
            }
          }
        },
      );
      And('no name tag is ever over another, or over a face', () => {
        for (const watched of runs) {
          for (const frame of watched.frames) {
            const drawn = boxes(watched, frame);
            for (const one of drawn) {
              for (const other of drawn) {
                if (one !== other) expect(overlap(one.tag, other.tag), `${frame.time}`).toBe(false);
                expect(overlap(one.tag, other.face), `${one.name}, ${other.name}`).toBe(false);
              }
            }
          }
        }
      });
      And('no speech bubble covers a name tag or a face', () => {
        let bubbles = 0;
        for (const watched of runs) {
          for (const frame of watched.frames) {
            const drawn = boxes(watched, frame);
            for (const said of frame.says) {
              bubbles++;
              const box = speechBox(said.text, said);
              for (const { name, face, tag } of drawn) {
                expect(overlap(box, face), `${said.text} on ${name}'s face`).toBe(false);
                expect(overlap(box, tag), `${said.text} on ${name}'s tag`).toBe(false);
              }
            }
          }
        }
        expect(bubbles).toBeGreaterThan(0);
      });
      And('each speech bubble sits by its speaker, touching their face or name tag', () => {
        // Touching: within the gap a bubble keeps from what it sits by.
        const touching = (one: Box, two: Box) =>
          overlap(one, {
            left: two.left - 16,
            right: two.right + 16,
            top: two.top - 16,
            bottom: two.bottom + 16,
          });
        for (const watched of runs) {
          for (const frame of watched.frames) {
            const drawn = boxes(watched, frame);
            for (const said of frame.says) {
              const box = speechBox(said.text, said);
              const { face, tag } = drawn.find(({ name }) => name === said.person)!;
              expect(
                touching(box, face) || touching(box, tag),
                `${said.person}: ${said.text}`,
              ).toBe(true);
            }
          }
        }
      });
    });

    RuleScenario('Everyone stays on stage', ({ When, Then }) => {
      let watched: Watched;
      When('the show runs at {int} people', async () => {
        watched = await shared.long(8);
      });
      Then('every racer is on stage from "On your marks…" to the end', () => {
        for (const frame of watched.frames) {
          watched.team.forEach((name, i) => {
            const at = lane(i, 8);
            const mount = watched.looks.get(name)!.mount as Mount;
            const nose = frame.racers[name]!.nose;
            expect(tagBox(name, mount, at, nose).left).toBeGreaterThanOrEqual(0);
            expect(nose).toBeLessThanOrEqual(1280);
          });
        }
      });
    });

    RuleScenario('Riders and creatures side by side', ({ When, Then, And }) => {
      let runs: Watched[];
      const KINDS: readonly Kind[] = [...MOUNTS, ...CREATURES];
      /** Each racer's face and tag in each frame. */
      const boxes = (watched: Watched, frame: Frame) =>
        watched.team.map((name, i) => {
          const at = lane(i, watched.team.length);
          const kind = kindOf(watched, name);
          const { nose, lift } = frame.racers[name]!;
          return {
            name,
            face: raised(faceAt(kind, at, nose), lift),
            tag: raised(tagBox(name, kind, at, nose), lift),
          };
        });
      When(
        'the show runs at 8 and at 2 people, riders and creatures mixed, a 15-character name among them',
        async () => {
          runs = await Promise.all([8, 2].map((count) => shared.mixed(count)));
          for (const watched of runs) {
            expect(watched.team).toContain('Annamaria Rossi');
            const kinds = watched.team.map((name) => isCreature(kindOf(watched, name)));
            expect(new Set(kinds)).toEqual(new Set([true, false]));
          }
        },
      );
      Then("every face, a rider's or a creature's, sits at the same height in its lane", () => {
        for (const count of [2, 4, 8]) {
          for (let i = 0; i < count; i++) {
            const tops = KINDS.map((kind) => faceAt(kind, lane(i, count), 900).top);
            expect(new Set(tops).size).toBe(1);
          }
        }
      });
      And("at 8 people, every creature's face is {int} pixels or more across", (_, px: number) => {
        for (let i = 0; i < 8; i++) {
          for (const kind of CREATURES) {
            const face = faceAt(kind, lane(i, 8), 900);
            expect(face.right - face.left).toBeGreaterThanOrEqual(px);
            // The box is round the creature's own face: its eyes are in it.
            const k = lane(i, 8).k;
            const left = 900 - CREATURE_SPEC[kind].nose * k;
            for (const [x] of CREATURE_SPEC[kind].eyes) {
              expect(left + x * k).toBeGreaterThan(face.left);
              expect(left + x * k).toBeLessThan(face.right);
            }
          }
        }
      });
      And(
        "each name tag sits beside its racer's face, behind it, level with it, and moves with it",
        () => {
          for (const watched of runs) {
            for (const frame of watched.frames) {
              for (const { face, tag } of boxes(watched, frame)) {
                expect(tag.right).toBeLessThanOrEqual(face.left);
                expect(face.left - tag.right).toBeLessThan(6);
                const middle = (tag.top + tag.bottom) / 2;
                expect(middle).toBeGreaterThan(face.top);
                expect(middle).toBeLessThan(face.bottom);
              }
            }
          }
        },
      );
      And('no name tag is ever over another, or over a face', () => {
        for (const watched of runs) {
          for (const frame of watched.frames) {
            const drawn = boxes(watched, frame);
            for (const one of drawn) {
              for (const other of drawn) {
                if (one !== other) expect(overlap(one.tag, other.tag), `${frame.time}`).toBe(false);
                expect(overlap(one.tag, other.face), `${one.name}, ${other.name}`).toBe(false);
              }
            }
          }
        }
      });
    });
  });

  Rule('Reduced motion keeps the story', ({ RuleScenario }) => {
    RuleScenario('With reduced motion, nothing shakes', ({ Given, When, Then, And }) => {
      let still: Watched;
      let chairs: Watched;
      Given('reduced motion is on', () => undefined);
      When('the show runs', async () => {
        still = await shared.story(true);
        chairs = await shared.mount('chair', 'Marco', true);
      });
      Then("there are no speed lines, the duck doesn't tip and the chair doesn't spin", () => {
        for (const frame of [...still.frames, ...chairs.frames]) {
          expect(frame.speedLines).toBe(0);
          for (const racer of Object.values(frame.racers)) {
            expect(racer.rotate).toBe('');
            expect(racer.scale).toBe('');
          }
        }
        // Both stops still happen: the duck's and the chair's.
        expect(still.frames.some((frame) => frame.racers.Carla!.stopped)).toBe(true);
        expect(chairs.frames.some((frame) => frame.racers.Marco!.stopped)).toBe(true);
      });
      And(
        'the slow last moment, the photo and every caption still come, in the same order',
        async () => {
          const moving = await shared.story();
          expect(moving.frames.some((frame) => frame.speedLines > 0)).toBe(true);
          expect(captions(still)).toEqual(captions(moving));
          expect(still.frames.filter((frame) => frame.slow).length).toBe(
            moving.frames.filter((frame) => frame.slow).length,
          );
          expect(still.frames.some((frame) => frame.photo)).toBe(true);
        },
      );
    });

    RuleScenario('With reduced motion, the new rides keep still too', ({ Given, When, Then }) => {
      let rockets: Watched;
      let hoppers: Watched;
      Given('reduced motion is on', () => undefined);
      When('the show runs', async () => {
        rockets = await shared.mount('rocket', 'Carla', true);
        hoppers = await shared.mount('hopper', 'Anna', true);
      });
      Then(
        "the rocket's flame doesn't flicker, and a hopper that stops doesn't bounce on the spot",
        async () => {
          const flames = rockets.frames.flatMap((frame) =>
            Object.values(frame.racers).map((racer) => racer.flame),
          );
          expect(new Set(flames)).toEqual(new Set([1, 2, 'out']));
          const moving = await shared.mount('rocket', 'Carla');
          expect(
            moving.frames.some((frame) =>
              Object.values(frame.racers).some(
                (racer) =>
                  typeof racer.flame === 'number' && racer.flame !== 1 && racer.flame !== 2,
              ),
            ),
          ).toBe(true);
          for (const frame of hoppers.frames) {
            for (const racer of Object.values(frame.racers)) expect(racer.hop).toBe(0);
          }
          // The stop still happens.
          expect(hoppers.frames.some((frame) => frame.racers.Anna!.stopped)).toBe(true);
        },
      );
    });

    RuleScenario('With reduced motion, the creatures keep still too', ({ Given, When, Then }) => {
      let monsters: Watched;
      let villains: Watched;
      Given('reduced motion is on', () => undefined);
      When('the show runs', async () => {
        monsters = await shared.mount('monster', 'Marco', true);
        villains = await shared.mount('villain', 'Hana', true);
      });
      Then(
        "the monster doesn't hop with its hiccups, and the villain doesn't turn in its cape",
        () => {
          for (const frame of [...monsters.frames, ...villains.frames]) {
            for (const racer of Object.values(frame.racers)) {
              expect(racer.hop).toBe(0);
              expect(racer.scale).toBe('');
              expect(racer.flail).toBe(0);
            }
          }
          // The hiccups and the cape still come.
          expect(monsters.frames.some((frame) => saying(frame, 'Marco', 'Hic!'))).toBe(true);
          expect(villains.frames.some((frame) => frame.racers.Hana!.props === 'wrap')).toBe(true);
        },
      );
    });

    RuleScenario(
      'With reduced motion, the things on legs keep still too',
      ({ Given, When, Then }) => {
        const watched: Record<string, Watched> = {};
        Given('reduced motion is on', () => undefined);
        When('the show runs', async () => {
          for (const [name, thing] of [
            ['Carla', 'printer'],
            ['Dario', 'sticky'],
            ['Femi', 'icecream'],
          ] as const) {
            watched[name] = await shared.thing(thing, name, true);
          }
        });
        Then(
          "the printer's light doesn't blink, the sticky note doesn't flutter and the ice cream doesn't drip",
          () => {
            const seen = (name: string) =>
              watched[name]!.frames.map((frame) => frame.racers[name]!);
            const props = (name: string) =>
              new Set(seen(name).flatMap((racer) => racer.props.split(' ')));
            for (const racer of seen('Carla')) expect(racer.light).toBe('on');
            for (const racer of seen('Dario')) expect(racer.rotate).toBe('');
            for (const racer of seen('Femi')) expect(racer.drip).toBe(0);
            // Each still happens: the jam, the wind, the puddle without drips.
            expect(props('Carla')).toContain('jam');
            expect(props('Dario')).toContain('wind');
            expect(props('Femi')).toContain('puddle');
            expect(props('Femi')).not.toContain('drips');
          },
        );
      },
    );

    RuleScenario(
      'With reduced motion, the new animals and spooky creatures keep still too',
      ({ Given, When, Then }) => {
        const watched: Record<string, Watched> = {};
        Given('reduced motion is on', () => undefined);
        When('the show runs', async () => {
          for (const [name, kind] of [
            ['Ivo', 'octopus'],
            ['Priya', 'ghost'],
            ['Carla', 'yeti'],
          ] as const) {
            watched[name] = await shared.thing(kind, name, true);
          }
        });
        Then(
          "the octopus's legs don't whirl, the ghost doesn't jump and the yeti doesn't sweep its arms",
          () => {
            const seen = (name: string) =>
              watched[name]!.frames.map((frame) => frame.racers[name]!);
            const props = (name: string) =>
              new Set(seen(name).flatMap((racer) => racer.props.split(' ')));
            for (const racer of seen('Ivo')) expect(racer.whirl).toBe(0);
            for (const racer of seen('Priya')) expect([racer.hop, racer.rotate]).toEqual([0, '']);
            for (const racer of seen('Carla')) expect([racer.sweep, racer.rotate]).toEqual([0, '']);
            // Each still happens: the knot, the fright, the snow.
            expect(props('Ivo')).toContain('knot');
            expect(props('Priya')).toContain('fright');
            expect(props('Carla')).toContain('snow');
          },
        );
      },
    );
  });

  Rule('The beats keep every show inside the limit', ({ RuleScenario }) => {
    /** For each ending, the first of seeds 1–40 whose plan ends that way. */
    const byEnding = (count: number) =>
      ENDINGS.map((ending) => {
        const team = names(count);
        const plan = plans(team, team.at(-1)!, 40).find((each) => each.ending === ending);
        if (!plan) throw new Error(`No ${ending} with ${count} people.`);
        return plan;
      });

    RuleScenario('About 20 to 22 seconds at 8 people', ({ Given, When, Then }) => {
      let runs: Plan[];
      Given('{int} people', () => undefined);
      When('the show runs with each ending', () => {
        runs = byEnding(8);
      });
      Then('each run lasts between {int} and {int} seconds', (_, least: number, most: number) => {
        for (const plan of runs) {
          expect(plan.times.end, plan.ending).toBeGreaterThanOrEqual(least);
          expect(plan.times.end, plan.ending).toBeLessThanOrEqual(most);
        }
      });
    });

    RuleScenario('Every head count lands between 14 and 25 seconds', ({ When, Then }) => {
      let runs: Plan[];
      When('the show runs at every head count from 2 to 8, with each ending', () => {
        runs = Array.from({ length: 7 }, (_, i) => byEnding(i + 2)).flat();
      });
      Then('each run lasts between {int} and {int} seconds', (_, least: number, most: number) => {
        for (const plan of runs) {
          expect(plan.times.end).toBeGreaterThanOrEqual(least);
          expect(plan.times.end).toBeLessThanOrEqual(most);
        }
      });
    });
  });
});

describe('the plan', () => {
  const all = everyPlan();

  it('lasts 14 to 25 seconds at every head count, with every ending, seeds 1–40', () => {
    for (const { label, plan } of all) {
      expect(plan.times.end, label).toBeGreaterThanOrEqual(14);
      expect(plan.times.end, label).toBeLessThanOrEqual(25);
    }
  });

  it('has the rival and the third from the others, the third only from 3 people', () => {
    for (const { label, plan, team, unlucky } of all) {
      expect(team, label).toContain(plan.rival);
      expect(plan.rival, label).not.toBe(unlucky);
      if (team.length === 2) expect(plan.third, label).toBeNull();
      else expect([unlucky, plan.rival], label).not.toContain(plan.third);
    }
  });

  it('puts the rival beside the unlucky person at the line, or just ahead for a brake or a surge', () => {
    for (const { label, plan, unlucky } of all) {
      const front = orderAt(plan, plan.times.slow);
      if (plan.ending === 'brake') expect(front.slice(0, 2), label).toEqual([plan.rival, unlucky]);
      if (plan.ending === 'surge' && plan.third) {
        expect(front.slice(0, 3), label).toEqual([plan.rival, plan.third, unlucky]);
      }
      if (plan.ending === 'photo') {
        expect([...front.slice(0, 2)].sort(), label).toEqual([plan.rival, unlucky].sort());
      }
    }
  });

  it('has its events one at a time, bursts and then the leader stopping', () => {
    for (const { label, plan, team, unlucky } of all) {
      const count = team.length;
      expect(plan.events, label).toHaveLength(eventCount(count));
      const bursts = plan.events.filter((event) => event.kind === 'burst');
      expect(plan.events.slice(0, bursts.length).every((event) => event.kind === 'burst')).toBe(
        true,
      );
      plan.events.forEach((event, i) => {
        if (i > 0) expect(event.at - plan.events[i - 1]!.at, label).toBeCloseTo(spacing(count));
        expect(event.at - (plan.events[i - 1]?.at ?? 0)).toBeGreaterThanOrEqual(2.5);
        if (event.kind === 'stop') {
          expect(event.subject, label).not.toBe(unlucky);
          expect(leaderAt(plan, event.at), label).toBe(event.subject);
          expect(orderAt(plan, event.at + STOP.off)[0], label).not.toBe(event.subject);
        } else {
          expect(leaderAt(plan, event.at + 0.01), label).not.toBe(event.subject);
          expect(leaderAt(plan, event.at + 0.9), label).toBe(event.subject);
        }
      });
      expect(plan.events.at(-1)!.at + spacing(count), label).toBeCloseTo(plan.times.stretch);
    }
  });

  it('has one event of the track’s own off the sports field, and none on it', () => {
    for (const { label, plan } of all) {
      const own = plan.events.filter((event) => event.cause === 'track');
      expect(own, label).toHaveLength(plan.course === 'field' ? 0 : 1);
    }
  });

  it('starts everyone with their noses on the line, and springs them off together at "Go!"', () => {
    for (const { label, plan, team } of all.slice(0, 80)) {
      const ranks = orderAt(plan, plan.times.go + 0.3);
      expect(ranks, label).toEqual(plan.setOff);
      expect(new Set(team.map((name) => orderAt(plan, 0).indexOf(name))).size).toBe(team.length);
    }
  });

  it('crosses with the unlucky nose first in every run', () => {
    for (const { label, plan, team, unlucky } of all) {
      const crossing = crossingOf(plan, unlucky);
      expect(crossing, label).not.toBeNull();
      for (const name of team.filter((each) => each !== unlucky)) {
        const theirs = crossingOf(plan, name);
        if (theirs !== null) expect(theirs, label).toBeGreaterThan(crossing!);
      }
    }
  });
});
