# Game lineup

All ten games are enabled for their daily modes. The shared run engine handles selection, arbitrary play order, timers, pause/resume, local persistence, and canonical exports.

| Game            | URL                                             | Status    | Capture      |
| --------------- | ----------------------------------------------- | --------- | ------------ |
| Wordle          | https://www.nytimes.com/games/wordle/index.html | Supported | Board        |
| Globle          | https://globle-game.com/game                    | Supported | Globe        |
| Krillion        | https://krillion.io/                            | Supported | Result panel |
| Minecraftle     | https://minecraftle.zachmanson.com/             | Supported | Full board   |
| Lewdle          | https://www.lewdlegame.com/App                  | Supported | Board        |
| Guess the Audio | https://guesstheaudio.com/                      | Supported | Background   |
| GuessThe.Game   | https://guessthe.game/                          | Supported | Background   |
| Poople          | https://pooplegame.com/                         | Supported | Background   |
| Costcodle       | https://costcodle.com/                          | Supported | Full game    |
| Angle           | https://angle.wtf/                              | Supported | Result panel |

Each adapter supplies observed progress, completion, structured results, native-format non-spoiler share text, and capture selectors. The shared engine handles tabs, timers, persistence, and exports.

Future scoring will use structured game metrics and retained share text. Normalization rules, cross-game weighting, and a total score are intentionally deferred until specified. Do not infer a numeric score by parsing display labels when structured metrics are available.

Guess the Audio and GuessThe.Game capture the background clue/player view and preserve native share preferences (rank, link, and related-title feedback). Poople captures its full submitted word path, and stores both guesses used and optimal guesses (`par`); it has no daily loss state. Costcodle captures the product and entire guess history, including the revealed price.

Only submitted/revealed information is read by production adapters. Test-only solving helpers are kept in live-test scripts. Native share text remains unmodified in meaning; future score normalization should use the structured outcome and numeric metrics alongside it.
