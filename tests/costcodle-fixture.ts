import type { AdapterFixture, PageFixture } from "./adapter-fixtures";
export function costcodlePage(won = true, count = 2): PageFixture {
  const guesses = Array.from({ length: count }, (_, i) =>
    won && i === count - 1
      ? { guess: "10.00", closeness: "guess-win", direction: "&check;" }
      : { guess: "0.01", closeness: "guess-far", direction: "&uarr;" },
  );
  return {
    html: `<main id="game-container"><div id="product-info">Secret product</div><div id="game-stats">${won ? "You win!" : "Better luck next time!"} The price was $10</div><div id="guesses-container">${guesses.map((g, i) => `<div id="${i + 1}"><div class="guess-value-container">$${g.guess}</div><div class="guess-direction-container ${g.closeness}">${g.direction}</div></div>`).join("")}</div><button id="share-button">Share</button></main>`,
    storage: { state: { gameNumber: 1137, guesses, hasWon: won } },
  };
}
export const adapterFixture: AdapterFixture = {
  now: new Date("2026-10-30T16:00:00Z"),
  storageRequired: true,
  unfinished: {
    html: '<main id="game-container"><div id="guesses-container"></div></main>',
    storage: { state: { gameNumber: 1137, guesses: [], hasWon: false } },
  },
  complete: costcodlePage(),
  expected: {
    outcome: "won",
    score: "2/6",
    metrics: { guesses: 2, maxGuesses: 6 },
    shareText: "Costcodle #1137 2/6\n⬆️🟥\n✅\nhttps://costcodle.com",
  },
  spoilers: ["Secret product", "10.00"],
};
