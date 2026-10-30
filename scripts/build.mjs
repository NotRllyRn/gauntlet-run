import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
const common = {
  manifest_version: 3,
  name: "Gauntlet Run",
  version: "0.1.0",
  description:
    "Play Wordle and Globle in a timed sequence. Save scores, share text, and board screenshots locally.",
  permissions: ["storage", "unlimitedStorage"],
  host_permissions: [
    "https://www.nytimes.com/games/wordle/*",
    "https://globle-game.com/*",
  ],
  optional_host_permissions: ["<all_urls>"],
  action: { default_title: "Open Gauntlet Run" },
  content_scripts: [
    {
      matches: [
        "https://www.nytimes.com/games/wordle/*",
        "https://globle-game.com/game*",
      ],
      js: [
        "core.js",
        "adapters/wordle.js",
        "adapters/globle.js",
        "capture.js",
        "content.js",
      ],
      run_at: "document_idle",
    },
  ],
};
await fs.mkdir("dist", { recursive: true });
for (const target of ["chrome", "firefox"]) {
  const dir = `dist/${target}`;
  await fs.rm(dir, { recursive: true, force: true });
  await fs.cp("extension", dir, { recursive: true });
  const manifest = {
    ...common,
    background:
      target === "chrome"
        ? { service_worker: "background.js" }
        : { scripts: ["core.js", "screenshot.js", "background.js"] },
  };
  if (target === "chrome") manifest.minimum_chrome_version = "120";
  else
    manifest.browser_specific_settings = {
      gecko: {
        id: "gauntlet-run@local.example",
        strict_min_version: "142.0",
        data_collection_permissions: { required: ["none"] },
      },
    };
  await fs.writeFile(`${dir}/manifest.json`, JSON.stringify(manifest, null, 2));
  await fs.rm(`dist/gauntlet-${target}.zip`, { force: true });
  execFileSync("/usr/bin/python3", [
    "-c",
    'import shutil,sys;shutil.make_archive(sys.argv[1],"zip",sys.argv[2])',
    `dist/gauntlet-${target}`,
    dir,
  ]);
}
console.log("Built dist/chrome, dist/firefox and ZIP packages.");
