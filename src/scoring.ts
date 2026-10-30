import type { Result, Run } from "./types";

// Change these defaults for NEW runs. Existing runs keep their settings.
export const scoringDefaults = {
  version: 1,
  referenceMax: 1000,
  weights: {
    wordle: 1,
    globle: 1,
    krillion: 1,
    minecraftle: 1,
    lewdle: 1,
    angle: 1,
    costcodle: 1,
    guesstheaudio: 1,
    guessthegame: 1,
    poople: 1,
  } as Record<string, number>,
  presentCredit: 0.5,
  globleHalfLife: 5,
  solveFloor: 6,
  efficiencyBonus: 4,
  angleGuessWeight: 0.75,
};
export type ScoringConfig = typeof scoringDefaults;
export interface GameScore {
  raw: number;
  maximum: number;
  correction: number;
  normalized: number;
}
const squares = (line: string) =>
  Array.from(line).filter((c) => "🟩🟨🟧🟦⬜⬛🟥🟫💡👻".includes(c));
const rows = (text: string) =>
  text
    .split("\n")
    .map(squares)
    .filter((row) => row.length > 0);
const closeness = (row: string[], present: number) =>
  row.reduce(
    (sum, c) =>
      sum + ("🟩🟧".includes(c) ? 1 : "🟨🟦".includes(c) ? present : 0),
    0,
  ) / row.length;
const best = (values: number[]) => Math.max(0, ...values);
const finite = (
  n: number,
  guess: number | null,
  q: number,
): [number, number] => [
  guess === null ? (n - 1) * q : 2 * n - guess,
  2 * n - 1,
];
function attempts(text: string, n: number): number | null | undefined {
  const match = text
    .split("\n")[0]
    .match(new RegExp(`\\b([1-9]\\d*|x)/${n}\\b`, "i"));
  if (!match) return undefined;
  if (match[1].toLowerCase() === "x") return null;
  const g = Number(match[1]);
  return g <= n ? g : undefined;
}

/** Score only native non-spoiler shares. Outcome resolves Minecraftle's ambiguous 10/10. */
export function scoreGame(
  id: string,
  result: Pick<Result, "shareText" | "outcome">,
  config = scoringDefaults,
): GameScore | null {
  if (config.version !== 1) return null;
  const text = result.shareText.trim();
  let raw: number, maximum: number;
  if (id === "krillion") {
    const match = text.match(/^Krillion #[\d]+[^\n]*\n(\d+)\s*(?:\n|$)/);
    if (!match || Number(match[1]) > 700) return null;
    raw = Number(match[1]);
    maximum = 700;
  } else if (id === "globle") {
    const match = text.match(/🟩\s*=\s*(\d+)\s*(?:\n|$)/);
    if (!/#globle\b/i.test(text) || !match || Number(match[1]) < 1) return null;
    raw =
      config.solveFloor +
      config.efficiencyBonus *
        2 ** (-(Number(match[1]) - 1) / config.globleHalfLife);
    maximum = config.solveFloor + config.efficiencyBonus;
  } else if (id === "poople") {
    const match = text.match(/^Poople #\d+ (\d+)\/(\d+)/);
    if (!match) return null;
    const [, g, p] = match.map(Number);
    if (p <= 0 || g < p) return null;
    raw = config.solveFloor + (config.efficiencyBonus * p) / g;
    maximum = config.solveFloor + config.efficiencyBonus;
  } else if (id === "guesstheaudio" || id === "guessthegame") {
    if (!text.toLowerCase().startsWith(`#${id} #`)) return null;
    const row = rows(text)[0];
    if (!row || row.length !== 6 || row.some((c) => !"🟥🟨🟩⬜⬛".includes(c)))
      return null;
    const used = row.filter((c) => c !== "⬜" && c !== "⬛");
    const won = used.indexOf("🟩");
    if (won >= 0 && (won !== used.length - 1 || row[won] !== "🟩")) return null;
    if (won < 0 && used.length !== 6) return null;
    [raw, maximum] = finite(
      6,
      won >= 0 ? used.length : null,
      row.includes("🟨") ? config.presentCredit : 0,
    );
  } else if (id === "angle") {
    if (!text.startsWith("#Angle #")) return null;
    const g = attempts(text, 4);
    const board = rows(text);
    if (
      g === undefined ||
      board.length !== (g ?? 4) ||
      board.some((r) => r.length !== 5)
    )
      return null;
    const [first, maxFirst] = finite(
      4,
      g,
      best(board.map((r) => r.filter((c) => c === "🟧").length / 5)),
    );
    const made = text.split("\n")[0].match(/made it in (\d+)/);
    const a = made ? Number(made[1]) : null;
    if (a !== null && (a < 1 || a > 3)) return null;
    raw =
      100 *
      ((config.angleGuessWeight * first) / maxFirst +
        (1 - config.angleGuessWeight) * (a === null ? 0 : (6 - a) / 5));
    maximum = 100;
  } else if (["wordle", "lewdle", "minecraftle", "costcodle"].includes(id)) {
    if (!text.toLowerCase().startsWith(id + " ")) return null;
    const n = id === "minecraftle" ? 10 : 6;
    let g = attempts(text, n);
    if (g === undefined) return null;
    let board = rows(text);
    // Lewdle header may contain a mode icon, but never a feedback square.
    if (id === "minecraftle") {
      if (board.some((r) => r.length !== 3) || board.length % 3 !== 0)
        return null;
      board = Array.from({ length: board.length / 3 }, (_, i) =>
        board.slice(i * 3, i * 3 + 3).flat(),
      );
      if (g === 10 && result.outcome === "lost") g = null;
    } else if (id === "costcodle") {
      board = text
        .split("\n")
        .filter((l) => /[🟥🟨✅]/u.test(l))
        .map((l) => (l.includes("✅") ? ["🟩"] : squares(l)));
      if (board.some((r) => r.length !== 1)) return null;
    } else {
      const width = id === "wordle" ? 5 : board[0]?.length;
      if (
        !width ||
        (width !== 5 && width !== 6) ||
        board.some((r) => r.length !== width)
      )
        return null;
    }
    if (board.length !== (g ?? n)) return null;
    [raw, maximum] = finite(
      n,
      g,
      best(board.map((r) => closeness(r, config.presentCredit))),
    );
  } else return null;
  if (!Number.isFinite(raw) || maximum <= 0 || raw < 0 || raw > maximum)
    return null;
  const correction = config.referenceMax / maximum;
  return { raw, maximum, correction, normalized: raw * correction };
}

export function scoreRun(run: Run) {
  const config = run.scoring ?? scoringDefaults;
  const weights = Object.values(config.weights);
  const denominator = weights.reduce((a, b) => a + b, 0);
  if (
    !Number.isFinite(config.referenceMax) ||
    config.referenceMax <= 0 ||
    denominator <= 0 ||
    weights.some((w) => !Number.isFinite(w) || w < 0)
  )
    throw new Error("Invalid scoring weights or reference maximum");
  const maximum = config.referenceMax * weights.length;
  const games: Record<string, { score: GameScore | null; points: number }> = {};
  const unavailable: string[] = [];
  for (const [id, weight] of Object.entries(config.weights)) {
    const result = run.games[id]?.result;
    const score = result ? scoreGame(id, result, config) : null;
    if (result && !score) unavailable.push(id);
    games[id] = {
      score,
      points: score
        ? (((maximum * weight) / denominator) * score.raw) / score.maximum
        : 0,
    };
  }
  return {
    total: Object.values(games).reduce((sum, g) => sum + g.points, 0),
    maximum,
    games,
    unavailable,
  };
}
export const points = (value: number) => value.toFixed(0);
export function scoreLabel(run: Run): string {
  const score = scoreRun(run);
  return `Score: ${points(score.total)} / ${points(score.maximum)}${run.status !== "complete" || score.unavailable.length ? " (provisional)" : ""}${score.unavailable.length ? ` · ${score.unavailable.length} game score(s) unavailable` : ""}`;
}
