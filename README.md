# FinQuest

A gamified web app for learning US personal finance and Bogleheads-style investing.

- **Path**: 26 bite-sized lessons (plus scenario missions) that follow the r/personalfinance "Prime Directive" order, then Bogleheads investing.
- **Review**: FSRS spaced-repetition flashcards, including Q&A, cloze, reverse, and multiple-choice cards. Finishing a lesson unlocks its cards.
- **Map**: a knowledge graph of about 70 concepts, clustered by domain and colored by mastery. Drag between nodes to link them.
- **Library**: add your own concepts (press `N` anywhere), with auto-generated cards and links into the map.
- **Money Lab**: six calculators: 50/30/20 budget, compound growth, fees, Roth vs Traditional, debt avalanche vs snowball, and years to FI.
- **Gamification**: Cappy the capybara mascot reacts as you learn. There are XP and levels, streaks with weekly streak freezes, a daily goal, combos, daily quests with a reward chest, and a customizable avatar whose accessories unlock by level or streak. Sound effects can be muted in Settings.
- **Optional AI**: paste a Bogleheads or Reddit excerpt and Claude drafts a concept, flashcards, quiz questions, and map links. There is also an "Explain like I'm new" button. It uses your own Anthropic API key, which is stored only in your browser.

All data lives in your browser (IndexedDB). You can export or import a JSON backup from Settings.

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # unit tests (finance math, FSRS, streaks, content integrity, DB/backup)
npm run build
```

Code layout: `src/content` (seed curriculum), `src/lib` (pure logic), `src/db` (Dexie schema, actions, backup), `src/features/*` (pages).

This is educational content, not financial advice. Contribution limits are 2026 IRS figures.
