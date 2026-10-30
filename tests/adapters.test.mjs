import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import fs from "node:fs";
const source = ["core.js", "adapters/wordle.js", "adapters/globle.js"]
  .map((f) => fs.readFileSync(`extension/${f}`, "utf8"))
  .join("\n");
function env(html = "") {
  const dom = new JSDOM(html, {
    url: "https://example.com",
    runScripts: "outside-only",
  });
  dom.window.eval(source);
  return dom.window;
}
const now = new Date(2026, 9, 30, 12);
function board(rows) {
  return `<main id="wordle-app-game"><div class="Board-module_board__abc">${Array.from({ length: 6 }, (_, i) => `<div role="group">${Array.from({ length: 5 }, (_, j) => `<div data-state="${rows[i]?.[j] || "empty"}">${rows[i] ? "crane"[j] : ""}</div>`).join("")}</div>`).join("")}</div></main>`;
}
test("Wordle ignores help example tiles and an incomplete row", () => {
  const w = env(
    `<div data-state="correct">a</div>${board([["correct", "correct", "correct", "correct", "tbd"]])}`,
  );
  assert.equal(
    w.Gauntlet.adapters.wordle.read(w.document, w.localStorage, now).complete,
    false,
  );
});
test("Wordle detects a win and reconstructs a spoiler-free share grid", () => {
  const w = env(
    board([
      ["absent", "present", "absent", "correct", "absent"],
      Array(5).fill("correct"),
    ]),
  );
  const s = w.Gauntlet.adapters.wordle.read(w.document, w.localStorage, now);
  assert.equal(s.score, "2/6");
  assert.equal(s.outcome, "won");
  assert.equal(s.shareText, "Wordle 1,959 2/6\n\n⬜🟨⬜🟩⬜\n🟩🟩🟩🟩🟩");
  assert.equal(s.shareText.includes("crane"), false);
});
test("Wordle detects a loss only when all six rows are evaluated", () => {
  const w = env(
    board(Array.from({ length: 6 }, () => Array(5).fill("absent"))),
  );
  const s = w.Gauntlet.adapters.wordle.read(w.document, w.localStorage, now);
  assert.equal(s.outcome, "lost");
  assert.equal(s.score, "X/6");
});
function globle(day = "2026-10-30", lastWin = day) {
  const w = env(
    '<input data-cy="guesser" disabled><div class="scene-container"><canvas></canvas></div>',
  );
  w.localStorage.setItem(
    "guesses",
    JSON.stringify({ day, countries: ["France", "Japan"] }),
  );
  w.localStorage.setItem(
    "statistics",
    JSON.stringify({
      lastWin,
      usedGuesses: [4, 2],
      emojiGuesses: "🟥🟩",
      currentStreak: 2,
    }),
  );
  return w;
}
test("Globle uses current-day statistics and matches native share text", () => {
  const w = globle();
  const s = w.Gauntlet.adapters.globle.read(w.document, w.localStorage, now);
  assert.equal(s.complete, true);
  assert.equal(
    s.shareText,
    "🌎 Oct 30, 2026 🌍\n🔥 2 | Avg. Guesses: 3\n🟥🟩 = 2\n\nhttps://globle-game.com\n#globle",
  );
});
test("Globle refuses yesterday, mismatched counts, and an unfinished form", () => {
  for (const mutation of [
    (w) =>
      w.localStorage.setItem(
        "statistics",
        JSON.stringify({
          lastWin: "2026-10-29",
          usedGuesses: [2],
          emojiGuesses: "🟩",
        }),
      ),
    (w) =>
      w.localStorage.setItem(
        "statistics",
        JSON.stringify({
          lastWin: "2026-10-30",
          usedGuesses: [9],
          emojiGuesses: "🟩",
        }),
      ),
    (w) => (w.document.querySelector("input").disabled = false),
  ]) {
    const w = globle();
    mutation(w);
    assert.equal(
      w.Gauntlet.adapters.globle.read(w.document, w.localStorage, now).complete,
      false,
    );
  }
  const w = globle("2026-10-29");
  assert.equal(
    w.Gauntlet.adapters.globle.read(w.document, w.localStorage, now),
    null,
  );
});
test("Malformed storage does not create a Globle win", () => {
  const w = globle();
  w.localStorage.setItem("statistics", "{bad");
  assert.equal(
    w.Gauntlet.adapters.globle.read(w.document, w.localStorage, now).complete,
    false,
  );
});
test("Canonical share layout is independent of play order and excludes spoilers", () => {
  const w = env(),
    G = w.Gauntlet;
  const run = {
    createdAt: 0,
    startedAt: 0,
    finishedAt: 1000,
    status: "complete",
    order: ["globle", "wordle"],
    results: {
      wordle: {
        outcome: "won",
        score: "2/6",
        elapsedMs: 800,
        spoiler: { answer: "crane" },
      },
    },
  };
  const summary = G.summary(run);
  assert(summary.indexOf("Wordle:") < summary.indexOf("Globle:"));
  assert(!summary.includes("crane"));
  run.order = ["globle"];
  assert(G.summary(run).includes("Wordle: Not included"));
});
test("Run validates selections and randomization preserves the selected set", () => {
  const G = env().Gauntlet;
  assert.throws(() => G.newRun([]));
  assert.throws(() => G.newRun(["wordle", "wordle"]));
  assert.throws(() => G.newRun(["unknown"]));
  for (let i = 0; i < 20; i++)
    assert.deepEqual([...G.newRun(["globle", "wordle"], true).order].sort(), [
      "globle",
      "wordle",
    ]);
});

test("Globle accepts the RFC date string observed in the live game", () => {
  const w = globle("2026-10-30", now.toUTCString());
  assert.equal(
    w.Gauntlet.adapters.globle.read(w.document, w.localStorage, now).complete,
    true,
  );
});
test("Wordle respects current persisted hard mode and high-contrast/dark settings", () => {
  const w = env(
    board([
      ["absent", "present", "correct", "absent", "absent"],
      Array(5).fill("correct"),
    ]),
  );
  w.localStorage.setItem(
    "games-settings-wordleV2/ANON",
    JSON.stringify({
      states: [
        {
          puzzleId: "settings",
          timestamp: 10,
          data: { hardMode: true, darkMode: true, colorblindMode: true },
        },
      ],
    }),
  );
  w.localStorage.setItem("nyt-wordle-darkmode", "true");
  const s = w.Gauntlet.adapters.wordle.read(w.document, w.localStorage, now);
  assert(s.shareText.startsWith("Wordle 1,959 2/6*"));
  assert(s.shareText.includes("⬛🟦🟧⬛⬛"));
});
