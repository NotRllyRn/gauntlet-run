import type { Adapter } from "../src/types";
import { localDay } from "../src/utils";
/** Copy into src/adapters and register once in src/games.ts. No background/UI changes needed. */
export const example: Adapter = {
  captureBackground: true,
  // Set false and provide resultSelector to capture the result panel instead.
  boardSelector: "[data-game-board]",
  // resultSelector: "[data-game-results]",
  // Matching overlays are hidden except the capture target and its ancestors.
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
            // Use "completed" for points-based games without a win/loss.
            outcome: "won" as const,
            score: `${progress} guesses`,
            guesses: progress,
            // metrics: { points: 100, maxPoints: 700 },
            shareText: `Example: ${progress} guesses`,
            shareSource: "visible-board",
          }
        : {}),
    };
  },
};
