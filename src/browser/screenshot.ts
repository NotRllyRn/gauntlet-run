import { api } from "./api";
import type { CaptureRect } from "../types";
async function rectFor(
  tabId: number,
  type: string,
  offsetY?: number,
): Promise<CaptureRect> {
  const response = await api.tabs.sendMessage(tabId, { type, offsetY });
  if (response.error) throw new Error(response.error);
  return response.rect;
}
async function checkTab(tab: chrome.tabs.Tab, href: string) {
  const current = (
    await api.tabs.query({ active: true, windowId: tab.windowId })
  )[0];
  if (current?.id !== tab.id || current.url !== href)
    throw new Error("Game tab changed during capture.");
}
export async function captureBoard(tab: chrome.tabs.Tab) {
  try {
    let rect = await rectFor(tab.id!, "prepareCapture"),
      covered = 0;
    const initial = rect;
    let canvas: OffscreenCanvas | undefined;
    for (let slice = 0; slice < 30; slice++) {
      if (
        Math.abs(rect.width - initial.width) > 1 ||
        Math.abs(rect.totalHeight - initial.totalHeight) > 1 ||
        rect.offsetY > covered + 1
      )
        throw new Error("Board moved during capture. Retry capture.");
      await checkTab(tab, rect.href);
      const data = await api.tabs.captureVisibleTab(tab.windowId, {
        format: "png",
      });
      await checkTab(tab, rect.href);
      const after = await rectFor(tab.id!, "capturePosition");
      if (JSON.stringify(after) !== JSON.stringify(rect))
        throw new Error("Page moved during capture. Retry capture.");
      const bitmap = await createImageBitmap(await (await fetch(data)).blob());
      const sx = bitmap.width / rect.viewportWidth,
        sy = bitmap.height / rect.viewportHeight;
      canvas ??= new OffscreenCanvas(
        Math.round(rect.width * sx),
        Math.round(rect.totalHeight * sy),
      );
      const h =
        Math.round((rect.offsetY + rect.height) * sy) -
        Math.round(rect.offsetY * sy);
      canvas
        .getContext("2d")!
        .drawImage(
          bitmap,
          Math.round(rect.x * sx),
          Math.round(rect.y * sy),
          canvas.width,
          h,
          0,
          Math.round(rect.offsetY * sy),
          canvas.width,
          h,
        );
      bitmap.close();
      const end = rect.offsetY + rect.height;
      if (end >= initial.totalHeight - 0.5) {
        const bytes = new Uint8Array(
          await (
            await canvas.convertToBlob({ type: "image/png" })
          ).arrayBuffer(),
        );
        let binary = "";
        for (let i = 0; i < bytes.length; i += 32768)
          binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
        return `data:image/png;base64,${btoa(binary)}`;
      }
      if (end <= covered)
        throw new Error("Could not scroll through the full board.");
      covered = end;
      // Chrome permits at most two visible-tab captures per second.
      await new Promise((r) => setTimeout(r, 550));
      rect = await rectFor(tab.id!, "captureSlice", covered);
    }
    throw new Error("Board exceeds the capture limit.");
  } finally {
    try {
      await api.tabs.sendMessage(tab.id!, { type: "restoreCapture" });
    } catch {}
  }
}
