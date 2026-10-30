import { test } from "node:test";
import assert from "node:assert/strict";
import { games } from "../src/games";
import {
  newRun,
  observe,
  pause,
  resume,
  recover,
  setFocus,
  settle,
  nextGame,
  projected,
} from "../src/run/engine";
import { summary } from "../src/sharing";
import type { Observation } from "../src/types";
const run = () => newRun(["wordle", "globle"], false, games, 0);
const snapshot = (
  game: string,
  progress = 0,
  complete = false,
): Observation => ({
  game,
  puzzleId: `${game}:today`,
  progress,
  complete,
  ...(complete
    ? {
        outcome: "won",
        score: `${progress} guesses`,
        shareText: "safe share",
        checkpoint: { secret: "answer" },
        spoiler: { secret: "answer" },
      }
    : {}),
});
test("game timers follow focused game tabs; research and unfocused windows count only globally", () => {
  const r = run();
  setFocus(r, { gameId: "wordle", tabId: 1 }, 0);
  setFocus(r, { gameId: "wordle", tabId: 1 }, 2000);
  setFocus(r, null, 4000);
  setFocus(r, { gameId: "globle", tabId: 3 }, 10000);
  settle(r, 13000);
  assert.equal(r.clock.totalMs, 13000);
  assert.equal(r.games.wordle.activeMs, 4000);
  assert.equal(r.games.globle.activeMs, 3000);
});
test("switching unfinished games and duplicate tabs never double-counts; next wraps to unfinished game", () => {
  const r = run();
  setFocus(r, { gameId: "wordle", tabId: 1 }, 0);
  observe(r, snapshot("wordle", 3), 1000);
  setFocus(r, { gameId: "globle", tabId: 2 }, 2000);
  observe(r, snapshot("globle", 1, true), 3000);
  assert.equal(nextGame(r), "wordle");
  setFocus(r, { gameId: "wordle", tabId: 4 }, 4000);
  setFocus(r, { gameId: "wordle", tabId: 1 }, 5000);
  settle(r, 6000);
  assert.equal(r.games.wordle.activeMs, 4000);
  assert.equal(r.games.wordle.progress, 3);
  assert.equal(r.games.globle.activeMs, 1000);
});
test("pause freezes both timers; resume starts a fresh interval", () => {
  const r = run();
  setFocus(r, { gameId: "wordle", tabId: 1 }, 0);
  pause(r, 3000);
  observe(r, snapshot("globle", 1, true), 10000);
  settle(r, 90000);
  assert.equal(r.clock.totalMs, 3000);
  assert.equal(r.games.wordle.activeMs, 3000);
  assert.equal(r.games.globle.result, null);
  resume(r, 100000);
  setFocus(r, { gameId: "wordle", tabId: 1 }, 100000);
  settle(r, 102000);
  assert.equal(r.clock.totalMs, 5000);
  assert.equal(r.games.wordle.activeMs, 5000);
});
test("browser recovery keeps last checkpoint, partial guesses, and results, excluding offline time", () => {
  const original = run();
  setFocus(original, { gameId: "wordle", tabId: 1 }, 0);
  observe(original, snapshot("wordle", 3), 2000);
  const r = JSON.parse(JSON.stringify(original));
  recover(r);
  assert.equal(r.status, "paused");
  assert.equal(r.games.wordle.progress, 3);
  resume(r, 86400000);
  settle(r, 86401000);
  assert.equal(r.clock.totalMs, 3000);
  assert.equal(r.games.wordle.activeMs, 2000);
});
test("worker suspension is not browser restart; total remains continuous and game lease expires", () => {
  const r = run();
  setFocus(r, { gameId: "wordle", tabId: 1 }, 0);
  settle(r, 3600000);
  assert.equal(r.clock.totalMs, 3600000);
  assert.equal(r.games.wordle.activeMs, 5000);
});
test("completion is idempotent and finishing in reverse order stops total at last solve", () => {
  const r = run();
  observe(r, snapshot("wordle"), 0);
  observe(r, snapshot("globle"), 0);
  observe(r, snapshot("globle", 2, true), 2000);
  observe(r, snapshot("wordle", 4, true), 4000);
  observe(r, snapshot("wordle", 4, true), 8000);
  settle(r, 10000);
  assert.equal(r.status, "complete");
  assert.equal(r.clock.totalMs, 4000);
  assert.equal(r.games.wordle.result?.completedAt, 4000);
});
test("preexisting puzzles are marked untimed and stale duplicate tabs cannot roll back progress", () => {
  const r = run();
  observe(r, snapshot("globle", 2, true), 1000);
  assert.equal(r.games.globle.result?.preexisting, true);
  observe(r, snapshot("wordle", 3), 2000);
  observe(r, snapshot("wordle", 1), 3000);
  assert.equal(r.games.wordle.progress, 3);
});
test("daily rollover pauses rather than silently replacing saved game state", () => {
  const r = run();
  observe(r, snapshot("wordle", 3), 1000);
  observe(r, { ...snapshot("wordle"), puzzleId: "wordle:tomorrow" }, 2000);
  assert.equal(r.status, "paused");
  assert.equal(r.games.wordle.progress, 3);
  assert.equal(r.games.wordle.puzzleId, "wordle:today");
});
test("canonical summaries do not depend on play order and do not leak progress or spoilers", () => {
  const r = run();
  r.order.reverse();
  observe(r, snapshot("globle", 2, true), 1000);
  const text = summary(r);
  assert(text.indexOf("Wordle:") < text.indexOf("Globle:"));
  assert(!text.includes("answer"));
  const subset = newRun(["globle"], false, games, 0);
  assert(summary(subset).includes("Wordle: Not included"));
});
test("selection validation, shuffled membership, and timer projections leave durable state unchanged", () => {
  for (const ids of [[], ["wordle", "wordle"], ["unknown"]])
    assert.throws(() => newRun(ids, false, games, 0));
  for (let i = 0; i < 20; i++)
    assert.deepEqual(
      newRun(["wordle", "globle"], true, games, 0).order.sort(),
      ["globle", "wordle"],
    );
  const r = run();
  const display = projected(r, 1000);
  assert.equal(display.clock.totalMs, 1000);
  assert.equal(r.clock.totalMs, 0);
});
