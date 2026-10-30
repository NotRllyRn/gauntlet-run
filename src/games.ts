import { poople } from "./adapters/poople";
import { guessthegame } from "./adapters/guessthegame";
import { guesstheaudio } from "./adapters/guesstheaudio";
import { costcodle } from "./adapters/costcodle";
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
  {
    id: "costcodle",
    name: "Costcodle",
    url: "https://costcodle.com/",
    matches: ["https://costcodle.com/*"],
    adapter: costcodle,
  },
  {
    id: "guesstheaudio",
    name: "Guess the Audio",
    url: "https://guesstheaudio.com/",
    matches: ["https://guesstheaudio.com/*"],
    adapter: guesstheaudio,
  },
  {
    id: "guessthegame",
    name: "GuessThe.Game",
    url: "https://guessthe.game/",
    matches: ["https://guessthe.game/*"],
    adapter: guessthegame,
  },
  {
    id: "poople",
    name: "Poople",
    url: "https://pooplegame.com/",
    matches: ["https://pooplegame.com/*"],
    adapter: poople,
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
