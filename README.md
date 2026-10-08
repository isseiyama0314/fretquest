# FRET QUEST Academy

Static guitar-practice web app, published at https://isseiyama0314.github.io/fretquest/.

## Lessons

Six independently selectable courses, each with six sequential lessons (36 total). Clearing a lesson unlocks the next one in that course. First completion earns 40 XP; repeats do not duplicate XP.

1. First notes: tuning, open-string warm-up, Em/Am jam, quarter-note taps, Mary Had a Little Lamb, Twinkle Twinkle.
2. Chords: C/G, chord-chart literacy, G/D/Em/C, down-up eighths, G/C/D jam, boss: 8-beat strum.
3. Groove: down/up, rests, offbeats, syncopation, 8-beat rock, boss: groove medley.
4. Fretboard: intervals, low strings, high strings, C major scale, Ode to Joy, When the Saints.
5. Riffs: chromatic exercise, A minor pentatonic, power chords, rock riff, walking boogie, boss: garage riff.
6. Stage: barre chords, sixteenth notes, major/minor ear training, encore melody, Amazing Grace, finale.

Melodies are public-domain tunes or original phrases written for this app. All exercises use standard tuning E2 A2 D3 G3 B3 E4 and A4 = 440 Hz.

## Play-along stages

27 lessons are play-along stages (`stage.js`). Notes (tab: string and fret) or strum arrows scroll toward a hit line over a synthesized backing: drums for melodies, a soft attack-free pad for strumming so it is not mistaken for a strum. Each note is graded PERFECT / GREAT / OK / MISS with combo and a 0–100 score. ★1 (60) clears the lesson, ★2 is 80, ★3 is 93. "Slow" (75% tempo) can clear but is capped at ★2. A timing-offset setting (0 / +0.1 s / +0.2 s for Bluetooth) compensates output delay, and the result screen reports the average early/late drift.

## Actual assessment limits

Melody stages (microphone): a YIN-style detector must hear the exact target pitch (nearest semitone) for two consecutive frames inside the note's window. A repeated pitch only counts if a new pick attack is detected, so a ringing note cannot pass the next identical note. This does not grade chords, fingering or tone.

Strum stages (microphone): only the timing of strum attacks is graded. Attacks that match no target count as EXTRA and cost points, so random strumming scores 0. Whether the correct chord shape is held is not judged and the screen says so.

Tap mode is available on every stage and is labeled as screen-tap timing, not guitar grading. The microphone requests echo cancellation; headphones are still recommended. No audio is recorded or uploaded.

Other lessons are unchanged: quizzes, fretboard quizzes, tap rhythm lessons (tolerance 150 ms or 30% of a subdivision) and locally generated ear-training triads.

## Records and installation

The existing `fretQuestV1` localStorage key is retained. Course activity counts toward practice days and streaks. JSON export/import merges daily activity and course completions, protecting against duplicate XP. This is manual transfer, not account-based cloud synchronization. Automated account sync requires an authenticated backend; none is configured in this static site.

The manifest, PNG icons and a service worker support home-screen installation and cached offline lessons. The service worker is limited to `/fretquest/`, caches only app assets, and never handles microphone audio. This is a PWA, not an App Store native iOS application. iPhone hardware microphone accuracy and Safari installation require device verification.

## Validation

`tests/stage-playthrough.cjs` drives the real page in headless Chromium and feeds synthetic plucked notes and strums in as the microphone. It checks that clean playing scores at least 95, that silence and random strumming stay below the clear line, that the +0.2 s offset setting restores a delayed performance, and that tap mode works. `ALL=1` also plays every stage once. Serve the folder that contains `fretquest/` on port 8765 first (for example `python3 -m http.server 8765`).

These are synthetic signals. They do not establish accuracy with a real guitar, a real iPhone microphone or real Bluetooth latency; those still need device testing.

API references: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia and https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/.
