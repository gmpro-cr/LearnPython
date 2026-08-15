# PyQuest — DESIGN.md

## Theme
An illustrated natural-history field guide. Cream paper stock with a fibrous grain, warm drawing ink,
six saturated botanical inks, and hand-authored SVG plates. Progress is a plant: a vine that grows
down the sidebar and across the journey map as the learner works. No gradients, no glassmorphism,
no image assets — every drawing is built in code.

## Color
- Paper: `#FBF7ED` (bg, aged cream), `#FFFDF7` (surface, plate white), `#F2EBD9` (bone, inset panels)
- Ink: `#171309` (warm drawing ink), `#3A342A` (body), `#756D5D` (muted), `#9A907C` (faint)
- Rules: `#E3D9C2` (1px plate rule), `#C9BC9F` (line-strong)
- Pencil: `#D3C9B2` — underdrawing, used for everything not yet reached
- The six botanical inks (ink / wash):
  fern `#2E5E3A`/`#E3EEDF`, indigo `#2B4C7E`/`#E1E9F5`, terracotta `#B4462A`/`#F8E3D8`,
  amber `#A97708`/`#FAEDD0`, plum `#6C3A69`/`#F0E2EF`, teal `#136266`/`#DCEDEC`
- Tracks: Foundations = fern, Intermediate = indigo, Expert = plum
- Stages cycle all six. A stage's ink follows it everywhere: sidebar leaf and number, map medallion,
  badge, lesson vignette, and the wash behind a correct answer (`--stage-ink`, `--stage-wash`)
- Syntax tokens: keywords indigo, strings fern, builtins terracotta, numbers amber, comments faint
- Legacy `--pastel-*` variables are aliases onto the new inks

## Typography
- Display/serif: Fraunces (500-600), tight tracking -0.02 to -0.035em
- UI/body: Geist Sans, 15-15.5px body, line-height 1.6-1.75
- Code: Geist Mono 13-13.5px
- Plate numbering: Geist Mono 10.5px, 0.14em tracking, with a hairline rule — `PLATE 05 ——— FOUNDATIONS`
- Specimen captions: Fraunces italic, muted, max 46ch
- Prose is ragged right (never justified) at a 640px measure shared with code blocks

## Illustration
All drawings live in `illustrations.js` as SVG-string builders. House style: single-weight 1.4px
linework in `currentColor`, one flat wash behind the subject at 13% of the same hue, stipple dots for
shading, and deterministic path wobble from a seeded generator so nothing is machine-straight but
every render is identical.

- Hero: *Sansevieria* (snake plant), roots to tip. The answer to "Python" with no mascot
- Track plates: germinating seed (Foundations), unfurling fern frond (Intermediate), split seed pod (Expert)
- Course complete: the snake plant in flower
- Beetle: an entomological plate — used for Firewall sectors on the map and for every bug on the canvas
- Medallions: a kit, not 20 originals — 6 specimen forms (leaf, seed, pod, frond, berry, root)
  x 6 inks x 3 frame treatments, with the stage number in a notch at the foot
- Pressed specimen: what a locked stage shows instead of a padlock

## Components
- Cards: surface, 1px rule, radius 12px, resting shadow 0 1px 2px @2.5%
- Buttons: primary ink-filled radius 6px; secondary ghost 1px rule; `.btn-hint.warm` after a miss
- Specimen labels (XP, rank, modal XP): hairline box, mono, 0.06-0.12em tracking — not pills
- Editors/game frames: faux-macOS chrome bar (3 dots + mono filename)
- Code examples: bone inset, "Example" microlabel, syntax highlighted
- Modals: centred card, kicker + medallion + serif h2 + actions; Escape closes
- Sidebar: vine in a 22px gutter behind the rows — leaf per finished stage, bud on the current one,
  pencil stem beyond. No progress bar; the honest counts stay as text
- Journey map: one bowed vine, medallions for stages, beetles for Firewall sectors, a leaf on every
  grown stretch, pencil underdrawing ahead

## Layout
- Page container 1360px; shell grid 264px sidebar + minmax(0,1fr) main (max 920px; home full)
- Lesson column 640px (`--measure`) shared by prose and examples
- Sticky topbar (blur) and sticky, self-scrolling sidebar
- Mobile <900px: single column, stage list becomes a horizontal chip rail, vine hidden, track plates
  side-on in one column. <520px: track plates stack, stage vignette drops

## Motion
- Linework draws itself: 900ms, 120ms stagger, once, on IntersectionObserver
- Sections: 12px rise + fade, 600ms
- Correct: stage wash wipes in from the left (200ms), tick strokes on (300ms)
- Wrong: no shake — a terracotta hairline draws above the message (250ms) and the Hint button warms
- Stage complete: a new leaf grows onto the sidebar vine (700ms); the badge stamps into the modal (400ms)
- Celebration: seeds and petals in the six inks, drifting, ~2.4s
- Game: canvas rAF loop; auto-pauses when the tab is hidden
- All motion off under prefers-reduced-motion, and drawings arrive finished

### Two Chrome behaviours the draw-on works around (`drawIn` in illustrations.js)
1. Chrome does not apply `pathLength` to dash values, and will not interpolate a keyframe whose value
   comes from `var()` — it silently holds the start value, leaving every drawing invisible. Paths are
   therefore measured with `getTotalLength()` and animated from JS.
2. A finished `fill: forwards` animation holds the correct computed value but does not repaint the
   path. The resting state is written inline on finish to force the repaint.
3. A tab opened in the background never runs the animation, so illustrations there skip it and render
   finished instead of waiting invisibly.
