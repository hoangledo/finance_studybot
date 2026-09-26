# FinQuest

A gamified app for learning US personal finance and Bogleheads investing. It's a static React SPA with no backend: all user data lives in the browser (IndexedDB via Dexie). There's an optional Claude integration that uses the user's own API key.

## Commands
- `npm run dev`: Vite dev server. It's exposed on the LAN (`server.host: true`) and moves to the next free port if 5173 is taken.
- `npm test`: Vitest (pure logic, content integrity, DB/backup with `fake-indexeddb`).
- `npm run build`: `tsc -b` then `vite build`. Run it before calling work done.
- `npx oxlint src`: lint. The existing `only-export-components` warnings are accepted.

## Layout
- `src/content/`: seed curriculum. `concepts.ts` holds concepts, cards and map edges; `lessons.ts` holds units and lessons.
- `src/lib/`: pure, tested logic:
  - `finance.ts`: calculator math
  - `gamify.ts`: XP, levels, streak rules
  - `srs.ts`: ts-fsrs wrapper
  - `mastery.ts`
  - `quests.ts`
  - `dates.ts`: local `YYYY-MM-DD` day keys
- `src/db/`:
  - `db.ts`: Dexie schema and `DEFAULT_PROFILE`
  - `actions.ts`: every write
  - `hooks.ts`: live queries
  - `seed.ts`
  - `backup.ts`
- `src/features/<area>/`: pages and feature components. `src/components/`: shared UI and the mascot.

## Rules that aren't obvious from the code
- **Seed card IDs come from their position** (`${conceptId}#${index}`). Never reorder or delete seed cards in `concepts.ts`, or users' review progress gets attached to the wrong cards. Append new cards at the end instead.
- **After changing seed content, bump `SEED_VERSION`** in `src/db/seed.ts`. On the next load, missing concepts, cards and edges get merged in without touching existing progress.
- `content.test.ts` enforces content integrity. Every edge and lesson must point to a real concept ID, every concept must be taught by some lesson, and quiz answer indexes must be valid.
- **`awardXp` in `src/db/actions.ts` is the only place XP is granted.** It also handles the streak, daily goal, level-ups, avatar unlocks, the streak celebration and toasts. Route every XP source through it.
  - The combo and Money Lab quests need `recordCombo` / `recordToolUse` to be called.
- **Adding a field to a stored row:** only bump the Dexie schema version if the field is indexed. For `Profile`, also add a default in `DEFAULT_PROFILE`. `useProfile` merges the defaults in so older saves keep working.
- **The Anthropic SDK is lazy-loaded.** Import from `features/ai/lazy.ts` (async wrappers) and `features/ai/settings.ts` (key and model in localStorage), never `features/ai/claude.ts` directly, so the SDK stays out of the main bundle.
  - The default model is `claude-opus-5`, with `fallbacks: 'default'` on Opus. Output uses structured JSON via `betaZodOutputFormat`.
- **Content is US-specific.** Contribution limits are 2026 IRS figures and need yearly updates in `concepts.ts`. The app stores links to the Bogleheads and r/personalfinance wikis; it never scrapes them.

## Styling (Tailwind v4, tokens in `src/index.css`)
- **Colors:** each hue (`brand` mint, `gold`, `sky`, `coral`, `grape`, `danger`) has four variants:
  - base: fills
  - `-edge`: 3D bottom edge
  - `-soft`: tinted backgrounds
  - `-ink`: readable text
- **Text:** use `text-*-ink` for colored text, never `text-brand` and the like. On mint or gold fills, use `text-on-color`.
- **Components:** use the `@utility` classes (`card`, `btn-primary`, `btn-sun`, `btn-sky`, `btn-coral`, `btn-danger`, `btn-ghost`, `input`, `label`) instead of rebuilding them. Custom classes can only be `@apply`'d if they're defined with `@utility`.
- **Dark mode:** toggled with a `.dark` class on `<html>` (`src/app/theme.ts`). Colors must come from tokens so both themes work.
- **Chart colors:** the `VIZ` palette in `features/widgets/common.tsx` was validated for colorblind separation and contrast against both themes' surfaces. Re-validate it if you change it.
- **Cappy the mascot** (`components/mascot/Cappy.tsx`) has moods: `idle | happy | cheer | think | oops | sleepy | wave`. His lines live in `components/mascot/lines.ts`. Use him for empty states and reactions.
- **Layout:** every page must work at 390px width. The right rail only shows at `lg` and up, so anything important in it also needs a mobile spot (for example `QuestsCard` on Home).
