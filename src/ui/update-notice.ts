import { api } from "../browser/api";
import {
  checkRelease,
  isNewerRelease,
  releasesURL,
  type ReleaseUpdate,
} from "../updates";

export function renderUpdateNotice(
  link: HTMLAnchorElement,
  latest: string | null,
  installed: string,
): void {
  link.href = releasesURL;
  link.hidden = !isNewerRelease(latest, installed);
  link.textContent = "⬆ Update extension";
  link.title = latest ? `Version ${latest.replace(/^v/, "")} is available` : "";
}
export async function showUpdateNotice(): Promise<void> {
  const link = document.getElementById("update-link") as HTMLAnchorElement;
  const installed = api.runtime.getManifest().version;
  try {
    const { releaseUpdate } = (await api.storage.local.get(
      "releaseUpdate",
    )) as { releaseUpdate?: ReleaseUpdate };
    renderUpdateNotice(link, releaseUpdate?.latestVersion ?? null, installed);
    const latest = await checkRelease(releaseUpdate);
    renderUpdateNotice(link, latest.latestVersion, installed);
    if (latest !== releaseUpdate)
      await api.storage.local.set({ releaseUpdate: latest });
  } catch {
    /* Updates are optional; storage/network failures do not block the UI. */
  }
}
