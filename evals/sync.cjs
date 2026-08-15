/* PyQuest evals — progress merge.
 *
 *   node evals/sync.cjs
 *
 * mergeProgress decides what happens to work someone already did when they
 * sign in for the first time. Get it wrong and a learner loses finished
 * stages — the one bug in this feature they would never forgive and might
 * never report. So it is tested against the real function in sync.js.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");

const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  window: { location: { origin: "", pathname: "" } },
  document: { getElementById: () => null },
  SUPABASE_CONFIG: { url: "", anonKey: "" },
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync(path.join(ROOT, "sync.js"), "utf8") +
    "\n;Object.assign(globalThis, { mergeProgress, syncConfigured });",
  sandbox,
  { filename: "sync.js" }
);
const { mergeProgress, syncConfigured } = sandbox;

let passed = 0;
const failures = [];

/* badges are only ever membership-tested (state.badges.includes), so their
   order carries no meaning and must not be asserted */
function sortBadges(o) {
  return o && o.badges ? { ...o, badges: [...o.badges].sort() } : o;
}

function check(name, got, want) {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { passed++; return; }
  failures.push(`${name}\n       got:  ${g}\n       want: ${w}`);
  console.log(`  FAIL ${name}\n       got:  ${g}\n       want: ${w}`);
}

function ok(name, cond, detail) {
  if (cond) { passed++; return; }
  failures.push(`${name}: ${detail}`);
  console.log(`  FAIL ${name} — ${detail}`);
}

const empty = { xp: 0, done: {}, badges: [], streak: 0, bugs: { cleared: {}, best: {} } };

console.log("\nsync  (progress merge)");

/* the config gate: with nothing filled in, sync must stay switched off */
ok("inert without config", syncConfigured() === false, "syncConfigured() is true with empty config");

/* a first sign-in on a device that has done work, with nothing on the server */
check(
  "local work survives when the server has nothing",
  mergeProgress({ ...empty, xp: 30, done: { "hello-1": true } }, null),
  { ...empty, xp: 30, done: { "hello-1": true } }
);

/* a fresh device signing in to an account that has progress */
check(
  "server progress arrives on a fresh device",
  mergeProgress(empty, { ...empty, xp: 50, done: { "var-1": true } }),
  { xp: 50, done: { "var-1": true }, badges: [], streak: 0, bugs: { cleared: {}, best: {} } }
);

/* the case that matters: work on both sides, none of it may be lost */
check(
  "two devices' work is unioned, not chosen between",
  sortBadges(mergeProgress(
    { xp: 30, done: { "hello-1": true, "hello-2": true }, badges: ["hello"], streak: 2,
      bugs: { cleared: { 0: true }, best: { 0: 8 } } },
    { xp: 50, done: { "var-1": true }, badges: ["variables"], streak: 5,
      bugs: { cleared: { 1: true }, best: { 0: 6, 1: 10 } } }
  )),
  {
    xp: 50,
    done: { "var-1": true, "hello-1": true, "hello-2": true },
    badges: ["hello", "variables"],
    streak: 5,
    bugs: { cleared: { 0: true, 1: true }, best: { 0: 8, 1: 10 } },
  }
);

/* best is "leaves left on the seedling", so higher wins */
check(
  "the better Firewall run is kept",
  mergeProgress(
    { ...empty, bugs: { cleared: {}, best: { 3: 9 } } },
    { ...empty, bugs: { cleared: {}, best: { 3: 4 } } }
  ).bugs.best,
  { 3: 9 }
);

/* badges must not accumulate duplicates across repeated sign-ins */
check(
  "badges do not duplicate",
  mergeProgress(
    { ...empty, badges: ["hello", "loops"] },
    { ...empty, badges: ["loops", "lists"] }
  ).badges.sort(),
  ["hello", "lists", "loops"]
);

/* a signed-in learner who has done nothing yet must not wipe their account */
check(
  "an untouched device does not erase the account",
  sortBadges(mergeProgress(empty, { ...empty, xp: 120, done: { "fn-1": true }, badges: ["functions"] })),
  { xp: 120, done: { "fn-1": true }, badges: ["functions"], streak: 0, bugs: { cleared: {}, best: {} } }
);

/* malformed rows must not throw — a corrupt row should degrade, not break */
ok(
  "survives a malformed server row",
  (() => {
    try { mergeProgress(empty, { xp: "nonsense", done: null, badges: null, bugs: null }); return true; }
    catch (e) { return false; }
  })(),
  "mergeProgress threw on a malformed row"
);

console.log();
if (failures.length) {
  console.log(`${failures.length} failed, ${passed} passed`);
  process.exit(1);
}
console.log(`all ${passed} merge checks passed`);
