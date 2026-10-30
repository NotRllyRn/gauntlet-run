import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { games } from "../src/games";
import { newRun, observe } from "../src/run/engine";
import { validObservation } from "../src/run/validation";
import { summary } from "../src/sharing";
import { adapterFixtures, type PageFixture } from "./adapter-fixtures";
function fixturePage(fixture: PageFixture) {
  const window = new JSDOM(fixture.html, { url: "https://example.com" }).window;
  for (const [key, value] of Object.entries(fixture.storage))
    window.localStorage.setItem(key, JSON.stringify(value));
  return window;
}
test("every registered game supplies shared regression fixtures", () => {
  assert.deepEqual(
    Object.keys(adapterFixtures).sort(),
    games.map((g) => g.id).sort(),
  );
});
for (const game of games) {
  const fixture = adapterFixtures[game.id];
  test(`${game.name}: progress, completion, share text, metrics, capture target, and persistence contract`, () => {
    assert(
      fixture,
      "Add the game's fixture; shared assertions run automatically.",
    );
    const partial = fixturePage(fixture.unfinished),
      complete = fixturePage(fixture.complete);
    try {
      const before = game.adapter.read(
        partial.document,
        partial.localStorage,
        fixture.now,
      )!;
      const after = game.adapter.read(
        complete.document,
        complete.localStorage,
        fixture.now,
      )!;
      assert(validObservation(before));
      assert(validObservation(after));
      assert.equal(before.complete, false);
      assert.equal(after.complete, true);
      assert.equal(after.game, game.id);
      for (const [key, value] of Object.entries(fixture.expected))
        assert.deepEqual(after[key as keyof typeof after], value);
      assert(
        complete.document.querySelector(
          game.adapter.captureBackground
            ? game.adapter.boardSelector
            : game.adapter.resultSelector!,
        ),
      );
      const run = newRun([game.id], false, games, 0);
      observe(run, before, 100);
      observe(run, after, 200);
      const saved = JSON.parse(JSON.stringify(run));
      assert.equal(saved.status, "complete");
      assert.equal(saved.games[game.id].result.shareText, after.shareText);
      assert.deepEqual(saved.games[game.id].result.metrics, after.metrics);
      assert.equal(saved.games[game.id].result.preexisting, false);
      const durable = JSON.stringify(run);
      observe(run, after, 300);
      assert.equal(JSON.stringify(run), durable);
      for (const secret of fixture.spoilers) {
        assert(!after.shareText!.includes(secret));
        assert(!summary(run).includes(secret));
      }
    } finally {
      partial.close();
      complete.close();
    }
  });
  test(`${game.name}: empty/unrelated DOM and malformed storage never complete`, () => {
    for (const html of [
      "<main>Unrelated page</main>",
      fixture?.complete.html ?? "",
    ]) {
      const w = fixturePage({ html, storage: {} });
      for (const key of Object.keys(fixture?.complete.storage ?? {}))
        w.localStorage.setItem(key, "{bad");
      // Some adapters can derive completion entirely from the visible board.
      if (html === fixture?.complete.html && !fixture.storageRequired) {
        w.close();
        continue;
      }
      assert.notEqual(
        game.adapter.read(w.document, w.localStorage, fixture.now)?.complete,
        true,
      );
      w.close();
    }
  });
}
