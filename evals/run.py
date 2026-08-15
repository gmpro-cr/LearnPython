#!/usr/bin/env python3
"""PyQuest evals — structure and curriculum.

    python3 evals/run.py            # everything
    python3 evals/run.py structure  # just the cheap static checks
    python3 evals/run.py curriculum # just the 56 exercises
    python3 evals/run.py -v         # show every case, not only failures

No dependencies. Needs node on PATH to read lessons.js (see lib/dump_lessons.cjs).

A failure means the curriculum is wrong, not the eval. Fix the exercise —
never weaken a check to make this green.
"""

import io
import json
import os
import subprocess
import sys
import traceback

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EVALS = os.path.join(ROOT, "evals")

GREEN, RED, DIM, BOLD, OFF = "\033[32m", "\033[31m", "\033[2m", "\033[1m", "\033[0m"
if not sys.stdout.isatty():
    GREEN = RED = DIM = BOLD = OFF = ""


class Results:
    def __init__(self):
        self.passed = 0
        self.failures = []

    def ok(self, name):
        self.passed += 1
        if VERBOSE:
            print(f"  {GREEN}pass{OFF} {DIM}{name}{OFF}")

    def fail(self, name, detail):
        self.failures.append((name, detail))
        print(f"  {RED}FAIL{OFF} {name}\n       {detail}")

    def check(self, cond, name, detail):
        self.ok(name) if cond else self.fail(name, detail)


VERBOSE = "-v" in sys.argv or "--verbose" in sys.argv


def load_curriculum():
    """lessons.js is JavaScript, so node reads it and hands back JSON."""
    script = os.path.join(EVALS, "lib", "dump_lessons.cjs")
    try:
        raw = subprocess.run(
            ["node", script], capture_output=True, text=True, check=True, cwd=ROOT
        ).stdout
    except FileNotFoundError:
        sys.exit("node is required to read lessons.js — install node and retry.")
    except subprocess.CalledProcessError as e:
        sys.exit(f"could not read lessons.js:\n{e.stderr}")
    return json.loads(raw)


def load_solutions():
    with open(os.path.join(EVALS, "solutions.json")) as f:
        return json.load(f)


# --------------------------------------------------------------- the runner

def run_against_check(code, check):
    """A faithful port of _pyquest_run in worker.js: the learner's code and the
    check share one namespace, and the check sees _stdout and _code.

    Returns (passed, note).
    """
    buf = io.StringIO()
    ns = {}
    old = sys.stdout
    sys.stdout = buf
    try:
        exec(compile(code, "<solution>", "exec"), ns, ns)
    except BaseException:
        sys.stdout = old
        return False, "the code itself raised: " + traceback.format_exc().strip().split("\n")[-1]
    finally:
        sys.stdout = old

    ns["_stdout"] = buf.getvalue()
    ns["_code"] = code
    # The worker restores stdout before running the check, so anything the check
    # prints (a decorated function it calls, say) goes to the console and is
    # asserted on by nobody. Swallow it here so it cannot muddy eval output.
    sys.stdout = io.StringIO()
    try:
        exec(compile(check, "<check>", "exec"), ns, ns)
        return True, ""
    except AssertionError as e:
        return False, str(e) or "(assert with no message)"
    except BaseException:
        return False, "the check crashed: " + traceback.format_exc().strip().split("\n")[-1]
    finally:
        sys.stdout = old


# --------------------------------------------------------------- structure

def eval_structure(data, sols, r):
    print(f"\n{BOLD}structure{OFF}")
    stages = data["stages"]
    exercises = [(s, ex) for s in stages for ex in s["exercises"]]

    ids = [ex["id"] for _, ex in exercises]
    dupes = {i for i in ids if ids.count(i) > 1}
    r.check(not dupes, "exercise ids are unique", f"duplicated: {sorted(dupes)}")

    names = [s["name"] for s in stages]
    dupe_names = {n for n in names if names.count(n) > 1}
    r.check(not dupe_names, "stage names are unique", f"duplicated: {sorted(dupe_names)}")

    for stage, ex in exercises:
        for field in ("id", "title", "brief", "starter", "check", "hint"):
            r.check(
                bool(str(ex.get(field, "")).strip()),
                f"{ex['id']}: has {field}",
                f"{field} is empty or missing",
            )
        try:
            compile(ex["check"], f"<{ex['id']}>", "exec")
            r.ok(f"{ex['id']}: check is valid Python")
        except SyntaxError as e:
            r.fail(f"{ex['id']}: check is valid Python", f"SyntaxError: {e}")

        r.check(
            "assert" in ex["check"],
            f"{ex['id']}: check actually asserts something",
            "a check with no assert passes any answer",
        )

    for s in stages:
        r.check(
            bool(s.get("badge", {}).get("label")),
            f"{s['id']}: has a badge",
            "stage is missing badge.label",
        )
        r.check(
            bool(s.get("intro")),
            f"{s['id']}: has lesson text",
            "stage has no intro paragraphs",
        )

    # every stage belongs to exactly one track, and tracks cover all of them
    covered = []
    for t in data["tracks"]:
        covered.extend(range(t["from"], t["to"] + 1))
    r.check(
        sorted(covered) == list(range(len(stages))),
        "tracks cover every stage exactly once",
        f"tracks cover {sorted(covered)} but there are {len(stages)} stages",
    )

    # the XP the UI advertises must match what the exercises actually award
    per = data["xpPerExercise"]
    total_xp = len(exercises) * per
    top_level = max(l["at"] for l in data["levels"])
    r.check(
        top_level <= total_xp,
        "top rank is reachable",
        f"top rank needs {top_level} XP but the course only awards {total_xp}",
    )

    # solutions.json must line up with the curriculum
    missing = [i for i in ids if i not in sols]
    extra = [i for i in sols if i not in ids]
    r.check(not missing, "every exercise has a reference solution", f"missing: {missing}")
    r.check(not extra, "no orphaned solutions", f"solutions for exercises that no longer exist: {extra}")


# --------------------------------------------------------------- curriculum

EMPTY_PROGRAM = "# a learner who has written nothing yet\n"


def eval_curriculum(data, sols, r):
    print(f"\n{BOLD}curriculum{OFF}  {DIM}(reference solutions against the real checks){OFF}")
    for stage in data["stages"]:
        for ex in stage["exercises"]:
            entry = sols.get(ex["id"])
            if not entry:
                r.fail(f"{ex['id']}: solution", "no reference solution in solutions.json")
                continue

            passed, note = run_against_check(entry["solution"], ex["check"])
            r.check(passed, f"{ex['id']}: reference solution passes", note)

            # a check that accepts an empty program accepts anything
            passed, _ = run_against_check(EMPTY_PROGRAM, ex["check"])
            r.check(
                not passed,
                f"{ex['id']}: rejects an empty program",
                "the check passes a learner who wrote nothing",
            )

            for i, bad in enumerate(entry.get("rejects", []), start=1):
                passed, _ = run_against_check(bad, ex["check"])
                first = bad.strip().split("\n")[0][:60]
                r.check(
                    not passed,
                    f"{ex['id']}: rejects wrong answer {i}",
                    f"the check accepted: {first}",
                )


# --------------------------------------------------------------- entry

def main():
    which = [a for a in sys.argv[1:] if not a.startswith("-")]
    data = load_curriculum()
    sols = load_solutions()
    r = Results()

    if not which or "structure" in which:
        eval_structure(data, sols, r)
    if not which or "curriculum" in which:
        eval_curriculum(data, sols, r)

    total = r.passed + len(r.failures)
    print()
    if r.failures:
        print(f"{RED}{len(r.failures)} failed{OFF}, {r.passed} passed, {total} total")
        print(f"{DIM}A failure means an exercise or its check is wrong. Fix the exercise.{OFF}")
        return 1
    print(f"{GREEN}all {total} checks passed{OFF}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
