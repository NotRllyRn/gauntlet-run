import test from "node:test";
import assert from "node:assert/strict";
import {
  scoreGame,
  scoreRun,
  scoringDefaults,
  scoreLabel,
} from "../src/scoring";
import { games } from "../src/games";
import { newRun } from "../src/run/engine";
import { summary } from "../src/sharing";
import { adapterFixtures } from "./adapter-fixtures";
import { minecraftlePage } from "./minecraftle-fixture";
import type { Result } from "../src/types";
const result = (
  shareText: string,
  outcome: Result["outcome"] = "won",
): Result => ({
  shareText,
  outcome,
  score: "unused",
  shareSource: "native",
  spoiler: "SECRET",
  completedAt: 1,
  preexisting: false,
});
const near = (actual: number, expected: number) =>
  assert(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
const expected: Record<string, number> = {
  wordle: 1000,
  globle: 600 + 400 * 2 ** (-1 / 5),
  krillion: 3000 / 7,
  minecraftle: 18000 / 19,
  lewdle: 1000,
  angle: (750 * 6) / 7,
  costcodle: 10000 / 11,
  guesstheaudio: 10000 / 11,
  guessthegame: 1000,
  poople: 1000,
};
for (const game of games) {
  test(`${game.name}: scores saved native share fixture and rejects unrelated share`, () => {
    const fixture = adapterFixtures[game.id].expected;
    const score = scoreGame(
      game.id,
      result(fixture.shareText!, fixture.outcome),
    )!;
    assert(score);
    near(score.normalized, expected[game.id]);
    near(score.raw * score.correction, score.normalized);
    assert.equal(scoreGame(game.id, result("not a native share")), null);
  });
}
test("finite wins decrease monotonically and every win outranks partial failure", () => {
  for (let g = 1; g <= 6; g++) {
    const share = `Wordle 1 ${g}/6*\n${"⬛⬛⬛⬛⬛\n".repeat(g - 1)}🟩🟩🟩🟩🟩`;
    near(
      scoreGame("wordle", result(share))!.normalized,
      ((12 - g) * 1000) / 11,
    );
  }
  const share = `Wordle 1 X/6\n${"🟩🟩🟩🟩🟨\n".repeat(6)}`;
  near(scoreGame("wordle", result(share, "lost"))!.raw, 4.5);
  near(
    scoreGame(
      "wordle",
      result(share.replaceAll("🟩", "🟧").replaceAll("🟨", "🟦"), "lost"),
    )!.raw,
    4.5,
  );
  assert.equal(scoreGame("wordle", result("Wordle 1 7/6\n🟩🟩🟩🟩🟩")), null);
  assert.equal(scoreGame("wordle", result("Wordle 1 X/6\n🟨🟨🟨🟨🟨")), null);
});
test("Minecraftle failure uses best nine-square share grid; tenth win is distinct", () => {
  const lost = minecraftlePage({ count: 10, outcome: "lost" }).shareText;
  near(scoreGame("minecraftle", result(lost, "lost"))!.raw, 0.5);
  near(
    scoreGame("minecraftle", result(lost.replace("⬜🟨⬜", "🟩🟨🟩"), "lost"))!
      .raw,
    2.5,
  );
  near(
    scoreGame(
      "minecraftle",
      result(
        minecraftlePage({ count: 10, outcome: "won", contrast: true })
          .shareText,
      ),
    )!.raw,
    10,
  );
});
test("Lewdle supports six slots and conservatively scores hidden hint/ghost feedback", () => {
  near(
    scoreGame(
      "lewdle",
      result(`Lewdle 1 x/6\n${"🟩🟨💡👻⬜⬜\n".repeat(6)}`, "lost"),
    )!.raw,
    1.25,
  );
});
test("Costcodle uses share near feedback, not prices", () => {
  near(
    scoreGame(
      "costcodle",
      result(`Costcodle #1 X/6\n${"⬆️🟨\n".repeat(6)}`, "lost"),
    )!.raw,
    2.5,
  );
  near(
    scoreGame(
      "costcodle",
      result(`Costcodle #1 X/6\n${"⬆️🟥\n".repeat(6)}`, "lost"),
    )!.raw,
    0,
  );
});
test("identification shares score yellow partial credit and red/skip zero", () => {
  for (const id of ["guessthegame", "guesstheaudio"]) {
    near(
      scoreGame(id, result(`#${id} #1\n🟨 🟥 🟥 🟥 🟥 🟥`, "lost"))!.raw,
      2.5,
    );
    near(scoreGame(id, result(`#${id} #1\n🟥 🟥 🟥 🟥 🟥 🟥`, "lost"))!.raw, 0);
    assert.equal(scoreGame(id, result(`#${id} #1\n🟥 ⬜ ⬜ ⬜ ⬜ ⬜`)), null);
  }
});
test("Angle scores both rounds and skipped or failed Make earns zero", () => {
  const share = (suffix = "") =>
    `#Angle #1 1/4${suffix}\n🎉 🟩🟩🟩🟩🟩\nhttps://www.angle.wtf`;
  near(scoreGame("angle", result(share()))!.normalized, 750);
  near(scoreGame("angle", result(share(" · not made")))!.normalized, 750);
  for (let g = 1; g <= 3; g++)
    near(
      scoreGame("angle", result(share(` · made it in ${g}`)))!.normalized,
      750 + 50 * (6 - g),
    );
  near(
    scoreGame(
      "angle",
      result(`#Angle #1 X/4\n${"⬆️ 🟧🟧🟧🟧⬜\n".repeat(4)}`, "lost"),
    )!.normalized,
    (750 * 3 * 0.8) / 7,
  );
  assert.equal(scoreGame("angle", result(share(" · made it in 9"))), null);
});
test("Globle soft decay and Poople par ratio ignore lifetime statistics", () => {
  for (const [g, expected] of [
    [1, 1000],
    [6, 800],
    [11, 700],
    [21, 625],
  ])
    near(
      scoreGame(
        "globle",
        result(`🔥 900 | Avg. Guesses: 999\n🟩 = ${g}\n#globle`),
      )!.normalized,
      expected,
    );
  for (const [g, expected] of [
    [6, 1000],
    [9, 600 + (400 * 6) / 9],
    [12, 800],
  ])
    near(scoreGame("poople", result(`Poople #1 ${g}/6`))!.normalized, expected);
  assert.equal(scoreGame("poople", result("Poople #1 5/6")), null);
  assert.equal(scoreGame("poople", result("Poople #1 0/0")), null);
  assert.equal(scoreGame("krillion", result("Krillion #1 🦐\n701")), null);
  near(scoreGame("krillion", result("Krillion #1 🦐\n0"))!.normalized, 0);
});
test("totals use fixed roster, saved weights/scale, and do not depend on play order", () => {
  const run = newRun(["wordle", "krillion"], false, games, 0);
  run.games.wordle.result = result(adapterFixtures.wordle.expected.shareText!);
  near(scoreRun(run).total, 1000);
  near(scoreRun(run).maximum, 10000);
  run.scoring!.weights.wordle = 2;
  near(scoreRun(run).total, 20000 / 11);
  run.scoring!.referenceMax = 2000;
  near(scoreRun(run).total, 40000 / 11);
  near(scoreRun(run).maximum, 20000);
  assert.equal(scoringDefaults.weights.wordle, 1);
  const saved = JSON.parse(JSON.stringify(run));
  saved.order.reverse();
  assert.deepEqual(scoreRun(saved), scoreRun(run));
  assert.equal(summary(saved), summary(run));
  assert(!summary(run).includes("SECRET"));
  assert(summary(run).includes("Score: 3636 / 20000 (provisional)"));
  run.games.krillion.result = result("malformed");
  assert.deepEqual(scoreRun(run).unavailable, ["krillion"]);
  assert(summary(run).includes("score unavailable"));
  assert(scoreLabel(run).includes("provisional"));
  delete saved.scoring;
  near(scoreRun(saved).total, 1000); // Old runs remain readable.
});
test("all perfect native shares cap total at 10000; empty run earns zero", () => {
  const run = newRun(
    games.map((g) => g.id),
    false,
    games,
    0,
  );
  near(scoreRun(run).total, 0);
  const shares: Record<string, string> = {
    wordle: "Wordle 1 1/6\n🟩🟩🟩🟩🟩",
    lewdle: "Lewdle 1 1/6\n🟩🟩🟩🟩🟩",
    minecraftle: minecraftlePage({ count: 1, outcome: "won" }).shareText,
    costcodle: "Costcodle #1 1/6\n✅",
    angle: "#Angle #1 1/4 · made it in 1\n🎉 🟩🟩🟩🟩🟩",
    krillion: "Krillion #1 🦐\n700",
    globle: "🟩 = 1\n#globle",
    poople: "Poople #1 6/6",
    guessthegame: "#GuessTheGame #1\n🟩 ⬜ ⬜ ⬜ ⬜ ⬜",
    guesstheaudio: "#GuessTheAudio #1\n🟩 ⬜ ⬜ ⬜ ⬜ ⬜",
  };
  for (const [id, share] of Object.entries(shares))
    run.games[id].result = result(share);
  run.status = "complete";
  near(scoreRun(run).total, 10000);
  assert.equal(scoreLabel(run), "Score: 10000 / 10000");
});
