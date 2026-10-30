import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { prepareCapture, restoreCapture } from "../src/capture";
import type { Adapter } from "../src/types";

test("background capture hides results; result capture preserves and targets them", async () => {
  const dom = new JSDOM(
    '<div id="board"></div><div role="dialog" id="result">Score: 10</div>',
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
    overlays: '[role="dialog"]',
    read: () => null,
  };
  try {
    dom.window.document.elementFromPoint = () => board;
    assert.equal((await prepareCapture(adapter)).width, 300);
    assert.equal(result.style.display, "none");
    restoreCapture();
    assert.equal(result.getAttribute("style"), null);
    dom.window.document.elementFromPoint = () => result;
    assert.equal(
      (await prepareCapture({ ...adapter, captureBackground: false })).width,
      200,
    );
    assert.equal(result.style.display, "");
    restoreCapture();
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
