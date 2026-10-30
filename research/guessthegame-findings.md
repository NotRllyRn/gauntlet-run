# GuessTheGame adapter investigation

Target: https://guessthe.game/, shipped `/static/js/main.47095441.js`, investigated 2026-10-30. Only the daily screenshot game is supported; cover, quest, archive and description routes are outside this adapter.

## Observed contract

Direct inspection of the downloaded bundle (formatted copy in `/tmp/gtg-artifact/main.js`) identifies `LB` as the screenshot-game configuration, `zn`/`jn` as share construction, `Ho` as feedback colors, and `Mm`/`Tm` as revealed result rendering. Current puzzle identity is `.current-game-number` (`Game #1630` on investigation day). The site uses `ceil((now - local May 15 2022)/86400000)`, including its exact-midnight boundary behavior.

Raw localStorage keys are `${id}_gamestate` (`playing`, `win`, `lose`), `${id}_guess1` through `guess6`, and the corresponding `_f` boolean strings for submitted franchise matches. No hidden solution or bundled answer catalog is used by production. Completion requires the matching daily ID, submitted contiguous guesses, the appropriate `.win-msg`/`.lose-msg`, revealed `.answer span`, and native share button inside `.result`. The answer retained as a spoiler comes only from that revealed element.

Native sharing uses a space-separated six-square row, gamepad prefix, optional rank (derived from completed wins), optional member decoration, and rank/franchise/link preference switches. Only the presence of the site's cached membership hint is used; no account data is retained. Rank thresholds are the shipped `LB.progress_ranks` table. Historical outcome keys are read only to count wins, never exported. Screenshot capture uses the visible result panel.

## Evidence and limitations

T3 preview status was unavailable; opening failed with “Chrome will not start its sandbox as root”. Installed-extension tests use the repository's disposable Playwright profile workflow.

REA CLI analysis of the full 13.5 MB shipped bundle reached its 300000 ms per-source provider deadline. Partial evidence: `ev_39465802e5fb9c6d0135952c572d367788138c977fd141e675bd30e60853e3fd`; inventory artifact SHA-256 `5bed4eff326cd432aca572d147be778ff38d45ff9fdaff000c3c536e5b32f4fc`. Its semantic examination was explicitly not completed. This record establishes artifact inventory only, not behavior. Behavior claims above are direct source inspection, corroborated by the live test where stated. Full failure/partial record remains `/tmp/gtg-rea.json`.

## Integration

Exports: `guessthegame` adapter, `adapterFixture` from dedicated TypeScript fixture, and `{html, dimensions}` from dedicated browser fixture. The native storage strings cannot be JSON.stringify-encoded by the shared regression fixture loader: parent integration must support raw storage for these fixture entries. Shared files are not modified by this task.

Dedicated regression cases cover wins, six-guess losses, premature loss, missing panel, stale ID, malformed state and feedback, gapped submissions, unfinished play, and native share preference/franchise formatting. The live script uses six real Skip button submissions, then invokes the site's own Share Results handler and requires exact equality with the extension's saved result. Saved evidence contains only result/nativeShare and capture identifiers, never a broad storage dump.

## Validation results

- Live installed Chrome extension: PASS on puzzle #1630. Six real skips saved `lost`, `X/6`, six guesses, `preexisting: false`, and a completed run. Native Share Results output equals saved share text exactly.
- `research/guessthegame-live-raw.json` retains that result and nativeShare; `research/guessthegame-result.png` is the actual extension-saved screenshot, visually checked (512 × 650, revealed loss and answer visible).
- TypeScript typecheck passed. All 70 repository regression tests passed after parent added raw-storage loader support and this fixture opted into `rawStorage: true`.
- REA semantic analysis remains incomplete as described above; no successful semantic analysis is claimed.
- Full Chrome browser suite attempt passed its initial phase and browser restart, then failed at `Guess the Audio partial progress` before reaching GuessTheGame. This is a cross-game integration blocker, not a passing full-suite result. Parent owns shared browser harness/catalog integration; no shared fixes were made here.
- Full Firefox browser suite also passed its initial phase/restart and stopped at the same `Guess the Audio partial progress` timeout before GuessTheGame. Both full-suite attempts therefore remain blocked; the dedicated live GuessTheGame installed-extension check is independently passing.
