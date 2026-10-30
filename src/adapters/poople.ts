import type { Adapter } from "../types";
import { readJSON } from "../utils";
const boardSelector = "div.flex.w-full.flex-col.items-center.gap-5.py-4";
const day = (time: number) =>
  Math.floor((time - Date.UTC(2025, 7, 14, 8)) / 86400000);
export const poople: Adapter = {
  captureBackground: true,
  boardSelector,
  resultSelector: ".poople-card",
  overlays: ".poople-overlay, .poople-card, canvas, header.fixed",
  read(doc, storage, now) {
    const board = doc.querySelector(boardSelector);
    const heading = board
      ?.querySelector("p")
      ?.textContent?.match(/^#(\d+): ([A-Z]{4})$/);
    const number = day(now.getTime());
    if (!board || !heading || Number(heading[1]) !== number) return null;
    const words = readJSON<string[]>(storage, "guesses");
    const played = readJSON<number>(storage, "dateLastPlayed");
    if (
      !Array.isArray(words) ||
      !words.length ||
      words.some((w) => typeof w !== "string" || !/^[a-z]{4}$/.test(w)) ||
      !Number.isFinite(played) ||
      day(played!) !== number ||
      words[0].toUpperCase() !== heading[2]
    )
      return null;
    if (
      words.some(
        (w, i) =>
          i > 0 && [...w].filter((c, j) => c !== words[i - 1][j]).length !== 1,
      ) ||
      words.slice(0, -1).includes("poop")
    )
      return null;
    const tiles = [...board.querySelectorAll(".h-12.w-12")].filter(
      (t) =>
        t.classList.contains("bg-muted") ||
        t.classList.contains("poople-tile-match"),
    );
    if (
      tiles
        .map((t) => t.textContent)
        .join("")
        .toLowerCase() !== words.join("")
    )
      return null;
    const count = words.length - 1;
    const base = {
      game: "poople",
      puzzleId: `poople:${number}`,
      progress: count,
      complete: false,
      checkpoint: { words },
    };
    if (words.at(-1) !== "poop") return base;
    const panel = doc.querySelector(".poople-card");
    const score = panel?.textContent?.match(
      /You used (\d+) guesses?\. The best solution was (\d+) guesses?\./,
    );
    if (
      !score ||
      Number(score[1]) !== count ||
      Number(score[2]) < 1 ||
      Number(score[2]) > count ||
      !panel?.querySelector("h2")?.textContent?.includes(`${heading[2]} → POOP`)
    )
      return base;
    const par = Number(score[2]);
    const grid = words
      .map((w) =>
        [...w].map((c, i) => (c === "poop"[i] ? "🟫" : "⬜")).join(""),
      )
      .join("\n");
    return {
      ...base,
      complete: true,
      outcome: "won",
      score: `${count}/${par}`,
      guesses: count,
      metrics: { guesses: count, par, extraGuesses: count - par },
      shareText: `Poople #${number} ${count}/${par}\n${grid}\n\nhttps://pooplegame.com/`,
      shareSource: "reconstructed-from-submitted-path-and-visible-result",
      spoiler: { words },
    };
  },
};
