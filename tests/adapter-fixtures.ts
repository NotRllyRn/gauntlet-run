import type { Observation } from "../src/types";
export interface PageFixture {
  html: string;
  storage: Record<string, unknown>;
}
export interface AdapterFixture {
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
  '<div class="ds-root"><div><div><span class="ds-done-krill">KRILLION</span><span>Dive #107 complete</span></div><div><span class="font-display">300</span><span>-3,000m</span></div></div></div>';
export const adapterFixtures: Record<string, AdapterFixture> = {
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
};
