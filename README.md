# Gauntlet Run

A small desktop browser extension for playing **daily Wordle and Globle** in one timed run. Choose either or both games, arrange their order, or shuffle. The extension detects completion, saves the result and game-style share text, captures the board behind the result dialog, and opens the next game.

All data stays in extension-local storage. No server, accounts, telemetry, framework, bundler, or runtime dependencies.

## Install for development

Run `npm ci && npm run build` (Node 22+, Python 3 for ZIP packaging).

- **Chrome / Edge 120+:** open `chrome://extensions` / `edge://extensions`, enable Developer mode, choose **Load unpacked**, and select `dist/chrome`.
- **Firefox desktop 142+:** open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, and select `dist/firefox/manifest.json`. Temporary installations are removed when Firefox restarts. Permanent distribution needs Mozilla signing; the provided ZIP is an unsigned development build.

Click the toolbar extension icon to open the dashboard. Choose the lineup and click Start. Grant the optional all-sites permission when prompted: Chromium requires this permission for unattended screenshots after navigating between sites. Content scripts are registered only for the two games; the extension never uploads page data.

Play in the tab the extension opens. Wordle may show its own Play, ad, help, cookie, or login screens; dismiss these normally. When a game ends, keep its tab visible for a few seconds while the board screenshot is saved. Capture errors appear in the dashboard; use **Return / retry capture** after resolving them.

## Scope and behavior

- Wordle daily game: wins and six-guess losses. Globle daily `/game`: wins. Practice, archives, and other games are outside this version.
- Share text is reconstructed from evaluated Wordle tiles/settings or Globle's saved statistics using the games' observed formats. The extension does not click Share, read the clipboard, or read hidden solutions.
- Wordle's screenshot is its six-row grid. Globle's screenshot is the globe canvas, including its rendered country highlights. The surrounding page, stats card, and guess list are excluded.
- Overlays are temporarily hidden and restored, including on errors. The visible tab is captured and cropped to the target element; this preserves the real WebGL globe. If the full target does not fit or is covered, capture fails explicitly rather than saving the wrong image.
- Results persist before navigation. Completion events are serialized and deduplicated. A failed screenshot leaves the run on that stage with its detected result pending.
- Already-completed daily puzzles are imported as **previously completed (untimed)**. Existing progress is not cleared. A resumed, partially played puzzle includes only time spent since launching this run.
- Timing uses persisted timestamps, includes loading, ads, transitions, capture waits, and time away, and has no pause feature. A stage ends at detected completion; total time ends after the final capture. Detection polls once per second, so this is casual timing, not precision competitive timing.
- Screenshots, histories, and exports can contain answers. The dashboard hides screenshots behind a spoiler disclosure. Uninstalling the extension removes local history; export JSON if you want a backup.

## Fixed sharing requirement

Share template **v1** always places **Wordle first, Globle second**, regardless of play order, shuffle, or selected subset. Excluded games retain a `Not included` slot; unfinished games retain an `Unfinished` slot.

- **Non-spoiler text:** date, status, timing rule, total duration, and each game's outcome/score/time. No words, country names, answer boards, or screenshots.
- **Spoiler image:** fixed 1200×930 image, explicit spoiler heading, two fixed panels, consistent labels and screenshot fitting. Excluded games keep an empty labeled panel.
- The raw JSON stores the actual play order and full per-game share text and screenshots. It is explicitly a spoiler export.

When more games are implemented, add their canonical slots and version the layout. This version deliberately has two slots, not seven empty placeholders for unspecified games.

## Code map

Plain JavaScript and native extension APIs keep the project easy to change. The browser global `Gauntlet` shares small helpers between classic content scripts and the two background implementations.

- `extension/adapters/wordle.js`, `globle.js`: game-specific DOM/storage readers and board/overlay selectors. Pure reads; no navigation or extension API calls.
- `extension/content.js`: polls the adapter and responds to capture requests.
- `extension/capture.js`: temporarily exposes the board, validates its visible rectangle, and restores the page.
- `extension/screenshot.js`: validates the active tab, captures and crops browser pixels, and always requests page restoration.
- `extension/background.js`: one sequential run coordinator; validates messages, persists state, captures, and advances. Chrome service worker and Firefox background event page share this file.
- `extension/core.js`: two-game catalog, run creation, shuffle, dates, and canonical non-spoiler formatting.
- `extension/dashboard.*`: lineup controls, progress/history, and local downloads.
- `extension/export-image.js`: canonical spoiler-image renderer.
- `scripts/build.mjs`: copies source and generates the two small manifests and ZIP files.

There is no plugin framework or generic workflow engine. To support a third game, implement its adapter, add a catalog entry and manifest match, then intentionally update the fixed export layout and its version.

## Checks

```sh
npm test
npm run build
npx playwright install chromium firefox
npm run test:browser
npx web-ext lint --source-dir dist/firefox
```

The installed-extension tests use deterministic local pages with real dialogs and canvas rendering. They verify both game transitions, persisted results, exact crop dimensions, and that the popup's pixels are absent. Test-only URL overrides, broad host grants, and a reporting harness are placed in separate `dist/test-*` directories and never included in release ZIPs.

`node scripts/live-extension-test.mjs` exercises the real sites in a disposable Chromium profile. It intentionally completes today's puzzles in that test profile (Wordle loss and Globle win). The test harness obtains Globle's test answer to exercise the win path; that code is **not shipped in the extension**. The production adapters only read finished results. Live sites can change or show consent/anti-automation screens, so this is a manual integration check rather than a reliable offline test.

See `research/findings.md` for observed selectors, verification, and remaining limits.
