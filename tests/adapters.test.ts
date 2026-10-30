import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { wordle } from "../src/adapters/wordle";
import { globle as globleAdapter } from "../src/adapters/globle";
function env(html = "") {
  return new JSDOM(html, { url: "https://example.com" }).window;
}
const now = new Date(2026, 9, 30, 12);
function board(rows: string[][]) {
  return `<main id="wordle-app-game"><div class="Board-module_board__abc">${Array.from({ length: 6 }, (_, i) => `<div role="group">${Array.from({ length: 5 }, (_, j) => `<div data-state="${rows[i]?.[j] || "empty"}">${rows[i] ? "crane"[j] : ""}</div>`).join("")}</div>`).join("")}</div></main>`;
}
test("Wordle ignores help example tiles and an incomplete row", () => {
  const w = env(
    `<div data-state="correct">a</div>${board([["correct", "correct", "correct", "correct", "tbd"]])}`,
  );
  assert.equal(wordle.read(w.document, w.localStorage, now)!.complete, false);
});
test("Wordle detects a win and reconstructs a spoiler-free share grid", () => {
  const w = env(
    board([
      ["absent", "present", "absent", "correct", "absent"],
      Array(5).fill("correct"),
    ]),
  );
  const s = wordle.read(w.document, w.localStorage, now)!;
  assert.equal(s.score, "2/6");
  assert.equal(s.outcome, "won");
  assert.equal(s.shareText, "Wordle 1,959 2/6\n\n⬜🟨⬜🟩⬜\n🟩🟩🟩🟩🟩");
  assert.equal(s.shareText!.includes("crane"), false);
});
test("Wordle detects a loss only when all six rows are evaluated", () => {
  const w = env(
    board(Array.from({ length: 6 }, () => Array(5).fill("absent"))),
  );
  const s = wordle.read(w.document, w.localStorage, now)!;
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
  const s = globleAdapter.read(w.document, w.localStorage, now)!;
  assert.equal(s.complete, true);
  assert.equal(
    s.shareText,
    "🌎 Oct 30, 2026 🌍\n🔥 2 | Avg. Guesses: 3\n🟥🟩 = 2\n\nhttps://globle-game.com\n#globle",
  );
});
test("Globle refuses yesterday, mismatched counts, and an unfinished form", () => {
  for (const mutation of [
    (w: ReturnType<typeof env>) =>
      w.localStorage.setItem(
        "statistics",
        JSON.stringify({
          lastWin: "2026-10-29",
          usedGuesses: [2],
          emojiGuesses: "🟩",
        }),
      ),
    (w: ReturnType<typeof env>) =>
      w.localStorage.setItem(
        "statistics",
        JSON.stringify({
          lastWin: "2026-10-30",
          usedGuesses: [9],
          emojiGuesses: "🟩",
        }),
      ),
    (w: ReturnType<typeof env>) =>
      (w.document.querySelector("input")!.disabled = false),
  ]) {
    const w = globle();
    mutation(w);
    assert.equal(
      globleAdapter.read(w.document, w.localStorage, now)!.complete,
      false,
    );
  }
  const w = globle("2026-10-29");
  assert.equal(globleAdapter.read(w.document, w.localStorage, now), null);
});
test("Malformed storage does not create a Globle win", () => {
  const w = globle();
  w.localStorage.setItem("statistics", "{bad");
  assert.equal(
    globleAdapter.read(w.document, w.localStorage, now)!.complete,
    false,
  );
});
test("Globle accepts the RFC date string observed in the live game", () => {
  const w = globle("2026-10-30", now.toUTCString());
  assert.equal(
    globleAdapter.read(w.document, w.localStorage, now)!.complete,
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
  const s = wordle.read(w.document, w.localStorage, now)!;
  assert(s.shareText!.startsWith("Wordle 1,959 2/6*"));
  assert(s.shareText!.includes("⬛🟦🟧⬛⬛"));
});

test("Globle preserves the multiline non-spoiler share result", () => {
  const w = globle();
  w.localStorage.setItem(
    "guesses",
    JSON.stringify({
      day: "2026-10-30",
      countries: Array(12).fill("France"),
    }),
  );
  w.localStorage.setItem(
    "statistics",
    JSON.stringify({
      lastWin: now.toUTCString(),
      usedGuesses: [12],
      currentStreak: 1,
      emojiGuesses: "⬜🟧🟥🟥🟧⬜⬜🟧\n🟥🟥🟥🟩",
    }),
  );
  const result = globleAdapter.read(w.document, w.localStorage, now)!;
  assert.equal(
    result.shareText,
    "🌎 Oct 30, 2026 🌍\n🔥 1 | Avg. Guesses: 12\n⬜🟧🟥🟥🟧⬜⬜🟧\n🟥🟥🟥🟩 = 12\n\nhttps://globle-game.com\n#globle",
  );
  assert(!result.shareText!.includes("France"));
});
