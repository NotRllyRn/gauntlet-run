import type { Adapter } from "../types";
import { readJSON } from "../utils";
interface Guess {
  guess: string;
  closeness: "guess-win" | "guess-near" | "guess-far";
  direction: "&check;" | "&uarr;" | "&darr;";
}
interface State {
  gameNumber: number;
  guesses: Guess[];
  hasWon: boolean;
}
// Match the site's local-midnight epoch and ceil-based puzzle numbering exactly.
export const costcodleNumber = (now: Date) =>
  Math.ceil((now.getTime() - new Date(2023, 8, 21).getTime()) / 86400000) + 1;
export const costcodle: Adapter = {
  captureBackground: true,
  boardSelector: "#game-container",
  overlays: ".overlay, #share-toast, #warning-toast",
  read(doc, storage, now) {
    if (!doc.querySelector("#game-container #guesses-container")) return null;
    const state = readJSON<State>(storage, "state");
    if (
      !state ||
      state.gameNumber !== costcodleNumber(now) ||
      typeof state.hasWon !== "boolean" ||
      !Array.isArray(state.guesses) ||
      state.guesses.length > 6
    )
      return null;
    const guesses = state.guesses;
    if (
      guesses.some(
        (g) =>
          !g ||
          typeof g.guess !== "string" ||
          !/^\d+\.\d{2}$/.test(g.guess) ||
          !Number.isFinite(Number(g.guess)) ||
          !["guess-win", "guess-near", "guess-far"].includes(g.closeness) ||
          !["&check;", "&uarr;", "&darr;"].includes(g.direction) ||
          (g.closeness === "guess-win") !== (g.direction === "&check;"),
      )
    )
      return null;
    if (
      guesses.slice(0, -1).some((g) => g.closeness === "guess-win") ||
      state.hasWon !== (guesses.at(-1)?.closeness === "guess-win")
    )
      return null;
    for (let i = 0; i < guesses.length; i++) {
      const row = doc.getElementById(String(i + 1)),
        g = guesses[i];
      if (
        row?.querySelector(".guess-value-container")?.textContent !==
          `$${g.guess}` ||
        !row.querySelector(`.guess-direction-container.${g.closeness}`)
      )
        return null;
    }
    const base = {
      game: "costcodle",
      puzzleId: `costcodle:${state.gameNumber}`,
      progress: guesses.length,
      complete: false,
      checkpoint: { guesses: guesses.map((g) => ({ ...g })) },
    };
    if (
      !guesses.length ||
      (!state.hasWon && guesses.length < 6) ||
      !doc.querySelector("#share-button")
    )
      return base;
    const result = doc.querySelector("#game-stats")?.textContent ?? "",
      priceText = result.match(/The price was \$(\d+(?:\.\d+)?)/)?.[1];
    if (
      !priceText ||
      !result.includes(state.hasWon ? "You win!" : "Better luck next time!")
    )
      return base;
    const price = Number(priceText);
    if (
      price <= 0 ||
      guesses.some((g) => {
        const error = ((Number(g.guess) * 100) / (price * 100)) * 100 - 100;
        const closeness =
          Math.abs(error) <= 5
            ? "guess-win"
            : Math.abs(error) <= 25
              ? "guess-near"
              : "guess-far";
        const direction =
          closeness === "guess-win"
            ? "&check;"
            : error < 0
              ? "&uarr;"
              : "&darr;";
        return g.closeness !== closeness || g.direction !== direction;
      })
    )
      return base;
    const score = `${state.hasWon ? guesses.length : "X"}/6`;
    const grid = guesses
      .map(
        (g) =>
          (g.direction === "&check;"
            ? "✅"
            : g.direction === "&uarr;"
              ? "⬆️"
              : "⬇️") +
          (g.closeness === "guess-far"
            ? "🟥"
            : g.closeness === "guess-near"
              ? "🟨"
              : ""),
      )
      .join("\n");
    return {
      ...base,
      complete: true,
      outcome: state.hasWon ? "won" : "lost",
      score,
      guesses: guesses.length,
      metrics: { guesses: guesses.length, maxGuesses: 6 },
      shareText: `Costcodle #${state.gameNumber} ${score}\n${grid}\nhttps://costcodle.com`,
      shareSource: "reconstructed-from-saved-results",
      spoiler: {
        product: doc.querySelector("#product-info")?.textContent ?? "",
        price,
        guesses: guesses.map((g) => ({ ...g })),
      },
    };
  },
};
