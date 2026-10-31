import type { Adapter, CaptureRect } from "./types";
let saved: {
  styles: [HTMLElement, string | null][];
  x: number;
  y: number;
  target: Element;
  scroller: HTMLElement | null;
  scrollLeft: number;
  scrollTop: number;
} | null = null;
let watchdog: ReturnType<typeof setTimeout>;
export let captureActive = false;
export const restoreCapture = () => {
  captureActive = false;
  if (!saved) return;
  clearTimeout(watchdog);
  for (const [el, style] of saved.styles)
    style === null
      ? el.removeAttribute("style")
      : el.setAttribute("style", style);
  saved.scroller?.scrollTo({
    left: saved.scrollLeft,
    top: saved.scrollTop,
    behavior: "instant",
  });
  window.scrollTo({ left: saved.x, top: saved.y, behavior: "instant" });
  saved = null;
};
function renewWatchdog() {
  clearTimeout(watchdog);
  watchdog = setTimeout(restoreCapture, 15000);
}
export function capturePosition(): CaptureRect {
  if (!saved) throw new Error("Capture session expired. Retry capture.");
  const rect = saved.target.getBoundingClientRect();
  const bounds = saved.scroller?.getBoundingClientRect();
  const y = Math.max(0, bounds?.top ?? 0, rect.y),
    bottom = Math.min(innerHeight, bounds?.bottom ?? innerHeight, rect.bottom);
  if (
    rect.width < 20 ||
    rect.height < 20 ||
    rect.x < -1 ||
    rect.right > innerWidth + 1 ||
    bottom - y < 1
  )
    throw new Error(
      "The board must fit the window width. Maximize the window and retry.",
    );
  for (const [fx, fy] of [
    [0.5, 0.5],
    [0.2, 0.2],
    [0.8, 0.2],
    [0.2, 0.8],
    [0.8, 0.8],
  ]) {
    const top = document.elementFromPoint(
      rect.x + rect.width * fx,
      y + (bottom - y) * fy,
    );
    if (
      top &&
      top !== saved.target &&
      !saved.target.contains(top) &&
      !top.contains(saved.target)
    )
      throw new Error(
        "Something is covering the board. Close it and retry capture.",
      );
  }
  return {
    x: rect.x,
    y,
    width: rect.width,
    height: bottom - y,
    offsetY: y - rect.y,
    totalHeight: rect.height,
    viewportWidth: innerWidth,
    viewportHeight: innerHeight,
    href: location.href,
  };
}
export async function captureSlice(offsetY = 0): Promise<CaptureRect> {
  if (!saved || !Number.isFinite(offsetY) || offsetY < 0)
    throw new Error("Invalid capture offset.");
  renewWatchdog();
  const rect = saved.target.getBoundingClientRect();
  if (saved.scroller) {
    saved.scroller.scrollTo({
      left: saved.scroller.scrollLeft,
      top:
        saved.scroller.scrollTop +
        rect.y -
        saved.scroller.getBoundingClientRect().top +
        offsetY,
      behavior: "instant",
    });
  } else {
    window.scrollTo({
      left: scrollX,
      top: scrollY + rect.y + offsetY,
      behavior: "instant",
    });
  }
  await new Promise((r) => setTimeout(r, 250));
  await new Promise<void>((r) =>
    requestAnimationFrame(() => requestAnimationFrame(() => r())),
  );
  return capturePosition();
}
export async function prepareCapture(adapter: Adapter): Promise<CaptureRect> {
  restoreCapture();
  const selector = adapter.captureBackground
    ? adapter.boardSelector
    : adapter.resultSelector;
  if (!selector) throw new Error("Result capture requires a resultSelector.");
  const target = document.querySelector(selector);
  if (!target)
    throw new Error("Capture target not found. The game may have changed.");
  const scroller = adapter.scrollContainerSelector
    ? document.querySelector<HTMLElement>(adapter.scrollContainerSelector)
    : null;
  if (
    adapter.scrollContainerSelector &&
    (!scroller || !scroller.contains(target))
  )
    throw new Error(
      "Capture scroll container not found. The game may have changed.",
    );
  captureActive = true;
  saved = {
    styles: [],
    x: scrollX,
    y: scrollY,
    target,
    scroller,
    scrollLeft: scroller?.scrollLeft ?? 0,
    scrollTop: scroller?.scrollTop ?? 0,
  };
  renewWatchdog();
  if (adapter.overlays)
    document.querySelectorAll<HTMLElement>(adapter.overlays).forEach((el) => {
      if (el === target || el.contains(target)) return;
      saved!.styles.push([el, el.getAttribute("style")]);
      el.style.setProperty("display", "none", "important");
    });
  if (adapter.captureBackground && adapter.revealSelector)
    document
      .querySelectorAll<HTMLElement>(adapter.revealSelector)
      .forEach((el) => {
        saved!.styles.push([el, el.getAttribute("style")]);
        el.style.setProperty("transition", "none", "important");
        el.style.setProperty("opacity", "1", "important");
      });
  try {
    return await captureSlice();
  } catch (error) {
    restoreCapture();
    throw error;
  }
}
