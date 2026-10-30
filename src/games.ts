import { minecraftle } from "./adapters/minecraftle";
import { lewdle } from "./adapters/lewdle";
import { angle } from "./adapters/angle";
import type { Game } from "./types";
import { wordle } from "./adapters/wordle";
import { krillion } from "./adapters/krillion";
import { globle } from "./adapters/globle";
// Canonical order also controls share layouts. Adding a game requires one entry and one adapter.
export const games: Game[] = [
  {
    id: "wordle",
    name: "Wordle",
    url: "https://www.nytimes.com/games/wordle/index.html",
    matches: ["https://www.nytimes.com/games/wordle*"],
    aliases: ["https://www.nytimes.com/games/wordle/"],
    adapter: wordle,
  },
  {
    id: "globle",
    name: "Globle",
    url: "https://globle-game.com/game",
    matches: ["https://globle-game.com/*"],
    aliases: ["https://globle-game.com/"],
    adapter: globle,
  },
  {
    id: "krillion",
    name: "Krillion",
    url: "https://krillion.io/",
    matches: ["https://krillion.io/"],
    adapter: krillion,
  },
  {
    id: "minecraftle",
    name: "Minecraftle",
    url: "https://minecraftle.zachmanson.com/",
    matches: ["https://minecraftle.zachmanson.com/*"],
    excludedQueryParams: ["random"],
    adapter: minecraftle,
  },
  {
    id: "lewdle",
    name: "Lewdle",
    url: "https://www.lewdlegame.com/App",
    matches: ["https://www.lewdlegame.com/*"],
    adapter: lewdle,
  },
  {
    id: "angle",
    name: "Angle",
    url: "https://angle.wtf/",
    aliases: ["https://www.angle.wtf/"],
    matches: ["https://angle.wtf/*", "https://www.angle.wtf/*"],
    adapter: angle,
  },
];
export function gameForURL(url?: string): Game | undefined {
  if (!url) return;
  try {
    const actual = new URL(url);
    return games.find(
      (g) =>
        !g.excludedQueryParams?.some((param) =>
          actual.searchParams.has(param),
        ) &&
        [g.url, ...(g.aliases ?? [])].some((url) => {
          const expected = new URL(url);
          return (
            actual.origin === expected.origin &&
            actual.pathname.replace(/\/$/, "") ===
              expected.pathname.replace(/\/$/, "")
          );
        }),
    );
  } catch {
    return;
  }
}
