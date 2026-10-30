import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { angle } from "../src/adapters/angle";
import { lewdle } from "../src/adapters/lewdle";
import { adapterFixtures } from "./adapter-fixtures";
import type { Adapter } from "../src/types";
function read(
  id: "angle" | "lewdle",
  change: (w: Window, storage: Record<string, any>) => void = () => {},
) {
  const fixture = adapterFixtures[id],
    w = new JSDOM(fixture.complete.html, { url: "https://example.com" }).window;
  const storage = structuredClone(fixture.complete.storage);
  try {
    change(w as unknown as Window, storage);
    for (const [k, v] of Object.entries(storage))
      w.localStorage.setItem(k, JSON.stringify(v));
    return ({ angle, lewdle }[id] as Adapter).read(
      w.document,
      w.localStorage,
      fixture.now,
    );
  } finally {
    w.close();
  }
}
test("Lewdle rejects mismatched board, malformed arrays and unfinished feedback", () => {
  for (const change of [
    (w: Window, s: any) => {
      s.words = { length: 6 };
    },
    (w: Window, s: any) => {
      s.highlights = { length: 6 };
    },
    (w: Window, s: any) => {
      s.words[0] = "OTHER";
    },
    (w: Window, s: any) => {
      s.highlights[0] = "BBBBBB";
    },
    (w: Window, s: any) => {
      s.row = 6;
    },
  ])
    assert.notEqual(read("lewdle", change)?.complete, true);
});
test("Lewdle preserves six-letter boards, assisted markers, ghost squares and loss notation", () => {
  const result = read("lewdle", (w, s) => {
    const rows = w.document.querySelectorAll(".testBoardRow");
    rows.forEach((row) =>
      row.querySelectorAll<HTMLElement>(".testTile").forEach((t, j) => {
        t.style.opacity = "1";
        t.textContent = j < 5 ? "SHAFT"[j] : "";
      }),
    );
    s.words = Array(6).fill("SHAFT");
    s.highlights = Array(6).fill("bYLGLL");
    s.row = 5;
    s.gameState = "lost";
    s.easyOnSubmit = true;
  });
  assert.equal(result?.complete, true);
  assert.equal(result?.score, "X/6");
  assert.equal(result?.metrics?.wordLength, 6);
  assert.equal(
    result?.shareText,
    `Lewdle 🍆💦 1746 x/6 🏠\n${Array(6).fill("💡🟨⬛🟩⬛👻").join("\n")}\n\n\nlewdlegame.com\nBy SuperHappyFunTimes`,
  );
});
test("Angle waits for explicit round two skip or completion and rejects stale/inconsistent data", () => {
  for (const change of [
    (w: Window, s: any) => {
      delete s["angle.construct.daily"];
    },
    (w: Window, s: any) => {
      s["angle.construct.daily"]["2026-10-30"] = { attempts: [42] };
    },
    (w: Window, s: any) => {
      s.guesses = { "2026-10-29": s.guesses["2026-10-30"] };
    },
    (w: Window, s: any) => {
      s.guesses["2026-10-30"][0].delta = -100;
    },
    (w: Window, s: any) => {
      s.guesses["2026-10-30"][0].value = NaN;
    },
    (w: Window, s: any) => {
      w.document.querySelector("[data-testid=final-screen]")!.textContent =
        "Angle #1591 · the angle was 101°";
    },
  ])
    assert.notEqual(read("angle", change)?.complete, true);
});
test("Angle retains optional construction results in share and numeric metrics", () => {
  for (const solved of [true, false]) {
    const result = read("angle", (w, s) => {
      s["angle.construct.daily"]["2026-10-30"] = {
        attempts: solved ? [100.5] : [80, 80, 80],
        done: true,
        solved,
      };
      w.document
        .querySelector("[data-testid=final-screen]")!
        .insertAdjacentHTML(
          "beforeend",
          `<p data-testid="result-round2">Round 2: ${solved ? "made it in 1" : "not made"}</p>`,
        );
    });
    assert.equal(result?.complete, true);
    assert.equal(result?.metrics?.constructionSolved, Number(solved));
    assert(
      result?.shareText?.includes(solved ? " · made it in 1" : " · not made"),
    );
  }
});
test("Angle proximity thresholds, direction and loss share match native format", () => {
  for (const [delta, filled] of [
    [4, 4],
    [5, 3],
    [9, 3],
    [10, 2],
    [19, 2],
    [20, 1],
    [49, 1],
    [50, 0],
    [-4, 4],
  ]) {
    const result = read("angle", (w, s) => {
      s.guesses["2026-10-30"] = Array(4).fill({ value: 101 + delta, delta });
    });
    assert.equal(result?.score, "X/4");
    assert.equal(
      result?.shareText,
      `#Angle #1592 X/4\n${Array(4)
        .fill(
          `${delta > 0 ? "⬇️" : "⬆️"} ${"🟧".repeat(filled)}${"⬜".repeat(5 - filled)}`,
        )
        .join("\n")}\nhttps://www.angle.wtf`,
    );
  }
});
