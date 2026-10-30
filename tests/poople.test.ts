import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { poople } from "../src/adapters/poople";
import { gameForURL } from "../src/games";
import { adapterFixture as f, pooplePage, words } from "./poople-fixture";
function read(
  html = f.complete.html,
  storage = f.complete.storage,
  url = "https://pooplegame.com/",
) {
  const w = new JSDOM(html, { url }).window;
  try {
    for (const [k, v] of Object.entries(storage))
      w.localStorage.setItem(k, JSON.stringify(v));
    return poople.read(w.document, w.localStorage, f.now);
  } finally {
    w.close();
  }
}
test("Poople win preserves exact native share and submitted progress", () => {
  const r = read()!;
  assert.equal(r.complete, true);
  assert.equal(r.shareText, f.expected.shareText);
  assert.deepEqual(r.metrics, f.expected.metrics);
  assert.equal(read(f.unfinished.html, f.unfinished.storage)?.progress, 1);
});
test("Poople rejects stale, malformed, inconsistent and unlimited states", () => {
  for (const storage of [
    { ...f.complete.storage, dateLastPlayed: 0 },
    { ...f.complete.storage, guesses: {} },
    { ...f.complete.storage, guesses: ["fuss", "poop"] },
    { ...f.complete.storage, guesses: ["fuss", null] },
  ])
    assert.notEqual(read(f.complete.html, storage)?.complete, true);
  for (const html of [
    pooplePage(words, 7),
    pooplePage(words, 6, 441),
    f.complete.html.replace("You used 6", "You used 5"),
    f.complete.html.replace("FUSS →", "COOP →"),
  ])
    assert.notEqual(read(html)?.complete, true);
  assert.equal(gameForURL("https://pooplegame.com/unlimited"), undefined);
});
test("Daily Poople has no loss state: long unfinished paths remain unfinished", () => {
  const path = [
    "fuss",
    ...Array.from({ length: 20 }, () => ["cuss", "fuss"]).flat(),
  ];
  const r = read(pooplePage(path), { ...f.complete.storage, guesses: path })!;
  assert.equal(r.complete, false);
  assert.equal(r.progress, 40);
  assert.equal(r.outcome, undefined);
});
test("Poople ignores a draft row and preserves above-par scores", () => {
  const draft = f.unfinished.html;
  assert.equal(
    read(
      draft.replace("</p>", '</p><div class="h-12 w-12 bg-background">X</div>'),
      f.unfinished.storage,
    )?.progress,
    1,
  );
  const path = ["fuss", "cuss", ...words];
  const result = read(pooplePage(path), {
    ...f.complete.storage,
    guesses: path,
  })!;
  assert.equal(result.score, "8/6");
  assert.equal(result.metrics?.extraGuesses, 2);
});
