import type { Adapter } from "../src/types";
import { localDay } from "../src/utils";
/** Copy into src/adapters and register once in src/games.ts. No background/UI changes needed. */
export const example: Adapter = {
  boardSelector: "[data-game-board]",
  overlays: '[role="dialog"]',
  read(document, _storage, now) {
    const board = document.querySelector<HTMLElement>("[data-game-board]");
    if (!board) return null;
    const progress = Number(board.dataset.guesses || 0);
    const complete = board.dataset.status === "won";
    return {
      game: "example",
      puzzleId: `example:${localDay(now)}`,
      progress,
      complete,
      checkpoint: { guesses: progress },
      ...(complete
        ? {
            outcome: "won" as const,
            score: `${progress} guesses`,
            guesses: progress,
            shareText: `Example: ${progress} guesses`,
            shareSource: "visible-board",
          }
        : {}),
    };
  },
};
