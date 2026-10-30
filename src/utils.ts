export function localDay(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function readJSON<T>(storage: Storage, key: string): T | null {
  try {
    return JSON.parse(storage.getItem(key) || "null") as T | null;
  } catch {
    return null;
  }
}
export function duration(ms: number | null): string {
  if (ms === null) return "—";
  const seconds = Math.floor(Math.max(0, ms) / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
export function shuffle(ids: string[]): string[] {
  const copy = [...ids];
  for (let i = copy.length - 1; i > 0; i--) {
    const size = i + 1,
      limit = 2 ** 32 - (2 ** 32 % size);
    let n;
    do {
      n = crypto.getRandomValues(new Uint32Array(1))[0];
    } while (n >= limit);
    const j = n % size;
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
