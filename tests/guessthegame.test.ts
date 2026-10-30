import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { guessthegame } from "../src/adapters/guessthegame";
import { adapterFixture as f, gameHtml } from "./guessthegame-fixture";
function env(state = "win", count = 1) {
  const w = new JSDOM(gameHtml(state), { url: "https://guessthe.game/" })
    .window;
  w.localStorage.setItem("1630_gamestate", state);
  for (let i = 1; i <= count; i++) {
    w.localStorage.setItem(
      `1630_guess${i}`,
      state === "win" && i === count ? "Portal" : "Skipped!",
    );
    w.localStorage.setItem(`1630_guess${i}_f`, "false");
  }
  return w;
}
const read = (w: ReturnType<typeof env>) =>
  guessthegame.read(w.document, w.localStorage, f.now);
test("GuessTheGame win reproduces native share format", () => {
  const r = read(env())!;
  assert.equal(r.shareText, f.expected.shareText);
  assert.equal(r.score, "1/6");
  assert.deepEqual(r.spoiler, { answer: "Portal", guesses: ["Portal"] });
});
test("GuessTheGame loss requires six submitted guesses and revealed panel", () => {
  assert.equal(read(env("lose", 5))?.complete, false);
  assert.equal(read(env("lose", 6))?.score, "X/6");
  const w = env();
  w.document.querySelector(".result")!.remove();
  assert.equal(read(w)?.complete, false);
});
test("GuessTheGame ignores stale, malformed and incomplete state", () => {
  for (const mutate of [
    (w: ReturnType<typeof env>) =>
      w.localStorage.setItem("1630_gamestate", "{bad"),
    (w: ReturnType<typeof env>) => w.localStorage.removeItem("1630_guess1"),
    (w: ReturnType<typeof env>) => w.localStorage.setItem("1630_guess3", "gap"),
    (w: ReturnType<typeof env>) =>
      w.localStorage.setItem("1630_guess1_f", "bad"),
    (w: ReturnType<typeof env>) =>
      (w.document.querySelector(".current-game-number")!.textContent =
        "Game #1629"),
  ]) {
    const w = env();
    mutate(w);
    assert.notEqual(read(w)?.complete, true);
  }
  assert.equal(read(env("playing", 1))?.complete, false);
});
test("GuessTheGame honors share preferences and franchise feedback", () => {
  const w = env("win", 2);
  w.localStorage.setItem("1630_guess1_f", "true");
  w.localStorage.setItem("rankToggle", "false");
  w.localStorage.setItem("shareLinkToggle", "false");
  assert.equal(
    read(w)?.shareText,
    "#GuessTheGame #1630\n\n🎮 🟨 🟩 ⬜ ⬜ ⬜ ⬜",
  );
  w.localStorage.setItem("franchiseToggle", "false");
  assert.match(read(w)!.shareText!, /🟥 🟩/);
});
