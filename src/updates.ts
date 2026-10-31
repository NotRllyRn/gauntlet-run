export const releasesURL =
  "https://github.com/NotRllyRn/gauntlet-run/releases/latest";
const latestReleaseAPI =
  "https://api.github.com/repos/NotRllyRn/gauntlet-run/releases/latest";
const checkInterval = 24 * 60 * 60 * 1000;
export interface ReleaseUpdate {
  checkedAt: number;
  latestVersion: string | null;
}
function versionParts(value: string): number[] | null {
  const match = value.match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  return match ? match.slice(1).map(Number) : null;
}
export function isNewerRelease(
  latest: string | null,
  installed: string,
): boolean {
  const a = latest && versionParts(latest),
    b = versionParts(installed);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
}
/** Quiet, cached checks: an offline GitHub request must never interrupt a run. */
export async function checkRelease(
  cached?: ReleaseUpdate,
  now = Date.now(),
  request: typeof fetch = fetch,
): Promise<ReleaseUpdate> {
  if (
    cached &&
    now >= cached.checkedAt &&
    now - cached.checkedAt < checkInterval
  )
    return cached;
  let latestVersion = cached?.latestVersion ?? null;
  try {
    const response = await request(latestReleaseAPI, {
      headers: { Accept: "application/vnd.github+json" },
      credentials: "omit",
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (response.ok) {
      const release = await response.json();
      if (
        release &&
        !release.draft &&
        !release.prerelease &&
        typeof release.tag_name === "string" &&
        versionParts(release.tag_name)
      )
        latestVersion = release.tag_name;
    }
  } catch {
    /* Retain the last known release when offline or rate limited. */
  }
  return { checkedAt: now, latestVersion };
}
