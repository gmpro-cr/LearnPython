// Emits the curriculum as JSON on stdout, so run.py never has to parse
// JavaScript template literals by hand.
//
//   node evals/lib/dump_lessons.js > /tmp/lessons.json
//
// lessons.js is a plain script that declares consts, so it is evaluated in a
// throwaway context and the globals are read back out.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..", "..");
const src = fs.readFileSync(path.join(root, "lessons.js"), "utf8");

const sandbox = {};
vm.createContext(sandbox);
// top-level const/let live in the lexical scope, not on the context object, so
// the script ends with an expression that hands them back
const decls = vm.runInContext(
  src + "\n;({ LEVELS, TRACKS, XP_PER_EXERCISE, STAGES })",
  sandbox,
  { filename: "lessons.js" }
);

const out = {
  levels: decls.LEVELS,
  tracks: decls.TRACKS,
  xpPerExercise: decls.XP_PER_EXERCISE,
  stages: decls.STAGES.map((s) => ({
    id: s.id,
    name: s.name,
    badge: s.badge,
    intro: s.intro,
    exercises: s.exercises.map((ex) => ({
      id: ex.id,
      title: ex.title,
      brief: ex.brief,
      starter: ex.starter,
      check: ex.check,
      hint: ex.hint,
    })),
  })),
};

process.stdout.write(JSON.stringify(out, null, 1));
