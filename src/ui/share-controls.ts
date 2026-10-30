import type { Run } from "../types";
import { summary, spoilerImage } from "../sharing";
import { imagesFor } from "../run/storage";
import { projected } from "../run/engine";
import { element, onClick } from "./common";

export function renderShareControls(run: Run | null | undefined): void {
  for (const id of ["copy", "copy-image"])
    element<HTMLButtonElement>(id).disabled = !run;
}
export function wireShareControls(getRun: () => Run | null | undefined): void {
  const snapshot = () => {
    const run = getRun();
    if (!run) throw new Error("Start a run first.");
    return projected(run, Date.now());
  };
  onClick("copy", async () => {
    await navigator.clipboard.writeText(summary(snapshot()));
    element("copy-status").textContent = "Results copied.";
  });
  onClick("copy-image", async () => {
    const run = snapshot();
    // Start the clipboard write during the click; PNG rendering can finish later.
    const png = imagesFor(run).then((images) => spoilerImage(run, images));
    await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
    element("copy-status").textContent = "Image copied.";
  });
}
