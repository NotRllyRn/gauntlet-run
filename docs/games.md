# Game lineup

Ten-game target lineup. Planned entries are not enabled in the extension until their adapters are implemented and verified.

| Game            | URL                                             | Status    | Capture      |
| --------------- | ----------------------------------------------- | --------- | ------------ |
| Wordle          | https://www.nytimes.com/games/wordle/index.html | Supported | Board        |
| Globle          | https://globle-game.com/game                    | Supported | Globe        |
| Krillion        | https://krillion.io/                            | Supported | Result panel |
| Minecraftle     | https://minecraftle.zachmanson.com/             | Supported | Result panel |
| Lewdle          | https://www.lewdlegame.com/App                  | Planned   | To inspect   |
| Guess the Audio | https://guesstheaudio.com/                      | Planned   | To inspect   |
| GuessThe.Game   | https://guessthe.game/                          | Planned   | To inspect   |
| Poople          | https://pooplegame.com/                         | Planned   | To inspect   |
| Costcodle       | https://costcodle.com/?utm_source               | Planned   | To inspect   |
| Angle           | https://angle.wtf/                              | Planned   | To inspect   |

Each adapter supplies observed progress, completion, structured results, native-format non-spoiler share text, and capture selectors. The shared engine handles tabs, timers, persistence, and exports.

Future scoring will use structured game metrics and retained share text. Normalization rules, cross-game weighting, and a total score are intentionally deferred until specified. Do not infer a numeric score by parsing display labels when structured metrics are available.
