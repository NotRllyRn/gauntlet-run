# Gauntlet Run

A **TypeScript browser extension** for playing ten daily games in one resumable gauntlet. Choose games, reorder or shuffle the suggested lineup, and switch whenever you want. Scores, share text, board screenshots, progress, and timers stay on your device.

## Play your way

- **Next game** and direct game buttons focus the most recently accessed existing tab for an unfinished game, including tabs in another window. If no matching tab remains, they open a new one.
- Open a supported website yourself: the extension automatically associates it with your active run, provided that game was selected.
- Return to a game later. Its focused time accumulates across visits and tabs; it is never counted twice.
- Completion is detected independently for each game. Finish Globle first even if Wordle was first in the lineup.
- After saving a result screenshot, the extension opens the next unfinished game. Results remain saved if you switch away before the screenshot can be taken; return to that game to finish capture.
- The toolbar popup provides switching and pause/resume. The dashboard provides lineup, history, and exports.

## Gauntlet score

The popup and dashboard show points from completed native share results, alongside the timers. Defaults are 1000 points per game and a 10000-point run maximum. Unplayed/excluded games score zero; incomplete totals are provisional. The copy-summary button includes the score and all ten canonical game slots.

Formulas, correction scale, and weights live in `src/scoring.ts`. New runs save their settings for consistent results after resuming. See [scoring rules](docs/scoring.md) for formulas and share-only limitations.

## Two timers

**Total time** counts elapsed time while the run is running, including loading, research tabs, and other apps. Explicit pauses and browser downtime after recovery are excluded. It stops when every selected game has a detected result, rather than waiting for screenshot processing.

**Game time** counts only the active game tab in the focused browser window. Research tabs, background game tabs, unfocused windows, and pauses add no game time. Time stops for a game when its result is detected. Duplicate tabs share one accumulated game timer.

A visible page renews a short five-second timing lease. If a page crashes, freezes, or the device sleeps, the extension cannot accrue hours of unsupported game time from a stale focus record. This is approximate browser timing, not an authoritative competitive leaderboard.

**Pause** stops both timers and automatic completion processing until Resume. It does not freeze another website's internal JavaScript or prevent you from interacting with that website.

## Autosave and recovery

- Focus changes, opening games, completions, pauses, and resumes persist immediately.
- Game observations/checkpoints arrive every second. A 30-second browser alarm checkpoints total time when no game is actively sending observations.
- Screenshots are separate storage entries, so timer saves do not rewrite image data.
- Closing/reopening the browser restores the run **paused**, with its saved progress, timings, and results. Click Resume and open the desired game. Worker suspension within the same browser session does not pause the run.
- There is no reliable last callback after an abrupt process kill. Recovery uses the last successful checkpoint, so a crash can lose roughly the last observation interval of game time or up to the last alarm interval of total time. Browser throttling can extend these intervals.
- The games retain their own playable boards in their site storage. The extension saves observed guesses/progress but does not rewrite the games' private state. **A daily puzzle changing at midnight cannot always be resumed on its original website.** The extension detects a changed puzzle ID, pauses, and preserves the old run rather than mixing two days. Clearing site storage can also remove the playable board.
- Existing v0.1 run records are backed up and migrated. Earlier timings used wall clock; new focused-game counters begin at zero on migration.
- All data uses extension-local browser storage, not a server. Uninstalling the extension deletes it. Export full JSON if you want an independent backup.

## Install

Development requires Node 22+:

```sh
npm ci
npm run typecheck
npm test
npm run build
```

- **Chrome / Edge 120+:** open `chrome://extensions` / `edge://extensions`, enable Developer mode, choose **Load unpacked**, and select `dist/chrome`.
- **Firefox desktop 142+:** open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, and select `dist/firefox/manifest.json`. Temporary add-ons are removed on browser restart; reload the same extension ID for development. Persistent installation for everyday use requires a Mozilla-signed package. Development ZIPs are unsigned.

Builds are `dist/gauntlet-chrome.zip` and `dist/gauntlet-firefox.zip`. Start asks for optional all-sites permission because unattended cross-site screenshot capture requires it. Content scripts run only on the registered game URLs. There is no telemetry or upload endpoint.

Wordle may show its own Play, ads, help, consent, or login screens. Dismiss these normally. Keep a finished game visible for a few seconds for capture. If the board is covered or does not fit, the extension preserves the result and offers Retry screenshot.

## Consistent sharing

Share text template **v7** (image template **v6**) always follows the canonical catalog order: **Wordle, Globle, Krillion, Minecraftle, Lewdle, Angle, Costcodle, Guess the Audio, GuessThe.Game, then Poople**. Actual play order, shuffle, and selection never rearrange the slots. Excluded games show `Not included`; unfinished games retain their slot and accumulated time.

- **Non-spoiler text:** one header with date, total score and total time, followed by colored per-game point rows. No status line, score denominator or native share grids. No answers, guesses, or boards.
- **Spoiler image:** score/date/time header, per-game points, fixed-width panels, canonical order and normalized board crops. The image itself has no spoiler label; its board screenshots still contain spoilers. Missing captures are labeled. Its dimensions depend only on the supported catalog, never the run's selection/order.
- **Full JSON:** actual suggested order, partial progress, timestamps, timings, results, and screenshots. This export contains spoilers.

Use **Copy image** or download the PNG from the dashboard. The popup has text and image copy buttons near the top. Clipboard writes use the extension’s `clipboardWrite` permission; no clipboard reading is requested.

Each completed game saves its own non-spoiler `result.shareText`, separately from scores, spoiler data, and the combined summary. Saved results display this text with a per-game copy button for the selected current or historical run.

Per-game share text is reconstructed from observed Wordle tiles/settings or Globle statistics. It does not read the clipboard or hidden answers. Wordle capture targets the six-row board; Globle capture targets the rendered globe canvas. Krillion captures the daily result summary (points/depth), preserving the result panel rather than hiding it. The results overlay is temporarily hidden and restored, including on failure.

## Small modules, reusable adapter contract

TypeScript provides strict contracts and maintainability; it compiles to JavaScript and does not inherently make browser execution faster. Small checkpoint writes and separate image storage keep the runtime lightweight. There are no runtime dependencies, application framework, server, or generic plugin engine.

- `src/run/engine.ts`: pure run/timer transitions; accepts timestamps for deterministic tests.
- `src/run/storage.ts`: local persistence, screenshot storage, v1 migration, and session recovery.
- `src/background.ts`: browser events, serialized commands, tab discovery, and capture coordination.
- `src/adapters/`: only game-specific detection, progress extraction, and capture selectors.
- `src/capture.ts`: exposes the board, validates its rectangle, and restores the page.
- `src/browser/screenshot.ts`: browser capture, tab validation, cropping, and full-height stitching.
- `src/ui/`: shared popup/dashboard controls.
- `src/scoring.ts`: pure share parsing, configurable scoring, and weighted totals.
- `src/sharing.ts`: canonical text and image layouts driven by the catalog.
- `src/games.ts`: the one registration point for games, URLs, and manifest matches.

To add another game:

1. Copy `templates/game-adapter.ts` into `src/adapters/`.
2. Set `captureBackground: true` for a board crop with overlays hidden, or `false` with a `resultSelector` for a result-panel crop while preserving that panel; unrelated selected overlays are temporarily hidden. Implement its board selector, overlay selectors, and `read()` method. Return a stable puzzle ID, progress/checkpoint, and a complete result only after reliable completion evidence.
3. Register it once in `src/games.ts`. Navigation, timing, saving, UI controls, manifest generation, and share panels are shared automatically.
4. Add one entry to `tests/adapter-fixtures.ts` and `tests/browser-fixtures.mjs`. Shared contract tests run automatically for every registered game; the browser suite checks saved results, timing, and cropped images for each fixture. Add game-specific edge-case tests only where needed. Bump the sharing template version if changing the canonical catalog layout.

## Verification

```sh
npm run typecheck
npm test
npm run build
npx playwright install chromium firefox
npm run test:browser
npx web-ext lint --source-dir dist/firefox
```

The installed-extension browser test performs actual close/reopen cycles in disposable Chromium and Firefox profiles. It covers Wordle left at three guesses, manual Globle tabs, Next/direct buttons reusing unfinished tabs and recreating closed tabs, research exclusion, pause/resume, saved recovery, reverse-order completion, clean screenshots, and canonical text/image exports. Test-only catalog URLs and reporting pages are bundled into `dist/test-*`, never the shipping ZIPs.

`node scripts/live-extension-test.mjs` checks the real websites in an isolated Chromium profile. It intentionally completes today's games in that profile. Its test-only Globle answer lookup is not shipped. Live pages may change or show anti-automation screens; deterministic fixtures form the regression suite.

See `research/findings.md` for the original live evidence and limitations.

## Krillion and planned games

Krillion support covers the **daily dive at the root URL**, not Archive, Unlimited, packs, or Puffer Party. It reads current-account local progress/statistics and requires the displayed daily result to agree with seven persisted rounds. It uses the site's America/New_York reset date. A zero-point dive is still `completed`; it is not classified as a win or loss.

Saved Krillion results contain `metrics.points`, `maxPoints` (700), `rounds` (7), and `depthMeters`, along with native-format share text, per-round spoiler data, and a result-summary screenshot. The optional share-link preference is respected. No answer list or clipboard read is needed. If the site revises tiers so displayed points disagree with saved statistics, completion is withheld rather than saving inconsistent results.

The extension pause stops its own timers, not Krillion's round countdown. Use the game's own pause/menu controls as needed. Normalized gauntlet scoring remains deferred; raw numeric metrics and share text are retained for it.

See [the ten-game roadmap](docs/games.md). All ten games are implemented. Fixture tests do not establish compatibility with every future site update or account configuration.

`node scripts/live-krillion-test.mjs` plays a zero-point daily dive in a disposable Chromium profile by letting each round expire (about four minutes), then compares saved share text with the site’s actual Copy result output and checks result capture. An optional storage JSON path reopens an already observed live result for repeat capture verification. Neither mode uses a player’s existing profile.

## Minecraftle daily support

Minecraftle uses the shared engine without new run or storage logic. The adapter reads submitted crafting-grid progress and the visible completion dialog. It saves the native share text directly, numeric guess count/max guesses, win/loss, observed feedback grids, and the revealed solution in spoiler data. Capture targets the entire submitted board, from first to last guess. The shared capture code scrolls and stitches native-resolution viewport images, hiding the result dialog temporarily and restoring it and the original scroll position afterward. It does not scale the page. The board must fit the viewport width; captures are limited to 30 slices.

Only daily mode is tracked. Any `random` query parameter is excluded from both detection and game timing. Stats/help routes are also excluded. The game uses the browser's local calendar date.

Native loss shares say `10/10`, just like a tenth-guess win. The extension preserves that exact text and saves a separate `outcome: "lost"` and `score: "X/10"`. Future scoring should use that structured outcome as well as the share grid.

**Playable-board limitation:** the current Minecraftle site does not persist its crafting grids across reloads. Returning to a still-open tab resumes the board; reopening/reloading may reset it. The extension retains its observed progress, results, and timers but does not inject private site state to recreate the board. Leave the completion dialog open briefly for saving/capture; use Show Summary if capture is pending.

`node scripts/live-minecraftle-test.mjs` verifies a live daily win, native Copy text equality, and saved result capture in a disposable Chromium profile. Its solution/recipe lookup is test-only and never bundled into the extension. Shared browser fixtures cover the installation pipeline in Chromium and Firefox; dedicated fixtures cover losses and high-contrast mode.

## Lewdle and Angle

Lewdle reads submitted letters and stored feedback, checks that they agree, and reconstructs the native non-spoiler share text, including hints, ghost tiles, and sheltered mode. Five- and six-letter boards are supported. Capture hides stats and temporarily restores the board opacity; all styles are restored afterward. The daily number follows the site's fixed epoch. Lewdle does not store a board date: stale-board reset is owned by the site, so completion requires DOM/storage agreement but cannot independently prove a stored board's date.

Angle tracks the daily Guess round and waits for the optional Make round to finish or for the player to explicitly choose Results & share. Saved metrics retain round-two attempts, completion, and skip status. The share text includes the native round-two suffix when played. Capture preserves the final result panel. No hidden answer lookup is used by either production adapter.

`node scripts/live-next-games-test.mjs` completes Lewdle and Angle in disposable Chromium profiles, checks saved share text against each native copy action, and saves screenshots under `research/`. Lewdle's answer lookup is confined to that test. Angle's live check uses four deliberate incorrect guesses and skips round two. Shared installation tests cover both browsers; unit fixtures cover win/loss, assistance, malformed state, and Angle round-two results.

## Final four adapters

Guess the Audio, GuessThe.Game, Poople, and Costcodle use the same completion, screenshot, timer, and storage pipeline as the original six games. Daily root pages are supported; archive/unlimited modes are excluded by catalog routing and puzzle-date checks.

- Guess the Audio and GuessThe.Game save guess count, win/loss, native-format share text, and the background game view (clue/player and guess indicators). Result panels and footers are temporarily hidden for capture. Share preferences are respected.
- Poople saves the submitted word path, guesses used, optimal guesses (`par`), and extra guesses. It completes when the user reaches POOP; there is no fabricated loss state. The full submitted path is captured behind the result overlay; the fixed site header is temporarily hidden so it cannot cover the first row.
- Costcodle verifies stored feedback against the revealed price and visible rows. It saves guess count and win/loss publicly, with product, price, and submitted prices in spoiler data. Its capture contains the full product and guess history.

Run `node scripts/live-GAME-test.mjs` with GAME equal to `guesstheaudio`, `guessthegame`, `poople`, or `costcodle` after building. These disposable live checks save `research/GAME-result.png` and `research/GAME-live-raw.json`, and compare saved shares with each site's native copy action. Deterministic per-game fixtures participate automatically in the shared Chrome/Firefox installation, restart, timing, capture, and export tests. Site changes or overlays may require refreshing an adapter or retrying capture; existing scores remain saved.

Per-game research notes are in `research/*-findings.md`. Normalized scoring is intentionally deferred; all underlying results and share text are retained.

See [the scoring proposal](docs/scoring-proposal.md) for raw formulas, correction factors, weighting, alternatives, and data requirements. Scoring is awaiting review and is not yet implemented.
