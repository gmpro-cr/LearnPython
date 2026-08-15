# PyQuest evals

The site has no framework and no build step, so these have no dependencies either.

```bash
python3 evals/run.py          # structure + all 56 exercises   (~1s)
node evals/balance.cjs        # all 19 Firewall sectors        (~1s)
```

Both exit non-zero on failure. For the browser check, serve the repo and open
`/evals/evals.html`.

## Why these exist

Every exercise hides a Python `check` that decides whether a learner was right. It can fail two
ways, and neither is visible by clicking around:

- **it accepts anything** — a learner is told "Correct" for wrong code, and learns the wrong thing
- **it rejects the correct answer** — a learner who has done the task is stuck, and blames themselves

Before this, the only defence was running each exercise by hand in a browser. The 56 solutions
verified in July 2026 were written ad hoc and thrown away, so nothing could be re-checked.

## What runs

**`run.py structure`** — ids unique, no repeated stage names, every exercise has all six fields,
every check compiles as Python and actually contains an `assert`, every stage has a badge and
lesson text, tracks cover each stage exactly once, the top rank is reachable with the XP the
course awards, and `solutions.json` matches the curriculum with nothing missing or orphaned.

**`run.py curriculum`** — for each exercise: the reference solution must pass the real check; an
empty program must be rejected (a check that accepts nothing written accepts anything); and each
`rejects` entry — a plausible wrong answer — must be rejected too. The reject cases are what
catch a weakened check, since an empty program is usually still caught by a first `assert`.

`run_against_check()` is a port of `_pyquest_run` in `worker.js`: the solution and the check share
one namespace, and the check sees `_stdout` and `_code`. Keep it that way — the checks rely on it
(`assert "age" in dir()`).

**`balance.cjs`** — replays all 19 sectors through the real `fwStep` loop out of `firewall.js`,
with a stub DOM. Nothing is reimplemented, so changes to `FW_TOWERS` or `fwQueueWave` are picked
up automatically. It asserts the two ends of the curve: a competent defence clears every sector,
an undefended board loses every sector. It does **not** test fine balance — the competent bot
finishes most sectors untouched at 10/10, so this catches severe regressions, not a sector that
merely got harder.

The bot is deliberately not tuned to pass. It buys by damage-per-credit, holds at most one Gate
(1 damage — it is a slower, not a weapon) and three Sprinklers, and stops at twelve defences.
An earlier version bought the most expensive tower first and lost sectors 8, 9 and 11; that was
a bad bot, not bad balance.

**`evals.html`** — the same solutions through the site's own `worker.js` and real Pyodide.
`run.py` uses CPython, which the site does not; anything green there and red here is a CPython/
Pyodide difference. It cannot run unattended, so it is not the CI path.

## Adding an exercise

Add its reference solution to `solutions.json`, and a `rejects` entry for the mistake a learner
would plausibly make. `run.py` fails if an exercise has no solution, so this cannot be forgotten.

## The rule

A failure means the curriculum or the check is wrong. **Fix the exercise, never weaken the eval to
make it green.**

## Not deployed

`.vercelignore` keeps `evals/` off the live site: `solutions.json` is a complete answer key.
