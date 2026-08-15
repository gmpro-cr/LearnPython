/* PyQuest evals — Firewall balance.
 *
 *   node evals/balance.cjs        # every sector
 *   node evals/balance.cjs -v     # per-sector detail
 *
 * Replays all 19 sectors through the real fwStep loop from firewall.js — no
 * reimplementation, so if the numbers in FW_TOWERS or fwQueueWave move, this
 * moves with them.
 *
 * Asserts the two ends of the difficulty curve the owner sim-tested in July
 * and nothing has protected since:
 *   - a competent defence clears every sector
 *   - an undefended board loses every sector
 * If a sector fails, the balance changed. Decide whether that was intended
 * before touching this file.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const VERBOSE = process.argv.includes("-v");

/* ---------------------------------------------- a browser-shaped nothing */

/* A DOM node that swallows anything asked of it. Winning a sector writes into
   the celebration modal, so getElementById cannot simply return null — but
   nothing here should influence the simulation either. */
function fakeNode() {
  const handler = {
    get(_t, key) {
      if (key === "length") return 0;
      if (key === Symbol.iterator) return [][Symbol.iterator].bind([]);
      if (key === "classList" || key === "style" || key === "dataset") return node;
      return node;
    },
    set() { return true; },
    apply() { return node; },
    has() { return true; },
  };
  const node = new Proxy(function () {}, handler);
  return node;
}

function makeSandbox() {
  const noop = () => {};
  const node = fakeNode();
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    requestAnimationFrame: noop,
    cancelAnimationFrame: noop,
    devicePixelRatio: 1,
    Image: class { set src(_) {} },
    // the game asks the document for HUD nodes; nothing exists, and every
    // caller already guards against that
    document: {
      getElementById: () => node,
      querySelector: () => node,
      querySelectorAll: () => [],
      addEventListener: noop,
      createElement: () => node,
      body: node,
    },
    window: {
      matchMedia: () => ({ matches: false, addEventListener: noop }),
      devicePixelRatio: 1,
      addEventListener: noop,
    },
    // drawing is not part of balance
    ILLO: { defence: () => "", seedling: () => "", stageInk: () => ({ ink: "#000" }) },
    // progress state the engine reads
    state: { xp: 0, done: {}, badges: [], streak: 0, bugs: { cleared: {}, best: {} } },
    saveState: noop,
    refreshHeader: noop,
    refreshSidebar: noop,
    showStage: noop,
    showHome: noop,
    celebrateStage: noop,
    confetti: noop,
    ILLO_ready: true,
    activeStageIdx: null,
    XP_PER_EXERCISE: 10,
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  return sandbox;
}

function loadEngine() {
  const sandbox = makeSandbox();
  const lessons = fs.readFileSync(path.join(ROOT, "lessons.js"), "utf8");
  const firewall = fs.readFileSync(path.join(ROOT, "firewall.js"), "utf8");

  // top-level const/let stay lexical, so each file ends by publishing what the
  // next one needs onto the shared context
  vm.runInContext(
    lessons + "\n;Object.assign(globalThis, { LEVELS, TRACKS, XP_PER_EXERCISE, STAGES });",
    sandbox,
    { filename: "lessons.js" }
  );

  // the engine calls these; in the real app they live in app.js
  vm.runInContext(
    `globalThis.stageDone = () => true;
     globalThis.stageUnlocked = () => true;`,
    sandbox
  );

  vm.runInContext(
    firewall +
      "\n;Object.assign(globalThis, { FW_TOWERS, FW_GRID_W, FW_GRID_H, FW_CELL, fw," +
      " fwLoadSector, fwQueueWave, fwStep, fwSectorWaves, fwCanPlant, fwCanvasClick });",
    sandbox,
    { filename: "firewall.js" }
  );

  return sandbox;
}

/* ---------------------------------------------- a competent player */

/** Cells that can hold a defence, nearest the trail first — where a thinking
 *  player would build. */
function goodCells(S) {
  const { FW_GRID_W, FW_GRID_H, FW_CELL, fw } = S;
  const cells = [];
  for (let cx = 0; cx < FW_GRID_W; cx++) {
    for (let cy = 0; cy < FW_GRID_H; cy++) {
      if (fw.pathCells.has(cx + "," + cy)) continue;
      const px = cx * FW_CELL + FW_CELL / 2;
      const py = cy * FW_CELL + FW_CELL / 2;
      let best = Infinity;
      for (let d = 0; d < fw.pathLen; d += 12) {
        const [tx, ty] = S.fwPointAt ? S.fwPointAt(d) : [0, 0];
        best = Math.min(best, Math.hypot(tx - px, ty - py));
      }
      cells.push({ cx, cy, dist: best });
    }
  }
  return cells.sort((a, b) => a.dist - b.dist);
}

/** How many of a defence a thinking player would own. The Gate deals 1 damage —
 *  it is a slower, not a weapon — and the Sprinkler only pays off against a
 *  crowd, so neither is something to spam. Nothing here is tuned to make the
 *  sectors pass; it is what the stat block implies. */
const WANT_AT_MOST = { cond: 1, loop: 3 };

/** A competent player builds a working line, not a hundred-bed fortress. The
 *  cap keeps the simulation honest as well as fast. */
const MAX_DEFENCES = 12;

/** Value per credit: damage over its cooldown, with the area attack credited
 *  for hitting more than one pest. */
function valuePerCredit(spec) {
  const dps = (spec.dmg / spec.rate) * (spec.aoe ? 2.5 : 1);
  return dps / spec.cost;
}

/** Spend whatever is in the bank on the best value that fits, in the closest
 *  free bed; once there is nothing worth adding, pour it into upgrades. */
function spend(S, cells) {
  const { FW_TOWERS, fw } = S;
  const unlocked = Object.values(FW_TOWERS)
    .filter((t) => fw.sector >= t.unlockSector)
    .sort((a, b) => valuePerCredit(b) - valuePerCredit(a));

  let bought = true;
  while (bought) {
    bought = false;
    if (fw.towers.length >= MAX_DEFENCES) break;
    for (const spec of unlocked) {
      if (fw.credits < spec.cost) continue;
      const owned = fw.towers.filter((t) => t.type === spec.key).length;
      if (owned >= (WANT_AT_MOST[spec.key] || Infinity)) continue;
      const cell = cells.find(
        (c) => !fw.towers.some((t) => t.cx === c.cx && t.cy === c.cy)
      );
      if (!cell) break;
      fw.selectedType = spec.key;
      S.fwCanvasClick(cell.cx, cell.cy);
      bought = true;
      break;
    }
  }

  // no room left to build — pour the rest into upgrades
  for (const t of fw.towers) {
    const cost = Math.round(FW_TOWERS[t.type].cost * 0.6 * t.level);
    while (t.level < 3 && fw.credits >= cost) {
      fw.credits -= cost;
      t.spent += cost;
      t.level += 1;
    }
  }
}

/* ---------------------------------------------- one sector, played out */

function playSector(S, sector, { defended }) {
  const { fw } = S;
  S.fwLoadSector(sector);
  const cells = defended ? goodCells(S) : [];

  if (defended) spend(S, cells);

  fw.phase = "wave";
  fw.wave = 1;
  S.fwQueueWave();

  const DT = 1 / 30;
  let ticks = 0;
  const LIMIT = 30 * 60 * 12; // twelve simulated minutes is a hang, not a game
  let sinceBuy = 0;

  while (fw.phase === "wave" && ticks < LIMIT) {
    S.fwStep(DT);
    ticks++;
    sinceBuy += DT;
    if (defended && sinceBuy >= 1) {
      sinceBuy = 0;
      spend(S, cells);
    }
  }

  return {
    outcome: fw.phase,
    integrity: fw.integrity,
    towers: fw.towers.length,
    waves: fw.waves,
    ticks,
  };
}

/* ---------------------------------------------- run */

function main() {
  const S = loadEngine();
  // fwPointAt is needed by goodCells but is not exported above
  S.fwPointAt = vm.runInContext("fwPointAt", S);

  const sectors = S.STAGES.length - 1; // one Firewall between each pair of stages
  const failures = [];
  let passed = 0;

  console.log(`\nbalance  (${sectors} sectors, replayed through the real engine)`);

  for (let i = 0; i < sectors; i++) {
    const won = playSector(S, i, { defended: true });
    if (won.outcome === "won") {
      passed++;
      if (VERBOSE) {
        console.log(
          `  pass sector ${i + 1}: cleared ${won.waves} waves with ${won.towers} defences,` +
            ` seedling ${won.integrity}/10`
        );
      }
    } else {
      failures.push(
        `sector ${i + 1}: a competent defence did not clear it — ended "${won.outcome}"` +
          ` with ${won.towers} defences after ${won.ticks} ticks`
      );
      console.log(`  FAIL sector ${i + 1}: competent defence lost (${won.outcome})`);
    }

    const bare = playSector(S, i, { defended: false });
    if (bare.outcome === "lost") {
      passed++;
      if (VERBOSE) console.log(`  pass sector ${i + 1}: undefended board falls, as it should`);
    } else {
      failures.push(
        `sector ${i + 1}: an undefended board ended "${bare.outcome}" — the sector is free XP`
      );
      console.log(`  FAIL sector ${i + 1}: undefended board did not lose (${bare.outcome})`);
    }
  }

  console.log();
  if (failures.length) {
    console.log(`${failures.length} failed, ${passed} passed`);
    failures.forEach((f) => console.log("  - " + f));
    console.log("\nThe balance changed. Decide whether that was intended before editing this file.");
    process.exit(1);
  }
  console.log(`all ${passed} balance checks passed`);
}

main();
