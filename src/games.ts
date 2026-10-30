import type { Game } from "./types";
import { wordle } from "./adapters/wordle";
import { globle } from "./adapters/globle";
// Canonical order also controls share layouts. Adding a game requires one entry and one adapter.
export const games: Game[] = [
  {
    id: "wordle",
    name: "Wordle",
    url: "https://www.nytimes.com/games/wordle/index.html",
    matches: ["https://www.nytimes.com/games/wordle/*"],
    adapter: wordle,
  },
  {
    id: "globle",
    name: "Globle",
    url: "https://globle-game.com/game",
    matches: ["https://globle-game.com/game*"],
    adapter: globle,
  },
];
export function gameForURL(url?: string): Game | undefined {
  if (!url) return;
  try {
    const actual = new URL(url);
    return games.find((g) => {
      const expected = new URL(g.url);
      return (
        actual.origin === expected.origin &&
        actual.pathname.replace(/\/$/, "") ===
          expected.pathname.replace(/\/$/, "")
      );
    });
  } catch {
    return;
  }
}
