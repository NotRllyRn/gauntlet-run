import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { prepareCapture, restoreCapture } from "../src/capture";
import type { Adapter } from "../src/types";

test("background capture hides results; result capture preserves and targets them", async () => {
  const dom = new JSDOM(
    '<main style="opacity:0;transition:opacity 1s"><div id="board"></div></main><div role="dialog" id="result">Score: 10</div><canvas id="confetti"></canvas>',
  );
  const originals = new Map<string, PropertyDescriptor | undefined>();
  const globals = {
    window: dom.window,
    document: dom.window.document,
    scrollX: 0,
    scrollY: 0,
    innerWidth: 800,
    innerHeight: 600,
    location: { href: "https://example.com/game" },
    requestAnimationFrame: (callback: () => void) => setTimeout(callback, 0),
  };
  for (const [key, value] of Object.entries(globals)) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true });
  }
  dom.window.scrollTo = () => {};
  const board = dom.window.document.querySelector<HTMLElement>("#board")!;
  const result = dom.window.document.querySelector<HTMLElement>("#result")!;
  for (const [element, width] of [
    [board, 300],
    [result, 200],
  ] as const) {
    element.scrollIntoView = () => {};
    element.getBoundingClientRect = () => ({
      x: 0,
      y: 0,
      width,
      height: 100,
      right: width,
      bottom: 100,
      top: 0,
      left: 0,
      toJSON() {},
    });
  }
  const adapter: Adapter = {
    captureBackground: true,
    boardSelector: "#board",
    resultSelector: "#result",
    overlays: '[role="dialog"], canvas',
    revealSelector: "main",
    read: () => null,
  };
  try {
    dom.window.document.elementFromPoint = () => board;
    assert.equal((await prepareCapture(adapter)).width, 300);
    assert.equal(result.style.display, "none");
    assert.equal(dom.window.document.querySelector("main")!.style.opacity, "1");
    restoreCapture();
    assert.equal(
      dom.window.document.querySelector("main")!.getAttribute("style"),
      "opacity:0;transition:opacity 1s",
    );
    assert.equal(result.getAttribute("style"), null);
    dom.window.document.elementFromPoint = () => result;
    assert.equal(
      (await prepareCapture({ ...adapter, captureBackground: false })).width,
      200,
    );
    assert.equal(result.style.display, "");
    assert.equal(
      dom.window.document.querySelector("canvas")!.style.display,
      "none",
    );
    restoreCapture();
    assert.equal(
      dom.window.document.querySelector("canvas")!.getAttribute("style"),
      null,
    );
    await assert.rejects(
      prepareCapture({
        ...adapter,
        captureBackground: false,
        resultSelector: undefined,
      }),
      /resultSelector/,
    );
  } finally {
    restoreCapture();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
    dom.window.close();
  }
});

test("Krillion captures graph and all seven catch rows in its scroll panel, then restores it", async () => {
  const { krillion } = await import("../src/adapters/krillion");
  const { krillionPanel } = await import("./adapter-fixtures");
  const { captureSlice } = await import("../src/capture");
  const dom = new JSDOM(krillionPanel);
  const doc = dom.window.document;
  const scroller = doc.querySelector<HTMLElement>(".ds-done")!;
  const target = doc.querySelector<HTMLElement>(krillion.resultSelector!)!;
  const rect = (y: number, height: number) => ({
    x: 100,
    y,
    top: y,
    bottom: y + height,
    left: 100,
    right: 500,
    width: 400,
    height,
    toJSON() {},
  });
  scroller.scrollTop = 120;
  scroller.scrollTo = (options: ScrollToOptions | number = {}) => {
    scroller.scrollTop = Math.min(
      560,
      Math.max(0, (options as ScrollToOptions).top ?? 0),
    );
  };
  scroller.getBoundingClientRect = () => rect(50, 600);
  target.getBoundingClientRect = () => rect(50 - scroller.scrollTop, 1160);
  doc.elementFromPoint = () => target;
  dom.window.scrollTo = () => {};
  const globals = {
    window: dom.window,
    document: doc,
    scrollX: 0,
    scrollY: 0,
    innerWidth: 800,
    innerHeight: 1000,
    location: { href: "https://krillion.io/" },
    requestAnimationFrame: (callback: () => void) => setTimeout(callback, 0),
  };
  const originals = new Map(
    Object.keys(globals).map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );
  for (const [key, value] of Object.entries(globals))
    Object.defineProperty(globalThis, key, { value, configurable: true });
  try {
    const first = await prepareCapture(krillion);
    assert.equal(first.totalHeight, 1160);
    assert.equal(first.y, 50);
    assert.equal(first.height, 600);
    assert.equal(first.offsetY, 0);
    assert.equal(doc.querySelector("aside")!.style.display, "none");
    assert.equal(doc.querySelector("section")!.style.display, "");
    assert(target.contains(doc.querySelector(".ds-done-krill")));
    assert.equal(target.querySelectorAll("li").length, 7);
    const last = await captureSlice(600);
    assert.equal(last.offsetY, 560);
    assert.equal(last.height, 600);
    restoreCapture();
    assert.equal(scroller.scrollTop, 120);
    assert.equal(doc.querySelector("aside")!.getAttribute("style"), null);
    await assert.rejects(
      prepareCapture({ ...krillion, scrollContainerSelector: ".missing" }),
      /scroll container/,
    );
  } finally {
    restoreCapture();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
    dom.window.close();
  }
});
