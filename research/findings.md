# Integration findings — 2026-10-30

## Observed live behavior

- Official Wordle: `https://www.nytimes.com/games/wordle/index.html`.
  - Board: `#wordle-app-game [class*="Board-module_board__"]`.
  - Six `role="group"` rows, each containing five tiles with `data-state` values `empty`, `tbd`, `absent`, `present`, or `correct`.
  - Help examples also have evaluated tile states: all detection must be scoped to the board.
  - Results/help overlays are native `dialog` elements with `data-testid="modal-overlay"`.
  - Share formatting was checked against the shipped share selector in `2174.21b582036a6598268996.js`: puzzle number, score, optional hard-mode asterisk, blank line, colored tile grid.
  - Current settings use `games-settings-wordleV2/<account>`, with `states[].data`; dark theme is also stored as `nyt-wordle-darkmode`. This was observed by toggling Hard Mode in an isolated live profile.
- Globle: `https://globle-game.com/game`, app v1.10.8.
  - Globe: `.scene-container canvas`, a real WebGL rendering.
  - Form: `[data-cy="guesser"]`, disabled after a win.
  - Daily `guesses` localStorage value: `{day:"YYYY-MM-DD", countries:[...]}`.
  - `statistics`: `lastWin`, `currentStreak`, `usedGuesses`, `emojiGuesses`.
  - **Live `lastWin` is an RFC date string**, e.g. `Fri, 30 Oct 2026 … GMT`, not necessarily an ISO date. Normalize it to the browser's local day.
  - Current stats popup: `.m.absolute.z-40`. Temporarily hide it for capture; restore afterwards.
  - Share text construction confirmed in shipped `index-DityyZtG.js`; win/stat persistence confirmed in `Game-BhWAllN-.js`.

The generic T3 preview failed before opening with: “Chrome will not start its sandbox as root.” Local disposable browser profiles were used instead. No player's existing game profile or statistics were used.

## Evidence boundary

REA static analysis of the downloaded Globle index bundle returned `ev_214b37c03d9dfb78e9fdfadfdc9b0b54a1535e57e277e4d56c9326070f423731` (artifact-root SHA-256 `e680c6b1179df782aa66b7dc4d0bf709e6c052ad8284f7344d905f8b25739cf0`). This establishes static artifact analysis, not runtime correctness. The observations above also use direct live DOM/storage inspection and focused reads of shipped scripts.

The extension is an integration with independently maintained websites. Selectors/storage layouts can change; the adapter boundary contains those changes. Account synchronization, every locale/theme, consent variants, and browser store distribution have not all been exercised. Local results can be modified by the player and are not authoritative leaderboard evidence.

## Verification completed

- Real Chromium extension, disposable profile: official Wordle six-guess loss → automatic board capture/save → Globle win → automatic globe capture/save → completed run. Both saved images were visually inspected; neither contains the result popup.
- Installed Chrome and Firefox temporary extensions, deterministic local fixtures: win detection, two-stage auto-advance, share-text persistence, screenshot pixel dimensions, and absence of a deliberately magenta overlay all passed.
- Firefox fixture testing required a host match without a port and explicit test-profile host grants. Production matches use the real HTTPS domains, and Start requests the required permission from the user.
- Unit tests cover unfinished boards, Wordle win/loss, help-tile isolation, theme/hard-mode settings, stale/malformed Globle records, actual RFC win dates, selection validation, shuffle membership, and canonical spoiler-free summaries.
- Firefox manifest/package lint: zero errors and zero warnings.

Live-site gameplay was exercised in Chromium; Firefox's extension APIs and pipeline were exercised with local fixtures, not a live logged-in NYT/Globle account. The distribution artifacts remain unsigned development builds.
