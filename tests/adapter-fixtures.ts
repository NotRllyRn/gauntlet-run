import { adapterFixture as poopleFixture } from "./poople-fixture";
import { adapterFixture as guessthegameFixture } from "./guessthegame-fixture";
import { adapterFixture as guesstheaudioFixture } from "./guesstheaudio-fixture";
import { adapterFixture as costcodleFixture } from "./costcodle-fixture";
import { minecraftlePage } from "./minecraftle-fixture";
import type { Observation } from "../src/types";
export interface PageFixture {
  html: string;
  storage: Record<string, unknown>;
}
export interface AdapterFixture {
  rawStorage?: boolean;
  now: Date;
  unfinished: PageFixture;
  complete: PageFixture;
  expected: Pick<Observation, "outcome" | "score" | "shareText" | "metrics">;
  spoilers: string[];
  storageRequired: boolean;
}
const now = new Date("2026-10-30T16:00:00Z");
const board = (complete: boolean) =>
  `<main id="wordle-app-game"><div data-testid="board">${Array.from({ length: 6 }, (_, i) => `<div role="group">${Array.from({ length: 5 }, (_, j) => `<div data-state="${i === 0 ? (complete ? "correct" : "tbd") : "empty"}">${i === 0 ? "CRANE"[j] : ""}</div>`).join("")}</div>`).join("")}</div></main>`;
const globe = (complete: boolean) =>
  `<input data-cy="guesser" ${complete ? "disabled" : ""}><div class="scene-container"><canvas></canvas></div>`;
export const krillionRounds = [
  ["plankton", 10],
  ["tooclever", 15],
  ["schooler", 30],
  ["rare", 60],
  ["deepcut", 85],
  ["krillion", 100],
  [null, 0],
].map(([tier, score], i) => ({
  promptId: `p${i}`,
  promptText: "Secret prompt",
  rawAnswer: "Secret answer",
  answer: tier ? "Secret answer" : null,
  tier,
  score,
}));
export const krillionEntry = {
  dayNumber: 107,
  score: 300,
  tiers: krillionRounds.map((r) => r.tier ?? "miss"),
  results: krillionRounds,
};
export const krillionPanel =
  '<div class="ds-root"><div class="ds-done"><div class="ds-done-inner"><div><div><div><span class="ds-done-krill">KRILLION</span><span>Dive #107 complete</span></div><div><span class="font-display">300</span><span>-3,000m</span></div></div><aside>Promotion</aside><section><p>The Catch</p><ul>' +
  krillionRounds
    .map(
      (r, i) =>
        `<li><button aria-expanded="false">${i + 1} ${r.rawAnswer}</button></li>`,
    )
    .join("") +
  "</ul></section></div></div></div></div>";
const lewdleBoard = (done: boolean) =>
  `<div class="testBoardWrapper">${Array.from({ length: 6 }, (_, i) => `<div class="testBoardRow">${Array.from({ length: 6 }, (_, j) => `<div class="testTile" ${j === 5 ? 'style="opacity:0"' : ""}>${done && i === 0 && j < 5 ? "SHAFT"[j] : ""}</div>`).join("")}</div>`).join("")}</div>`;
export const adapterFixtures: Record<string, AdapterFixture> = {
  poople: poopleFixture,
  guessthegame: { ...guessthegameFixture, rawStorage: true },
  guesstheaudio: { ...guesstheaudioFixture, rawStorage: true },
  costcodle: costcodleFixture,
  wordle: {
    storageRequired: false,
    now,
    unfinished: { html: board(false), storage: {} },
    complete: { html: board(true), storage: {} },
    expected: {
      outcome: "won",
      score: "1/6",
      shareText: "Wordle 1,959 1/6\n\n🟩🟩🟩🟩🟩",
    },
    spoilers: ["CRANE"],
  },
  globle: {
    storageRequired: true,
    now,
    unfinished: {
      html: globe(false),
      storage: { guesses: { day: "2026-10-30", countries: [] } },
    },
    complete: {
      html: globe(true),
      storage: {
        guesses: { day: "2026-10-30", countries: ["France", "Japan"] },
        statistics: {
          lastWin: "2026-10-30",
          usedGuesses: [4, 2],
          emojiGuesses: "🟥🟩",
          currentStreak: 2,
        },
      },
    },
    expected: {
      outcome: "won",
      score: "2 guesses",
      shareText:
        "🌎 Oct 30, 2026 🌍\n🔥 2 | Avg. Guesses: 3\n🟥🟩 = 2\n\nhttps://globle-game.com\n#globle",
    },
    spoilers: ["France", "Japan"],
  },
  krillion: {
    storageRequired: true,
    now,
    unfinished: {
      html: '<div class="ds-root"></div>',
      storage: {
        "krillion:game:v1": {
          date: "2026-10-30",
          dayNumber: 107,
          phase: "feedback",
          results: krillionRounds.slice(0, 3),
        },
      },
    },
    complete: {
      html: krillionPanel,
      storage: {
        "krillion:stats:v1": { history: { "2026-10-30": krillionEntry } },
      },
    },
    expected: {
      outcome: "completed",
      score: "300/700 points",
      metrics: { points: 300, maxPoints: 700, rounds: 7, depthMeters: 3000 },
      shareText: "Krillion #107 🦐\n300\n\n🫧🤡🐟🦑🏮🌟⬛",
    },
    spoilers: ["Secret answer", "Secret prompt"],
  },
  minecraftle: {
    storageRequired: false,
    now,
    unfinished: { html: minecraftlePage({ count: 2 }).html, storage: {} },
    complete: {
      html: minecraftlePage({ count: 2, outcome: "won" }).html,
      storage: {},
    },
    expected: {
      outcome: "won",
      score: "2/10",
      metrics: { guesses: 2, maxGuesses: 10 },
      shareText: minecraftlePage({ count: 2, outcome: "won" }).shareText,
    },
    spoilers: ["Diamond Axe"],
  },
  lewdle: {
    now,
    storageRequired: true,
    unfinished: {
      html: lewdleBoard(false),
      storage: {
        words: Array(6).fill(""),
        highlights: Array(6).fill("BBBBBB"),
        row: 0,
        gameState: "normal",
      },
    },
    complete: {
      html: lewdleBoard(true),
      storage: {
        words: ["SHAFT", ...Array(5).fill("")],
        highlights: ["GGGGGG", ...Array(5).fill("BBBBBB")],
        row: 0,
        gameState: "won",
        easyOnSubmit: false,
      },
    },
    expected: {
      outcome: "won",
      score: "1/6",
      metrics: { guesses: 1, maxGuesses: 6, wordLength: 5, sheltered: 0 },
      shareText:
        "Lewdle 🍆💦 1746 1/6\n🟩🟩🟩🟩🟩\n\n\nlewdlegame.com\nBy SuperHappyFunTimes",
    },
    spoilers: ["SHAFT"],
  },
  angle: {
    now,
    storageRequired: true,
    unfinished: {
      html: '<div data-testid="round-steps"></div>',
      storage: { guesses: { "2026-10-30": [{ value: 0, delta: -101 }] } },
    },
    complete: {
      html: '<div data-testid="final-screen">Solved in 2/4 Angle #1592 · the angle was 101°</div>',
      storage: {
        guesses: {
          "2026-10-30": [
            { value: 0, delta: -101 },
            { value: 101, delta: 0 },
          ],
        },
        "angle.construct.daily": {
          "2026-10-30": { attempts: [], skipped: true },
        },
      },
    },
    expected: {
      outcome: "won",
      score: "2/4",
      metrics: {
        guesses: 2,
        maxGuesses: 4,
        constructionAttempts: 0,
        constructionSolved: 0,
        constructionSkipped: 1,
      },
      shareText:
        "#Angle #1592 2/4\n⬆️ ⬜⬜⬜⬜⬜\n🎉 🟩🟩🟩🟩🟩\nhttps://www.angle.wtf",
    },
    spoilers: ["101°"],
  },
};
