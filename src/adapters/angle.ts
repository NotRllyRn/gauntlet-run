import type { Adapter } from "../types";
import { localDay, readJSON } from "../utils";
interface Guess {
  value: number;
  delta: number;
}
interface Construction {
  attempts: number[];
  skipped?: boolean;
  done?: boolean;
  solved?: boolean;
}
export const angle: Adapter = {
  captureBackground: false,
  boardSelector: '[data-testid="round-steps"]',
  resultSelector: '[data-testid="final-screen"]',
  overlays: '[role="dialog"]',
  read(doc, storage, now) {
    if (
      !doc.querySelector(
        '[data-testid="round-steps"], [data-testid="final-screen"]',
      )
    )
      return null;
    const day = localDay(now),
      guesses =
        readJSON<Record<string, Guess[]>>(storage, "guesses")?.[day] ?? [];
    if (
      !Array.isArray(guesses) ||
      guesses.length > 4 ||
      guesses.some(
        (g) =>
          !g ||
          !Number.isInteger(g.value) ||
          g.value < 0 ||
          g.value > 360 ||
          !Number.isInteger(g.delta) ||
          Math.abs(g.delta) > 360,
      )
    )
      return null;
    const base = {
      game: "angle",
      puzzleId: `angle:${day}`,
      progress: guesses.length,
      complete: false,
      checkpoint: { guesses: guesses.map((g) => ({ ...g })) },
    };
    const panel = doc.querySelector('[data-testid="final-screen"]');
    if (!guesses.length || !panel) return base;
    const target = guesses[0].value - guesses[0].delta;
    if (
      target < 0 ||
      target > 360 ||
      guesses.some((g) => g.value - g.delta !== target) ||
      guesses.slice(0, -1).some((g) => g.delta === 0)
    )
      return base;
    const won = guesses.at(-1)!.delta === 0;
    if (!won && guesses.length !== 4) return base;
    const construction = readJSON<Record<string, Construction>>(
      storage,
      "angle.construct.daily",
    )?.[day];
    if (
      !construction ||
      !Array.isArray(construction.attempts) ||
      construction.attempts.length > 3 ||
      construction.attempts.some(
        (n) => !Number.isFinite(n) || n < 0 || n > 360,
      ) ||
      !(construction.skipped || construction.done || construction.solved)
    )
      return base;
    const played = !construction.skipped && construction.attempts.length > 0;
    if (construction.skipped && construction.attempts.length) return base;
    const round2 = panel.querySelector(
      '[data-testid="result-round2"]',
    )?.textContent;
    const suffix = played
      ? construction.solved
        ? `made it in ${construction.attempts.length}`
        : "not made"
      : "";
    if (played && round2 !== `Round 2: ${suffix}`) return base;
    const [year, month, date] = day.split("-").map(Number);
    const number = Math.round(
      (Date.UTC(year, month - 1, date) - Date.UTC(2022, 5, 21)) / 86400000,
    );
    if (
      !panel.textContent?.includes(`Angle #${number}`) ||
      !panel.textContent.includes(`the angle was ${target}°`)
    )
      return base;
    const grid = guesses
      .map((g) => {
        if (g.delta === 0) return "🎉 🟩🟩🟩🟩🟩";
        const thresholds = [5, 10, 20, 50],
          index = thresholds.findIndex((n) => Math.abs(g.delta) < n),
          filled = index < 0 ? 0 : 4 - index;
        return `${g.delta > 0 ? "⬇️" : "⬆️"} ${"🟧".repeat(filled)}${"⬜".repeat(5 - filled)}`;
      })
      .join("\n");
    return {
      ...base,
      complete: true,
      outcome: won ? "won" : "lost",
      score: `${won ? guesses.length : "X"}/4`,
      guesses: guesses.length,
      metrics: {
        guesses: guesses.length,
        maxGuesses: 4,
        constructionAttempts: construction.attempts.length,
        constructionSolved: construction.solved ? 1 : 0,
        constructionSkipped: construction.skipped ? 1 : 0,
      },
      shareText: `#Angle #${number} ${won ? guesses.length : "X"}/4${suffix ? ` · ${suffix}` : ""}\n${grid}\nhttps://www.angle.wtf`,
      shareSource: "reconstructed-from-game-results",
      spoiler: {
        angle: target,
        guesses: guesses.map((g) => ({ ...g })),
        construction: { ...construction },
      },
    };
  },
};
