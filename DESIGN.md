# Design

LuckyYou's look is **Sticker Pop**: a cartoon sticker book. Flat colours,
thick ink outlines, hard shadows and chunky type on a sky-blue ground. Who it's
for and how it should feel is in [PRODUCT.md](PRODUCT.md), behaviour is in
[specs/](specs/), and every value is in [tokens.css](src/styles/tokens.css).
This file says how they're used.

## Every screen

- Every colour, font and font size comes from the token file through
  `var(--…)` ([styles.feature](specs/styles.feature)).
- Body text is `--size-body`; nothing is smaller than `--size-small`.
- Text is ink or ink-soft on paper, sky, sun, mint, tomato or tomato-soft.
  White text is never used.
- Solid fills only: no gradients, glows, blur or thin lines.
- Outlines are `--line` in ink. Surfaces that sit on the ground get a hard
  ink shadow, never a blurred one.
- On and off look different without colour: a ticked person has a check
  mark and a solid outline; an unticked or disabled one is white with a
  dashed outline.
- One primary button per screen, in tomato.
- Only the logo and the stickers on the result and in shows are tilted,
  between −2° and 2°. Lists and buttons stay straight.
- Click targets are at least `--target-min`. Keyboard focus shows as
  `--focus`, offset 3px.

## Type

- **Lilita One** (`--font-display`): the logo, headings, show names,
  captions and the name on the result.
- **Nunito** (`--font-body`) at weight 700 to 900: everything else.
- The name on the result starts at `--size-name-max` and shrinks to fit, down
  to `--size-name-min`, then wraps onto a second line.

## Colour roles

| Token       | Used for                                                       |
| ----------- | -------------------------------------------------------------- |
| sky         | the ground of every screen                                     |
| paper       | sheets, cards, tiles, tags, fields, secondary buttons          |
| ink         | text, outlines, shadows                                        |
| ink-soft    | unticked names, disabled text, placeholders                    |
| sun         | ticked people, the logo, the current step, the result's ribbon |
| tomato      | the primary button, a count that blocks, remove buttons        |
| tomato-soft | refused-name notes, remove mode                                |
| mint        | a count that's fine, "Last time", "Done"                       |
| grape       | the name on the result, focus                                  |
| the rest    | shows only: sea, shark, glass, skin tones, extra ring colours  |

## Parts

- **Sheet**: paper, ink outline, `--radius-card`, `--shadow`. Holds the team.
- **Person tile**: a grid of equal tiles at least 250px wide, so rows line up
  for 3 people or 20. Ticked: sun, solid outline, `--shadow-small`, a check
  in a paper box. Unticked: paper, dashed ink-soft outline, an empty box.
  A long name wraps inside its tile. In remove mode: paper, solid outline,
  and a round tomato × labelled "Remove" and the name.
- **Count pill**: "8 of 10 in", mint from 2 to 12 ticked, tomato otherwise.
- **Notes**: a refused name's note in tomato-soft beside the add field; the
  reason a button is disabled in paper beside or under it.
- **Buttons**: primary in tomato with `--shadow`; secondary in paper with
  `--shadow-small`; quiet as underlined text; disabled in paper with a
  dashed ink-soft outline, no shadow, and its reason.
- **Step pills**: "1 · Who's in" and "2 · Pick a show"; the current one in
  sun with a shadow.
- **Show card**: paper, `--radius-card`, `--shadow`, a round sticker with the
  scenario's picture, its name, its description, and either a mint "Last
  time" badge or a dashed badge with the reason it can't run. The whole card
  is the button.

## Screens

**Who's in.** A header with the logo, the step pills, mute and fullscreen.
Then "Who's in today?" with the count pill, "Everyone" and "No one". The sheet
with the tiles fills the middle and scrolls if it must. The footer has the add
field and "Remove people" on the left, the reason and "Next: pick a show" on
the right. In remove mode the sheet turns tomato-soft with a dashed outline and
the footer says "Click × to take someone off the team." beside "Done". On a
first visit the heading is "Who's on the team?" and the sheet says "Add each
teammate once, below. They stay in this browser, ready for the next call."

**Pick a show.** "Who's in" to go back, the heading, then a mint "3 in" pill
followed by the names. Show cards sit in a grid at least 300px wide; more
shows add rows and the page scrolls. The footer says "Click a show to start
it."

**Show.** The scenario owns the window ([show.feature](specs/show.feature)).

**Result.** The sky with a few clouds and star stickers. A paper card tilted
−1.5° with `--shadow-big`: "Lucky you," over the name, then the sun ribbon
"Sorry for your win". Under the card: the primary, secondary and quiet
buttons, and a disabled button's reason under the row.

## Shows

Every scenario follows these so the shows look like one app:

- Each show is drawn first for the usual head count in
  [PRODUCT.md](PRODUCT.md), then checked at its smallest and largest.
- The stage is 1280×720 stage pixels, scaled to fit the window.
- Drawings use flat fills and ink outlines of 4 to 5 stage pixels.
- Name tags are paper stickers with an ink outline and ink text, straight
  (never on a curve), at least `--size-stage-tag-min`, at most two lines,
  never over another tag. They grow as fewer people are left.
- Captions are one at a time, top centre, in the display font at
  `--size-stage-caption` on a paper sticker, each for at least a second.
- People are cartoon heads with a mood (calm, worried, scared, happy, party)
  and a cap, goggles or snorkel, handed out per run.
- Movement that matters lasts at least 0.4 seconds, and nothing flashes more
  than three times a second. With `prefers-reduced-motion`, a show keeps its
  story and drops shaking and speed lines.
- Every show reads with the sound off.
- Nobody gets hurt.
