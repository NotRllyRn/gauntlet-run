import type { AdapterFixture } from "./adapter-fixtures";
export const gameHtml = (state = "win", id = 1630) =>
  `<div class="current-game"><div class="current-game-number">Game #${id}</div><div class="Screenshots"></div>${state === "playing" ? "" : `<div class="result"><h2 class="${state === "win" ? "win" : "lose"}-msg">Result</h2><div class="answer"><span>Portal</span></div><button id="share-results-btn">Share Results</button></div>`}</div>`;
// These are native raw storage strings, not JSON-encoded strings.
export const adapterFixture: AdapterFixture = {
  now: new Date("2026-10-30T16:00:00Z"),
  storageRequired: true,
  rawStorage: true,
  unfinished: {
    html: gameHtml("playing"),
    storage: { "1630_gamestate": "playing" },
  },
  complete: {
    html: gameHtml(),
    storage: {
      "1630_gamestate": "win",
      "1630_guess1": "Portal",
      "1630_guess1_f": "false",
    },
  },
  expected: {
    outcome: "won",
    score: "1/6",
    metrics: { guesses: 1, maxGuesses: 6 },
    shareText:
      "#GuessTheGame #1630\n\n🎮 🟩 ⬜ ⬜ ⬜ ⬜ ⬜\n\n#RookieGuesser\nhttps://GuessThe.Game/p/1630",
  },
  spoilers: ["Portal"],
};
