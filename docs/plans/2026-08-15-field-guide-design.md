# PyQuest — Illustrated Field Guide redesign

Date: 2026-08-15
Project: /Users/gaurav/pyquest (static site, live at pyquest-one.vercel.app, repo gmpro-cr/LearnPython)
Branch: `field-guide` — commit per step, nothing to main until reviewed.

## Decision

Replace the current calm-editorial identity with an **illustrated natural-history field guide**: cream
paper, ink linework, six saturated botanical inks, hand-authored SVG plates, and a vine that grows as
the learner progresses. Motion is rich but purposeful — things draw themselves when they arrive and
progress animates when it is earned; nothing moves while reading.

This overrides parts of the existing PRODUCT.md (which bans decorative colour/illustration) at the
owner's explicit request. PRODUCT.md and DESIGN.md are rewritten in step 9 to match reality.

Constraints kept: no emoji, no Inter/Roboto/Lucide, static site, localStorage only, CDN only,
no image assets (all SVG authored in code), prefers-reduced-motion honoured everywhere.

## 1. Palette and type

| token | now | new |
|---|---|---|
| `--bg` | `#FBFAF7` | `#FBF7ED` aged cream stock |
| `--surface` | `#FFFFFF` | `#FFFDF7` plate white |
| `--bone` | `#F5F3EE` | `#F2EBD9` inset panels, code wells |
| `--ink` | `#12100D` | `#171309` warm drawing ink |
| `--border` | `#E8E4DC` | `#E3D9C2` plate rule |

Six botanical inks replace the four pastels (ink / wash):

- Fern `#2E5E3A` / `#E3EEDF`
- Indigo `#2B4C7E` / `#E1E9F5`
- Terracotta `#B4462A` / `#F8E3D8`
- Amber `#A97708` / `#FAEDD0`
- Plum `#6C3A69` / `#F0E2EF`
- Teal `#136266` / `#DCEDEC`

Tracks: Foundations = fern, Intermediate = indigo, Advanced = plum. Individual stages cycle all six;
a stage's colour follows it everywhere (sidebar dot, plate number, badge, its own syntax accent).

Type stays Fraunces + Geist, plus two field-guide moves:
1. Plate captions in Fraunces italic, small, muted — reads as a specimen caption, not UI text.
2. Plate numbering in Geist Mono, letterspaced, with a hairline rule: `PLATE 01 ———— FOUNDATIONS`.

Justified prose is dropped — ragged right at a 68-character measure (better for non-native readers,
kills the rivers).

## 2. Illustrations

Style rules for all: single-weight 1.4px ink linework, no gradients, one flat wash behind the subject,
stipple dots for shading, deliberate small path irregularities. All use `currentColor` so one drawing
works in all six inks.

Nine hand-authored pieces:
1. Hero plate — *Sansevieria* (snake plant), roots to tip. The field-guide answer to "Python", no mascot.
2. Foundations plate — germinating seed: split husk, first root, first leaf.
3. Intermediate plate — unfurling fern frond, fiddlehead mid-open.
4. Advanced plate — seed pod splitting, seeds scattering.
5. The vine — climbing stem for the sidebar (see §3).
6. Badge medallions — a kit, not 20 originals: 6 specimen forms (leaf, seed, pod, frond, berry, root)
   x 6 inks x 3 frame treatments. All 20 distinct, all consistent.
7. Firewall emblem — a beetle drawn as an entomological plate. Bug defence and specimen-pinning make
   the game and the course one world.
8. Locked state — pressed, faded silhouette in faint ink, replacing the padlock icon.
9. Course complete — the snake plant fully grown and flowering.

All in a new `illustrations.js` as SVG-string builders: `plate()`, `vine()`, `medallion()`,
`beetle()`, `glyph()`, plus the stroke-draw helper.

## 3. The vine (progress)

One idea, three surfaces:

- **Sidebar** — stem down the left edge of the stage list, behind the rows. Completed stages sprout a
  leaf in that stage's ink; current stage carries a closed bud; stages ahead are bare stem in faint
  pencil. Finishing a stage draws the new leaf in over ~700ms — that is the reward moment.
- **Journey map (home)** — today's serpentine dashed trail becomes the grown vine. Stage nodes become
  specimen medallions on it; Firewall sectors become beetles perched between them. Completed run is
  full ink and leaf; everything ahead is pencil **underdrawing** — "not yet drawn" rather than
  "locked out".
- **Topbar** — XP pill and level tag restyled as specimen labels: hairline box, Geist Mono,
  letterspaced. Collection ledger, not game HUD.

The linear progress bar is removed (the vine says it better). Honest numbers stay as text
(`0 of 56 exercises · Slitherer at 60 XP`).

Track plates appear on home as the three chapter markers. Lesson pages get only a small corner
vignette in the stage's colour — the reading surface stays calm.

## 4. Motion inventory

| Trigger | What happens | Timing |
|---|---|---|
| Plate enters view | Linework draws itself, then wash fades in behind | 900ms, 120ms stagger, once |
| Section enters | Existing 12px rise + fade, kept | 600ms |
| Answer correct | Output well fills with the stage wash from the left; check stroke-draws | 200 + 300ms |
| Answer wrong | No shake. Terracotta hairline draws under the output; hint button warms | 250ms |
| Stage complete | New leaf grows onto the sidebar vine in that stage's ink | 700ms |
| Badge earned | Medallion stamps into the modal, scale 0.94→1 with ink-bleed fade | 400ms |
| Celebration | Drifting seeds and petals in the six inks, replacing confetti rectangles | 2.4s |
| Next stage unlocks | Map node inks in from pencil underdrawing to full linework | 500ms |
| Hover stage row | That row's leaf tilts ~2°, ink deepens | 180ms |
| Engine ready | Status dot crossfades amber → fern | 300ms |

No shake-on-error, deliberately: absolute beginners, and PRODUCT.md already promises errors are normal.

All `transform`/`opacity` plus `stroke-dashoffset`, triggered by IntersectionObserver, run once — no
permanent rAF loop outside the existing game canvas.

Under `prefers-reduced-motion`: every draw jumps to its finished state, no falling seeds, hovers become
colour-only. The reward still registers, it just does not move.

## 5. Build order

Each step leaves the site working; commit after each.

1. Palette + type tokens in `styles.css`
2. `illustrations.js` — drawing kit + draw-on helper
3. Sidebar vine (`refreshSidebar`)
4. Home — hero plate, three track plates, journey map as vine
5. Lesson page — plate header, italic caption, corner vignette, ragged-right prose, correct/wrong states
6. Badge medallions + seed/petal celebration (replaces `badgeSvg`, `confetti`)
7. Firewall re-skin — canvas palette and shapes, beetles as specimens (`firewall.js`, ~714 lines)
8. Reduced-motion audit + mobile pass under 900px
9. Rewrite `DESIGN.md` and the affected parts of `PRODUCT.md`

## Verification

No test suite exists (static site). Browser-based and reported honestly:

- Screenshots at 1440 / 1024 / 390px
- Run all three Stage 1 exercises — confirm correct and wrong states
- Complete the stage — confirm the leaf grows and the badge stamps
- Open a Firewall level — confirm the re-skin and that the game still plays
- Re-check the whole flow with reduced-motion forced on

**Do not forget:** bump every `?v=` cache-bust param in `index.html`, or Vercel serves stale CSS/JS.
Also update `theme-color` and the favicon (currently a green "P" circle → specimen medallion).

## Open risk

Large single-session change across 4 files. Mitigated by branch + per-step commits.
