import type { Adapter, CaptureRect } from "./types";
let saved: {
  styles: [HTMLElement, string | null][];
  x: number;
  y: number;
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
  window.scrollTo(saved.x, saved.y);
  saved = null;
};
export const prepareCapture = async (
  adapter: Adapter,
): Promise<CaptureRect> => {
  restoreCapture();
  const selector = adapter.captureBackground
    ? adapter.boardSelector
    : adapter.resultSelector;
  if (!selector) throw new Error("Result capture requires a resultSelector.");
  const target = document.querySelector(selector);
  if (!target)
    throw new Error("Capture target not found. The game may have changed.");
  captureActive = true;
  saved = { styles: [], x: scrollX, y: scrollY };
  watchdog = setTimeout(restoreCapture, 10000);
  const hide = (el: HTMLElement) => {
    if (el === target || el.contains(target)) return;
    saved!.styles.push([el, el.getAttribute("style")]);
    el.style.setProperty("display", "none", "important");
  };
  if (adapter.captureBackground)
    document.querySelectorAll<HTMLElement>(adapter.overlays).forEach(hide);
  target.scrollIntoView({
    block: "center",
    inline: "center",
    behavior: "instant",
  });
  await new Promise((r) => setTimeout(r, 250));
  await new Promise<void>((r) =>
    requestAnimationFrame(() => requestAnimationFrame(() => r())),
  );
  const rect = target.getBoundingClientRect();
  if (
    rect.width < 20 ||
    rect.height < 20 ||
    rect.x < -1 ||
    rect.y < -1 ||
    rect.right > innerWidth + 1 ||
    rect.bottom > innerHeight + 1
  ) {
    restoreCapture();
    throw new Error(
      "The full capture target must fit on screen. Maximize the game window or zoom out, then retry.",
    );
  }
  // Fail rather than save a result dialog, ad, or another overlay covering the board.
  for (const [fx, fy] of [
    [0.5, 0.5],
    [0.2, 0.2],
    [0.8, 0.2],
    [0.2, 0.8],
    [0.8, 0.8],
  ]) {
    const top = document.elementFromPoint(
      rect.x + rect.width * fx,
      rect.y + rect.height * fy,
    );
    if (
      top &&
      top !== target &&
      !target.contains(top) &&
      !top.contains(target)
    ) {
      restoreCapture();
      throw new Error(
        "Something is covering the capture target. Close it and retry capture.",
      );
    }
  }
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    viewportWidth: innerWidth,
    viewportHeight: innerHeight,
    href: location.href,
  };
};
