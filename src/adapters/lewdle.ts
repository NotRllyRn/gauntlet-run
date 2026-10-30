import type { Adapter } from "../types";
import { readJSON } from "../utils";
export const lewdle: Adapter = {
  captureBackground: true,
  boardSelector: ".testBoardWrapper",
  overlays: ".testOverlayBG, .grippy-host",
  // The stats modal makes the game itself transparent. Restore it only for capture.
  revealSelector: ".testMain",
  read(doc, storage, now) {
    const rows = [...doc.querySelectorAll(".testBoardWrapper .testBoardRow")];
    if (rows.length !== 6) return null;
    const tiles = [
      ...rows[0].querySelectorAll<HTMLElement>(".testTile"),
    ].filter((t) => t.style.opacity !== "0");
    const width = tiles.length;
    if (width !== 5 && width !== 6) return null;
    const words = readJSON<string[]>(storage, "words"),
      highlights = readJSON<string[]>(storage, "highlights");
    const row = readJSON<number>(storage, "row"),
      state = readJSON<string>(storage, "gameState");
    if (
      !Array.isArray(words) ||
      !Array.isArray(highlights) ||
      words.length !== 6 ||
      highlights.length !== 6 ||
      !Number.isInteger(row) ||
      row! < 0 ||
      row! > 5 ||
      !["normal", "won", "lost"].includes(state!)
    )
      return null;
    const complete = state !== "normal",
      count = complete ? row! + 1 : row!;
    if (
      words.some((w) => typeof w !== "string" || w.length > 6) ||
      highlights.some((h) => typeof h !== "string" || h.length !== 6)
    )
      return null;
    const settled = highlights.slice(0, count).map((h) => h.slice(0, width));
    if (settled.some((h) => !/^[LGYbtrlgy]+$/.test(h))) return null;
    for (let i = 0; i < count; i++) {
      const shown = [...rows[i].querySelectorAll<HTMLElement>(".testTile")]
        .filter((t) => t.style.opacity !== "0")
        .map((t) => t.textContent ?? "")
        .join("");
      if (shown !== words[i]) return null;
    }
    const day = Math.floor((now.getTime() / 1000 - 1642564800) / 86400) + 1;
    const base = {
      game: "lewdle",
      puzzleId: `lewdle:${day}`,
      complete: false,
      progress: count,
      checkpoint: { words: words.slice(0, count), highlights: settled },
    };
    if (!complete) return base;
    const won = state === "won";
    if (
      won
        ? !/^[Gg]+$/.test(settled.at(-1)!)
        : count !== 6 || /^[Gg]+$/.test(settled.at(-1)!)
    )
      return base;
    const sheltered = readJSON<boolean>(storage, "easyOnSubmit") === true;
    const grid = settled
      .map((h, i) =>
        [...h]
          .map((c, j) =>
            /[btrlgy]/.test(c)
              ? "💡"
              : c === "L"
                ? words[i][j] === undefined
                  ? "👻"
                  : "⬛"
                : c === "Y"
                  ? "🟨"
                  : "🟩",
          )
          .join(""),
      )
      .join("\n");
    return {
      ...base,
      complete: true,
      outcome: won ? "won" : "lost",
      score: `${won ? count : "X"}/6`,
      guesses: count,
      metrics: {
        guesses: count,
        maxGuesses: 6,
        wordLength: width,
        sheltered: sheltered ? 1 : 0,
      },
      shareText: `Lewdle 🍆💦 ${String(day).padStart(2, "0")} ${won ? count : "x"}/6${sheltered ? " 🏠" : ""}\n${grid}\n\n\nlewdlegame.com\nBy SuperHappyFunTimes`,
      shareSource: "reconstructed-from-visible-board-and-saved-feedback",
      spoiler: { words: words.slice(0, count), highlights: settled },
    };
  },
};
