import type { Adapter, Json } from "../types";
import { readJSON } from "../utils";

// Observed daily tiers; no hidden answer lists or scoring requests are read.
const tiers: Record<string, { points: number; emoji: string }> = {
  miss: { points: 0, emoji: "⬛" },
  plankton: { points: 10, emoji: "🫧" },
  tooclever: { points: 15, emoji: "🤡" },
  schooler: { points: 30, emoji: "🐟" },
  rare: { points: 60, emoji: "🦑" },
  deepcut: { points: 85, emoji: "🏮" },
  krillion: { points: 100, emoji: "🌟" },
};
interface Round {
  tier: string | null;
  score: number;
  [key: string]: Json;
}
interface Dive {
  dayNumber: number;
  date?: string;
  score?: number;
  results: Round[];
  tiers?: string[];
}
const resultSelector = "div:has(> div > .ds-done-krill)";
function validRounds(value: unknown): value is Round[] {
  return (
    Array.isArray(value) &&
    value.length <= 7 &&
    value.every(
      (r) =>
        r &&
        typeof r === "object" &&
        Object.hasOwn(tiers, r.tier ?? "miss") &&
        r.score === tiers[r.tier ?? "miss"].points,
    )
  );
}
export const krillion: Adapter = {
  captureBackground: false,
  boardSelector: ".ds-root",
  resultSelector:
    ".ds-done-inner > div:has(> section > ul > li:nth-child(7) > button[aria-expanded])",
  scrollContainerSelector: ".ds-done",
  // Keep the existing score/graph panel and the seven catch rows; hide promos and controls.
  overlays:
    'dialog[open], [role="dialog"], .ds-done-inner > div > :not(div:has(> div > .ds-done-krill), section:has(> ul > li > button[aria-expanded]))',
  read(doc, storage, now) {
    if (!doc.querySelector(".ds-root, .ds-done-krill")) return null;
    const day = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
    const owner = storage.getItem("krillion:account-owner:v1");
    const key = (name: string) =>
      owner ? `krillion:account:${encodeURIComponent(owner)}:${name}` : name;
    const current = readJSON<Dive>(storage, key("krillion:game:v1"));
    const saved = readJSON<{ history: Record<string, Dive> }>(
      storage,
      key("krillion:stats:v1"),
    )?.history?.[day];
    const panel = doc.querySelector(resultSelector);
    const dive = panel ? saved : current?.date === day ? current : null;
    if (
      !dive ||
      !Number.isInteger(dive.dayNumber) ||
      dive.dayNumber < 1 ||
      !validRounds(dive.results)
    )
      return null;
    const base = {
      game: "krillion",
      puzzleId: `krillion:${day}`,
      complete: false,
      progress: dive.results.length,
      checkpoint: { results: dive.results },
    };
    if (!panel || !saved) return base;
    const points = dive.results.reduce((sum, r) => sum + r.score, 0);
    const roundTiers = dive.results.map((r) => r.tier ?? "miss");
    // Require the displayed daily result and persisted round totals to agree.
    if (
      dive.results.length !== 7 ||
      dive.score !== points ||
      JSON.stringify(dive.tiers) !== JSON.stringify(roundTiers) ||
      !panel.textContent?.includes(`Dive #${dive.dayNumber} complete`) ||
      panel.querySelector(".font-display")?.textContent?.trim() !==
        String(points)
    )
      return base;
    const grid = roundTiers.map((t) => tiers[t].emoji).join("");
    const link =
      storage.getItem("krillion-share-link") === "1"
        ? "\n\nhttps://krillion.io"
        : "";
    return {
      ...base,
      complete: true,
      outcome: "completed",
      score: `${points}/700 points`,
      metrics: { points, maxPoints: 700, rounds: 7, depthMeters: points * 10 },
      shareText: `Krillion #${dive.dayNumber} 🦐\n${points}\n\n${grid}${link}`,
      shareSource: "reconstructed-from-game-statistics",
      spoiler: { results: dive.results },
    };
  },
};
