import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { build } from "esbuild";
import { games } from "../src/games";
const matches = games.flatMap((g) => g.matches);
const common = {
  manifest_version: 3,
  name: "Gauntlet Run",
  version: "0.2.0",
  description:
    "Play games in any order, with focused-tab timers, pause/resume, local progress, and board screenshots.",
  permissions: ["storage", "unlimitedStorage", "alarms"],
  host_permissions: matches,
  optional_host_permissions: ["<all_urls>"],
  action: { default_title: "Gauntlet Run", default_popup: "popup.html" },
  content_scripts: [{ matches, js: ["content.js"], run_at: "document_idle" }],
};
for (const target of ["chrome", "firefox"]) {
  const dir = `dist/${target}`;
  await fs.mkdir(dir, { recursive: true });
  // Remove only generated files, then rebuild from explicit entrypoints.
  for (const entry of await fs.readdir(dir))
    await fs.rm(`${dir}/${entry}`, { recursive: true, force: true });
  for (const file of ["dashboard.html", "popup.html", "dashboard.css"])
    await fs.copyFile(`extension/${file}`, `${dir}/${file}`);
  await build({
    entryPoints: {
      background: "src/background.ts",
      content: "src/content.ts",
      dashboard: "src/ui/dashboard.ts",
      popup: "src/ui/popup.ts",
    },
    outdir: dir,
    bundle: true,
    format: "iife",
    target: ["chrome120", "firefox142"],
    minify: false,
  });
  const manifest = {
    ...common,
    background:
      target === "chrome"
        ? { service_worker: "background.js" }
        : { scripts: ["background.js"] },
    ...(target === "chrome"
      ? { minimum_chrome_version: "120" }
      : {
          browser_specific_settings: {
            gecko: {
              id: "gauntlet-run@local.example",
              strict_min_version: "142.0",
              data_collection_permissions: { required: ["none"] },
            },
          },
        }),
  };
  await fs.writeFile(`${dir}/manifest.json`, JSON.stringify(manifest, null, 2));
  execFileSync(
    process.execPath,
    [
      "node_modules/web-ext/bin/web-ext.js",
      "build",
      "--source-dir",
      dir,
      "--artifacts-dir",
      "dist",
      "--filename",
      `gauntlet-${target}.zip`,
      "--overwrite-dest",
    ],
    { stdio: "pipe" },
  );
}
console.log("Built TypeScript extension for Chrome and Firefox.");
