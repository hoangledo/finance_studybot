# FinQuest

A gamified app for learning US personal finance and Bogleheads investing. It's a static React SPA. It works local-first: the app always reads and writes IndexedDB (Dexie). Signed-in users' data is synced to Supabase as one JSON snapshot per user. Guests stay local-only. There's an optional Claude integration that uses the user's own API key.

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
  - `calc.ts`: seeded RNG and number-crunch card builder; `glossary.ts`: term matcher; `coach.ts`: money-coach rules; `sim.ts`: Life Simulator engine
- `src/db/`:
  - `db.ts`: Dexie schema and `DEFAULT_PROFILE`
  - `actions.ts`: every write
  - `hooks.ts`: live queries
  - `seed.ts`
  - `backup.ts`
- `src/auth/`:
  - `supabase.ts`: client, created from `NEXT_PUBLIC_SUPABASE_*` (or `VITE_SUPABASE_*`) env vars, exposed through `envPrefix` in `vite.config.ts`; `null` when they aren't set, which means guest-only
  - `session.ts`: auth state and actions
  - `sync.ts`: local ↔ cloud sync
  - `syncLogic.ts`: pure sync decisions, with tests
  - `AuthGate.tsx`: picks the database for the current identity
  - `AuthPage.tsx`, `AccountCard.tsx`
- `supabase/migrations/`: SQL for the `user_progress` table and its RLS policies.
- `src/features/<area>/`: pages and feature components. `src/components/`: shared UI and the mascot.

## Rules that aren't obvious from the code
- **Seed card IDs come from their position** (`${conceptId}#${index}`). Never reorder or delete seed cards in `concepts.ts`, or users' review progress gets attached to the wrong cards. Append new cards at the end instead.
- **After changing seed content, bump `SEED_VERSION`** in `src/db/seed.ts`. On the next load, missing concepts, cards and edges get merged in without touching existing progress.
- `content.test.ts` enforces content integrity. Every edge and lesson must point to a real concept ID, every concept must be taught by some lesson, and quiz answer indexes must be valid.
- **`awardXp` in `src/db/actions.ts` is the only place XP is granted.** It also handles the streak, daily goal, level-ups, avatar unlocks, the streak celebration and toasts. Route every XP source through it.
  - The combo and Money Lab quests need `recordCombo` / `recordToolUse` to be called.
- **Adding a field to a stored row:** only bump the Dexie schema version if the field is indexed. For `Profile`, also add a default in `DEFAULT_PROFILE`. `useProfile` merges the defaults in so older saves keep working.
- **Auth and data isolation:**
  - Each identity gets its own IndexedDB: `finquest-guest` or `finquest-u-<userId>`.
  - `db` in `src/db/db.ts` is a live `export let` binding that `openDb` swaps out. Never cache it in a module-level constant.
  - Sync detects writes through Dexie's global `storagemutated` event, so new actions need no sync code.
  - Sign-out flushes pending changes, then deletes that account's local database. The Anthropic key is scoped per identity and cleared on sign-out.
  - The old pre-auth `finquest` database is intentionally ignored.
- **Secrets:**
  - Only the publishable/anon Supabase key may appear in `NEXT_PUBLIC_*` / `VITE_*` variables; security comes from RLS.
  - Never commit `.env*` files (only `.env.example`). Never add the service_role key to the frontend.
- **Money tracker:**
  - Amounts are integer **cents** (`amountCents`). Format with `money()` and parse with `parseAmount()` from `src/lib/budget.ts`. Never use float dollars in storage.
  - Pure logic (periods, `summarize`, `monthlyAverages`, recurring `occurrences`) lives in `src/lib/budget.ts`, with tests. Writes go through `src/db/moneyActions.ts`.
  - Recurring occurrences have deterministic IDs (`${recurringId}@${date}`) and are created with `bulkPut`, so materializing is idempotent. Deleting one adds its date to the item's `skipped` list so it isn't recreated.
  - Money tables (`transactions`, `categories`, `recurring`) were added in Dexie schema v2 and are included in the table list in `backup.ts`, so they sync with the account.
  - The starter categories are in `src/content/categories.ts` and use stable IDs (seeded via `SEED_VERSION` 2).
- **Money Lab inputs:**
  - `Widget` takes `persist` (Money Lab only; lessons use fixed teaching defaults). Persisted inputs are saved in `meta` as `tool:<id>` via `useToolInputs`.
  - `Slider` in `widgets/common.tsx` has a typeable box. Its `unit` is `money | percent | plain`, and percents are stored as fractions.
- **Review sessions:**
  - `useReviewSession` holds the shared session logic for classic and swipe (`SwipeDeck`) modes.
  - `reviewCard` returns `{ next, logId }`, and `undoReview` restores the previous schedule. Re-rating an undone card earns no XP.
- **The Anthropic SDK is lazy-loaded.** Import from `features/ai/lazy.ts` (async wrappers) and `features/ai/settings.ts` (key and model in localStorage), never `features/ai/claude.ts` directly, so the SDK stays out of the main bundle.
  - The default model is `claude-opus-5`, with `fallbacks: 'default'` on Opus. Output uses structured JSON via `betaZodOutputFormat`.
- **Number-crunch cards** (`type: 'calc'`): templates live in `src/content/calcCards.ts`, and seed cards use the ID `calc:<templateId>`. Always render them through `calcAsMcq(card)`. It draws fresh numbers from the seed `${id}:${reps}:${lapses}`, but still rate the original card. Options must stay distinct after rounding, and `calc.test.ts` checks that.
- **Glossary:** terms come from concept titles plus `src/content/glossaryAliases.ts`. Render learning text with `GlossaryMd` (not `Md`), passing `exclude={conceptId}` on a concept's own text. `GlossarySheet` is mounted in `Layout` and `LessonPlayer`. Avoid aliases that are common English words (e.g. "deductible").
- **Missions** (`src/content/missions.ts`) are educational checklists only. They must never ask for account numbers, passwords or other credentials. Writes go through `src/db/missionActions.ts`.
- **Achievements:** badge rules are pure functions over `Stats` in `src/content/achievements.ts`. `awardXp` and `addTransaction` call `scheduleAchievementCheck()`; call it after any new action a badge depends on. Never delete or rename badge IDs, because they're stored.
- **Life Simulator:** `src/lib/sim.ts` is pure and seeded; the page state lives in localStorage (`finquest.simGame`) so a game survives reloads. `saveSimRun` stores the run and awards XP at most once per day.
- **Dexie schema v3** added `missionProgress`, `achievements` and `simRuns`. They're in the `backup.ts` table list, so they sync. Any new table must be added there too.
- **Offline mode (PWA):** `vite-plugin-pwa` (config in `vite.config.ts`, registration in `src/app/pwa.ts`) precaches every built asset. It only runs in production builds, never in `npm run dev`. New pages must stay lazy-loaded so they're precached as separate chunks. AI calls throw `OfflineError` when offline, and `describeAiError` turns it into a friendly message. iOS only enables service workers over HTTPS (so it works on Vercel, not on the LAN address).
- **Content is US-specific** except the `global` domain / Unit 8 ("Global Investor"), which covers nonresident aliens and non-US investors (visa tax status, PFIC, FBAR, UCITS ETFs). Contribution limits are 2026 IRS figures and need yearly updates in `concepts.ts`; also review the global figures ($60k nonresident estate exemption, $10k FBAR threshold, 30%/15% dividend withholding). The app stores links to the Bogleheads and r/personalfinance wikis; it never scrapes them.

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
- **Layout:** every page must work from 320px to tablet. The right rail only shows at `lg` and up, so anything important in it also needs a phone spot. On phones, the More sheet (`src/app/MoreSheet.tsx`) holds quests and streak.
- **Phones (`src/lib/device.ts` has `usePhone`, `useTouch`, `useKeyboardInset`):**
  - `Modal` becomes a bottom sheet on phones (drag handle, keyboard-safe, safe areas). Use it for every pop-up.
  - Tap targets are at least 40px (aim for 44px).
  - Never hide controls behind hover. Use the `reveal-on-hover` class, which is visible on touch, hover-revealed with a mouse.
  - Every drag interaction needs a tap alternative: rank ↑ ↓ buttons, Map "Link to…".
  - Keyboard hints go in `kbd` or `.kbd-hint`, which are hidden on touch.
  - Full-screen flows set focus mode (`useUi().setFocus`) to hide the header and bottom nav.
  - Use `pt-safe` and `env(safe-area-inset-*)` for the notch and home bar. In Tailwind arbitrary values, write `calc()` spaces as `_`.
- **Installable app:** `public/manifest.webmanifest` plus the icons in `public/`, and meta tags in `index.html`.
