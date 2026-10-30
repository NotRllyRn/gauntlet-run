import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { guesstheaudio } from "../src/adapters/guesstheaudio";
import { audioPage, adapterFixture } from "./guesstheaudio-fixture";
function read(f = audioPage(2, "won"), now = adapterFixture.now) {
  const w = new JSDOM(f.html, { url: "https://guesstheaudio.com/" }).window;
  try {
    for (const [k, v] of Object.entries(f.storage))
      w.localStorage.setItem(k, String(v));
    return guesstheaudio.read(w.document, w.localStorage, now);
  } finally {
    w.close();
  }
}
test("GuessTheAudio exact native win/loss text", () => {
  assert.equal(read()?.shareText, adapterFixture.expected.shareText);
  const loss = read(audioPage(6, "lost"));
  assert.equal(loss?.score, "X/6");
  assert.equal(loss?.outcome, "lost");
  assert.equal(
    loss?.shareText,
    "#GuessTheAudio #1276\n\n🔊 🟥 🟥 🟥 🟥 🟥 🟥\n\n#RookieListener\nhttps://GuessTheAudio.com/p/1276",
  );
});
test("GuessTheAudio rejects stale, malformed and incomplete results", () => {
  assert.equal(read(audioPage(1))?.complete, false);
  assert.equal(read(audioPage(6, "lost", 1275)), null);
  assert.notEqual(read(audioPage(2, "lost"))?.complete, true);
  for (const mutate of [
    (f: ReturnType<typeof audioPage>) => {
      delete f.storage["1276_guess1"];
    },
    (f: ReturnType<typeof audioPage>) => {
      f.storage["1276_guess2_f"] = "broken";
    },
    (f: ReturnType<typeof audioPage>) => {
      f.html = f.html.replace("guess-image-success", "");
    },
    (f: ReturnType<typeof audioPage>) => {
      f.html = f.html.replace('class="answer"', 'class="other"');
    },
  ]) {
    const f = audioPage(2, "won");
    mutate(f);
    assert.notEqual(read(f)?.complete, true);
  }
});
test("GuessTheAudio honors share preferences and submitted franchise feedback", () => {
  const f = audioPage(2, "won");
  f.storage.rankToggle = "false";
  f.storage.shareLinkToggle = "false";
  f.storage["1276_guess1_f"] = "true";
  assert.equal(
    read(f)?.shareText,
    "#GuessTheAudio #1276\n\n🔊 🟨 🟩 ⬜ ⬜ ⬜ ⬜",
  );
  f.storage.franchiseToggle = "false";
  assert.match(read(f)!.shareText!, /🔊 🟥 🟩/);
});

test("GuessTheAudio ignores injected heading CSS and preserves member rank badges", () => {
  const f = audioPage(2, "won");
  f.html =
    f.html.replace(
      "Song #1276",
      "Song #1276<style>.rating {color:red}</style>",
    ) + '<button class="setting-btn"><svg stroke="green"></svg></button>';
  assert.equal(
    read(f)?.shareText,
    adapterFixture.expected.shareText?.replace(
      "#RookieListener",
      "🕹️#RookieListener🕹️",
    ),
  );
});
