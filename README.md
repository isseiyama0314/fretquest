# FRET QUEST Academy

Static guitar-practice web app, published at https://isseiyama0314.github.io/fret-quest/.

## Lessons

Six independently selectable courses, each with four sequential lessons. Complete a lesson at 80% or higher to unlock the next lesson in that course. First completion earns 40 XP; repeats do not duplicate XP.

1. First notes: tuning, open strings, Em/Am, quarter-note timing.
2. Chords: C/G, chord-chart literacy, G/D/Em/C, eighth notes.
3. Groove: down/up, rests, offbeats, syncopation.
4. Fretboard: intervals, low strings, high strings, C major.
5. Riffs: chromatic exercise, A minor pentatonic, power chords, original riff.
6. Stage: barre chords, sixteenth notes, major/minor ear training, original melody.

All exercises use standard tuning E2 A2 D3 G3 B3 E4 and A4 = 440 Hz.

## Actual assessment limits

Microphone exercises estimate a single note using a YIN-style pitch detector. Four consecutive frames within 50 cents of the exact target pitch pass that note. The reference speaker is disabled while the microphone is running. Each matched note stops the microphone; the player silences the previous note and resumes for the next target. This does not grade chords, fingering, articulation or performance timing. No audio is recorded or uploaded. A clearly labeled self-check route is available.

Rhythm lessons assess touchscreen or mouse taps, with a maximum tolerance of 150 ms or 30% of a subdivision, whichever is smaller. Extra taps reduce the score. Chord performance is explicitly self-assessed. Ear exercises generate triads locally with Web Audio.

## Records and installation

The existing `fretQuestV1` localStorage key is retained. Course activity counts toward practice days and streaks. JSON export/import merges daily activity and course completions, protecting against duplicate XP. This is manual transfer, not account-based cloud synchronization. Automated account sync requires an authenticated backend; none is configured in this static site.

The manifest, PNG icons and a service worker support home-screen installation and cached offline lessons. The service worker is limited to `/fret-quest/`, caches only app assets, and never handles microphone audio. This is a PWA, not an App Store native iOS application. iPhone hardware microphone accuracy and Safari installation require device verification.

## Validation

JavaScript syntax checks and jsdom interaction tests cover all 24 lessons and positions, gated unlocking, XP deduplication, legacy record compatibility, import merging, invalid imports, exact rhythm taps, rests, zero-tap failure, microphone teardown, delayed permission resolution and pitch matching. Synthetic single tones with harmonics at 44.1/48 kHz are checked across the guitar range. Live-browser checks validate the published lesson interface; they do not establish real-instrument acoustic accuracy.

API references: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia and https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/.
