# AGENTS.md

Concise guidance for AI agents working in this repository. Keep it accurate and behavioral; see [Self-Improvement Protocol](#self-improvement-protocol).

## Project Snapshot

**Q** is a browser new-tab productivity app: a Chrome/Edge MV3 extension and an installable PWA/web build. It is local-first — all data lives in IndexedDB (Dexie) and there is no backend.

- **Stack:** SvelteKit 2 (Svelte 5 runes), TypeScript (strict), Vite 7, Tailwind CSS 4, Dexie 4, Milkdown/Crepe editor, `@vite-pwa/sveltekit`, Playwright (e2e).
- **Targets:** `web` (static adapter + PWA) and `extension` (MV3 chrome adapter).
- **Package manager:** Bun (`bun.lockb`). Never introduce npm/yarn/pnpm lockfiles or scripts.
- **OS:** developed on Windows — keep scripts and commands cross-platform.

## Commands

```bash
bun install
bun run dev            # Vite dev server
bun run check          # svelte-check (typecheck) — must pass
bun run lint           # eslint + prettier --check — must pass
bun run verify         # check + lint + unit tests
bun run format         # prettier --write
bun run build:web      # static/PWA build -> build/
bun run build:ext      # MV3 extension build -> build-extension/
bun run release        # syncs manifest version, builds, tags, releases

bun run test:unit           # Bun unit tests (tests/**)
bun run test:unit:coverage  # unit tests with coverage
bun run test:e2e            # Playwright web e2e (builds + previews)
bun run test:e2e:ui         # interactive UI mode
bun run test:e2e:extension  # MV3 extension load test (headed Chromium)
bun run test:e2e:live       # smoke test against https://q.xqbuilds.com
bun run test:e2e:install    # one-time browser download
```

`BUILD_TARGET=web|extension` selects the adapter in `svelte.config.js` / `vite.config.ts`; the build scripts depend on it.

**Definition of done:** `bun run check` and `bun run lint` exit 0, and `bun run test:unit` passes. Run `bun run test:e2e` after UI or data-flow changes.

## Architecture Map

```
src/
  routes/
    +layout.svelte     App shell: sidebars, global Alt+Q/P/W keys, DB liveQuery subscriptions
    +layout.ts         prerender = true
    +page.svelte       View router (home|projects|writer) + deep-link sync; home board (StickyNotes); lazy-imports WriterView
    +error.svelte      Error page
  lib/
    state.svelte.ts    Global rune state: appState (view, projectStore, writeups, notes, composeNoteId, flags), notifications
    utils/
      db.ts            Dexie schema + init + settings helpers (single source of DB truth)
      stores.ts        Project/Task CRUD + observeProjects()
      tasks.ts         Pure helpers: project/task sorting + grouping (unit-tested)
      constants.ts     Shared quick-link/category defaults, icons, URL helpers
      browser.ts       Typed chrome/browser API access (topSites, permissions)
      utils.ts         deriveTitle(), clickOutside action
      writeup.ts       Derived draft title + Writeup -> WriteupSummary projection (unit-tested)
      datetime.ts      Pure date helpers (startOfDay/Week, isToday/Week, relative + autosave formatting)
      weather.ts       Pure weather mapping/formatting (WMO codes, AQI, buildWeather)
      view.ts          View query-param parsing (VALID_VIEWS, getViewFromUrl)
      notes.ts         Pure sticky-note helpers: clamping, cascade + free-slot placement, colour, tilt (unit-tested)
      notification.ts  toast/notify
    stores/
      writeups.ts      Writeup CRUD + observeWriteups()
      notes.ts         Sticky-note CRUD + observeNotes() + createNote()
      quicklinks.ts    Quick link read/upsert helpers
    components/        UI (SideNav + SideNavButton, StickyNotes/, Links, Settings, Projects/, Writer/, Widgets/, shared/)
    features/voice/    Browser-native SpeechRecognition -> editor text controller
tests/                 Bun unit tests for pure modules (deriveTitle, textPostProcess, constants, ...)
e2e/                   Playwright specs (web, extension, live)
static/
  manifest.json        MV3 manifest (version must match package.json)
  background.js        Service worker stub
  icons/, assets/
```

### Data & state rules

- IndexedDB is the source of truth. `utils/stores.ts` hides the legacy Quick Todo pseudo-project (id `-1`) from project lists without deleting it; `< 0` ids are never user projects.
- Cross-tab/global sync uses Dexie `liveQuery` subscriptions created in `+layout.svelte` (`observeProjects`, `observeWriteups`, `observeNotes`). Mutations write to Dexie and rely on the observers to refresh `appState`; do not refresh `appState` manually or query Dexie ad-hoc from components when a store helper exists.
- liveQuery queriers must issue their first Dexie read synchronously (no `await` of an external promise such as `ensureDBReady()` before `db.*`), or Dexie's query scope is lost and the subscription never re-fires. `ensureDBReady()` guards every other DB call.
- Sticky notes are a **home-only board**: `appState.notes` is observed from Dexie, positions are viewport pixels clamped by `utils/notes.ts`, and `Alt+Q` (global, in `+layout.svelte`) switches to Home and calls `createNote()` (which takes the first non-overlapping cascade slot). Notes must never change the URL/view beyond that Home switch. Per-note UX: drag or arrow-key nudge (Shift = 10px), pin-to-lock (`Note.pinned` is optional on disk and normalised in `observeNotes()`), a colour palette (roving-tabindex toolbar), and dissolve + undo delete (undo keeps the last 5). All `stores/notes.ts` mutations catch failures and toast, so callers may ignore rejections. `nextNoteZ()`/`NOTE_Z_BASE` live in `state.svelte.ts` so `utils/notes.ts` stays pure.
- `appState.writeups` holds `WriteupSummary[]` (title + timestamps, no body); `title` is derived and stored on save, and legacy rows derive it on read. Fetch full `content` on demand via `getWriteup()`.
- `db.ts` schema (`version(3)`, adds the `notes` table) indexes only queried columns; don't add indexes on free-text columns (`content`, `text`, etc.).
- Svelte 5 runes only (`$state`, `$derived`, `$props`, `$effect`, `onMount`). Never write Svelte 4 `export let` / `$:` / `on:click`.
- The writer/editor bundle is **lazy-loaded** in `+page.svelte` via dynamic `import()`; never statically import `WriterView`/`Editor` from the `$lib/components` barrel.

## Code Conventions

- Prettier (`.prettierrc`): no semicolons, single quotes, 4-space indent, 120 cols. Run `bun run format` before finishing.
- ESLint flat config enables `@typescript-eslint`, `eslint-plugin-svelte`, and `svelte/require-each-key`. Avoid `any` (use `unknown` + narrowing); every `{#each}` needs a key.
- Use typed browser access from `$lib/utils/browser` — never `(globalThis as any).chrome`.
- Use the `$lib/...` path alias for intra-src imports.
- Tailwind utility classes inline; support both light and dark (`.dark` class, set pre-paint in `app.html`).
- Component shape: `<script lang="ts">`, template, optional `<style>`.
- No comments unless a non-obvious decision needs explaining.

## Testing

### Unit (`bun run test:unit`, `tests/**`)

- Bun's built-in runner (`bun:test`); `bun test` must be scoped to `tests/` so it never picks up Playwright specs.
- Only pure modules are unit-tested (no Svelte runes / Dexie / DOM). Current coverage: `deriveTitle`, `textPostProcess` (voice), `constants` URL/icon helpers, `browser`, `weather`, `datetime`, `view`, `tasks`, `notes`, `writeup`.
- Keep pure logic in `utils/*.ts` so it stays testable; add a `tests/<module>.test.ts` alongside non-trivial changes.

### e2e (`bun run test:e2e`, `e2e/**`)

- Config: `playwright.config.ts`. Projects: `chromium` (web, default), `extension` (opt-in headed), `live` (opt-in external).
- Web tests run against `vite preview`; the `webServer` builds `build:web` first. Each test gets an isolated context, so IndexedDB starts empty.
- `openHome()` / `openViewShortcut()` live in `e2e/helpers.ts`. Prefer accessible-role locators and stable ids (e.g. `input[id^="task-edit-"]`) over positional selectors.
- Cover happy, unhappy (blank/duplicate input, cancel) and edge (reload persistence, ordering, toggling back) paths per view. Mobile specs set a viewport via `test.use`.
- `migration.spec.ts` seeds a v1 IndexedDB and asserts the v3 upgrade; `sync.spec.ts` opens two tabs for cross-tab sync; `weather.spec.ts` mocks the weather/fetch + geolocation APIs; `stickynotes.spec.ts` covers create/drag/dissolve/undo on the home board.
- Live/extension suites are gated by `E2E_LIVE=1` / `RUN_EXTENSION_E2E=1` and must not run in the default `bun run test:e2e`.

## Self-Improvement Protocol

This file is living documentation. Every session:

1. **Read first.** Read this file and `README.md`, then verify the sections you rely on against the code. Code wins over docs — fix the doc.
2. **Work the definition of done.** `check`, `lint` and `test:unit` must exit 0; run `test:e2e` for UI/data-flow changes. Never leave the tree redder than you found it.
3. **Keep this file accurate.** When you change build/test commands, architecture, data flow, or conventions, update the matching section in the same change.
4. **Be concise and concrete.** Short bullets; exact paths. No prose, no duplicated explanations; compress rather than split.
5. **Prefer verifiable claims.** Only document what you confirmed by reading code or running a command.
6. **Small, reversible steps.** One logical change per commit-worthy edit; follow the repo's commit style in `git log`.
7. **Never commit secrets.** `.env` is gitignored and holds `EDGE_EXTENSION_PUBLISH_API_KEY`; never print or commit its value.
