import { loadFeature } from '@amiceli/vitest-cucumber';
import { describe, expect, it } from 'vitest';
import { handOutLooks, speechBox, type Box, type ChosenLook } from '../../scenario-kit';
import { dealLooks } from '../../scenario-kit/line-up';
import { createRandom } from '../../scenario-kit/random';
import { describeSpec, runShow, type ShowRecord } from '../../scenario-kit/testing';
import theRace from './index';
import { eventCaption } from './play';
import { faceAt, lane, tagBox } from './layout';
import { creature, CREATURE_SPEC } from './creature';
import {
  CREATURES,
  EXTRAS,
  isCreature,
  MOUNTS,
  RACER_COLOURS,
  racer,
  RIDER,
  SPEC,
  type Creature,
  type Kind,
  type Mount,
} from './parts';
import styles from './the-race.module.css';
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
    looks,
    cancelAt,
    reducedMotion = false,
    onStage,
  }: {
    unlucky?: string;
    seed?: number;
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
  const plan = planShow(team, unlucky, createRandom(seed));
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
        let seed = 7;
        while (planShow(team, team.at(-1)!, createRandom(seed)).course !== 'field') seed++;
        const plan = planShow(team, team.at(-1)!, createRandom(seed));
        team[team.indexOf(plan.events[0]!.subject)] = name;
        return watch(team, { seed, looks: allOn(team, mount), reducedMotion });
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
          plan.course === 'field' &&
          plan.ending === 'photo' &&
          plan.events.every((event) => event.subject !== 'Anna');
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
    const plan = planShow(team, unlucky, createRandom(seed));
    if (plan.course === course && fits(plan)) found.push(plan);
  }
  return found;
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

/** Who the track's own event happens to, as the feature names them. */
const SUBJECTS: Readonly<Record<Course, string>> = {
  field: 'Ben',
  office: 'Ben',
  sea: 'Marco',
  moon: 'Anna',
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
      plan.course === course &&
      plan.ending === 'photo' &&
      (course === 'field' || plan.events.some((e) => e.cause === 'track' && e.kind === kind));
    while (!fits(planShow(team, unlucky, createRandom(seed)))) seed++;
    // Names are only labels to the plan: two swapped keep the same race.
    const own = planShow(team, unlucky, createRandom(seed)).events.find(
      (event) => event.cause === 'track',
    );
    if (own) {
      const at = team.indexOf(own.subject);
      const theirs = team.indexOf(SUBJECTS[course]);
      if (theirs >= 0) team[theirs] = own.subject;
      team[at] = SUBJECTS[course];
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
          for (const part of ['machine', 'wet-floor']) {
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

/** Show seconds from `from` to `to`, every frame. */
function* frames(from: number, to: number, step = 1 / 30) {
  for (let t = from; t <= to + 1e-9; t += step) yield t;
}

/** Every head count with seeds 1–40, the last of the team unlucky. */
function everyPlan(): { label: string; plan: Plan; team: string[]; unlucky: string }[] {
  const all = [];
  for (let count = 2; count <= 8; count++) {
    for (let seed = 1; seed <= 40; seed++) {
      const team = names(count);
      const unlucky = team.at(-1)!;
      all.push({
        label: `${count} people, seed ${seed}`,
        plan: planShow(team, unlucky, createRandom(seed)),
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
      const holds = (group: string, held: string) => {
        const choices = option('Racer').choices.filter((choice) => choice.group === group);
        expect(choices.map((choice) => choice.label)).toEqual(listed(held));
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
        expect([...new Set(first.choices.map((choice) => choice.group))]).toEqual([
          'Rides',
          'Animals',
          'Spooky',
          'Space',
        ]);
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

    RuleScenario('The Line-up fits the window', ({ Given, When, Then }) => {
      // jsdom has no layout: e2e/line-up.spec.ts measures this Line-up in a
      // real 1280 by 800 window. Here: nothing it shows is more than one row holds.
      const lineUp = theRace.lineUp!;
      let people: string[] = [];
      Given(
        '{int} people, a 15-character name among them, in a 1280 by 800 window',
        (_, count: number) => {
          people = [...names(count - 1), 'Maria-Elena Ros'];
          expect(people.at(-1)).toHaveLength(15);
        },
      );
      When('the Line-up opens for The Race', () => {
        expect(people.length).toBeLessThanOrEqual(theRace.people.max);
      });
      Then(
        "every person, the chosen one's look, the tabs, every racer in the open tab, every colour and extra, and both buttons are in view without scrolling",
        () => {
          const [racer, colour, extra] = lineUp.options;
          const tabs = new Set(racer!.choices.map((choice) => choice.group));
          // Two rows of four racers, eight swatches and six extras in one row each.
          for (const tab of tabs) {
            const inTab = racer!.choices.filter((choice) => choice.group === tab);
            expect(inTab.length).toBeLessThanOrEqual(8);
          }
          expect(colour!.choices).toHaveLength(8);
          expect(extra!.choices).toHaveLength(6);
        },
      );
    });

    /** Everyone with a look given, as the show first draws them, the last unlucky. */
    async function firstDrawn(looks: Map<string, ChosenLook>, seed = 4) {
      const team = [...looks.keys()];
      const drawn = new Map<string, SVGSVGElement>();
      await runShow(theRace, {
        names: team,
        unlucky: team.at(-1)!,
        seed,
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
        const legs = giulia.querySelector('path[data-part="legs"]')!.getAttribute('d')!;
        expect(legs.match(/M/g)).toHaveLength(2);
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
    };
    let allTomato: Promise<Map<string, SVGSVGElement>> | undefined;

    RuleScenarioOutline(
      'Where a <creature> wears its colour',
      ({ When, Then }, { creature: kind }) => {
        let svg: SVGSVGElement;
        When('someone races as a <creature> in tomato', async () => {
          // All eight in one race, as the show first draws them.
          allTomato ??= firstDrawn(
            new Map(
              CREATURES.map((each) => [each, { mount: each, colour: 'tomato', extra: 'scarf' }]),
            ),
          );
          svg = (await allTomato).get(WEARS[kind]!.creature)!;
        });
        Then('<where> is tomato', () => {
          expect(svg.style.getPropertyValue('--racer')).toBe('var(--color-tomato)');
          for (const part of WEARS[kind]!.parts) {
            const shapes =
              part === 'arms'
                ? [...svg.querySelectorAll<SVGElement>('[data-part$="-arm"] > :nth-child(2)')]
                : [...svg.querySelectorAll<SVGElement>(`[data-part="${part}"]`)].filter(
                    (shape) => shape.tagName !== 'g',
                  );
            expect(shapes.length, part).toBeGreaterThan(0);
            for (const shape of shapes) {
              const painted =
                shape.getAttribute('class') === styles.racer ||
                shape.style.getPropertyValue('--paint') === 'var(--racer)';
              expect(painted, `${kind} ${part}`).toBe(true);
            }
          }
        });
      },
    );

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
  });

  Rule('A track drawn at random', ({ RuleScenario, RuleScenarioOutline }) => {
    const team = names(8);
    const unlucky = team.at(-1)!;
    const own = (plan: Plan) => plan.events.filter((event) => event.cause === 'track');

    RuleScenario('Each race draws its track', ({ Given, When, Then, And }) => {
      let runs: Plan[];
      Given('{int} people', () => undefined);
      When('the show runs with {int} different random seeds', (_, seeds: number) => {
        runs = plans(team, unlucky, seeds);
      });
      Then('each run is on the sports field, the office, under the sea or the Moon', () => {
        for (const plan of runs) expect(COURSES).toContain(plan.course);
      });
      And('each of the four comes up in at least {int} runs', (_, least: number) => {
        for (const course of COURSES) {
          const on = runs.filter((plan) => plan.course === course);
          expect(on.length, course).toBeGreaterThanOrEqual(least);
        }
      });
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
        const skies = { field: 'sky', office: 'paper', sea: 'sea', moon: 'ink' };
        expect(run.sky).toBe(`var(--color-${skies[course]})`);
        const parts = {
          field: ['flags', 'posts'],
          office: ['wall', 'panels', 'plant'],
          sea: ['surface', 'fish', 'seaweed', 'floats'],
          moon: ['space'],
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
          expect(!!sign.querySelector(`.${styles.post}`)).toBe(course !== 'office');
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

    RuleScenarioOutline(
      'On <track>, <caption>',
      ({ When, Then, And }, { track: where, event: kind, caption }) => {
        const course = COURSE_NAMES[where]!;
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
        const says = (text: string) =>
          during(0, 3).some((frame) => saying(frame, event.subject, text));
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
        When("someone's event is <track>'s own <event>", async () => {
          run = await onTrack(course, kind as RaceEvent['kind']);
          event = run.watched.plan.events.find((each) => each.cause === 'track')!;
          expect(event.kind).toBe(kind);
          expect(event.subject).toBe(SUBJECTS[course]);
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
          if (kind === 'stop') {
            expect(during(0.5, STOP.off).some((frame) => frame.racer.pose === 'wave')).toBe(true);
            expect(says('Phew!')).toBe(true);
            expect(furtherBack()).toBe(true);
          } else {
            expect(leads()).toBe(true);
            expect(says('Nooo!')).toBe(true);
          }
        });
      },
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
        expect(runs).toHaveLength(36);
        for (const plan of runs) {
          expect(plan.times.end, `${plan.course} ${plan.ending}`).toBeGreaterThanOrEqual(least);
          expect(plan.times.end, `${plan.course} ${plan.ending}`).toBeLessThanOrEqual(most);
        }
      });
    });
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
          } else if (kind !== 'dinosaur') {
            const hands = [...one.el.querySelectorAll('[data-part$="-arm"] circle')].map((hand) => [
              Number(hand.getAttribute('cx')),
              Number(hand.getAttribute('cy')),
            ]);
            expect(hands, kind).toEqual([
              [x - 24, y + 26],
              [x + 24, y + 26],
            ]);
          }
        }
      });
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
