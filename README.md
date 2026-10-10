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

## Jam sessions

`jam.js` loops the chord changes of blues and jazz standards (12-bar blues in A, Sweet Home Chicago, The Thrill Is Gone, Billie's Bounce, ii–V–I, Autumn Leaves, Fly Me to the Moon, Blue Bossa) with a generated band: walking bass, ride and comping for swing, a shuffle groove for blues, and a bossa nova pattern. Only chord progressions are included, never melodies; the progressions are common simplified versions. A fretboard map shows the current chord's tones (with degrees) and the notes that fit. With the microphone on, each newly detected single note scores loosely: chord tone 100, scale tone 50, anything else 0 and breaks the combo. Nothing fails. The bass is kept below the guitar's low E and detections below E2 are ignored, but backing played through a speaker can still be picked up; earphones are recommended. Best scores stay in this browser (`fretQuestJam`).

## Rhythm games

`games.js` has three games played on muted strings (onset timing only, with a tap fallback):

- Call & response: the app plays a one-bar rhythm, the player answers it in the next bar. Two wins raise the level (denser patterns, faster tempo; from level 7 the pattern is hidden). Three misses end the game.
- Tempo survival: a count-in bar, then two judged bars of a chosen pattern. 85% or better raises the tempo by 5. Three misses end the game.
- Just timing: strum quarter notes while the click plays, then keep going through 2, 4, 8, 12 and 16 silent bars. The player's own offset during the click bars is the baseline, so device latency does not count as drift. The average deviation and the rushing/dragging trend are reported.

- Feel games, tapped on screen (or strummed with earphones, since clicks keep playing while judged): 裏拍キープ (tap the offbeats while the click thins out from every beat to beat 1 only, then 16th offbeats), 変拍子アクセント (tap group starts in 6/8, 5/8, 7/8 2+2+3 and 3+2+2, 9/8 after one accented bar) and ポリリズム (3 against 2 up to 5 against 4). One bar to listen, two to tap; two clean rounds raise the level, three misses end.
- Weak-rhythm remix: eight rounds drawn from the rhythm book, weakest and most recent first, cycling three faces: hear and see the call, hear it only, or read it and play it straight away (Rhythm Heaven style remix). Rated ハイレベル / OK / もう一回.

The rhythm book (`fretQuestRhythmBook`, this browser only) collects one-bar rhythms the player missed: call & response patterns, tempo-survival patterns at their tempo, and every 4/4 bar of a song or strum stage that contained a miss (identical rhythms are merged). A rhythm leaves the book after two clean passes in a row. Call & response results list the rhythms missed in that game with a one-tap review, and once the book holds three rhythms the daily menu's game becomes the remix.

While the player is judged, the backing is a soft attack-free pad, so speaker sound is not mistaken for a strum. Best records stay in this browser (`fretQuestGames`).

## Tools, daily menu and records

`tools.js` adds a microphone tuner (nearest string or a tapped one with a reference tone, median-smoothed, within 5 cents counts as tuned) and an automatic timing measurement (eight clicks; the median offset is saved and used by stages, sessions and games; noisy or incomplete runs are refused).

Today's menu replaces the retired daily quests (35-second chord change, note-name quiz, screen-tap rhythm): one lesson (the next one, or the lowest-starred stage), one session and one rhythm game, rotating by date. Beginners only get the three easier sessions until 12 lessons are cleared. A lesson clear earns 40 XP the first time; each session or game earns 20 XP the first time it is played that day; finishing all three adds a 40 XP bonus. Sessions and games count toward practice days and streaks, appear in the calendar and badges, and their best records travel with the JSON export. Older records that hold the retired quests remain valid.

## Phrase dojo

`licks.js` teaches 21 modules across blues, jazz and pops, split into solo/improvisation and comping. Each module has three steps: learn (play the lick or comping pattern from a tab/strum chart), groove (at tempo over drums, with space between repeats) and use (a session mission for solos, the full form for comping). Steps one and two clear at ★1; a mission clears when every goal is met. Clearing all three masters the module; titles rise with the number mastered.

- Blues solo: pentatonic box 1, B.B. box, blue note (♭5), turnaround, call and answer. Blues comping: shuffle boogie, 7th-chord backbeat.
- Jazz solo: chord-tone arpeggios, guide tones, enclosure, ii–V–I lick, minor ii–V. Jazz comping: shell voicings, four-to-the-bar, Charleston, bossa nova.
- Pops solo: major pentatonic, singing lines. Pops comping: 8-beat strum, 16-beat cutting, arpeggio.

Missions are graded from the notes the microphone hears during a session: note count, share of notes in a scale, share of chord tones, 3rds and 7ths, a specific pitch (such as the blue note), register (B.B. box range) and chord tones landed on downbeats. Register is used as a proxy for position; fingering itself is not judged. Licks are original or common idioms; no song melodies are used. Pop sessions (王道進行, カノン進行, ballad) use a straight 8-beat groove. Progress is kept in this browser (`fretQuestLicks`).

## Off-guitar training

`train.js` offers nine screen-and-sound games for times without a guitar, five levels each. A run is five quick questions; four correct opens the next level, and faster answers and combos raise the score.

- メロディ耳コピ (solfège): hear a 3–5 note melody and reproduce it by tapping a six-string, frets 0–7 board; the first note is given and every tap sounds. C major steps up to A minor pentatonic and blues phrases.
- 拍子当て: name the meter of a drum groove (4/4 and 3/4 up to 6/8, 5/4, 7/8, 9/8, 12/8).
- ズレ探し: find the one click out of eight that is early or late (90 ms down to 18 ms).

- 音程当て: intervals from 3rds/5ths/octave up to every interval, descending and harmonic.
- コード聴き分け: major/minor up to 7th chords, diminished, augmented, sus4 and 6th.
- 進行聴き取り: after the tonic, name three chords by degree (I–IV–V up to ii7–V7–Imaj7 and minor keys).
- リズム聴き取り: pick the heard one-bar rhythm from four charts; wrong answers go to the rhythm book.
- 指板マップ: tap where a named note sits on a given string (low strings first, then all strings with sharps and flats).
- 理論ドリル: diatonic chords, chord tones, relative minors and pentatonics, key signatures, modes over each chord.

Each mode played counts as the daily menu's game and earns 20 XP the first time that day. Progress is kept in this browser (`fretQuestTrain`).

After a wrong answer in interval training, a review panel puts the root, the right interval and the chosen interval on one fretboard (the playable shape from a root on the lowest string), names each interval's character and how many semitones the answer was off, and plays both intervals from the same root for comparison.

## Skipping ahead

Each course can be opened early in two ways: a skip challenge (play the course's last stage and reach ★1; only that stage counts as cleared) or opening it without a test. Experienced mode opens every course, makes the home card and daily menu follow the chosen course, and offers all sessions from the start. Skipped lessons are never marked cleared and earn no XP. Opened courses and the mode are part of the saved record and the export.

## Bass mode

A switch in the top bar chooses guitar or 4-string bass (E1 A1 D2 G2). The choice is kept in this browser and the page reloads so every screen follows it.

- Stages: melody stages drop two octaves (one, if two would go below the low E) and are laid out on bass strings and frets. Strum stages become the chord's root on the same rhythm. The lobby says which conversion was applied. Quiz lessons, chord diagrams and the guitar-specific lesson texts are not converted.
- Pitch detection searches down to 35 Hz with a 4096-sample window (guitar: 70 Hz, 2048). Because a phone microphone often reports a low bass note one octave high, a note one octave away from the target counts. The hit time is taken from the attack detector when one came just before the pitch settled, since the longer window settles later.
- Tuner: E A D G; an octave-high reading is folded back to the nearest open string; the reference tone plays an octave up so a phone speaker can reproduce it.
- Sessions: the band drops its bass line and the player is the bassist. Pitches down to E1 are scored (guitar mode ignores everything below E2, where the band's bass lives). Dojo missions add a goal type for roots on the downbeat.
- Phrase dojo: the bass shows 8 bass-line modules instead of the guitar modules (root playing and boogie walk for blues; root eighths, root–fifth–octave and a syncopated line for pops; two-beat, walking bass and bossa nova for jazz), with their own mastery count.
- Training: the fretboard map and the melody board use 4 strings, and melodies sit in the bass range.

Not verified on a real bass. The low-frequency response of iPhone microphones varies, and the synthetic tests cannot show it.

## Actual assessment limits

Melody stages (microphone): a YIN-style detector must hear the exact target pitch (nearest semitone) for two consecutive frames inside the note's window. A repeated pitch only counts if a new pick attack is detected, so a ringing note cannot pass the next identical note. This does not grade chords, fingering or tone.

Strum stages (microphone): only the timing of strum attacks is graded. Attacks that match no target count as EXTRA and cost points, so random strumming scores 0. Whether the correct chord shape is held is not judged and the screen says so.

The microphone is opened as raw instrument input (no echo cancellation, noise suppression or automatic gain): iOS voice processing suppressed sustained guitar notes. Attack and pitch thresholds follow a noise floor measured between notes, so quiet sources such as an unplugged electric guitar register while steady room noise does not; the floor does not rise while notes ring. Meters use a decibel scale. If several notes are missed while almost nothing reaches the microphone, the stage suggests moving the phone closer.

Tap mode is available on every stage and is labeled as screen-tap timing, not guitar grading. Headphones are recommended, because the microphone input is raw and would also hear the backing. No audio is recorded or uploaded.

Other lessons are unchanged: quizzes, fretboard quizzes, tap rhythm lessons (tolerance 150 ms or 30% of a subdivision) and locally generated ear-training triads.

## Records and installation

The existing `fretQuestV1` localStorage key is retained. Course activity counts toward practice days and streaks. JSON export/import merges daily activity and course completions, protecting against duplicate XP. This is manual transfer, not account-based cloud synchronization. Automated account sync requires an authenticated backend; none is configured in this static site.

The manifest, PNG icons and a service worker support home-screen installation and cached offline lessons. The service worker is limited to `/fretquest/`, caches only app assets, and never handles microphone audio. This is a PWA, not an App Store native iOS application. iPhone hardware microphone accuracy and Safari installation require device verification.

## Validation

`tests/stage-playthrough.cjs` drives the real page in headless Chromium and feeds synthetic plucked notes and strums in as the microphone. It checks that clean playing scores at least 95 (also at 1/20 level with room noise, which scored 0 before the adaptive thresholds), that silence and random strumming stay below the clear line, that the +0.2 s offset setting restores a delayed performance, and that tap mode works. `ALL=1` also plays every stage once. Serve the folder that contains `fretquest/` on port 8765 first (for example `python3 -m http.server 8765`).

`tests/tools.cjs` checks tuner readings and that a player 0.2 s late scores 100 after measuring. `tests/feel.cjs` checks that perfect taps clear every feel-game level and silence does not. `tests/interval-review.cjs` checks that a wrong interval answer shows the root, the right note and the chosen note on a guitar and a bass board with both playback buttons, and that a right answer shows none. `tests/train.cjs` checks that every training mode runs, a perfect run opens the next level, a poor run does not, wrong rhythm answers enter the rhythm book and XP counts. `tests/dojo.cjs` checks dojo steps, a failed and a passed session mission, mastery and a pop session. `tests/remix.cjs` checks that stage misses fill the rhythm book, that a perfect remix clears 8/8 and graduates the rhythm, and that call & response offers a review. `tests/skip.cjs` checks skip challenges, opening without a test and experienced mode. `tests/records.cjs` checks the daily menu, XP, bonus, streak, duplicate protection and export/import. `tests/bass.cjs` runs in bass mode: every stage converts to valid bass positions and strum roots, a converted melody and a root line score 100 (also when every other note is heard an octave high), silence and the original guitar register score 0, the tuner reads E1, A1 and an octave-high E, a bass-line learn step and a root mission pass, and the training boards have 4 strings. `tests/jam-games.cjs` does the same for sessions (chord-tone arpeggios score 100%, a chromatic line does not) and the three rhythm games (a perfect player clears them; a steadily drifting player fails the timing game).

These are synthetic signals. They do not establish accuracy with a real guitar, a real iPhone microphone or real Bluetooth latency; those still need device testing.

API references: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia and https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/.
