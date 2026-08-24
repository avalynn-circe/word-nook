# Wordnook

A knock-off of Wordscapes: a crossword sheet with the letters missing and a
wheel of letters underneath. Drag across the wheel to spell a word; if it is on
the sheet it fills itself in, and real words that are not on the sheet go in the
jar for coins.

Expo SDK 57, `expo-dev-client`. 120 levels, 7,975-word dictionary.

## Running it

Copy over an existing working folder rather than extracting fresh, so
`node_modules` survives:

    ditto ~/Downloads/lofi-wordnook ~/lofi-wordnook
    cd ~/lofi-wordnook
    npm install          # only if package.json changed
    caffeinate -i npx expo start -c

The build stamp is at the bottom of the screen. Check it matches what you
expect before debugging anything.

## Does it need a new dev client?

Two native modules are in use:

| module | why |
| --- | --- |
| `expo-audio` | plays the rendered sounds |
| `@react-native-async-storage/async-storage` | saves progress |

If the dev client on the phone already has both, JS and assets reload over
Metro and no rebuild is needed. If not:

    eas build --profile development --platform android

Everything else here — levels, dictionary, sounds, game logic — is JS or assets
and ships without a build.

## Checks

    npm test       # compile the rules alone, then re-derive all 120 levels
    npm run purity # fail if anything in src/game imports React, RN or Expo
    npm run check  # typecheck the whole app

`npm test` compiles `src/game/` through `tsconfig.game.json`, which sets
`"types": []` so React Native's types are not even visible to it. That is what
keeps the rules runnable in Node.

## Sound

The browser version synthesised everything live in WebAudio. React Native has
no WebAudio and `expo-audio` plays files rather than generating them, so the
same DSP was reimplemented in `tools/render-audio.js` and rendered ahead of
time. The tuning carried over unchanged; only the source of the samples moved.

    node tools/render-audio.js     # rewrites assets/audio/*.wav

12 files, 0.9 MB: a 14.4s four-chord loop with tape crackle, eight pitched
blips, two small chimes, and the win celebration. The loop is tapered at both
ends so it does not click.

Finishing a sheet plays `win.wav` - a rising A-minor-pentatonic figure landing
on a sustained Am9, left to ring for three seconds. It ducks the loop to 0.18
while it plays and restores it afterwards, rather than competing with it. The
word that completes the sheet gets this instead of the ordinary found-a-word
tick, and `npm test` checks that the condition fires exactly once per level and
never before the last word.

Sound is off until the note in the top right is pressed, and the choice is
saved.

## Layout

    src/game/      rules and data. No React, RN or Expo imports - enforced.
    src/state/     the React hook, and storage behind an interface
    src/audio/     expo-audio playback of the rendered files
    src/ui/        board, wheel, theme, build stamp
    tools/         level verifier and audio renderer

The wheel uses `PanResponder` (RN core) and draws its trail with rotated
`View`s, rather than `react-native-gesture-handler` and `react-native-svg`.
Both of those are native modules and would have forced a dev-client rebuild
for a gesture and a line.

## Not done

- No win screen, level picker or bonus-word list yet - solving a level
  registers, but nothing celebrates it and there is no way to move on in the
  UI.
- Never run on a device. It typechecks, the rules are verified, and Metro
  bundles it, but nobody has seen it yet.
