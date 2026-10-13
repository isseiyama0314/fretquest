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

`jam.js` loops the chord changes of blues and jazz standards (12-bar blues in A, Sweet Home Chicago, The Thrill Is Gone, Billie's Bounce, ii–V–I, Autumn Leaves, Fly Me to the Moon, rhythm changes in B♭ (A section), a minor blues in C, a D dorian one-chord vamp, Blue Bossa, and for pops 王道進行, カノン進行, a ballad, city pop (IV–III–vi), J-rock (Am–F–G–C), a fast anisong 王道進行 and British rock (I–♭VII–IV)) with a generated band: walking bass, ride and comping for swing, a shuffle groove for blues, and a bossa nova pattern. Only chord progressions are included, never melodies; the progressions are common simplified versions. A fretboard map shows the current chord's tones (with degrees) and the notes that fit. With the microphone on, each newly detected single note scores loosely: chord tone 100, scale tone 50, anything else 0 and breaks the combo. Nothing fails. The bass is kept below the guitar's low E and detections below E2 are ignored, but backing played through a speaker can still be picked up; earphones are recommended. Best scores stay in this browser (`fretQuestJam`).

## Rhythm games

`games.js` has three games played on muted strings (onset timing only, with a tap fallback):

- Call & response: the app plays a one-bar rhythm, the player answers it in the next bar. Two wins raise the level (denser patterns, faster tempo; from level 7 the pattern is hidden). Three misses end the game.
- Tempo survival: a count-in bar, then two judged bars of a chosen pattern. 85% or better raises the tempo by 5. Three misses end the game.
- Just timing: strum quarter notes while the click plays, then keep going through 2, 4, 8, 12 and 16 silent bars. The player's own offset during the click bars is the baseline, so device latency does not count as drift. The average deviation and the rushing/dragging trend are reported.

- Feel games, tapped on screen (or strummed with earphones, since clicks keep playing while judged): 裏拍キープ (tap the offbeats while the click thins out from every beat to beat 1 only, then 16th offbeats), 変拍子アクセント (tap group starts in 6/8, 5/8, 7/8 2+2+3 and 3+2+2, 9/8 after one accented bar) and ポリリズム (3 against 2 up to 5 against 4). One bar to listen, two to tap; two clean rounds raise the level, three misses end.
- Weak-rhythm remix: eight rounds drawn from the rhythm book, weakest and most recent first, cycling three faces: hear and see the call, hear it only, or read it and play it straight away (Rhythm Heaven style remix). Rated ハイレベル / OK / もう一回.

The rhythm book (`fretQuestRhythmBook`, this browser only) collects one-bar rhythms the player missed: call & response patterns, tempo-survival patterns at their tempo, and every 4/4 bar of a song or strum stage that contained a miss (identical rhythms are merged). A rhythm leaves the book after two clean passes in a row. Call & response results list the rhythms missed in that game with a one-tap review, and once the book holds three rhythms the daily menu's game becomes the remix.

While the player is judged, the backing is a soft attack-free pad, so speaker sound is not mistaken for a strum. Best records stay in this browser (`fretQuestGames`).

## Guitar drills

`drills.js` has three short games judged by pitch through the microphone (no tap mode):

- 指板ハンター: name a string and a note, the player finds it in frets 0–12. A note counts when the right pitch is heard with a fresh pick attack after the question appeared. 60 seconds; the score is notes found. Levels: strings 6 and 5, all strings, all strings with sharps and flats. The same pitch on another string cannot be told apart, so which string was used is not judged.
- コードチェンジ・アタック: a four-bar progression (G–C–D–G, Em–C–G–D or C–Am–F–G), one chord per bar. On beat 1 of each bar the player picks the chord's lowest note (its root); the rest of the bar is free. A change counts when that pitch class (E2–E4) starts within 0.3 s of beat 1. Three of four on time raises the tempo by 8 from ♩60 up to ♩140; three misses end the game. The judged bars use an unpitched hi-hat as the beat so the backing is never heard as a root. The chord shape itself is not judged.
- チョーキング・ジャッジ: eight bends on strings 3 and 2 (half, whole, or a mix up to 1.5 steps). A reference tone at the target pitch plays first. The bend must start within 70 cents of the fretted note (fretting the target directly does not count) and hold within ±25 cents of the target for 0.3 s; the score is 100 minus twice the mean deviation, at least 50 for a success. Misses report how many cents short or over.

In bass mode the hunter uses the four bass strings (levels start on strings 4 and 3), chord changes take the root from the two lowest strings at the lowest fret and accept it from D1 up two octaves, and the bending drill is hidden (also from the daily menu).

Each drill counts as the daily menu's game (the menu rotates rhythm games and drills) and earns 20 XP the first time that day. Best scores per level stay in this browser (`fretQuestDrills`) and travel with the JSON export. The result screen can share a one-line result (Web Share, or copied to the clipboard).

## Tools, daily menu and records

`tools.js` adds a microphone tuner (nearest string or a tapped one with a reference tone, median-smoothed, within 5 cents counts as tuned) and an automatic timing measurement (eight clicks; the median offset is saved and used by stages, sessions and games; noisy or incomplete runs are refused).

Today's menu replaces the retired daily quests (35-second chord change, note-name quiz, screen-tap rhythm): one lesson (the next one, or the lowest-starred stage), one session and one game (rhythm games and guitar drills), rotating by date. Beginners only get the three easier sessions until 12 lessons are cleared. The day's goal is the lesson. On a day without the instrument, a link under it swaps in the day's ear-training game, which counts too (any of the three items reaches the goal in the records). Once the goal is reached, one optional mission is revealed at a time: after the lesson, the session and then the game; after the no-instrument swap, the session on the screen fretboard and then the lesson. A lesson clear earns 40 XP the first time; each session or game earns 20 XP the first time it is played that day; reaching the goal adds 20 XP and finishing all three (the full course) another 20. Days completed under the earlier rule (one 40 XP bonus for all three) keep their XP and count as full courses. Sessions and games count toward practice days and streaks, appear in the calendar and badges, and their best records travel with the JSON export. Older records that hold the retired quests remain valid.

## Phrase dojo

`licks.js` teaches 181 guitar modules across blues (91), jazz (51) and pops (39), split into solo/improvisation and comping. Each module has three steps: learn (play the lick or comping pattern from a tab/strum chart), groove (at tempo over drums, with space between repeats) and use (a session mission for solos, the full form for comping). Steps one and two clear at ★1; a mission clears when every goal is met. Clearing all three masters the module; titles rise with the number mastered.

- Blues is grouped by artist, chosen from a scrolling chip row (the choice stays in this browser, `fretQuestDojoArtist`). Each group studies one player's vocabulary through licks written for this app; none are transcribed solos or song melodies, and the page says so.
  - 基礎 (9): pentatonic box 1, B.B. box, blue note (♭5), turnaround, call and answer, bending basics, box 2, triplet roll, major 3rd hammer-on.
  - B.B. King (8), Freddie King (7), Eric Clapton (8), Albert King (8), Stevie Ray Vaughan (8), Buddy Guy (7), T-Bone Walker (6), Jimi Hendrix (5), Albert Collins (4), John Mayer (8), minor blues in the Peter Green / Gary Moore manner (6).
  - バッキング (7): shuffle boogie, 7th-chord backbeat, 9th-chord stabs, quick change in E, stop time, slow-blues triplets in B minor, turnaround chords.
  - Each artist group (and comping) lists two reference recordings with a one-line note on what to listen for, under the group description and at the bottom of each lick. They are plain links to a YouTube search for the artist and title, not fixed videos or embeds, so a removed upload never breaks them; nothing is checked off and they do not count toward mastery.
  - Licks use the 12-bar blues in A, Sweet Home Chicago (E), The Thrill Is Gone (B minor) and the pop ballad for their missions.
- Jazz is grouped by artist the same way, with its own remembered choice (`fretQuestDojoArtist:JAZZ`).
  - 基礎 (9): chord-tone arpeggios, guide tones, enclosure, ii–V–I lick, minor ii–V, bebop scale, chromatic approach from below, 1-2-3-5 patterns, diminished over G7.
  - Charlie Christian (4), Django Reinhardt (4), Wes Montgomery (4), Grant Green (4), Kenny Burrell (3), Joe Pass (4), Pat Martino (4), Jim Hall (3), George Benson (3), Pat Metheny (2). Octaves and chord melody, which need two notes at once, are played as single-note lines because the microphone judges one pitch at a time.
  - バッキング (7): shell voicings, four-to-the-bar, Charleston, bossa nova, la pompe, jazz-blues comping through Billie's Bounce, anticipations.
  - Jazz missions grade the share of chord tones and chord tones on downbeats (not a scale). Each lick names the chords under its learn chart (`over`), and the content checks require at least 70% of its notes in the chord's scale and every bar to open on a chord tone, a 9th or a 6th.
- Pops is grouped by style instead of player (`fretQuestDojoArtist:POPS`), and its note says the licks follow a style's vocabulary.
  - 基礎 (2): major pentatonic, singing lines.
  - City pop (6): maj7 colour, dorian, E7♭9, 16th syncopation, half-step moves, high register. J-rock (6): pre-chorus bend, harmonic minor over E7, triplet descent, repeated-note climb, unison bend, tapping. Ballad (6): long notes, major bend, sus4, 6th, arpeggio melody, fills behind the vocal. Anisong (6): 16th runs, triplet arpeggios, a high climb, octaves, a five-string arpeggio, a moving motif. British rock (6): dotted-eighth arpeggios, open-string drone, double stops in 3rds, mixolydian ♭7, sus4, a slow two-note melody.
  - バッキング (7): 8-beat strum, 16-beat cutting, arpeggio, power-chord eighths, city-pop cutting, open-string strumming, driving downstroke eighths.

Missions are graded from the notes the microphone hears during a session: note count, share of notes in a scale, share of chord tones, 3rds and 7ths, a specific pitch (such as the blue note), register (B.B. box range) and chord tones landed on downbeats. Register is used as a proxy for position; fingering itself is not judged. Bends are written `string.fretbN` (pushed up N semitones) and show as `8↑` on the stage, with the bend size in NEXT; the guide tone glides up, and the note is judged at the bent pitch and timed from the pick attack (a bend gets 0.2 s more late window). Playing the fretted pitch without bending is a miss. Vibrato, slides, rakes and quarter-tone bends are explained in the text but not judged. Beat lengths may be fractions (`1/3` for triplets). Notes joined with `+` (`3.9+2.10`) are played together, as a double stop or chord: they show on their strings at one time and count when any one of them is heard, because the microphone follows a single pitch.

Blues and jazz charts are written straight and played swung (`feelOf` in `licks.js`): an offbeat eighth moves to the last third of its beat, so eighths are long-short; triplets and 16ths stay as written, and bossa nova and pops stay straight. Under a tab chart the stage plays the module's chords bar by bar (its `over`, or the session's home chord such as A7 for the blues in A): swung drums, a bass line kept below the guitar's low E, and, when the microphone is off, chords. Long guide notes get a light vibrato. Licks are original or common idioms; no song melodies are used. Pop sessions (王道進行, カノン進行, ballad) use a straight 8-beat groove. Progress is kept in this browser (`fretQuestLicks`).

### Lick relay

The リック・リレー button over the dojo cards opens the sessions of the current genre that have at least two licks. A relay is a session where the screen calls licks at set bars, with four free bars between them: a box over the board names the lick to play in these bars and shows its positions, or says the bars are free and which lick comes next. Licks come from the ones whose learn step is cleared (all of the session's licks when fewer than two are), in a random order. Each lick is placed where the session's chords match its own (every bar for a lick with its own chords, otherwise the first bar), so a turnaround lands on bars 11–12; when nothing fits it starts right after the free bars. A called note counts when a judged note of the same pitch, or an octave away, lands within 0.3 s of it; the result lists each lick's hit rate and the average, and the best average per session stays in this browser. Free bars score like any session. The relay works with the microphone and with the screen board.

## Off-guitar training

`train.js` offers ten screen-and-sound games for times without a guitar, five levels each. A run is five quick questions and passes at four correct; three passing runs on a level (not necessarily in a row) open the next one, and the result and level buttons show the count. Levels opened before this rule stay open, and faster answers and combos raise the score.

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


Modulation (転調当て): the same melody or chord progression plays twice and the second pass is in another key; the player names how far it moved (half step, whole step, minor/major 3rd, perfect 4th or 5th, up or down). Levels: melody upward, melody up or down, chords upward, chords up or down, and a mid-song key change where the second pass follows straight on with a top line on each chord's 3rd. A wrong answer plays the right and the chosen move from the same start, says whether only the direction was wrong, and offers the two keys' tonics alone, which turns it into an interval question.
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

## Air practice (on-screen fretboard)

For practising away from the instrument. The board shows the real strings and frets of the chosen instrument (6 or 4 strings), so positions learned on it are the ones played on the neck later. Taps sound immediately (bass an octave up, so a phone speaker can carry it).

- Phrase modules (solo licks, bass lines, tab-based comping): 1 **trace**: an approach ring closes on each position; tap it on the beat (judged like a stage on pitch and timing; the same note on another string counts and is pointed out; a wrong note costs points and leaves the note open). 2 **recall**: no guides; rebuild the phrase in order from the lit first note (the same note on another string counts, with the tab's position shown). Chord shapes keep exact positions. Play screens block text selection, the long-press menu and double-tap zoom, so fast tapping cannot start a selection on iOS (`tests/noselect.cjs`). Chord-based phrases (arpeggios, guide tones, ii–V licks, the sung line, every bass line) carry the chord of each bar: trace shows it next to the next position, and recall groups the answer slots by bar under their chord and shows the current and next chord. Scale and box phrases have none. 3 **air session**: the module's session mission, played by tapping the board.
- Chord modules: 1 **shapes**: place each form with the diagram in view (open and muted strings are marked at the nut). 2 **changes**: the progression plays and each form must be complete before its chord starts, without the diagram.
- Sessions: the lobby offers "play on the screen fretboard" next to the microphone; the board colours the current chord's tones (with degrees) and the scale, and can be moved along the neck.
- Progress is kept separately from the instrument steps (`fretQuestAir`): air steps never count as dojo mastery. Once a module is done on the board, the module screen points to the instrument steps.

This trains positions, order, rhythm and chord-tone choice. It does not train the hands: fretting pressure, stretches, picking and muting still need the instrument.

## Actual assessment limits

Melody stages (microphone): a YIN-style detector must hear the exact target pitch (nearest semitone) for two consecutive frames inside the note's window. A repeated pitch only counts if a new pick attack is detected, so a ringing note cannot pass the next identical note. This does not grade chords, fingering or tone.

Strum stages (microphone): only the timing of strum attacks is graded. Attacks that match no target count as EXTRA and cost points, so random strumming scores 0. Whether the correct chord shape is held is not judged and the screen says so.

The microphone is opened as raw instrument input (no echo cancellation, noise suppression or automatic gain): iOS voice processing suppressed sustained guitar notes. Attack and pitch thresholds follow a noise floor measured between notes, so quiet sources such as an unplugged electric guitar register while steady room noise does not; the floor does not rise while notes ring. Meters use a decibel scale. If several notes are missed while almost nothing reaches the microphone, the stage suggests moving the phone closer.

Tap mode is available on every stage and is labeled as screen-tap timing, not guitar grading. Headphones are recommended, because the microphone input is raw and would also hear the backing. No audio is recorded or uploaded.

Other lessons are unchanged: quizzes, fretboard quizzes, tap rhythm lessons (tolerance 150 ms or 30% of a subdivision) and locally generated ear-training triads.

## Silent mode (iPhone)

Sound plays even with the ring/silent switch on. The page declares its audio as media playback: `navigator.audioSession.type = 'playback'` where Safari supports it, otherwise (older iOS) a silent looping `<audio>` element started on the first tap. While the microphone is live the session is `play-and-record` (playback mode does not allow recording), and it returns to playback at the next sound start. If the audio context is left "interrupted" (iOS, after a call, the microphone or a session switch) it is resumed, and replaced if it will not come back. After an audio-session switch it waits briefly and resumes again, since iOS can interrupt a running context a moment later. Every play screen (stages, sessions, rhythm games, air practice) checks the clock each frame: if it stops mid-run it is resumed, and when iOS only allows that from a tap a "tap to resume" button appears (`tests/stall.cjs`). The practice tools include a sound check that plays a test tone and lists the audio state (context state, sample rate, audio session, fallback loop, microphone, iOS version) for diagnosing a silent phone. Only the switching is tested (`tests/silent.cjs`, with a stand-in `audioSession`); the effect on the silent switch has not been checked on a real iPhone.

## Records and installation

The existing `fretQuestV1` localStorage key is retained. Course activity counts toward practice days and streaks. JSON export/import merges daily activity and course completions, protecting against duplicate XP. This is manual transfer, not account-based cloud synchronization. Automated account sync requires an authenticated backend; none is configured in this static site.

Opening the app always starts at the top (My Studio): the manifest's start_url is `./`, and a leftover `#section` in the URL or a restored scroll position is dropped on load. `tests/start.cjs` checks this. `tests/listen-stop.cjs` checks that a phrase started with 「フレーズを聴く」 stops when its screen is closed or left with 戻る.

The manifest, PNG icons and a service worker support home-screen installation and cached offline lessons. The service worker is limited to `/fretquest/`, caches only app assets, and never handles microphone audio. This is a PWA, not an App Store native iOS application. iPhone hardware microphone accuracy and Safari installation require device verification.

## Validation

`tests/stage-playthrough.cjs` drives the real page in headless Chromium and feeds synthetic plucked notes and strums in as the microphone. It checks that clean playing scores at least 95 (also at 1/20 level with room noise, which scored 0 before the adaptive thresholds), that silence and random strumming stay below the clear line, that the +0.2 s offset setting restores a delayed performance, and that tap mode works. `ALL=1` also plays every stage once. Serve the folder that contains `fretquest/` on port 8765 first (for example `python3 -m http.server 8765`).

Tests that tap the screen in time (`air`, `bass`, `dojo`, `skip`, `stage-playthrough`) send their taps through `tests/taps.cjs`, which dispatches them inside the page on the audio clock the app judges against; timing them from Playwright on the wall clock failed at random when headless Chromium's audio clock stalled. `tests/tools.cjs` checks tuner readings and that a player 0.2 s late scores 100 after measuring. `tests/feel.cjs` checks that perfect taps clear every feel-game level and silence does not. `tests/air.cjs` checks that every guitar and bass module fits its board window and every chord has a form, that trace scores 100 with the right positions on time and low on the wrong strings, recall, shapes and changes, a dojo session mission from board taps, a free board session and a bass trace on 4 strings. `tests/interval-review.cjs` checks that a wrong interval answer shows the root, the right note and the chosen note on a guitar and a bass board with both playback buttons, and that a right answer shows none. `tests/train.cjs` checks that every training mode runs, a perfect run counts one clear and the third opens the next level, earlier unlocks stay open, a poor run does not count, wrong rhythm answers enter the rhythm book and XP counts. `tests/dojo.cjs` checks dojo steps, a failed and a passed session mission, mastery, the artist filter and its reference links, bend notation, that a gliding bend scores every note while the unbent fret pitch misses every bend, and a pop session. `tests/remix.cjs` checks that stage misses fill the rhythm book, that a perfect remix clears 8/8 and graduates the rhythm, and that call & response offers a review. `tests/skip.cjs` checks skip challenges, opening without a test and experienced mode. `tests/records.cjs` checks the daily menu, XP, bonus, streak, duplicate protection and export/import. `tests/bass.cjs` runs in bass mode: every stage converts to valid bass positions and strum roots, a converted melody and a root line score 100 (also when every other note is heard an octave high), silence and the original guitar register score 0, the tuner reads E1, A1 and an octave-high E, a bass-line learn step and a root mission pass, and the training boards have 4 strings. `tests/jam-games.cjs` does the same for sessions (chord-tone arpeggios score 100%, a chromatic line does not) and the three rhythm games (a perfect player clears them; a steadily drifting player fails the timing game). `tests/drills.cjs` answers each drill with a synthetic guitar: clean answers score high (fretboard 30+ notes, chord changes reach ♩140, bends 85+), while wrong notes, late changes, under-bends and fretting the bent pitch directly score 0; in bass mode the hunter and root-on-beat-one changes clear and bending is not offered.

These are synthetic signals. They do not establish accuracy with a real guitar, a real iPhone microphone or real Bluetooth latency; those still need device testing.

API references: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia and https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/.
