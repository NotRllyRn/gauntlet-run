# Gauntlet scoring proposal (historical)

Implemented rules and share-only adaptations are documented in [scoring.md](scoring.md). This document retains the original alternatives and is not the implementation specification.

## Recommended structure

Keep three separate layers:

1. **Raw game score** `R`, with a declared minimum `0` and maximum `M`.
2. **Reference normalized score** `S = clamp(R / M, 0, 1) × 1000`. The correction multiplier is `C = 1000 / M`.
3. **Run contribution** `T × w × (R / M) / sum(weights)`, where `T` is the configurable run maximum and `w` is this game's nonnegative weight.

Total = sum of contributions. With ten equal weights and `T=10000`, each game contributes at most 1000. If Krillion has weight 2 and each other game weight 1, Krillion contributes at most 1818.18 and each other game 909.09; the run still caps at 10000. Weights redistribute the fixed budget rather than increasing it.

Official runs retain all ten games in the denominator: unplayed games score zero, so skipping cannot inflate the score. Custom runs can use a smaller roster with a denominator fixed at run start, but should be labeled separately. Require at least one positive weight. Round only the displayed final total; preserve unrounded components. Never silently recalculate old published runs after changing a rule: save the scoring version, settings, selected roster and weights with the result.

Do not include time in the initial point formula. Use global elapsed time (excluding explicit pauses) as an optional tie-breaker, because it also includes research time. Per-game focused time remains useful analytics. This is a local scoring system, not proof of an unassisted competitive run.

## Shared finite-guess rule

For a game with `N` attempts and a successful solve on attempt `g`:

- Win: `R = N + (N - g) = 2N - g`.
- Loss or explicit final give-up: `R = (N - 1) × q`, where `q` is observed closeness from 0 to 1.
- Never started: `R = 0`.
- Raw range: `0 … (2N - 1)`; correction: `1000 / (2N - 1)`.

Thus every win outranks every loss: even a last-attempt win earns `N`, while a loss earns at most `N-1`. Use the **best single submitted attempt**, not the sum of feedback across guesses. Repeated guesses do not accumulate points, drafts do not count, and a genuine solve immediately uses the win branch. Skips consume attempts but have zero closeness.

For six-attempt games the normalized win scores are:

| Solve on guess |    1 |      2 |      3 |      4 |      5 |      6 |
| -------------- | ---: | -----: | -----: | -----: | -----: | -----: |
| Points / 1000  | 1000 | 909.09 | 818.18 | 727.27 | 636.36 | 545.45 |

Failures score 0 to at most 454.55, depending on achievable closeness. The theoretical ceiling is conservative: a fully correct attempt must be a win, not a failed attempt with `q=1`.

The configurable version is `R_win = B + E × (N-g)/(N-1)` and `R_fail = P × q`, with default `B=N`, `E=N-1`, `P=N-1`. `M=B+E`. Keep `0 ≤ P < B` if every win should outrank every failure. Changing the raw maximum automatically changes the correction factor. A later-guess win having a higher quality score than an early loss is an intentional policy choice.

## Formulas for all ten games

All raw and normalized minima are **0**. Each recommended normalized maximum is **1000**, attained by the best valid result; the raw maxima deliberately differ.

| Game                    | Recommended raw score                  | Raw maximum M |          Correction C | Failure / close-out rule                                                                                  |
| ----------------------- | -------------------------------------- | ------------: | --------------------: | --------------------------------------------------------------------------------------------------------- |
| Krillion                | Native points `p`                      |           700 |     `10/7` ≈ 1.428571 | Native round points already include quality; do not add another closeness bonus. An unplayed run earns 0. |
| Wordle                  | Win `12-g`; otherwise `5q`             |            11 | `1000/11` ≈ 90.909091 | `q = max_rows((G + 0.5Y)/5)`                                                                              |
| Lewdle                  | Win `12-g`; otherwise `5q`             |            11 |             `1000/11` | `q = max_rows((G + 0.5Y)/L)`; `L` is the actual 5- or 6-letter length                                     |
| Minecraftle             | Win `20-g`; otherwise `9q`             |            19 | `1000/19` ≈ 52.631579 | Ingredient-aware `q`, described below; needs more recorded board data                                     |
| GuessThe.Game           | Win `12-g`; otherwise `5q`             |            11 |             `1000/11` | `q=0.5` if at least one submitted answer received the site's related-title/yellow feedback; otherwise 0   |
| Guess the Audio         | Win `12-g`; otherwise `5q`             |            11 |             `1000/11` | Same observed-feedback rule; do not infer semantic similarity from answer strings                         |
| Costcodle               | Win `12-g`; otherwise `5q`             |            11 |             `1000/11` | `e = best absolute price error / actual price`; `q=clamp((0.50-e)/0.45,0,1)`                              |
| Angle, guess round only | Win `8-g`; otherwise `3q`              |             7 | `1000/7` ≈ 142.857143 | `d = smallest absolute observed error in degrees`; `q=clamp(1-d/90,0,1)`                                  |
| Globle, soft decay      | Win `6+4×2^(-(g-1)/5)`; otherwise `4q` |            10 |                   100 | `q=clamp(1-d/2000,0,1)` using the closest distance actually revealed by the game, in km                   |
| Poople, par ratio       | Win `6+4p/g`; otherwise `4q`           |            10 |                   100 | `p` = optimal moves, `g` = submitted moves excluding start word; letter-progress `q` below                |

`G` means exact-position correct letters/ingredients; `Y` means present but misplaced. Use semantic feedback, not emoji colors: colorblind themes change the colors. Duplicate letters/ingredients use the game's evaluated feedback so duplicates cannot create extra credit.

### Wordle

The shared six-attempt rule is the recommendation. On a failed board, four green letters and one absent letter give `q=0.8`, raw 4, normalized **363.64**. Three green and one yellow give `q=0.7`, **318.18**. A last-guess solve earns **545.45**.

Hard mode should initially be recorded as a mode, not receive a guessed multiplier. Decide whether the official category requires it; separate leaderboards are simpler than claiming a calibrated difficulty adjustment.

### Lewdle

Use the same formula, divided by the actual word length. A failed six-letter row with four green and one yellow gives `q=0.75`, **340.91**. A six-letter puzzle is not automatically worth more than a five-letter puzzle.

Hint/ghost/sheltered modes require an explicit policy. Recommend separate assisted/unassisted categories initially. A configurable assist multiplier is possible, but a value such as 0.8 would be a design choice, not an empirically fair correction. If used, apply it after raw scoring and publish the assisted maximum. Do not treat the 💡 share symbol as an independently solved green letter; use underlying feedback and assistance metadata.

### Minecraftle — two options

**A. Solve efficiency only (available now).** `R=20-g` for a win, zero for failure. Raw maximum **19**, correction **1000/19**. A tenth-guess win earns **526.32**.

- Pros: minimal; no ambiguity about empty recipe slots; works with existing outcome/count.
- Cons: a near-perfect failed recipe and a completely wrong one both get zero.

**B. Ingredient-aware partial credit (recommended).** Same win formula; failure `R=9q`. For each submitted grid, let `m` be occupied slots in the revealed target recipe, `a` occupied slots in that guess, `G` correctly placed nonempty ingredients, and `Y` correct but misplaced ingredients. Set `q=(G+0.5Y)/max(m,a)` and take the best grid. No ingredients submitted means no progress; reject invalid zero-ingredient target data. Raw maximum **19**, correction **1000/19**.

- Pros: rewards recipe knowledge and placement; blank slots do not generate free points; extra ingredients can reduce closeness.
- Cons: requires saving submitted ingredient IDs/positions and the revealed recipe's occupied slots, not just nine feedback colors. Must honor the game's recipe/layout and duplicate-item rules.
- Example: target has 5 ingredients; best failed guess has 3 placed correctly and 1 misplaced, with 5 occupied guess slots: `q=0.7`, normalized **331.58**.

Do not sum greens across all guesses or count matching empty slots as ingredients. Native loss share says `10/10`, so scoring must use the separate saved outcome.

### GuessThe.Game and Guess the Audio

Both use the six-attempt rule. On failure, any game-confirmed related-title/yellow feedback gives `q=0.5`: raw **2.5**, normalized **227.27**. Red-only or six-skip failures earn zero. The coefficient 0.5 is configurable.

**Alternative: solve-only scoring.** Keep `12-g` on wins and award zero for every failure. Raw range stays **0–11**, correction **1000/11**. This is simpler and avoids treating every related-title hint as equally close, but discards genuine partial identification. The recommended related-feedback method above rewards that knowledge but can overvalue a weak relationship; its `q=0.5` coefficient is a policy choice.

These games do not provide a trustworthy continuous distance between arbitrary titles. Do not award points for spelling similarity, a language model's judgment, account rank, streaks, or unrelated history. A yellow share square may be disabled by a user's share settings, so scoring should use saved underlying feedback rather than rely solely on visible share text. If richer same-artist/franchise categories are desired, first verify that the site exposes those specific categories.

### Costcodle — two options

The game awards a win within 5% of the actual price. Let `e` be relative error of the best failed guess or the winning guess as appropriate.

**A. Follow the game's win rule (recommended).** Six-attempt base rule. Failure closeness is `clamp((0.50-e)/0.45,0,1)`: near the 5% win boundary gets high partial credit; errors of 50% or more get none. Raw maximum **11**, correction **1000/11**.

- Pros: respects what the game calls a win; simple; no extra reward for lucky exact cents.
- Cons: an exact price and a 4.9%-off price get the same win score at the same attempt count.
- Example: a loss whose best guess is 10% off earns **404.04**. Three-guess win earns **818.18**.

**B. Add exact-price precision.** On wins, `R=12-g + k×clamp(1-e/0.05,0,1)`, default `k=1`. Failures retain `5q`. Raw maximum **11+k**, default **12**, correction `1000/(11+k)`, default **83.333333**.

- Pros: distinguishes exact prices; precision weight `k` is explicit and adjustable.
- Cons: adds a competition rule the original game does not use; price rounding makes tiny differences potentially luck-driven.
- With `k=1`: exact first guess **1000**; a first guess exactly at the win boundary **916.67**; exact sixth guess **583.33**; sixth guess at boundary **500**. Failure ceiling is **416.67**. Use actual win status rather than recalculating a potentially rounded boundary.

The 50% failure cutoff is a tunable starting point, not calibrated difficulty data. Using relative error treats cheap and expensive products consistently in percentage terms.

### Angle — two options

**A. Score the four-guess round only (recommended initially).** `R1=8-g` on win, `3q` on loss; `q=clamp(1-d/90,0,1)`. Raw maximum **7**, correction **1000/7**.

- Pros: simple; everybody plays the same required component; skipping the optional Make round does not reduce the score.
- Cons: Make-round skill is ignored.
- Win points by attempt: **1000, 857.14, 714.29, 571.43**. A 10°-off failed round earns **380.95**. Use the site's actual degree/error semantics; do not assume a circular 0°/360° equivalence it does not use.

**B. Score both rounds, 75% Guess / 25% Make.** Let the Make round have `R2=6-a` on a solve in `a` attempts (three-attempt limit). On failed Make, use `R2=2q2`; on skip, zero. Suggested `q2=clamp(1-max(0,d2-5)/85,0,1)` for a site-confirmed ±5° win tolerance, with `d2` the closest observed construction error using the site's reflex-angle handling.

Combined raw `R=75×R1/7 + 25×R2/5`, range **0–100**, correction **10**. Replace 75/25 with configurable percentages totaling 100.

- Pros: rewards both types of skill; maximum remains 1000.
- Cons: adds rules/data validation; skipping Make limits the game to **750** even with a perfect Guess round. Official runs should explicitly adopt both rounds if this option is chosen.
- Example: Guess solved on attempt 2, Make on attempt 2: **842.86** normalized. Verify the stored Make-attempt representation and native reflex transformation before computing `d2`; do not assume those numbers are raw angles.

### Globle — two options

There is no native fixed guess limit or loss. A player leaving the tab is not giving up. Only an explicit final close-out can convert an unfinished game to a scored give-up.

**A. Soft decay (recommended).** On a solve, `R=6+4×2^(-(g-1)/h)`, default half-life `h=5`. Give-up `R=4q`, with distance closeness above. Range **0–10**, correction **100**.

- Pros: every additional guess costs something; no arbitrary attempt cutoff; even a very late solve stays above give-up partial credit.
- Cons: nonlinear; many-guess wins cluster near 600 points. Half-life needs playtesting.
- Examples: guesses **1→1000**, **6→800**, **11→700**, **21→625**. The win floor approaches 600; zero is available for unplayed/no-progress give-ups.

**B. Capped linear bonus.** On a solve, `R=6+4×clamp((H-g)/(H-1),0,1)`, default `H=20`. Give-up unchanged. Range **0–10**, correction **100**.

- Pros: easy to explain; a constant penalty until guess H.
- Cons: all solves at/after H tie at 600; H is an arbitrary cutoff unless calibrated.
- Examples: **1→1000**, **10→810.53**, **20 or later→600**.

For both, `q=clamp(1-d/D,0,1)`, suggested `D=2000 km`. A 500 km closest observed distance earns **300** on give-up. Use the game's disclosed distance definition (for example borders vs centers), not a made-up replacement. Geography makes proximity imperfect: a near miss to a large country may be easier than to a small island. Current stored shares have coarse colors, and unfinished checkpoints have country names but not numeric distance: numeric proximity requires an adapter enhancement. If distance is unavailable, report it as unknown; do not fabricate it from color. A conservative explicit fallback is zero partial credit.

### Poople — two options

The start word does not count as a move. Let `g` be submitted moves and `p` the site's revealed optimal move count. A valid solve must satisfy `g≥p>0`. There is no native loss or guess limit.

**A. Par ratio (recommended).** Win `R=6+4p/g`. Range **0–10**, correction **100**.

- Pros: adjusts efficiency to puzzle length; every excess move still matters; optimal paths always earn 1000.
- Cons: the same absolute number of extra moves costs less on longer puzzles.
- Example with par 6: **6 moves→1000**, **9→866.67**, **12→800**.

**B. Fixed excess-move penalty.** Win `R=max(6,10-lambda×(g-p))`, default `lambda=0.5`. Range **0–10**, correction **100**.

- Pros: each unnecessary move costs exactly 50 normalized points until the 600 floor; easy to audit.
- Cons: long puzzles receive no relative forgiveness; paths eight or more moves over par all tie at 600.
- Example with par 6: **6 moves→1000**, **9→850**, **12→700**.

For either option, explicit give-up can earn `R=4q`. Let `m0` be start-word letters already in the correct POOP positions and `mbest` the most matching letters in any submitted word. Set `q=clamp((mbest-m0)/(4-m0),0,1)`; no submissions means zero. A start word already equal to the goal is an exceptional invalid daily configuration, not a division by zero. This rewards improvement rather than free letters supplied by the puzzle. If the start has zero matches and a submitted word has three, give-up earns **300**.

This partial-credit measure is only a proxy: shortest word paths sometimes move away from matching letters. A dictionary-distance metric would be more principled but adds a dictionary/solver dependency and should be deferred under YAGNI.

## Data readiness and lifecycle

- Existing saved results support Krillion native points; finite-game outcomes/counts; Wordle and Lewdle feedback; Costcodle revealed price and guesses; Angle first-round deltas; Poople completed path and par.
- Minecraftle ingredient-aware failure scoring requires additional observed/revealed recipe data. Globle give-up distance requires recording observed proximity while playing. GuessThe.Game needs to retain its already-read `_f` feedback flags in structured results so hiding yellow squares in share preferences cannot change its score. Guess the Audio already retains its flags.
- Make-round Angle proximity needs validation of the site's stored-attempt/reflex semantics. Assistance metadata must be retained sufficiently to apply the chosen Lewdle policy.
- The run model currently distinguishes won/lost/completed, not a per-game final give-up. Add an explicit finalization action only when implementing approved scoring. Switching tabs, Next, pausing, or closing the browser must never automatically count as failure. Before finalization show a provisional score; exact finished-result reconstruction is not guaranteed from arbitrary incomplete checkpoints.
- Default unplayed score is zero; completed unknown/malformed data is an error/needs review, not a silently fabricated zero. Retain score inputs and configuration for audits. Do not use lifetime streak/average/rank to score today's run.

## Decisions to approve

1. Is a last-attempt solve worth roughly 53–57% and a failed near miss below roughly 43–47%, or should completion dominate more strongly?
2. Start all ten weights at 1 and target maximum at 10000? Recommended: yes, then adjust weights after real runs.
3. Minecraftle: zero on loss now (A), or implement ingredient-aware partial credit (B)? Recommended B if partial credit is a priority.
4. Globle: soft decay A or capped linear B? Poople: par ratio A or fixed excess B? Recommended A for both.
5. Costcodle: native win rule A or precision bonus B? Recommended A.
6. Angle: Guess-only A or both-round B? Recommended A initially.
7. Official assisted/hard-mode policy and explicit give-up policy. Recommend separate assist categories and no automatic forfeits.

These are bounded, understandable starting rules, not empirically equal-difficulty scoring. Equal maxima do not make games equally hard. Playtest distributions before treating the initial weights/decay constants as balanced.
