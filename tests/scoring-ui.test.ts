import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { games } from "../src/games";
import { newRun, observe, pause } from "../src/run/engine";
import { adapterFixtures } from "./adapter-fixtures";

test("dashboard and popup update running points beside existing timers", async () => {
  const originalDocument = globalThis.document;
  const originalChrome = globalThis.chrome;
  globalThis.chrome = {} as typeof chrome;
  const { renderRun } = await import("../src/ui/common");
  try {
    for (const page of ["dashboard", "popup"]) {
      const window = new JSDOM(readFileSync(`extension/${page}.html`, "utf8"))
        .window;
      globalThis.document = window.document;
      try {
        const now = Date.now();
        const run = newRun(["wordle", "globle"], false, games, now);
        renderRun(run);
        assert.equal(
          window.document.getElementById("score")!.textContent,
          "Score: 0 / 10000 (provisional)",
        );
        observe(
          run,
          {
            game: "wordle",
            puzzleId: "1",
            progress: 1,
            complete: true,
            ...adapterFixtures.wordle.expected,
          },
          now + 1,
        );
        renderRun(run);
        assert.equal(
          window.document.getElementById("score")!.textContent,
          "Score: 1000 / 10000 (provisional)",
        );
        assert(
          window.document
            .getElementById("game-list")!
            .textContent!.includes("1000 points"),
        );
        assert(
          window.document
            .getElementById("elapsed")!
            .textContent!.includes("Total time:"),
        );
        assert(
          window.document
            .getElementById("time-wordle")!
            .textContent!.includes("Game time:"),
        );
        pause(run, now + 2);
        renderRun(JSON.parse(JSON.stringify(run)));
        assert.equal(
          window.document.getElementById("score")!.textContent,
          "Score: 1000 / 10000 (provisional)",
        );
        assert.equal(
          window.document.getElementById("pause")!.textContent,
          "Resume",
        );
      } finally {
        window.close();
      }
    }
  } finally {
    globalThis.document = originalDocument;
    globalThis.chrome = originalChrome;
  }
});
