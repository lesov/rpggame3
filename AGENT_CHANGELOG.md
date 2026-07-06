# Agent Changelog

Shared coordination log per AGENT_WORKFLOW_INSTRUCTIONS.md.

## 2026-07-05 18:20 CDT - codex - feature/codex/player-character-start

- Status: started
- Summary: Add level 1 player character creation, Lepasoul nationality/religion choices, starting inventory, backstory bonuses, pregenerated characters, and map spawn integration.
- Files changed: (none yet)
- Tests run: (none yet)
- UI review: pending-human-test
- Blockers or coordination notes: Working from existing world/viewer app; leaving untracked source world files untouched.

## 2026-07-05 18:47 CDT - codex - feature/codex/player-character-start

- Status: ready-for-review
- Summary: Implemented player start feature: 2024-style level 1 character builder, Lepasoul nationality/religion selection from loaded world data, six predicament backstories with minor bonuses, six pregenerated characters, forced robe/sandals starting inventory, deterministic nation-aware spawn placement, player map marker, and Character/Inventory side-panel tabs.
- Files changed: AGENT_CHANGELOG.md, src/player/types.ts, src/player/rules2024.ts, src/player/backgrounds.ts, src/player/spawn.ts, src/player/character.ts, src/player/pregens.ts, src/player/character.test.ts, src/ui/CharacterBuilder.tsx, src/ui/InventoryPanel.tsx, src/ui/App.tsx, src/ui/store.tsx, src/ui/MapView.tsx, src/ui/styles.css, src/map/renderer.ts
- Tests run: `npx vitest run src/player/character.test.ts` — 4 tests passed; `npm run build` — passed; `npm test` — 48 tests passed.
- UI review: pending-human-test
- Blockers or coordination notes: No automated browser smoke test was run; human UI approval is still required before this UI work can be considered complete under repository instructions.

## 2026-07-05 22:36 CDT - codex - feature/codex/player-character-start

- Status: ready-for-review
- Summary: Follow-up character flow fixes from human review: widened ability score inputs, Character tab becomes a read-only sheet after character creation, backstory text now implies class-consistent training without explicit commoner-power explanation, and starting clothing switches to shoes/coat for cold spawn climates while retaining no weapons.
- Files changed: AGENT_CHANGELOG.md, src/player/backgrounds.ts, src/player/character.ts, src/player/rules2024.ts, src/player/character.test.ts, src/ui/CharacterBuilder.tsx, src/ui/styles.css
- Tests run: `npx vitest run src/player/character.test.ts` — 5 tests passed; `npm run build` — passed; `npm test` — 49 tests passed.
- UI review: pending-human-test
- Blockers or coordination notes: Existing dev server should hot-reload these changes; human UI approval still required by repo instructions.

## 2026-07-05 22:41 CDT - codex - feature/codex/player-character-start

- Status: approved
- Summary: Human approver tested the character builder/player start UI and stated "everything is checked ok", explicitly requesting merge and push.
- Files changed: AGENT_CHANGELOG.md
- Tests run: `npm test` — 49 tests passed as of previous entry; `npm run build` — passed as of previous entry.
- UI review: approved-by-human (2026-07-05)
- Blockers or coordination notes: Proceeding to commit feature branch, merge into main, and push main per human approval. No release tag requested.

## 2026-07-05 13:05 PDT - claude-fable-5 - feature/claude-fable-5/world-map-time-ui

- Status: approved
- Summary: Human approver (lesov1@gmail.com) tested the UI and stated "everything checks out", explicitly authorizing merge and push. Recording UI approval and merging to main per that authorization.
- Files changed: AGENT_CHANGELOG.md
- Tests run: full suite green as of previous entry (44 tests)
- UI review: approved-by-human (2026-07-05)
- Blockers or coordination notes: merging feature/claude-fable-5/world-map-time-ui into main with --no-ff and pushing to origin. No release tag created (not requested).

## 2026-07-05 12:45 PDT - claude-fable-5 - feature/claude-fable-5/world-map-time-ui

- Status: ready-for-review
- Summary: Data fix requested by human: culture name "Thyran (Wood Elf" (missing closing parenthesis in the source export) is now repaired during preprocessing (`fixParens` in tools/preprocess.mjs) — applied to culture names, people culture fields, and namedFeatures nameCulture. Source data files left untouched per workflow; fix survives future re-exports. All 26 occurrences now balanced in generated output.
- Files changed: tools/preprocess.mjs, tools/preprocess.test.mjs
- Tests run: `npx vitest run` — 44 tests passed (new test asserts every culture name is paren-balanced across outputs); `npm run preprocess` regenerated public/data.
- UI review: pending-human-test (unchanged)
- Blockers or coordination notes: none

## 2026-07-05 12:20 PDT - claude-fable-5 - feature/claude-fable-5/world-map-time-ui

- Status: ready-for-review
- Summary: Milestone 1 complete. Vite+React+TS app: canvas world map (terrain/political modes, pan/zoom, rivers, roads, borders, labels, lore markers), time progression from 1181-01-01 SE (step/play controls), event feed (46 scripted campaign-bible events + 128 wars from map data + deterministic ambient events), click-anywhere inspector (named geography, elevation, simulated seasonal weather with 3-day outlook, realm/rulers/wars, full settlement details, nearby POIs with lore). Preprocessing pipeline converts the raw Azgaar export + companion files into public/data artifacts (gitignored; run `npm run preprocess`).
- Files changed: package.json, vite.config.ts, tsconfig.json, index.html, .gitignore, tools/preprocess.mjs(+test), data/events.timeline.json, src/sim/* (+tests), src/map/* (+test), src/data/* (+test), src/ui/*
- Tests run: `npx vitest run` — 7 files, 43 tests, all passed (2026-07-05). `npx tsc -b` clean. Browser smoke test via Playwright headless Chromium: app loads, map renders, +1y/+1mo advance fires the 1187 Hattin anchor, event click jumps map and opens inspector, map click shows full place info, political mode and play/pause work, zero console errors (screenshots in session scratchpad).
- UI review: pending-human-test — run `npm run preprocess && npm run dev`, open http://localhost:5173
- Blockers or coordination notes: World source data files remain untracked/human-owned. Playwright needed local extraction of libnspr4/libnss3 (no sudo available) — see scratchpad libs; harmless to redo. No merge to main without explicit human approval.

## 2026-07-04 23:30 PDT - claude-fable-5 - feature/claude-fable-5/world-map-time-ui

- Status: started
- Summary: Milestone 1 — Lepasoul world viewer web app (Vite + React + TS). World map rendering from the Azgaar export, time progression from 1181-01-01 SE, scripted + ambient event feed, click-anywhere inspector with local weather. Plan approved by human (see .claude plan file iridescent-weaving-newell).
- Files changed: (none yet — scaffolding begins)
- Tests run: (none yet)
- UI review: pending-human-test (will remain pending until human approval)
- Blockers or coordination notes: World data files (Lepasoul Full *.json, lepasoul.*.json, *.md) are untracked on main; treating them as human-owned inputs — reading only, not committing or modifying them. Generated artifacts go to public/data/ (gitignored).
