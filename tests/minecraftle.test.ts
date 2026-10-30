import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { minecraftle } from "../src/adapters/minecraftle";
import { minecraftlePage } from "./minecraftle-fixture";
const now = new Date(2026, 9, 30, 12);
function read(html: string, url = "https://minecraftle.zachmanson.com/") {
  const w = new JSDOM(html, { url }).window;
  try {
    return minecraftle.read(w.document, w.localStorage, now);
  } finally {
    w.close();
  }
}
test("Minecraftle preserves exact native win/loss share grids and high contrast", () => {
  for (const outcome of ["won", "lost"] as const)
    for (const contrast of [false, true]) {
      const f = minecraftlePage({ count: 10, outcome, contrast }),
        result = read(f.html)!;
      assert.equal(result.complete, true);
      assert.equal(result.outcome, outcome);
      assert.equal(result.score, outcome === "won" ? "10/10" : "X/10");
      assert.equal(result.guesses, 10);
      assert.equal(result.shareText, f.shareText);
      // Native loss text says 10/10; structured outcome retains the distinction.
      assert(result.shareText!.startsWith("Minecraftle 2026-10-30 10/10\n"));
      assert(!result.shareText!.includes("Diamond Axe"));
    }
});
test("Minecraftle rejects random mode, malformed or inconsistent completion dialogs", () => {
  const f = minecraftlePage({ count: 2, outcome: "won" });
  assert.equal(
    read(f.html, "https://minecraftle.zachmanson.com/?random=true"),
    null,
  );
  for (const html of [
    f.html.replace("Took 2", "Took 3"),
    f.html.replace("2/10", "3/10"),
    f.html.replace("🟩🟩🟩", "SECRET"),
    f.html.replace("won!", "lost!"),
    f.html.replace('class="whitespace-pre"', 'class="other"'),
    f.html.replace("2026-10-30", "2026-10-29"),
  ])
    assert.notEqual(read(html)?.complete, true);
});
test("Minecraftle counts submitted grids, not the active draft", () => {
  assert.equal(read(minecraftlePage({ count: 4 }).html)?.progress, 3);
  assert.equal(read(minecraftlePage().html)?.progress, 0);
});
