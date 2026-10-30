# Scoring

Implemented in `src/scoring.ts`. No adapters collect additional data. The same pure calculation drives dashboard/popup points and the canonical non-spoiler copy summary.

## Configuration and persistence

Edit `scoringDefaults` for reference maximum (1000), per-game weights (1), partial-credit coefficient (0.5), Globle half-life (5), solve floor/efficiency bonus (6/4), and Angle round weighting (75%/25%). No settings UI.

New runs snapshot these settings into local storage alongside their native shares. Scores are derived, not separately cached. Reloading, pausing, or exporting preserves the inputs. Legacy runs without settings use current defaults. If changing formula semantics, add a new scoring version and retain the previous calculation for old runs; unsupported versions show unavailable scores.

Normalized score = raw / raw maximum × reference maximum. Correction factor = reference maximum / raw maximum. Each game exposes raw, maximum, correction, and normalized values through `scoreGame`.

Run maximum = reference maximum × number of configured games (10000 for ten games). Contribution = run maximum × game weight / sum(all configured weights) × raw / raw maximum. Weights must be nonnegative with at least one positive value. Excluded/unplayed games keep zero contribution; a subset never inflates its score. Round only display values; rounding individual rows may differ by a few points from the rounded total.

Timers do not affect points. Totals accrue from completed saved shares, not unfinished checkpoints. Pausing, switching games, and closing tabs do not finalize a game. Incomplete runs and runs with unscorable results are provisional. Malformed results show “score unavailable”; their missing contributions are excluded from the provisional sum.

## Implemented formulas

Finite-guess games use `R = 2N - g` on a win in g guesses, `R = (N-1)q` on failure, and maximum `2N-1`. All raw minima are zero. Use the best single guess for q, never cumulative feedback.

- **Wordle / Lewdle:** N=6, maximum 11. q = (green + 0.5 yellow) / row width. Orange/blue high-contrast squares count as green/yellow. Lewdle uses five or six cells; hint/ghost icons reveal no correctness and earn no closeness credit.
- **Minecraftle:** N=10, maximum 19. q = (green + 0.5 yellow) / 9 for each three-row share grid, including blank squares in the denominator. Empty recipe slots cannot be distinguished from other blank share cells. Existing saved outcome disambiguates the native `10/10` header (loss versus tenth-guess win); all counts and partial credit come from the share.
- **GuessThe.Game / Guess the Audio:** N=6, maximum 11. Nonblank squares consume attempts; green ends a win. On failure, any yellow gives q=0.5, otherwise zero. Share preferences that suppress yellow necessarily suppress that partial credit too.
- **Costcodle:** N=6, maximum 11. Respect the native successful guess count; no exact-price bonus. On failure, yellow gives q=0.5 and red gives zero. This explicitly replaces the proposal's continuous price-error proximity because native shares omit prices/errors.
- **Angle:** Guess round uses N=4, maximum 7, q=best orange-square count/5 on failure. Make round earns `6-a` for a solve in a=1..3 attempts, maximum 5; “not made” or no suffix earns zero. Combined raw = `100 × (0.75 × Guess/7 + 0.25 × Make/5)`, maximum 100. Shares omit exact failed-round errors, so no continuous proximity or failed Make credit is inferred. Skipping Make caps normalized points at 750 by default.
- **Krillion:** numeric score line, raw maximum 700; correction 10/7 by default.
- **Globle:** `6 + 4 × 2^(-(g-1)/5)`, maximum 10. Parse g from the final `= g`, ignoring lifetime streak/average. Solves approach 600 normalized points. No completed share means no awarded points.
- **Poople:** `6 + 4 × par/moves`, maximum 10. Parse moves/par from the share header (not attempts/limit). Require moves ≥ par > 0. No completed share means no awarded points.

Every finite-game win outranks its failure partial credit. These are scoring policies, not empirically calibrated equal difficulty. All other inputs, including spoilers, prices, answers, and screenshot pixels, are ignored.

## UI and sharing

Dashboard and popup show running total, weighted game points, and the existing timers. The existing **Copy non-spoiler summary** button now includes the total score and time and colored rows with each game's weighted points. The ten rows retain catalog order regardless of selection or play order. Native per-game share copies remain unchanged.

## Verification

`tests/scoring.test.ts` covers every adapter's native fixture, formula boundaries, partial/zero credit, high contrast, Angle's second round, configurable weights/scale, JSON roundtrip, malformed input, legacy fallback, canonical ordering, and spoiler exclusion. The installed-extension browser suite checks dashboard output and the copy button in Chrome and Firefox alongside existing capture, timing, and restart regressions.
