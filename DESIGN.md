# PyQuest — DESIGN.md

## Theme
Light editorial minimalism, botanical palette. Warm bone canvas, ink typography, four earthy desaturated accents used only for meaning (states, tracks, badges, syntax tokens). No gradients, no glassmorphism, near-invisible shadows.

## Color
- Canvas: `#FBFAF7` (bg), `#FFFFFF` (surface), `#F5F3EE` (bone, inset panels)
- Ink: `#12100D` (headings/actions), `#35312B` (body), `#6F6A61` (muted), `#8C8578` (faint)
- Borders: `#E8E4DC` (1px everywhere), `#C6BFB2` (line-strong)
- Botanical accents (bg / ink) — the `--pastel-*` variables keep their old names:
  clay `#F8EAE4`/`#96432C` (red), denim `#E7EEF7`/`#2A5680` (blue),
  sage `#EBF0E8`/`#41603F` (green), ochre `#FAF1DF`/`#8C6516` (yellow)
- Syntax tokens: keywords denim, strings sage, builtins clay, numbers ochre, comments faint

## Typography
- Display/serif: Fraunces (500-600), tight tracking -0.02 to -0.035em
- UI/body: Geist Sans, 15-15.5px body, line-height 1.6-1.75
- Code: Geist Mono 13-13.5px
- Lesson prose: justified, hyphens auto, 700px shared column with code blocks

## Components
- Cards: white, 1px `#EAEAEA` border, radius 12px, resting shadow 0 1px 2px @2.5%
- Buttons: primary ink-filled radius 6px; secondary ghost 1px border
- Pills/tags: 9999px radius, 11px uppercase 0.05em, pastel bg + matching ink
- Editors/game frames: faux-macOS chrome bar (3 gray dots + mono filename)
- Code examples: bone inset, "Example" microlabel, syntax highlighted
- Modals: centered white card, kicker + serif h2 + actions; Escape closes
- Journey map: serpentine SVG trail, solid ink for completed segments, dashed for future; pulsing ring on next node

## Layout
- Page container 1360px; shell grid 264px sidebar + minmax(0,1fr) main (max 920px; home full)
- Lesson column 700px shared by prose and examples
- Sticky topbar (blur) and sticky, self-scrolling sidebar
- Mobile <900px: single column, stage list becomes horizontal chip rail

## Motion
- Reveal: 12px rise + fade, 600ms cubic-bezier(0.16,1,0.3,1), 80ms stagger
- Celebrations: CSS confetti (pastel rects), XP pill bump
- Game: canvas rAF loop; auto-pauses when tab hidden
- All motion disabled under prefers-reduced-motion
