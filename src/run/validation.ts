import type { Observation } from "../types";
export function validObservation(value: unknown): value is Observation {
  if (!value || typeof value !== "object") return false;
  const s = value as Observation;
  return (
    typeof s.game === "string" &&
    typeof s.puzzleId === "string" &&
    s.puzzleId.length < 200 &&
    Number.isInteger(s.progress) &&
    s.progress >= 0 &&
    s.progress <= 10000 &&
    typeof s.complete === "boolean" &&
    JSON.stringify(s).length < 100000 &&
    (s.metrics === undefined ||
      (s.metrics !== null &&
        typeof s.metrics === "object" &&
        !Array.isArray(s.metrics) &&
        Object.values(s.metrics).every(
          (n) => typeof n === "number" && Number.isFinite(n),
        ))) &&
    (!s.complete ||
      (["won", "lost", "completed"].includes(s.outcome || "") &&
        typeof s.score === "string" &&
        s.score.length < 100 &&
        typeof s.shareText === "string" &&
        s.shareText.length < 10000))
  );
}
