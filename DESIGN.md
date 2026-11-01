# Design

LuckyYou's look is **Backstage**: dark screens around a bright show. Flat
panels with thin outlines, marigold for what's chosen, tomato for the button
that goes on. Every value is in [tokens.css](src/styles/tokens.css); this
file says how they're used. The Line-up, its sheet, the Result and the show
screen's chrome keep the earlier look, Sticker Pop, until they are restyled.

## Every screen

- Body text is `--size-body`; nothing is smaller than `--size-small`.
- Text is text or text-soft on ground, panel or raised, and ground on
  marigold, tomato, mint and white. Every pair is at least 4.5:1.
- Flat fills only: no gradients, glows or blur. Panels have a `--line-thin`
  edge and no shadow. The only shadow is the main button's `--shadow-press`.
- On and off differ without colour: ticked, done and chosen things have a
  check; anything off or disabled has a dashed outline.
- One main button per screen, in tomato.
- Click targets are at least `--target-min`. Keyboard focus shows as
  `--focus`, offset 3px.

## Type

- **Bricolage Grotesque** (`--font-title`), weight 800, `font-stretch: 88%`,
  −1px letter-spacing at heading size: the logo, headings and show names.
- **Figtree** (`--font-text`) at weight 600 to 900: everything else.
- **Lilita One** (`--font-display`) and **Nunito** (`--font-body`): the
  shows, and the screens not yet restyled.

## Colour roles

| Token       | Used for                                                     |
| ----------- | ------------------------------------------------------------ |
| ground      | every screen's ground; text on marigold, tomato, mint, white |
| panel       | the bar, cards, panels, icon and secondary buttons           |
| raised      | a done step, chips and marks on a panel                      |
| edge        | panel edges, the bar's top line, the line between steps      |
| edge-mid    | secondary buttons, the add tile                              |
| edge-strong | dashed outlines, the way back                                |
| text-soft   | help lines, descriptions, unticked names, a step's choice    |
| text-faint  | placeholders, disabled text                                  |
| marigold    | the current step, ticked people, the chosen show, "You"      |
| tomato      | the main button, a count that blocks, remove buttons         |
| tomato-text | a reason that blocks, a refused name                         |
| mint        | a count that's fine, "Last time", "Done", a done step        |
| the rest    | shows, and the screens not yet restyled                      |

## Parts

- **Header**: the logo (a marigold star, "Lucky", "You" in marigold), the
  step pills, then sound, music and fullscreen as round panel buttons; the
  music panel under ♪.
- **Step pills**: numbered, joined by an edge line. The current one marigold;
  a done one raised, with a mint check and what was chosen; the rest dashed.
- **Person tile**: four across, `--radius-person`. Ticked: marigold, a
  marigold check in a ground box. Unticked: no fill, dashed, an empty box. A
  long name wraps inside its tile. In remove mode: raised, solid, and a round
  tomato ×.
- **Add tile**: panel: a plus, the field and a white "Add".
- **Count pill**: "8 of 10 in", mint from 2 to 12 ticked, tomato otherwise.
- **Buttons**: main in tomato with `--shadow-press`; secondary on panel;
  outline (the bar's others) unfilled; quiet as underlined text; "Done" in
  mint; disabled unfilled and dashed, with its reason beside it.
- **Bar**: a panel along the bottom of every step before the show: the way
  back left, the main button right, a status between, tomato-text when it
  blocks, marigold for a hint.
- **Show card**: panel: the show's round sticker, "Last time", the name, the
  description, chips for how many it takes and "+ Line-up", or why it can't
  run. Chosen: a marigold ring and check badge.
- **Chosen-show panel**: the show's name and line, what it takes and what
  comes next.

## Screens

**Who's in.** "Who's in today?", the count pill and a line under it;
"Everyone", "No one" and "Remove people" right. The tiles sit on the ground
and scroll; the add tile is last. Remove mode puts its hint in the bar beside
"Done". A first visit has its own heading and a note.

**Pick a show.** The heading, a mint "3 in" pill and the names. Show cards
in one row; under them, the chosen-show panel. A show with a line-up adds
"Start with last line-up" to the bar.

**Line-up.** "1 · Track: Autumn" over paper postcards; "2 · Racers", "Deal
from" and "Shuffle everyone"; everyone in one row on the theme's ground, over
paper cards. A look opens in a paper sheet.

**Show.** The scenario owns the window ([show.feature](specs/show.feature)).

**Result.** Sky, clouds and stars; a tilted paper card: "Lucky you," over the
name, the sun ribbon "Sorry for your win"; the buttons under it.

## Shows

Every scenario follows these:

- Each show is drawn first for the usual head count in
  [PRODUCT.md](PRODUCT.md), then checked at its smallest and largest.
- Drawings use flat fills and ink outlines of 4 to 5 stage pixels.
- Name tags are paper stickers with an ink outline and ink text, straight,
  at least `--size-stage-tag-min`, never over another tag. They grow as fewer
  people are left. On land they sit on the chest, so hands can hold things
  overhead; on a mount or a creature, beside the face, behind it.
- Captions are one at a time, top centre, in the display font at
  `--size-stage-caption` on a paper sticker.
- People are cartoon heads with a mood and a cap, goggles or snorkel, handed
  out per run, or their theme's costume. On land they wear a shirt and raise
  their arms from the shoulders, and sweat when nervous. A show may cast
  people as creatures: modern cartoons whose own faces carry the mood, shaded
  with ink at 18% on each part's lower left.
- Movement that matters lasts at least 0.4 seconds, lights don't blink, and
  nothing flashes more than three times a second. With `prefers-reduced-motion`,
  a show keeps its story and drops shaking and speed lines.
- Every show reads with the sound off.
- Nobody gets hurt.
