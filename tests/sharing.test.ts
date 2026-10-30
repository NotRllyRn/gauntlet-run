import test from "node:test";
import assert from "node:assert/strict";
import { newRun } from "../src/run/engine";
import { games } from "../src/games";
import { shareHeader, summary, spoilerImage } from "../src/sharing";
import { adapterFixtures } from "./adapter-fixtures";

test("compact daily share uses one header, colored point rows, and no native grids or answers", () => {
  const run = newRun(
    ["wordle", "globle", "krillion"],
    false,
    games,
    Date.UTC(2026, 9, 30),
  );
  run.clock.totalMs = 950000;
  run.games.wordle.result = {
    ...adapterFixtures.wordle.expected,
    outcome: "won",
    score: "1/6",
    shareText: adapterFixtures.wordle.expected.shareText!,
    shareSource: "native",
    completedAt: 1,
    preexisting: false,
    spoiler: "CRANE",
  };
  assert.equal(
    shareHeader(run),
    "GAUNTLET RUN · v7 Oct 30 26 · score: 1000 · time: 15:50",
  );
  const text = summary(run);
  assert(text.includes("🟩 Wordle: 1000 pts"));
  assert(text.includes("⏳ Globle: Unfinished"));
  assert(text.includes("⬜ Minecraftle: Not included"));
  for (const hidden of ["Status:", "/ 10000", "CRANE", "1/6", "🟩🟩🟩🟩🟩"])
    assert(!text.includes(hidden));
  assert(text.includes("Provisional score"));
  run.games.wordle.result.outcome = "lost";
  assert(summary(run).includes("🟨 Wordle:"));
  run.games.wordle.result.shareText = "unsupported";
  assert(summary(run).includes("❔ Wordle: score unavailable"));
});

test("image header includes score and omits spoiler and status labels", async () => {
  const run = newRun(["wordle"], false, games, Date.UTC(2026, 9, 30));
  const drawn: string[] = [];
  const original = globalThis.document;
  const context = {
    fillRect() {},
    fillText(text: string) {
      drawn.push(text);
    },
  };
  globalThis.document = {
    createElement: () => ({
      getContext: () => context,
      toBlob: (callback: (blob: Blob) => void) =>
        callback(new Blob(["png"], { type: "image/png" })),
    }),
  } as unknown as Document;
  try {
    const blob = await spoilerImage(run, {}, []);
    assert.equal(blob.type, "image/png");
    assert.equal(drawn[0], shareHeader(run));
    assert(!drawn.join(" ").toLowerCase().includes("spoiler"));
    assert(!drawn.join(" ").includes("running"));
  } finally {
    globalThis.document = original;
  }
});
