import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { costcodle, costcodleNumber } from "../src/adapters/costcodle";
import { costcodlePage, adapterFixture } from "./costcodle-fixture";
function read(won = true, count = 2, mutate = (w: Window, s: any) => {}) {
  const f = costcodlePage(won, count),
    w = new JSDOM(f.html, { url: "https://costcodle.com/" }).window;
  try {
    mutate(w as unknown as Window, f.storage);
    for (const [k, v] of Object.entries(f.storage))
      w.localStorage.setItem(k, JSON.stringify(v));
    return costcodle.read(w.document, w.localStorage, adapterFixture.now);
  } finally {
    w.close();
  }
}
test("Costcodle win/loss preserve exact shares and numeric guesses", () => {
  for (const [won, count] of [
    [true, 1],
    [true, 6],
    [false, 6],
  ] as const) {
    const r = read(won, count);
    assert.equal(r?.complete, true);
    assert.equal(r?.score, `${won ? count : "X"}/6`);
    assert.equal(
      r?.shareText,
      `Costcodle #1137 ${won ? count : "X"}/6\n${Array.from({ length: count }, (_, i) => (won && i === count - 1 ? "✅" : "⬆️🟥")).join("\n")}\nhttps://costcodle.com`,
    );
  }
});
test("Costcodle refuses stale, invalid, mismatched and unfinished results", () => {
  for (const change of [
    (w: Window, s: any) => {
      s.state.gameNumber--;
    },
    (w: Window, s: any) => {
      s.state.guesses = { length: 2 };
    },
    (w: Window, s: any) => {
      s.state.hasWon = false;
    },
    (w: Window, s: any) => {
      s.state.guesses[0].direction = "wrong";
    },
    (w: Window, s: any) => {
      s.state.guesses[0].guess = "NaN";
    },
    (w: Window, s: any) => {
      w.document.getElementById("1")!.textContent = "wrong";
    },
    (w: Window, s: any) => {
      w.document.getElementById("game-stats")!.textContent =
        "You win! The price was $100";
    },
    (w: Window, s: any) => {
      w.document.getElementById("share-button")!.remove();
    },
  ])
    assert.notEqual(read(true, 2, change)?.complete, true);
  assert.notEqual(read(false, 5)?.complete, true);
});
test("Costcodle near feedback and down arrows match native share", () => {
  const r = read(true, 2, (w, s) => {
    s.state.guesses[0] = {
      guess: "12.00",
      closeness: "guess-near",
      direction: "&darr;",
    };
    w.document.getElementById("1")!.innerHTML =
      '<div class="guess-value-container">$12.00</div><div class="guess-direction-container guess-near">↓</div>';
  });
  assert(r?.shareText?.includes("⬇️🟨\n✅"));
});
test("Costcodle mirrors native ceil date numbering, including midnight", () => {
  assert.equal(costcodleNumber(new Date(2023, 8, 21)), 1);
  assert.equal(costcodleNumber(new Date(2023, 8, 21, 0, 0, 1)), 2);
});
