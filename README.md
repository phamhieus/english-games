# 🎈 Word Shooter

A cute, soft bubble-shooter style game for memorising English vocabulary. Balloons with words float down. Type the English word and press **Enter**, and the little cannon pops the balloon. It runs entirely in the browser (data in IndexedDB); optionally players can sign in with Google or Facebook to save their progress online and play on any device. See [docs/ACCOUNTS.md](docs/ACCOUNTS.md).

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # unit tests (Vitest)
npm run test:e2e     # Playwright smoke test (builds + previews the app)
npm run build        # type-check + production build into dist/
npm run dev:api      # (optional) account API on :8787 — see docs/ACCOUNTS.md
npm run deploy       # build + deploy app and API to Cloudflare Workers
```

On first launch a demo collection (“Starter Pack”, 30 words) is added once. You can delete it and import your own words.

## Features

| Area | What you get |
|---|---|
| Modes | **Copy Typing** (see English → type it), **Vietnamese → English** (recall, recommended), **Mistake Review** (only words with errors that aren't yet mastered) |
| Sessions | **Practice** (10 / 20 / 30 / all words, ends when every target is resolved) or **Endless** (until 3 hearts are lost) |
| Difficulty | Easy / Normal / Hard (fall speed, spawn rate, max 2 / 4 / 6 balloons) plus adaptive intensity based on accuracy, speed, misses and combo, always within the profile's caps |
| Typing | Case-insensitive, trims and collapses spaces, normalises curly apostrophes, dashes and Unicode (NFC). Multi-word, hyphenated and apostrophe answers all work. Duplicates: the balloon closest to the danger line is hit first |
| Feedback | Projectile + particle pop, floating score, combo badges, gentle input shake on wrong answers, danger-line flash on misses |
| Voice | Each word is **read aloud just before its balloon appears**. In recall modes it reads the Vietnamese prompt by default, so the answer isn't given away; you can switch this to the English word or turn it off. Optional “say the word after a hit”, adjustable speed, pronunciation buttons in the Library and Results |
| Library | Collections (create, rename, delete with confirmation), add/edit/delete words, search, filter by level or status, Excel/CSV import with column mapping, validation, duplicate detection (skip or update) and preview, CSV export, downloadable template |
| Stats | Learned / new / due / mastered words, average accuracy, typing speed (WPM), sessions, best score, streak; charts for accuracy per session, daily activity and mastery distribution |
| Data | IndexedDB (Dexie) with versioned schema, JSON backup export/restore, in-memory fallback if IndexedDB is unavailable |
| Accessibility | Keyboard-only play, screen-reader live region listing balloons on screen, reduced-motion and animation toggles, responsive layout that shrinks when the mobile keyboard opens |

### Scoring (`src/game/config/gameConfig.ts`)

| Action | Points |
|---|---:|
| Correct | +10 |
| Correct within 3 s of the balloon appearing | +5 |
| Every 5th consecutive correct answer | +10 |
| Combo ≥ 10 / ≥ 20 | ×1.5 / ×2 on base + speed points |
| Wrong submission | −2 (an identical wrong answer repeated within 1 s is only penalised once) |
| Balloon reaches the danger line | −5 and −1 life |

The score never goes below 0. All values are in one config module.

## Learning model

**Per-word progress** (`WordProgress`) tracks attempts, correct and incorrect answers, missed balloons, average response time, streak, review step, next review date and a 0–100 mastery score.

**Spaced repetition** (`src/features/learning/spacedRepetition.ts`) is a simple Leitner-style schedule:

| Successful reviews | Next review |
|---|---|
| 1 | 1 day |
| 2 | 3 days |
| 3 | 7 days |
| 4 | 16 days |
| 5+ | previous × 2.2 (max 180 days) |

- The schedule only advances when a word is answered correctly **while it is due**. Answering it again the same day updates the stats but not the schedule, so you can't “master” a word by hammering it in one sitting.
- A wrong answer or a missed balloon resets the step and makes the word due immediately.
- Mastery = retention (review step, up to 50) + accuracy (up to 30) + speed (up to 20). A word counts as mastered at ≥ 80, which takes at least three spaced reviews.

**In-session mistake replay** is separate from long-term scheduling. In practice sessions, a word you missed (or answered after a wrong attempt) comes back after a couple of other balloons, at most 3 appearances per word. Every target is therefore guaranteed to resolve, and a finite session always ends.

**Adaptive selection** (`src/features/learning/selection.ts`) uses weighted random sampling. Weights favour new words, words due (or overdue) for review, frequently missed words, low-accuracy words and slow-response words. Mastered words that aren't due are strongly down-weighted. Words on screen are excluded and recently shown words avoided unless they're the only option. Selection is deterministic for a seeded RNG.

A wrong answer is attributed to the most similar balloon on screen (edit-distance similarity ≥ 0.5), so mistakes are recorded against the right word. Unrelated typos only cost points.

## Architecture

```
src/
  app/App.tsx                 bootstrap (DB open, seed, settings) + screen shell
  components/
    common/                   UI kit (candy buttons, modal, toggles), Settings, clouds
    game/                     Home (setup), GameScreen, HUD, AnswerInput, PhaserCanvas, Results
    vocabulary/               Library, word form, import dialog
    statistics/               Stats dashboard + SVG charts
  game/
    GameBridge.ts             the only React ⇄ Phaser channel (commands + events)
    createGame.ts             creates exactly one Phaser.Game per mounted game screen
    scenes/BootScene.ts       textures + font loading
    scenes/GameScene.ts       rendering, movement, collisions, effects
    entities/                 Balloon, Cannon, Projectile
    systems/                  pure logic: Session, Scoring, Difficulty, Targeting, Spawn
    config/                   gameConfig (rules), theme (colours)
  features/
    learning/                 spaced repetition, adaptive selection
    statistics/               dashboard aggregations
    settings/                 defaults
    vocabulary/               demo data
  services/
    database/                 Dexie schema, repositories, backup, seed, batched progress saver
    import/                   import parser (pure) + SheetJS adapters
    speech/                   SpeechSynthesis wrapper (never throws)
    audio/                    synthesised WebAudio sound effects
  stores/                     Zustand: app navigation/setup, settings
  hooks/                      live Dexie queries, visual-viewport height
tests/
  unit/                       Vitest
  e2e/                        Playwright
```

- All rules live in `GameSession`, which knows nothing about Phaser. It decides what spawns next, applies scoring and learning updates, and decides when the session ends. The scene renders and reports events (hit, wrong, missed).
- The scene keeps its own clock that only advances while running. Pausing, or hiding the tab (which auto-pauses), never counts against response times or balloon positions.
- Balloon positions are stored as normalised progress, so the field resizes cleanly when the mobile keyboard opens.
- When an answer is accepted, the balloon is *claimed* and points are awarded once. The projectile is purely visual, so a balloon can't be scored twice or missed while a shot is in flight.
- Progress is saved in batches every 4 s and at session end. An in-progress record is also saved, so a refresh mid-game shows up as an *interrupted* session.

### Edge cases covered

Empty collections or mistake pools (start is disabled, with a clear message); invalid or duplicate import rows; long phrases (smaller font, wider balloons, more fall time, no overlap); identical words on screen; tiny screens and the mobile keyboard; hidden tab (auto-pause); pause; input focus loss (typing anywhere refocuses it); empty submissions; rapid wrong answers; double targeting; a balloon reaching the bottom mid-shot; refresh during a game; no speech synthesis or no Vietnamese voice; IndexedDB unavailable (in-memory fallback + banner); all words mastered; deleted collections (history keeps a name snapshot); 1,000+ word imports (single bulk transaction, paginated list).

## Import format

The first sheet of an `.xlsx`, `.xls`, `.ods` or `.csv` file is read. Headers are detected in English or Vietnamese (`English/Word/Từ vựng`, `Vietnamese/Meaning/Nghĩa`, `Example/Ví dụ`, `Level`, `Pronunciation/IPA`, `Part of speech`, `Tags`) and can be re-mapped by hand. English and Vietnamese are required. Level must be A1–C2; anything else is ignored with a warning.

## Known limitations

- Pronunciation quality depends on the voices installed in the browser or OS. Vietnamese prompts are silent when no Vietnamese voice exists.
- No cloud sync. Use **Settings → Backup** to move data between devices.
- Recall mode accepts one exact English answer per word. Alternative spellings (e.g. *colour/color*) need separate entries.
