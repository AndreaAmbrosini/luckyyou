# Design

LuckyYou's look is **Sticker Pop**: a cartoon sticker book. Flat colours,
thick ink outlines, hard shadows and chunky type on a sky-blue ground. Every
value is in [tokens.css](src/styles/tokens.css); this file says how they're
used.

## Every screen

- Body text is `--size-body`; nothing is smaller than `--size-small`.
- Text is ink or ink-soft on paper, sky, sun, mint, tomato or tomato-soft.
  White text is never used.
- Solid fills only: no gradients, glows, blur or thin lines.
- Outlines are `--line` in ink. Surfaces on the ground get a hard ink shadow.
- On and off look different without colour: a ticked person has a check
  mark and a solid outline, a pinned look a solid outline; anything off or
  disabled is white with a dashed outline.
- One primary button per screen, in tomato.
- Only the logo and the stickers on the result and in shows are tilted,
  between −2° and 2°.
- Click targets are at least `--target-min`. Keyboard focus shows as
  `--focus`, offset 3px.

## Type

- **Lilita One** (`--font-display`): the logo, headings, show names,
  captions and the name on the result.
- **Nunito** (`--font-body`) at weight 700 to 900: everything else.
- The name on the result starts at `--size-name-max` and shrinks to fit, down
  to `--size-name-min`, then wraps onto a second line.

## Colour roles

| Token       | Used for                                                           |
| ----------- | ------------------------------------------------------------------ |
| sky         | the ground of every screen                                         |
| paper       | sheets, cards, tiles, tags, fields, secondary buttons              |
| ink         | text, outlines, shadows                                            |
| ink-soft    | unticked names, disabled text, placeholders                        |
| sun         | ticked people, the chosen show, the current step, the logo, ribbon |
| tomato      | the primary button, a count that blocks, remove buttons            |
| tomato-soft | refused-name notes, remove mode                                    |
| mint        | a count that's fine, "Last time", "Done", a done step              |
| grape       | the name on the result, focus                                      |
| the rest    | shows, and the ground a theme names for the Line-up                |

## Parts

- **Sheet**: paper, ink outline, `--radius-card`, `--shadow`. Holds the team.
- **Person tile**: four equal tiles across. Ticked: sun, `--shadow-small`, a
  check in a paper box. Unticked: paper, an empty box. A long name wraps inside
  its tile. In remove mode: paper, solid outline, and a round tomato ×.
- **Count pill**: "8 of 10 in", mint from 2 to 12 ticked, tomato otherwise.
- **Notes**: paper; tomato-soft for a refused name.
- **Buttons**: primary in tomato with `--shadow`; secondary in paper with
  `--shadow-small`; quiet as underlined text; disabled in paper with a
  dashed ink-soft outline, no shadow, and its reason.
- **Step pills**: numbered; the current one in sun with a shadow; a done one
  with a mint check and what was chosen there; the rest dashed.
- **Bar**: paper along the bottom of every step before the show: the way back
  left, the main button right, a status or reason between.
- **Show card**: paper, `--radius-card`, `--shadow`: a round sticker with the
  picture, "Last time", the name, the description, how many it takes, "+
  Line-up" or why it can't run. Clicking chooses it: a sun band inside its
  outline and a check.
- **Postcard**: a theme's picture over its name, on paper; the chosen one in
  sun with a check, or a die on "Surprise".
- **Person card**: paper under each person on the ground: name, look in
  words, die, pin; a sun ring inside when pinned; a sun star badge when their
  choice suits the theme.
- **Look sheet**: paper from the right over the Line-up, dimmed by ink at 45%:
  the portrait on the theme's ground, "Surprise me", pin and options;
  mint "Done".
- **Music panel**: paper with `--shadow-small`, under the ♪ button.

## Screens

**Who's in.** The header: logo, step pills, sound, music, fullscreen. Then
"Who's in today?", the count pill and a line under it; "Everyone", "No one"
and "Remove people" right. The sheet scrolls; the add field is its last tile.
Remove mode turns the sheet tomato-soft and dashed, its hint beside "Done". A
first visit has its own heading and a note.

**Pick a show.** The heading, a mint "3 in" pill and the names. Show cards
in one row; under them, a paper panel: the chosen show, what it takes, what
comes next. A show with a line-up adds "Start with last line-up" to the bar.

**Line-up.** The heading; "1 · Track: Autumn" over the postcards; "2 ·
Racers" and "Shuffle everyone"; everyone in one row on the theme's ground, sky
over a floor with an ink line on top, over their cards. The bar names the
theme and pins.

**Show.** The scenario owns the window ([show.feature](specs/show.feature));
the volume pill is paper.

**Result.** The sky with a few clouds and star stickers. A paper card tilted
−1.5° with `--shadow-big`: "Lucky you," over the name, then the sun ribbon
"Sorry for your win". Under the card: the primary, secondary and quiet
buttons, and a disabled button's reason under the row.

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
