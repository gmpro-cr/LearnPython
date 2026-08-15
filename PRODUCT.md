# PyQuest

## Register
product — an interactive learning tool. Design serves the learning; the exercise runner is the core surface.

## Users & Purpose
- Absolute beginners learning Python from zero, many of them Indian English speakers. No programming background assumed.
- Context: a browser tab, often on a laptop, sometimes mobile. Sessions of 10-40 minutes between other tasks.
- Job to be done: understand one concept, prove it by writing real code that runs on the page, feel visible progress, come back tomorrow.
- Secondary surface: a gamified layer (journey map, Firewall tower defense between stages) that rewards completion and paces the course.

## Brand personality
An illustrated natural-history field guide: a patient teacher with taste who also draws. Warm,
encouraging, and made by hand — colour and illustration carry the character, but instructions stay in
plain, simple English (owner requirement: short sentences, everyday words, no idioms). Wit is allowed
in titles.

## Anti-references
- Anything that reads "vibe-coded" or template-generated (owner's words: not naive, professional).
- Duolingo-style candy gradients, mascots with speech bubbles, emoji anywhere in the UI (hard ban).
  The illustration is botanical and drawn, never a cartoon character with a face.
- Dark hacker-terminal aesthetics.
- Inter/Roboto, default Lucide icons (owner's global rules).
- Stock imagery or icon fonts: every drawing is authored as SVG in `illustrations.js`.

## Accessibility
- Keyboard: exercises runnable via Ctrl/Cmd+Enter, modal closes on Escape, locked controls are real disabled buttons.
- prefers-reduced-motion honored everywhere (confetti, reveals, game animations).
- Copy must stay readable for non-native English speakers.

## Strategic principles
1. The code is the hero: lesson examples and the editor deserve the most typographic care. Illustration
   density belongs on the home page and the map, not between the learner and the code.
2. Progress must always be visible and honest (the vine, XP, badges) without cluttering the reading
   surface. What is ahead is drawn as pencil underdrawing — not yet drawn, rather than shut out.
3. One linked journey: stages and game sectors form a single path, never parallel modes. The beetles
   in the Firewall are the same specimen as the beetles on the map.
4. Static site, no accounts; everything must work from localStorage and a CDN.
5. Errors are normal. A wrong answer gets a hairline and a warmed hint button — never a shake, a red
   panel, or anything that reads as a scolding.
