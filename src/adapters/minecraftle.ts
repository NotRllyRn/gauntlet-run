import type { Adapter } from "../types";
import { localDay } from "../utils";

const resultSelector = '[id^="headlessui-dialog-panel"]';
export const minecraftle: Adapter = {
  captureBackground: true,
  boardSelector: "#guesses",
  resultSelector,
  overlays: '[role="dialog"], #headlessui-portal-root',
  read(doc, _storage, now) {
    if (new URL(doc.URL).searchParams.has("random")) return null;
    const boards = [...doc.querySelectorAll("#guesses > .box")];
    if (boards.length < 1 || boards.length > 10) return null;
    const grids = boards.map((board) =>
      [...board.querySelectorAll(":scope > div:first-child .slot")].map(
        (slot) => (slot as HTMLElement).style.backgroundColor || "",
      ),
    );
    if (grids.some((grid) => grid.length !== 9)) return null;
    const base = {
      game: "minecraftle",
      puzzleId: `minecraftle:${localDay(now)}`,
      progress: boards.length - 1,
      complete: false,
      checkpoint: { grids },
    };
    const panel = doc.querySelector(resultSelector);
    const title = panel
      ?.querySelector("h3")
      ?.textContent?.match(/^You (won|lost)! Took (\d+) guesses\.$/);
    const shareText = panel
      ?.querySelector("p.whitespace-pre")
      ?.textContent?.trim();
    if (!title || !shareText) return base;
    const header = shareText.match(
      /^Minecraftle (\d{4}-\d{2}-\d{2}) (\d+)\/10\n/,
    );
    const count = Number(title[2]);
    if (
      !header ||
      header[1] !== localDay(now) ||
      Number(header[2]) !== count ||
      count !== boards.length ||
      (title[1] === "lost" && count !== 10)
    )
      return base;
    const shareGrids = shareText.slice(header[0].length).split("\n\n");
    if (
      shareGrids.length !== count ||
      shareGrids.some((grid) => {
        const rows = grid.split("\n");
        return (
          rows.length !== 3 ||
          rows.some((row) => !/^(?:⬜|🟩|🟨|🟧|🟦){3}$/u.test(row))
        );
      })
    )
      return base;
    const won = title[1] === "won";
    return {
      ...base,
      puzzleId: `minecraftle:${header[1]}`,
      progress: count,
      complete: true,
      outcome: won ? "won" : "lost",
      score: `${won ? count : "X"}/10`,
      guesses: count,
      metrics: { guesses: count, maxGuesses: 10 },
      shareText,
      shareSource: "visible-native-share-text",
      spoiler: {
        grids,
        solution:
          panel?.querySelector('[id^="headlessui-description"]')?.textContent ??
          null,
      },
    };
  },
};
