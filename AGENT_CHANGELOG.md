# Agent Changelog

Shared coordination log per AGENT_WORKFLOW_INSTRUCTIONS.md.

## 2026-07-19 18:20 CDT - codex - main

- Status: merged
- Summary: Merged feature/codex/bandit-toll into main locally after human UI approval and merge authorization.
- Files changed: AGENT_CHANGELOG.md
- Tests run: `npx vitest run src/ui/store.test.ts` — 28 passed; `npx tsc -b` — clean; `npx vitest run` — 318 passed; `npm run build` — passed as of ready-for-review entry.
- UI review: approved-by-human (2026-07-19)
- Blockers or coordination notes: No push performed; human will push manually. No release tag requested.

## 2026-07-19 18:20 CDT - codex - feature/codex/bandit-toll

- Status: approved
- Summary: Human tested the bandit toll prompt, including explicit Persuasion/Sleight of Hand roll step and ability labels, and stated "everything is checked ok", explicitly requesting local merge and saying they will push manually.
- Files changed: AGENT_CHANGELOG.md
- Tests run: `npx vitest run src/ui/store.test.ts` — 28 passed; `npx tsc -b` — clean; `npx vitest run` — 318 passed; `npm run build` — passed as of ready-for-review entry.
- UI review: approved-by-human (2026-07-19)
- Blockers or coordination notes: Proceeding to commit feature branch and merge into main locally. Do not push; human will push manually.

## 2026-07-19 18:05 CDT - codex - feature/codex/bandit-toll

- Status: ready-for-review
- Summary: Follow-up from human UI test: make Persuasion/Sleight of Hand toll attempts explicit two-step rolls instead of auto-resolving on option click, and label each option with its governing ability.
- Files changed: AGENT_CHANGELOG.md, src/ui/store.tsx, src/ui/EncounterModal.tsx, src/ui/styles.css, src/persistence/saveGame.ts, src/ui/store.test.ts.
- Tests run: `npx vitest run src/ui/store.test.ts` — 28 passed; `npx tsc -b` — clean; `npx vitest run` — 318 passed; `npm run build` — passed with existing Anthropic SDK browser-externalization and chunk-size warnings.
- UI review: pending-human-test — choose Persuasion or Sleight of Hand in the bandit toll prompt and confirm a second explicit roll button appears with Charisma/Dexterity labeling before any success/failure resolution.
- Blockers or coordination notes: Working from dedicated feature branch. Existing untracked lore/workflow files remain untouched. Dev server running at http://localhost:5173/.

## 2026-07-19 - claude-fable-5 - feature/claude-fable-5/travel-sea-passage

- Status: approved
- Summary: Human approver tested the travel fixes (encounter-marker removal, segmented-road joining, capped/cheapened sea passage) and stated "my check passed, merge it" — explicit UI approval and merge authorization. Merging feature/claude-fable-5/travel-sea-passage into main locally with --no-ff.
- Files changed: AGENT_CHANGELOG.md
- Tests run: `npx vitest run` — 311 passed; `npx tsc -b` clean; `npm run build` passed (as of ready-for-review entry).
- UI review: approved-by-human (2026-07-19)
- Blockers or coordination notes: No release tag requested. Not pushing — human pushes main manually.

## 2026-07-19 - claude-fable-5 - feature/claude-fable-5/travel-sea-passage

- Status: ready-for-review
- Summary: Follow-up fixes from human review of the sea-passage branch: (1) road detection now unions Azgaar's segmented roads into connected networks (grid-hash union-find over near-shared points, cached per world) so a leg like Sterzhkov→Mememil served by different segments of the same road counts as road travel again — the removed encounter marker had been acting as an accidental waypoint joining the two segments; mixed road/trail chains use trail speed; (2) sea-passage list capped at ports within 250 miles; (3) fare lowered to 10 vosels + 2/mile.
- Files changed: src/player/travel.ts (roadComponents union-find + component-aware roadRouteFor; SEA_PASSAGE_RANGE_MI=250 filter in seaPortDestinations; BOAT_FARE_VOSELS_PER_MILE=2), src/ui/TravelPanel.tsx (help text), src/player/travel.test.ts (+4: segment-chain joins, disconnected segments stay apart, mixed chain uses trails, real-data Sterzhkov–Mememil road found; fare/range expectations updated), AGENT_CHANGELOG.md.
- Tests run: `npx vitest run` — 311 tests / 40 files, all passed. `npx tsc -b` clean. `npm run build` passed. Headless Chromium re-run at Domasalyesi: 11/11 checks — Kethlin (292 mi) no longer listed, help text shows 250-mile/2-per-mile terms, Oladar fare now 476 (was 709), sails and arrives with exact deduction, no interruptions, zero console errors.
- UI review: pending-human-test — re-check a road leg between towns on the same (segmented) road, and the trimmed/cheaper sea list from a port.
- Blockers or coordination notes: none.

## 2026-07-19 - claude-fable-5 - feature/claude-fable-5/travel-sea-passage

- Status: started
- Summary: Travel fixes per approved plan: (1) `encounters`-type map markers no longer appear as travel destinations (reserved for future road chance-encounters; other marker types stay travelable); (2) port-to-port sea passage — from any port the player can sail to any other port at D&D sailing-ship speed (2 mph, day and night), fare 10 vosels + 3/mile, boat legs never roll encounters.
- Files changed: src/player/travel.ts (isPointDestination excludes `encounters` markers; SAILING_SHIP_MPH=2 replaces BOAT_MPH=5; boatFareVosels = 10 + 3/mile; TravelPlan.fareVosels; boatReachable no longer requires land-unreachable; new seaPortDestinations lists every other port from a port; old 900-mi/8-port back-fill removed), src/ui/store.tsx (runTravelLeg: boat legs deduct the fare via spendVosels, refuse when the purse is short, and skip rollTravelEncounters entirely), src/ui/TravelPanel.tsx (Sea passage section with per-port fares; boat readouts: Fare row with purse, "Safe passage — no encounters at sea"; travel button disabled/"Need N vosels" when short; sea picks pin boat mode), src/ui/styles.css (.sea-passage-list scroll), src/player/travel.test.ts (+4 tests, reworked 3 for the redesign), src/ui/store.test.ts (boat leg: fare deducted / arrival / no interception / blocked unpaid), AGENT_CHANGELOG.md.
- Tests run: `npx vitest run` — 307 tests / 40 files, all passed. `npx tsc -b` clean. `npm run build` passed. Headless Chromium (save injected with player at Domasalyesi port, 5000 vosels): Sea passage section lists ports sorted by distance with fares (Elethsana 35 mi/140v … Oladar 186 mi/709v), boat plan shows 2.0 mph day-and-night pace + Fare row + Safe-passage badge, traveling to Oladar advances 4d 21h, arrives with exactly fare deducted (5000→4291), no encounter/combat interruption; 9/9 checks, zero console errors (screenshots in scratchpad).
- UI review: pending-human-test — stand in a port town, open Travel: check the Sea passage list/fares, sail somewhere; also confirm "encounter" markers no longer appear among destinations.
- Blockers or coordination notes: `encounters` markers reserved for future road chance-encounters per human decision. Fare rate (10 + 3/mile) is the human's custom economy choice. Dev server on :5173.

## 2026-07-19 10:51 CDT - codex - main

- Status: merged
- Summary: Merged feature/codex/scene-painter into main locally after human UI approval and merge authorization.
- Files changed: AGENT_CHANGELOG.md
- Tests run: `npx vitest run src/scenePainter/prompt.test.ts src/scenePainter/claude.test.ts` — 8 passed; `npx tsc -b` — clean; `npx vitest run` — 303 passed; `npm run build` — passed as of ready-for-review entry.
- UI review: approved-by-human (2026-07-19)
- Blockers or coordination notes: No push performed; human will push manually. No release tag requested.

## 2026-07-19 10:51 CDT - codex - feature/codex/scene-painter

- Status: approved
- Summary: Human tested Scene Painter, including the road/camp location fix, and stated "everything is checked ok", explicitly requesting local merge and saying they will push manually.
- Files changed: AGENT_CHANGELOG.md
- Tests run: `npx vitest run src/scenePainter/prompt.test.ts src/scenePainter/claude.test.ts` — 8 passed; `npx tsc -b` — clean; `npx vitest run` — 303 passed; `npm run build` — passed as of ready-for-review entry.
- UI review: approved-by-human (2026-07-19)
- Blockers or coordination notes: Proceeding to commit feature branch and merge into main locally. Do not push; human will push manually.

## 2026-07-19 09:58 CDT - codex - feature/codex/scene-painter

- Status: ready-for-review
- Summary: Added the Scene Painter prompt builder, Claude text wrapper, header button, modal, and styling. Fixed settlement detection so road/camp positions outside a city are not painted as the nearest/adjacent town square.
- Files changed: AGENT_CHANGELOG.md, new src/scenePainter/prompt.ts, new src/scenePainter/claude.ts, new src/scenePainter/prompt.test.ts, new src/scenePainter/claude.test.ts, src/ui/App.tsx, new src/ui/ScenePainterModal.tsx, src/ui/styles.css.
- Tests run: `npx vitest run src/scenePainter/prompt.test.ts src/scenePainter/claude.test.ts` — 8 passed; `npx tsc -b` — clean; `npx vitest run` — 303 passed; `npm run build` — passed with existing Anthropic SDK browser-externalization and chunk-size warnings.
- UI review: pending-human-test — create/load a character, click Scene Painter next to Save / Load, confirm the context matches the current place/weather/time/party; specifically retest making camp after a travel interruption outside a city.
- Blockers or coordination notes: Existing stored key is an Anthropic text-generation key; implementation generates a detailed painter prompt/description and leaves actual bitmap generation as a future provider extension. Dev server running at http://localhost:5173/.

## 2026-07-19 - claude-fable-5 - feature/claude-fable-5/quest-burned-hall

- Status: approved
- Summary: Human approver tested the burned-hall quest finale in the UI and stated "my check passed, merge it" — explicit UI approval and merge authorization. Merging feature/claude-fable-5/quest-burned-hall into main locally with --no-ff.
- Files changed: AGENT_CHANGELOG.md
- Tests run: `npx vitest run` — 295 passed; `npx tsc -b` clean; `npm run build` passed (as of ready-for-review entry).
- UI review: approved-by-human (2026-07-19)
- Blockers or coordination notes: No release tag requested. Not pushing — human pushes main manually. Stabilize-quest concrete objectives still to be specified by the human (single open step for now).

## 2026-07-18 - claude-fable-5 - feature/claude-fable-5/quest-burned-hall

- Status: started
- Summary: First-quest final leg (plan approved by human): returning courier finds the guild hall burned — bodies consumed to teeth, two rooms usable (sleeping quarters + small kitchen). Scripted scenes: inspect ruins → talk to maid Semina (4 dead incl. the giver, retitled Flame-Commander) → quest completes; talk to survivor Emgerdas (autistic lvl-5 human wizard, potions/enchanting; flame "unusually hot") starts 'stabilize-guild-branch' quest (single open step; concrete objectives to be specified by human later); Seminol (illiterate lvl-1 wood elf ranger) arrives after. Full D&D sheets + appearance descriptors + 3 hand-picked personality traits for the two guild characters.
- Files changed: src/quests/types.ts (new phases 'ruins-inspected' / 'seminol-arriving'), src/quests/progression.ts (guards + transitions: inspectGuildRuins → appended learn-what-happened step; speakToSemina → quest completed with four deaths incl. the giver; startStabilizeQuest → 'Ashes of the Hearth' with single open hold-the-branch step; meetSeminol clears the arrival phase), src/quests/startQuest.ts (giver retitled Flame-Commander of the origin hall), new src/quests/survivors.ts (Semina + Emgerdas lvl-5 wizard + Seminol lvl-1 ranger: Person records with hand-picked 3-trait sets, full NpcSheet D&D stats using CLASS_RULES/proficiencyBonusForLevel, buildAppearance Looks descriptors, all four scene texts), src/ui/store.tsx (4 new actions, guildHallFire state slice, feed event on discovery), src/ui/QuestPanel.tsx (SceneBlock component + aftermath section for the completed-courier Emgerdas scene), src/ui/Inspector.tsx (burned-ruin Guild row + survivor PersonCards with expandable NpcSheetSection incl. Looks), src/ui/styles.css (.npc-sheet), src/persistence/saveGame.ts (guildHallFire null default for pre-fire saves), src/combat/fixtures.ts (fixture giverRole updated), tests: new src/quests/aftermath.test.ts (6), new src/quests/survivors.test.ts (4), store.test.ts reducer walkthrough, saveGame.test.ts round-trip/legacy default, startQuest.test.ts giverRole.
- Tests run: `npx vitest run` — 295 tests / 38 files, all passed (12 new). `npx tsc -b` clean. `npm run build` passed. Headless Chromium end-to-end (mid-quest save injected into a save slot, then driven through the UI): ruins scene (teeth + two rooms) → Semina (quest completes) → Emgerdas (stabilize quest starts) → Seminol (phase clears) → inspector shows burned-ruin row + three survivor cards with Wizard 5 sheet/Looks/traits → save + reload + load keeps quest and fire state; 16/16 checks, zero console errors (screenshots in session scratchpad).
- UI review: pending-human-test — fastest path: play the courier quest to the end (deliver, wait, return to your start town), then click through the four scenes in the Quests tab; check your start town in the Inspector afterward.
- Blockers or coordination notes: Stabilize-quest concrete objectives intentionally a single open step — human will specify details later. Survivors are narrative + sheet display only (no party/combat integration yet). Dev server on :5173.

## 2026-07-18 22:20 CDT - codex - feature/codex/character-appearance

- Status: approved
- Summary: Human tested custom and pregenerated character appearance/Looks UI and stated "everything is checked ok", explicitly requesting local merge and saying they will push manually.
- Files changed: AGENT_CHANGELOG.md
- Tests run: `npx vitest run` — 283 passed; `npx tsc -b` — clean; `npm run build` — passed as of ready-for-review entry.
- UI review: approved-by-human (2026-07-18)
- Blockers or coordination notes: Proceeding to commit feature branch and merge into main locally. Do not push; human will push manually.

## 2026-07-18 22:15 CDT - codex - feature/codex/character-appearance

- Status: ready-for-review
- Summary: Added character appearance data and generated looks descriptors. Custom character creation now has appearance controls for skin, hair color/length, facial hair, eyes, relative height, and posture, with body build derived from Strength. Pregenerated characters now provide hand-authored appearance choices through the same descriptor generator. Character sheet and Inventory show the Looks line.
- Files changed: AGENT_CHANGELOG.md, new src/player/appearance.ts, new src/player/appearance.test.ts, src/player/types.ts, src/player/character.ts, src/player/character.test.ts, src/player/pregens.ts, src/ui/CharacterBuilder.tsx, src/ui/InventoryPanel.tsx, src/ui/styles.css.
- Tests run: `npx vitest run src/player/appearance.test.ts src/player/character.test.ts src/persistence/saveGame.test.ts` — 20 passed; `npx tsc -b` — clean; `npx vitest run` — 283 passed; `npm run build` — passed with existing Anthropic SDK browser-externalization and chunk-size warnings.
- UI review: pending-human-test — create a custom character and try a pregen; confirm Looks preview and final Looks lines render as expected.
- Blockers or coordination notes: Existing untracked lore/world source files remain untouched.

## 2026-07-18 22:11 CDT - codex - feature/codex/character-appearance

- Status: started
- Summary: Add character appearance/looks descriptors for custom and pregenerated characters, with custom appearance controls and Strength-derived build wording.
- Files changed: AGENT_CHANGELOG.md; planned src/player/{types,appearance,character,pregens}.ts, tests, and character/inventory UI.
- Tests run: not run yet.
- UI review: pending-human-test
- Blockers or coordination notes: Working from a dedicated feature branch. Existing untracked lore/world source files will remain untouched.

## 2026-07-18 20:25 CDT - codex - feature/codex/event-map-highlights

- Status: approved
- Summary: Human tested world-event map highlights, including clearing highlight/focus circles when leaving the World events tab, and stated "everything is checked ok", explicitly requesting local merge and saying they will push manually.
- Files changed: AGENT_CHANGELOG.md
- Tests run: `npx vitest run` — 278 passed; `npm run build` — passed as of ready-for-review entry; follow-up `npx vitest run src/ui/store.test.ts` — 19 passed; follow-up `npx tsc -b` — clean.
- UI review: approved-by-human (2026-07-18)
- Blockers or coordination notes: Proceeding to commit feature branch and merge into main locally. Do not push; human will push manually.

## 2026-07-18 20:11 CDT - codex - feature/codex/event-map-highlights

- Status: ready-for-review
- Summary: World events feed clicks now dispatch a map-highlight action that jumps to the event and draws a semi-transparent area circle without creating a persistent cell selection or focus ring. Burg/cell events highlight their point with kind-relative radius; anchor events are larger; state/war events without a point derive a rough combined-state circle. Event highlights are render-only, excluded from save serialization, and clear when leaving the World events tab.
- Files changed: AGENT_CHANGELOG.md, src/ui/store.tsx, src/ui/EventFeed.tsx, src/ui/MapView.tsx, src/map/renderer.ts, src/persistence/saveGame.ts, src/ui/store.test.ts.
- Tests run: `npx vitest run src/ui/store.test.ts src/persistence/saveGame.test.ts` — 23 passed; `npx tsc -b` — clean; `npx vitest run` — 278 passed; `npm run build` — passed with existing Anthropic SDK browser-externalization and chunk-size warnings; follow-up `npx vitest run src/ui/store.test.ts` — 19 passed; follow-up `npx tsc -b` — clean; second follow-up `npx vitest run src/ui/store.test.ts` — 19 passed; second follow-up `npx tsc -b` — clean; focus-ring follow-up `npx vitest run src/ui/store.test.ts` — 19 passed; focus-ring follow-up `npx tsc -b` — clean.
- UI review: pending-human-test — open World events, click a located or war/state event, and confirm the map jumps and displays an appropriately sized translucent circle.
- Blockers or coordination notes: Existing untracked lore/world source files remain untouched.

## 2026-07-18 20:08 CDT - codex - feature/codex/event-map-highlights

- Status: started
- Summary: Add map highlights for world events from the World events feed: clicking an event should jump to its location and draw a semi-transparent circle sized to local, anchor, war, or multi-state scope.
- Files changed: AGENT_CHANGELOG.md; planned src/ui/store.tsx, src/ui/EventFeed.tsx, src/ui/MapView.tsx, src/map/renderer.ts, tests.
- Tests run: not run yet.
- UI review: pending-human-test
- Blockers or coordination notes: Working from a dedicated feature branch. Existing untracked lore/world source files will remain untouched.

## 2026-07-18 18:53 CDT - codex - feature/codex/biome-encounters

- Status: approved
- Summary: Human tested the biome/remoteness encounter behavior and stated "everything is checked ok", explicitly requesting local merge and saying they will push manually.
- Files changed: AGENT_CHANGELOG.md
- Tests run: `npx vitest run` — 275 passed; `npx tsc -b` — clean; `npm run build` — passed as of ready-for-review entry.
- UI review: approved-by-human (2026-07-18)
- Blockers or coordination notes: Proceeding to commit feature branch and merge into main locally. Do not push; human will push manually.

## 2026-07-18 17:03 CDT - codex - feature/codex/biome-encounters

- Status: ready-for-review
- Summary: Added 12 SRD/D&D-flavored level-1 enemy types (kobold scout, gnoll marauder, hobgoblin soldier, bugbear ambusher, giant rat, giant spider, stirge swarm, ice mephit, dust mephit, imp, ghoul, sprite archer). Travel encounter actor selection now computes wilderness level from road/pop/nearest burg/markers; remote/deep wild routes sharply suppress brigands and peaceful road traffic, cold biomes suppress fiends/imps and favor elementals/goblinoids/undead, wetlands favor spiders/stirges/vermin/undead, and statblock picks use per-monster biome/remoteness/road/marker affinity metadata.
- Files changed: AGENT_CHANGELOG.md, src/combat/monsters.ts, src/combat/types.ts, src/combat/kits.test.ts, src/travel/encounter/{types,disposition,tables,run}.ts, src/travel/encounter/tables.test.ts, src/ui/EncounterModal.tsx.
- Tests run: `npx vitest run src/travel/encounter/tables.test.ts src/travel/encounter/run.test.ts src/travel/encounter/disposition.test.ts src/combat/kits.test.ts src/combat/engine.test.ts` — 60 passed; `npx tsc -b` — clean; `npx vitest run` — 275 passed; `npm run build` — passed with existing Anthropic SDK browser-externalization and chunk-size warnings.
- UI review: pending-human-test — encounter modal has labels for new fiend/elemental/fey actor categories; no layout changes.
- Blockers or coordination notes: Working branch is feature/codex/biome-encounters. Existing untracked lore/world source files remain untouched.

## 2026-07-18 16:55 CDT - codex - feature/codex/biome-encounters

- Status: started
- Summary: Add 12 D&D/SRD-flavored enemy types and make travel encounter actor/statblock selection better aligned with biome, remoteness/wilderness level, roads, season, time of day, and hostile markers. Keep rate/disposition split intact.
- Files changed: AGENT_CHANGELOG.md; planned src/combat/monsters.ts, src/travel/encounter/{types,tables,run}.ts and focused tests.
- Tests run: not run yet.
- UI review: not-applicable
- Blockers or coordination notes: Working from main on a dedicated feature branch. Existing untracked lore/world files are human-owned/source inputs and will be left untouched.

## 2026-07-18 - claude-fable-5 - feature/claude-fable-5/codex-gates-carried-word

- Status: approved
- Summary: Human approver reviewed the two new codex pages in the UI and stated "my check passed, merge it" — explicit UI approval and merge authorization. Merging feature/claude-fable-5/codex-gates-carried-word into main locally with --no-ff.
- Files changed: AGENT_CHANGELOG.md
- Tests run: `npx vitest run` — 272 passed; `npx tsc -b` clean; `npm run build` passed (as of ready-for-review entry).
- UI review: approved-by-human (2026-07-18)
- Blockers or coordination notes: No release tag requested. Not pushing — human pushes main manually.

## 2026-07-18 - claude-fable-5 - feature/claude-fable-5/codex-gates-carried-word

- Status: started
- Summary: Add condensed in-game codex pages for the two new human-owned lore files (lepasoul_gates_codex.md, lepasoul_carried_word_codex.md): "The Gates" and "The Order of the Carried Word" as new CODEX_ENTRIES in src/lore/codex.ts, with alias links and registry tests. Keeper's Notes mechanics in those files are out of scope. Source .md files are read-only and stay uncommitted.
- Files changed: src/lore/codex.ts (two new CODEX_ENTRIES: `the-gates` — Law of Passage, purge/gate-wan, gatehouse + hearth-credit, travel arithmetic, "what you are passes"; `carried-word` — Bearers, Fast of the Road, House of Memory, Second Tongue, ranks/word-names, Bearer's Peace/Silence, statue-litany closer; both ~5 paragraphs condensed from the human-owned source codices, Keeper's Notes mechanics deliberately excluded), src/lore/codex.test.ts (+5 tests: id/alias lookups for both entries, prose link tokenization for Bearer/Carried Word/the gates, cross-entry alias-collision guard), AGENT_CHANGELOG.md.
- Tests run: `npx vitest run` — 272 tests / 35 files, all passed. `npx tsc -b` clean. `npm run build` passed. Headless Chromium: Codex tab lists all four entries; both new pages render title/subtitle/tags/body with zero console errors (screenshots in session scratchpad).
- UI review: pending-human-test — open the Codex tab, read "The Gates" and "The Order of the Carried Word".
- Blockers or coordination notes: New aliases ('the Ways', 'the gates', 'Bearer', …) auto-link from character-backstory text via tokenizeCodexLinks; alias regex is case-sensitive, hence paired case variants. Source .md files untouched and uncommitted. Dev server still on :5173.

## 2026-07-17 - claude-fable-5 - feature/claude-fable-5/portal-lore-15

- Status: approved
- Summary: Human approver tested the fifteen-portals UI and stated "my check passed, merge it" — explicit UI approval and merge authorization. Merging feature/claude-fable-5/portal-lore-15 into main locally with --no-ff.
- Files changed: AGENT_CHANGELOG.md
- Tests run: `npx vitest run` — 268 passed; `npx tsc -b` clean; `npm run build` passed (as of ready-for-review entry).
- UI review: approved-by-human (2026-07-17)
- Blockers or coordination notes: No release tag requested. Not pushing — per repo convention the human pushes main manually (SSH auth unavailable in this environment).

## 2026-07-17 - claude-fable-5 - feature/claude-fable-5/portal-lore-15

- Status: started
- Summary: Lore retcon approved by human (plan agile-launching-lobster): exactly 15 portals — the map's `portals` markers — built centuries ago by the precursor of the Adventurer's Guild in the great cities of that era (many since faded); Guild maintains them ritually, none can build new ones; capitals no longer imply portals. Preprocess will derive portal placement from markers (overriding the 35 stale `hasTeleportPortal` flags in human-owned lepasoul.buildings.json, which stays untouched), fees by settlement tier (city 200 / large_town 150 / town 100 / village 50). Human explicitly approved editing untracked lepasoul_landmarks.md and lepasoul_1181_1281_campaign_bible.md (still never committed).
- Files changed: tools/preprocess.mjs (+3 tests in tools/preprocess.test.mjs), src/data/types.ts (burg-level `portal?: {name, feeGold}`; removed SettlementBuilding.hasTeleportPortal/portalFeeGold), src/data/worldLoader.ts (hasPortal from burg.portal; portal burgs join ambient pool regardless of pop), src/ui/Inspector.tsx (dedicated Portal row on the burg card; guild building label loses portal suffix), src/lore/codex.ts (Ways rewritten to 15 ancient portals + new ritual-maintenance paragraph; Campfire "keeps the Rite of the Ways" instead of blessing new portals), src/lore/guild.ts (removed unused wayFee field/values; fixed Deretslav and Brinollu bios that claimed Ways in realms that no longer have one), data/events.timeline.json (1219 anchor: "portal caravan" → "Guild caravan"; Mememil has no portal), AGENT_CHANGELOG.md. Human-owned untracked files edited with explicit approval, NOT committed: lepasoul_landmarks.md (header count; 35-city fee list replaced by "The Fifteen Portals" with ancient portal names, hosts, realms, tier fees), lepasoul_1181_1281_campaign_bible.md (two Mememil portal-caravan phrases → Guild caravan).
- Tests run: `npx vitest run` — 268 tests / 35 files, all passed. `npx tsc -b` — clean. `npm run build` — passed (pre-existing chunk-size warning only). `npm run preprocess` — regenerated public/data; verified world.json has exactly 15 portal burgs matching the 15 `portals` markers (each marker sits exactly on its burg), tier fees correct, zero legacy hasTeleportPortal flags. Headless Chromium (Playwright) smoke test on the live dev server: Eralinde (faded village) shows "Nulgathun Portal — one of the fifteen Ways… 50 gold per traveler" plus the new marker legend under Local lore; Smovere (capital, ex-portal city) shows no portal row; zero console errors. Screenshots in session scratchpad.
- UI review: pending-human-test — run `npm run preprocess && npm run dev`, click a portal town (e.g. Eralinde in Nakinb, or Keboimrud) and a former portal capital (e.g. Smovere); check the Codex guild entry prose.
- Blockers or coordination notes: Portal placement now derives from the map's 15 `portals` markers at preprocess time; the 35 stale hasTeleportPortal flags in lepasoul.buildings.json are ignored/stripped (file untouched). Dev server left running on :5173 for human testing.

## 2026-07-14 - claude-fable-5 - feature/claude-fable-5/save-load

- Status: approved / merged
- Summary: Added save/load with 4 browser (localStorage) save slots. GameState is JSON-safe except economy.markets (a Map); it's serialized compactly — per-burg stock/price value arrays in the deterministic goodsStockedByBurg order (no repeated good-name keys), the cosmetic prev dropped, rounded to 2dp — so four full-world saves fit well under the ~5MB storage cap while faithfully restoring the world. New src/persistence/saveGame.ts: economy encode/decode codec, serializeGame/deserializeGame with a SAVE_VERSION + worldSeed guard (incompatible saves are refused, not loaded), and injectable slot storage (readSlot/writeSlot/deleteSlot/listSlotMeta) that catches QuotaExceededError. New loadGame store action recenters the map on the loaded position. New SaveLoadModal (header "Save / Load" button opens it) shows 4 slot cards with character name/class, in-game date, location, and real-world save time; Save is gated on player!=null && screen==='map' (transient combat/shop states never enter a save), Load is always available and disabled for empty/incompatible slots, Delete confirms first.
- Files changed: AGENT_CHANGELOG.md; new src/persistence/saveGame.ts + src/persistence/saveGame.test.ts; new src/ui/SaveLoadModal.tsx; src/ui/store.tsx (loadGame action + reducer case), src/ui/App.tsx (header button + modal in Shell), src/ui/styles.css (save modal/slot styling).
- Tests run: `npx vitest run` — 262 passed (34 files; +5 new persistence tests: round-trip fidelity incl. economy prices, version/seed rejection, slot write/read/list/delete with a fake in-memory Storage, corrupt-slot null); `npx tsc --noEmit` — clean; `npm run build` — passed (existing SDK-externalization + chunk-size warnings only).
- UI review: approved-by-human (2026-07-14) — human tested save/load in the live UI and stated their check passed, explicitly authorizing the merge ("my check passed, merge it"). Merged into main with a --no-ff merge commit.
- Blockers or coordination notes: Branched from main. Additive — new src/persistence/ module + a modal; shared touch-points store.tsx/App.tsx/styles.css (one loadGame action, one header button, modal styles) alongside codex's tabs. Out of scope: autosave, file export/import, mid-combat saving, save-schema migration (v1 only). main is merged locally but NOT pushed — the human will push manually.

## 2026-07-14 22:38 CDT - codex - feature/codex/shop-item-details

- Status: merged
- Summary: Human tested shop/trader item stats and comparison display and stated "everything is checked ok"; feature branch was committed and merged into main locally.
- Files changed: AGENT_CHANGELOG.md, src/ui/ShopScreen.tsx, src/ui/styles.css
- Tests run: `npm test` — 257 passed; `npm run build` — passed (existing Anthropic SDK browser-externalization warnings and chunk-size warning only).
- UI review: approved-by-human (2026-07-14)
- Blockers or coordination notes: Merged into main locally with merge commit. Do not push; human will push manually. Leaving untracked source-world files untouched.

## 2026-07-14 22:28 CDT - codex - feature/codex/remove-starting-battle

- Status: merged
- Summary: Human tested the removal of the automatic post-creation battle and stated "everything is checked ok"; feature branch was committed and merged into main locally.
- Files changed: AGENT_CHANGELOG.md, src/ui/CharacterBuilder.tsx, src/ui/store.test.ts, src/ui/styles.css
- Tests run: `npm test` — 257 passed; `npm run build` — passed (existing Anthropic SDK browser-externalization warnings and chunk-size warning only).
- UI review: approved-by-human (2026-07-14)
- Blockers or coordination notes: Merged into main locally with merge commit. Do not push; human will push manually. Leaving untracked source-world files untouched.

## 2026-07-13 22:23 CDT - codex - feature/codex/inventory-item-comparison

- Status: approved
- Summary: Human tested inventory item stats/comparison display in the live UI and stated "everything is checked ok", explicitly requesting local merge and saying they will push manually.
- Files changed: AGENT_CHANGELOG.md
- Tests run: `npm test` — 256 passed; `npm run build` — passed as of the ready-for-review state.
- UI review: approved-by-human (2026-07-13)
- Blockers or coordination notes: Proceeding to commit feature branch and merge into main locally. Do not push; human will push manually.

## 2026-07-13 22:11 CDT - codex - feature/codex/inventory-item-comparison

- Status: ready-for-review
- Summary: Inventory now shows comparison-oriented item rows with stat summaries, value, weight, details, equipped comparisons, and equip controls. Added catalog/item metadata hooks for magic items that require identification; unidentified magic hides stats and value until marked identified.
- Files changed: AGENT_CHANGELOG.md, src/player/types.ts, src/economy/catalog.ts, src/economy/itemDisplay.ts, src/economy/itemDisplay.test.ts, src/ui/InventoryPanel.tsx, src/ui/styles.css
- Tests run: `npm test` — 256 passed; `npm run build` — passed (existing Anthropic SDK browser-externalization warnings and chunk-size warning only).
- UI review: pending-human-test
- Blockers or coordination notes: Dev server running at http://localhost:5173/ for human UI review. HTTP check returned 200 OK. Leaving untracked source-world files untouched.

## 2026-07-13 22:01 CDT - codex - feature/codex/enemy-loot-drops

- Status: approved
- Summary: Human tested enemy loot drops in the live UI and stated "everything is checked ok", explicitly requesting local merge and saying they will push manually.
- Files changed: AGENT_CHANGELOG.md
- Tests run: `npm test` — 251 passed; `npm run build` — passed as of the ready-for-review state.
- UI review: approved-by-human (2026-07-13)
- Blockers or coordination notes: Proceeding to commit feature branch and merge into main locally. Do not push; human will push manually.

## 2026-07-13 21:53 CDT - codex - feature/codex/enemy-loot-drops

- Status: ready-for-review
- Summary: Added contextual enemy loot drops after combat victories. Loot tables are monster-specific and deterministic from combat seed; victory overlays now show dropped items with Take all/Leave actions; claiming loot merges catalog-backed items into player inventory once and clears when combat ends.
- Files changed: AGENT_CHANGELOG.md, src/combat/loot.ts, src/combat/loot.test.ts, src/economy/catalog.ts, src/ui/CombatScreen.tsx, src/ui/store.tsx, src/ui/store.test.ts, src/ui/styles.css
- Tests run: `npm test` — 251 passed; `npm run build` — passed (existing Anthropic SDK browser-externalization warnings and chunk-size warning only).
- UI review: pending-human-test
- Blockers or coordination notes: Dev server running at http://localhost:5173/ for human UI review. HTTP check returned 200 OK. Leaving untracked source-world files untouched.

## 2026-07-13 - claude-fable-5 - feature/claude-fable-5/trade-economy

- Status: approved / merged
- Summary: Added the world-scale trade economy core from lepasoul_trade_framework.md (v1.0). Player trading is NOT included (unlocks later with caravans) — this increment builds the living economy: a 24-good catalog (staple/commodity/luxury/special), per-province production derived from biome/state-type/culture/mine-markers, tier-gated demand per market class, a burg route graph (snapped from route polylines, road/trail/sea capacities), and a stateful MarketState per settlement with a weekly tick in §8 order (events → production → NPC diffusion → prices → clamps). Prices are seeded to a settled equilibrium at the 1181 start date (half-year settle) so day-one regional spreads exist, and move as the clock advances (weekly, with bounded catch-up for big jumps). History coupling: war economies (reusing wd.wars) raise iron/grain and depress luxuries in belligerent states with post-peace decay, plus two campaign-bible anchors (1234 Mathathremo → dwarf-steel supply collapse; 1258 sack of Zinulb → relic glut for 5y). Prices clamped to [0.4,3.0]×base, deterministic seeded noise. New read-only Trade tab: prices at a chosen market (vs base / vs last week), this week's movers, widest regional spreads, and a "you cannot trade yet — caravans unlock later" note.
- Files changed: AGENT_CHANGELOG.md; new src/trade/{goods,markets,graph,production,demand,pricing,events,flow,economy}.ts + src/trade/{graph,production,economy}.test.ts; new src/ui/TradePanel.tsx; src/ui/store.tsx (economy slice + weekly tick in advanceClock), src/ui/App.tsx (Trade tab), src/ui/styles.css.
- Tests run: `npx vitest run` — 246 passed (31 files; +21 new trade tests); `npx tsc --noEmit` — clean; `npm run build` — passed (existing Anthropic SDK browser-externalization + chunk-size warnings only).
- UI review: approved-by-human (2026-07-13) — human tested the Trade tab in the live UI and stated their check passed, explicitly authorizing the merge ("my check passed, merge it"). Merged into main with a --no-ff merge commit.
- Blockers or coordination notes: Branched from main 222b694. Additive — new src/trade/ module + store economy slice + Trade tab; shared touch-points store.tsx/App.tsx/styles.css added alongside codex's tabs (no change to combat, quests, shopping, or the guild layer). Deferred to the caravan milestone: transport (caravans/ships/portals), shipment quote/execute, insurance, player buy/sell of trade goods, rumor staleness, full campaign-bible event table. main is merged locally but NOT pushed — the human will push manually.

## 2026-07-12 21:59 CDT - codex - feature/codex/quest-progress-delivery

- Status: approved
- Summary: Human tested the capital courier quest progression in the live UI and stated "everything is checked ok", explicitly requesting local merge and saying they will push manually.
- Files changed: AGENT_CHANGELOG.md
- Tests run: `npm test` — 225 passed; `npm run build` — passed as of the ready-for-review state.
- UI review: approved-by-human (2026-07-12)
- Blockers or coordination notes: Proceeding to commit feature branch and merge into main locally. Do not push; human will push manually.

## 2026-07-12 21:38 CDT - codex - feature/codex/quest-progress-delivery

- Status: ready-for-review
- Summary: Added first courier quest progression: arriving at the capital shows a Firekeeper representative dialogue, delivering the sealed letter removes it and starts a two-hour response wait, the wait button advances the game clock and grants a sealed response letter, and the active objective changes to returning to the origin guild head.
- Files changed: AGENT_CHANGELOG.md, src/quests/types.ts, src/quests/startQuest.ts, src/quests/progression.ts, src/quests/startQuest.test.ts, src/economy/catalog.ts, src/economy/catalog.test.ts, src/combat/fixtures.ts, src/ui/store.tsx, src/ui/store.test.ts, src/ui/QuestPanel.tsx, src/ui/styles.css
- Tests run: `npm test` — 225 passed; `npm run build` — passed (existing Anthropic SDK browser-externalization warnings and chunk-size warning only).
- UI review: pending-human-test
- Blockers or coordination notes: Dev server running at http://localhost:5176/ for human UI review. HTTP check returned 200 OK. Leaving untracked source-world files untouched.

## 2026-07-12 21:06 CDT - codex - feature/codex/travel-target-highlight

- Status: approved
- Summary: Human tested the travel destination road-default behavior and map target highlight in the live UI and stated "everything is checked ok", explicitly requesting local merge and saying they will push manually.
- Files changed: AGENT_CHANGELOG.md
- Tests run: `npm test` — 223 passed; `npm run build` — passed as of the ready-for-review state.
- UI review: approved-by-human (2026-07-12)
- Blockers or coordination notes: Proceeding to commit feature branch and merge into main locally. Do not push; human will push manually.

## 2026-07-12 21:00 CDT - codex - feature/codex/travel-target-highlight

- Status: ready-for-review
- Summary: Travel destination selection now defaults immediately to roads/trails when the selected destination has a road/trail route, otherwise boat for boat-only destinations or off-road as fallback. The selected travel target is stored separately from Inspector selection and highlighted on the map with a blue travel-target ring and label.
- Files changed: AGENT_CHANGELOG.md, src/player/travel.ts, src/player/travel.test.ts, src/ui/TravelPanel.tsx, src/ui/store.tsx, src/ui/store.test.ts, src/ui/MapView.tsx, src/map/renderer.ts
- Tests run: `npm test` — 223 passed; `npm run build` — passed (existing Anthropic SDK browser-externalization warnings and chunk-size warning only).
- UI review: pending-human-test
- Blockers or coordination notes: Dev server running at http://localhost:5176/ for human UI review. HTTP check returned 200 OK. Leaving untracked source-world files untouched.

## 2026-07-12 - claude-fable-5 - feature/claude-fable-5/adventurers-guild

- Status: approved / merged
- Summary: Human tested the Adventurer's Guild feature in the live UI (codex entry + biography link, Ember rank on the character sheet/inventory, Firekeepers shown at capitals, guild branch lines, and the courier quest naming the real Firekeeper) and stated their check passed, explicitly authorizing the merge ("my check passed, merge it"). Merged feature/claude-fable-5/adventurers-guild into main with a --no-ff merge commit. Push deferred to the human per their instruction; no release tag requested.
- Files changed: AGENT_CHANGELOG.md (this entry); merge of the adventurers-guild branch (see prior entry).
- Tests run: `npx vitest run` — 222 passed; `npx tsc --noEmit` — clean; `npm run build` — passed (as of the ready-for-review state).
- UI review: approved-by-human (2026-07-12)
- Blockers or coordination notes: main is merged locally but NOT pushed — the human will push manually. Do not push, re-tag, or amend main.

## 2026-07-12 - claude-fable-5 - feature/claude-fable-5/adventurers-guild

- Status: ready-for-review
- Summary: Made the Adventurer's Guild a first-class organization from the canonical lore file. New codex entry "The Adventurer's Guild" (the Guild, the coal & rank ladder, halls & the Ways, the Ash Compact, the Campfire), auto-linked in the biography like the Duhi Troupe. Player biography rank changed from "Bronze" to "Ember" (file ranks Spark→Ember→Flame→Hearth→Firekeeper) plus the fired-clay coal clause; added a visible guildRank field (Ember) shown in the Character sheet and Inventory panel. Added all 32 national Firekeepers as Inspector people at their capitals (role guild_firekeeper), and a Guild branch line on capital/named-city burg cards. Rewrote the starting courier quest's target from a generic placeholder to the nation's real Firekeeper (e.g. Sio Empire → Firekeeper Talaran, Shateria → Firekeeper Timholt); the sealed-letter item note follows automatically. Spawn now prefers a named great-city-hall town when the nation has one (else any non-capital town, which the Guild keeps a post in).
- Files changed: new src/lore/guild.ts (+ guild.test.ts); src/lore/codex.ts (+ codex.test.ts); src/player/backgrounds.ts (Ember + coal), types.ts (guildRank), character.ts (set Ember), spawn.ts (prefer city-hall towns), character.test.ts; src/data/inspect.ts (Firekeeper people); src/ui/Inspector.tsx (role label + guild branch line), CharacterBuilder.tsx + InventoryPanel.tsx (rank display); src/quests/startQuest.ts (+ startQuest.test.ts, real Firekeeper target); src/combat/fixtures.ts + src/player/travel.test.ts (guildRank field); AGENT_CHANGELOG.md.
- Tests run: `npx vitest run` — 222 passed (28 files; +8 across guild/codex/character/quest); `npx tsc --noEmit` — clean; `npm run build` — passed (pre-existing SDK/chunk warnings only).
- UI review: pending-human-test. Dev server hot-reloading this branch.
- Blockers or coordination notes: Headless browser smoke still blocked here (Chromium libs missing); logic covered by guild/codex/quest/character unit tests, visual check left to the human (Codex tab entry + biography link; Character sheet Ember; Inspecting a capital shows its Firekeeper; quest names the real Firekeeper). Branched from main a92fd05; shares codex-authored files (startQuest.ts, player/types+character, CharacterBuilder, fixtures, travel.test) — edits additive, quest structure and Quests tab unchanged. No merge to main without explicit human approval.

## 2026-07-12 15:26 CDT - codex - feature/codex/starting-quest

- Status: approved
- Summary: Human tested the starting quest, sealed guild letter inventory item, and Quests tab in the live UI and stated "everything is checked ok", explicitly requesting local merge and saying they will push manually.
- Files changed: AGENT_CHANGELOG.md
- Tests run: `npm test` — 214 passed; `npm run build` — passed as of the ready-for-review state.
- UI review: approved-by-human (2026-07-12)
- Blockers or coordination notes: Proceeding to commit feature branch and merge into main locally. Do not push; human will push manually.

## 2026-07-12 14:51 CDT - codex - feature/codex/starting-quest

- Status: ready-for-review
- Summary: Added a starting Adventurers' Guild courier quest for every new character and pregen: a named local guild head gives the player a sealed letter for the regional leader in the nation's capital, with explicit steps to deliver it, wait for the penned response, and return immediately. The sealed guild letter is now a weightless, non-sellable quest item in starting inventory, and a new Quests tab displays active quest details with a destination jump button.
- Files changed: AGENT_CHANGELOG.md, src/quests/types.ts, src/quests/startQuest.ts, src/quests/startQuest.test.ts, src/player/types.ts, src/player/character.ts, src/player/character.test.ts, src/player/travel.test.ts, src/combat/fixtures.ts, src/economy/catalog.ts, src/economy/catalog.test.ts, src/ui/App.tsx, src/ui/QuestPanel.tsx, src/ui/CharacterBuilder.tsx, src/ui/store.tsx, src/ui/styles.css
- Tests run: `npm test` — 214 passed; `npm run build` — passed (existing Anthropic SDK browser-externalization warnings and chunk-size warning only).
- UI review: pending-human-test
- Blockers or coordination notes: Dev server is running at http://localhost:5176/ for human UI review. Headless Playwright smoke could not run because Chromium is missing `libnspr4.so`; HTTP check returned 200 OK. Leaving untracked source-world files untouched.

## 2026-07-11 - claude-fable-5 - feature/claude-fable-5/item-weights

- Status: approved / merged
- Summary: Human tested item weights and the carry-capacity limit in the live UI (Load bar + per-item weight in the Inventory panel, weights + disabled over-capacity Buy in the shop, slower travel under load) and stated their check passed, explicitly authorizing the merge ("my check passed, merge it"). Merged feature/claude-fable-5/item-weights into main with a --no-ff merge commit. Push deferred to the human per their instruction; no release tag requested.
- Files changed: AGENT_CHANGELOG.md (this entry); merge of the item-weights branch (see prior entry).
- Tests run: `npx vitest run` — 211 passed; `npx tsc --noEmit` — clean; `npm run build` — passed (as of the ready-for-review state).
- UI review: approved-by-human (2026-07-11)
- Blockers or coordination notes: main is merged locally but NOT pushed — the human will push manually. Do not push, re-tag, or amend main.

## 2026-07-11 - claude-fable-5 - feature/claude-fable-5/item-weights

- Status: ready-for-review
- Summary: Give every item a weight and cap what a character can carry. Carry capacity = 15 × Strength (lb), a hard cap — buying is refused if it would overload you (no D&D graduated-encumbrance tiers). Coins (vosels) are weightless. Heavier loads slow overland travel continuously: no effect up to a ~50% load, then walking speed falls linearly to a 0.6× floor at the cap (boat travel unaffected). Combat out of scope (hard-cap model has no speed-penalty tier). Weights live on the catalog; the few non-shop starting items (clothing, spellbook) were added to the catalog at basePrice 0 so weight resolves for everything.
- Files changed: src/economy/catalog.ts (weight field + WEAPON_WEIGHT + clothing/spellbook entries + weightOf + DEFAULT_ITEM_WEIGHT), new src/economy/encumbrance.ts (carriedWeight, carryCapacity=15×STR, remainingCapacity, wouldExceedCapacity, loadRatio, travelSpeedFactor) + encumbrance.test.ts, src/economy/transaction.ts (buyItem capacity gate) + transaction.test.ts, src/player/travel.ts (non-boat mph × travelSpeedFactor + paceDetail "under load") + travel.test.ts, src/economy/catalog.test.ts (weights), src/ui/InventoryPanel.tsx (Load line + bar + per-item weight), src/ui/ShopScreen.tsx (weight column + disabled over-capacity Buy + load readout), src/ui/styles.css, AGENT_CHANGELOG.md.
- Tests run: `npx vitest run` — 211 passed (26 files; +9 new across catalog/encumbrance/transaction/travel); `npx tsc --noEmit` — clean; `npm run build` — passed (pre-existing SDK/chunk warnings only).
- UI review: pending-human-test. Dev server hot-reloading this branch at http://localhost:5175/.
- Blockers or coordination notes: Headless browser smoke still can't run here (Chromium system libs missing); logic covered by the economy/travel unit tests, visual check left to the human. Branched from main (includes merged shopping + codex Codex panel); travel.ts change is a single localized factor on existing mph — no store/App changes. No merge to main without explicit human approval.

## 2026-07-11 - claude-fable-5 - feature/claude-fable-5/shopping

- Status: approved / merged
- Summary: Human tested shopping in the live UI (settlement markets, buy/sell, item-quality gating by shop/city size, equip/AC, travelling-trader trade, and the follow-up that stocks food provisions at every vendor) and stated their check passed, explicitly authorizing the merge ("my check passed, merge it"). Merged feature/claude-fable-5/shopping into main with a --no-ff merge commit. Push deferred to the human per their instruction; no release tag requested.
- Files changed: AGENT_CHANGELOG.md (this entry); merge of the shopping branch (see prior entry).
- Tests run: `npx vitest run` — 202 passed; `npx tsc --noEmit` — clean; `npm run build` — passed (as of the ready-for-review state).
- UI review: approved-by-human (2026-07-11)
- Blockers or coordination notes: main is merged locally but NOT pushed — the human will push manually. Do not push, re-tag, or amend main.

## 2026-07-11 - claude-fable-5 - feature/claude-fable-5/shopping

- Status: ready-for-review
- Summary: Add shopping — buy and sell in settlements and from travelling traders on the road. Vendor type (trader / healer / craftsman / city shop) and settlement size gate the quality of the best items available, so the strongest healing potions, finest weapons, and best armor are only sold at the best shops in the biggest cities (city `shop` buildings reach masterwork; village traders are common-only). Item grades are mechanically real: greater/superior potions heal more (2d4+2 → 4d4+4 → 8d4+8), finer weapons hit harder (+1/+2 to-hit & damage), armor raises AC (new armor/AC model: worn AC = acBase + min(Dex, dexCap)), gear is tiered. Full-screen Shop overlay; simple seeded storefront (sell 40%, unlimited vendor coin, deterministic stock that restocks on revisit). Settlement entry via a "Visit market" button in the Inventory panel; road entry via a "Trade with them" button on merchant/traveller encounters (journey resumes after trading). Equip/unequip in the Inventory panel recomputes AC and the combat weapon.
- Files changed: new src/economy/{catalog,money,shops,transaction}.ts (+ catalog/shops/transaction .test.ts), src/ui/ShopScreen.tsx; src/combat/kits.ts (equipped weapon + potion stack), src/combat/{types,engine}.ts (PotionCharge/potionStack, tiered potion heal + potionsRemainingById), src/combat/kits.test.ts (weapon-grade + potion-stack tests); src/ui/store.tsx (screen 'shop' + shop slice + openShop/openTravelShop/switchVendor/buyItem/sellItem/equipItem/unequipItem/closeShop + settlementVendorsAt + per-id potion write-back), src/ui/store.test.ts (shopping suite), src/ui/{App,InventoryPanel,EncounterModal}.tsx, src/ui/styles.css, AGENT_CHANGELOG.md.
- Tests run: `npx vitest run` — 201 passed (25 files; +27 new across catalog/shops/transaction/kits/store); `npx tsc --noEmit` — clean; `npm run build` — passed (pre-existing Anthropic-SDK node:fs externalization + chunk-size warnings only).
- UI review: pending-human-test. Dev server hot-reloading this branch at http://localhost:5175/.
- Blockers or coordination notes: Headless browser smoke could NOT run here — the Playwright Chromium binary is missing system libs (libnspr4/libnss3/libasound) and won't launch without a root package install, which I did not perform. Logic is covered instead by the store/economy integration tests, which drive the real reducer against real world data through openShop → buy → sell → equip → closeShop and openTravelShop (quality-ceiling gating asserted). Visual/interaction check is left to the human UI test. Branched from main 86af03b (includes codex's Codex panel); shared store/App/styles touch-points added additively (does not disturb the codex tab or selectedCodexId). No merge to main without explicit human approval.

## 2026-07-11 13:22 CDT - codex - feature/codex/codex-panel

- Status: started
- Summary: Add an in-game Codex panel with the Duhi Troupe as the first entry, plus biography hyperlinks that open the relevant codex entry.
- Files changed: AGENT_CHANGELOG.md
- Tests run: (none yet)
- UI review: pending-human-test
- Blockers or coordination notes: Working on a dedicated branch per workflow. Leaving untracked source-world files untouched.

## 2026-07-11 13:27 CDT - codex - feature/codex/codex-panel

- Status: ready-for-review
- Summary: Added a Codex tab and entry registry with The Duhi Troupe as the first entry. Character biography text now tokenizes known codex aliases and renders Duhi references as inline links that open the Codex panel on the matching entry.
- Files changed: AGENT_CHANGELOG.md, src/lore/codex.ts, src/lore/codex.test.ts, src/ui/CodexPanel.tsx, src/ui/App.tsx, src/ui/CharacterBuilder.tsx, src/ui/store.tsx, src/ui/store.test.ts, src/ui/styles.css
- Tests run: `npx vitest run src/lore/codex.test.ts src/ui/store.test.ts` — 10 tests passed; `npm run build` — passed (with existing Anthropic SDK browser externalization warnings and chunk-size warning); `npm test` — 174 tests passed.
- UI review: pending-human-test
- Blockers or coordination notes: Codex UI and biography link behavior require human UI review before merge. Dev server started at http://localhost:5176/.

## 2026-07-11 13:30 CDT - codex - feature/codex/codex-panel

- Status: approved
- Summary: Human approver tested the Codex UI and stated "everything is checked ok", explicitly requesting local merge and saying they will push manually.
- Files changed: AGENT_CHANGELOG.md
- Tests run: `npx vitest run src/lore/codex.test.ts src/ui/store.test.ts` — 10 tests passed as of previous entry; `npm run build` — passed as of previous entry; `npm test` — 174 tests passed as of previous entry.
- UI review: approved-by-human (2026-07-11)
- Blockers or coordination notes: Proceeding to commit feature branch and merge into main locally. Do not push; human will push manually.

## 2026-07-11 - claude-fable-5 - feature/claude-fable-5/unified-biography

- Status: approved / merged
- Summary: Human tested the unified biography in the live UI (gender selector, per-character name/class/city/pronoun substitution, non-capital city start, pregens) and stated their check is finished, explicitly authorizing the merge ("merge and I will push manually afterwards"). Merged feature/claude-fable-5/unified-biography into main with a --no-ff merge commit. Push deferred to the human per their instruction; no release tag requested.
- Files changed: AGENT_CHANGELOG.md (this entry); merge of the unified-biography branch (see prior entry).
- Tests run: `npx vitest run` — 170 passed; `npx tsc --noEmit` — clean; `npm run build` — passed (as of the ready-for-review state).
- UI review: approved-by-human (2026-07-11)
- Blockers or coordination notes: main is merged locally but NOT pushed — the human will push manually. Do not push, re-tag, or amend main.

## 2026-07-11 - claude-fable-5 - feature/claude-fable-5/unified-biography

- Status: ready-for-review
- Summary: Give every player character (custom and pregenerated) the same canonical "Duhi Troupe washout" biography, filled with the character's name, class, gender pronouns (binary he/she), and starting city. The starting location is now a non-capital city in the character's nation (deterministic per character, larger towns preferred), whose name is referenced verbatim in the biography ("cast out into the streets of [City]"). Collapsed the six-way backstory system to one canonical entry (`duhi_washout`, "Duhi Troupe Washout") with a single shared minor bonus; added a binary `gender: 'male' | 'female'` field driving pronoun substitution (he/him/his ↔ she/her/her) via a `fillBiography` templater; removed the backstory picker and added a gender selector in the builder. Plan approved by human ("proceed as written").
- Files changed: src/player/types.ts (BackstoryId → single literal, Gender/PRONOUNS/PronounSet, gender on CharacterBuildInput + PlayerCharacter, removed SpawnPreference/backstoryId-input), src/player/backgrounds.ts (rewritten: DUHI_BIOGRAPHY_TEMPLATE, DUHI_WASHOUT, getBackstory, fillBiography), src/player/spawn.ts (chooseStartingLocation picks non-capital burg, city name → placeName; 4-arg signature), src/player/character.ts (fills biography, threads gender), src/player/pregens.ts (each pregen gets gender, backstoryId removed), src/combat/fixtures.ts (gender + duhi_washout), src/ui/CharacterBuilder.tsx (gender select, Biography paragraphs, removed backstory dropdown), src/player/character.test.ts + src/player/travel.test.ts (fixtures + new city-start/pronoun assertions), AGENT_CHANGELOG.md.
- Tests run: `npx vitest run` — 170 passed (21 files, incl. new non-capital-city-start and male/female pronoun-substitution assertions); `npx tsc --noEmit` — clean; `npm run build` — passed. Headless render check: both male and female biographies substitute name/class/city/pronouns correctly and read naturally, no stray "they".
- UI review: pending-human-test
- Blockers or coordination notes: Touches the codex-authored player module (character/spawn/backgrounds/pregens) — a content/design change, not a mechanics rewrite. No merge to main without explicit human approval.

## 2026-07-10 - claude-fable-5 - feature/claude-fable-5/travel-encounters

- Status: approved / merged
- Summary: Human approver tested the travel-encounter system in the live UI (including the review follow-ups: context-aware post-combat overlay, the "show math" danger breakdown, and the remaining-journey readout on both the combat end screen and the peaceful encounter modal) and stated their check is finished, explicitly authorizing the merge into main ("merge and I will push manually afterwards"). Merged feature/claude-fable-5/travel-encounters into main with a --no-ff merge commit. Push deferred to the human per their instruction; no release tag requested.
- Files changed: AGENT_CHANGELOG.md (this entry); merge of the travel-encounters branch (encounter model + store/UI integration, see prior entries).
- Tests run: `npx vitest run` — 169 passed; `npx tsc --noEmit` — clean; `npm run build` — passed (as of the ready-for-review state). Headless smokes green.
- UI review: approved-by-human (2026-07-10)
- Blockers or coordination notes: main is merged locally but NOT pushed — the human will push manually. Do not push, re-tag, or amend main.

## 2026-07-10 - claude-fable-5 - feature/claude-fable-5/travel-encounters

- Status: ready-for-review
- Summary: Travel encounters — a two-question Poisson hazard model on the existing travel system. Question 1 (λ, frequency) reads only actor-density inputs; Question 2 (P(hostile|encounter)) reads only disposition inputs; the split is enforced structurally by disjoint context types, so player reputation can never change λ and biome can never change hostility. λ = base(biome habitability) × road × remoteness(pop/burg) × time × marker × war (with a decaying post-war tail) × season × weather × visibility, clamped to 4× base; P = 1−e^(−λ·Δt) with a bounded pity-timer to smooth Poisson streaks. Actor tables (markers pin the type, bandits favour roads, night thins human traffic) map to combat statblocks. A leg is walked as ~hourly waypoints; the first hit interrupts travel — hostile actors open the combat screen, peaceful ones open a choice modal (continue / attack / make camp) — then travel resumes on the remainder (multiple encounters per trip fall out naturally). The TravelPanel shows a pre-departure danger read (chance + dominant driver).
- Files changed: src/travel/encounter/{types,rate,disposition,tables,pacing,run}.ts + 5 test files; src/ui/store.tsx (pacing + pendingEncounter slice, encounter-aware travel/resume/attack/dismiss actions), src/ui/EncounterModal.tsx (new), src/ui/App.tsx (encounter screen + resume banner), src/ui/TravelPanel.tsx (danger read), src/ui/store.test.ts (encounter-aware travel + resume), src/ui/styles.css, AGENT_CHANGELOG.md.
- Tests run: `npx vitest run` — 167 passed (21 files, +42 new travel-encounter tests incl. the split invariants, clamp ceiling, war/post-war, marker override, determinism, resume-to-completion); `npx tsc --noEmit` — clean; `npm run build` — passed. Headless Playwright smoke: danger read renders ("DANGEROUS 62% chance — war"), travel fires encounters, peaceful modal + resume flow reach the destination, zero console errors.
- UI review: pending-human-test
- Blockers or coordination notes: Builds on codex's travel system (reads planTravel output, wraps the store `travel` action; no change to pathfinding). Pure model in src/travel/encounter/ mirrors src/combat. Tuning note: in a max-danger (deadly) zone, hits cluster early in each leg so progress per resume is small — intended but tunable (rate constants + interception point). No merge to main without explicit human approval.

## 2026-07-10 13:30 CDT - codex - feature/codex/player-travel

- Status: started
- Summary: Add player travel system with nearby destinations, road/off-road options, day-only travel, biome travel difficulty, and provisions consumption warnings.
- Files changed: (none yet)
- Tests run: (none yet)
- UI review: pending-human-test
- Blockers or coordination notes: Working on branch per workflow; leaving untracked source world files untouched.

## 2026-07-10 13:35 CDT - codex - feature/codex/player-travel

- Status: ready-for-review
- Summary: Implemented player travel: nearby land destinations from current player location, road/trail availability detection, off-road biome difficulty sampling, day-only elapsed-time handling, provisions requirement/warning, and travel commit that advances time, moves player, consumes provisions, selects/jumps to destination, and preserves day-event firing.
- Files changed: AGENT_CHANGELOG.md, src/player/travel.ts, src/player/travel.test.ts, src/ui/TravelPanel.tsx, src/ui/App.tsx, src/ui/store.tsx, src/ui/store.test.ts, src/ui/styles.css
- Tests run: `npx vitest run src/player/travel.test.ts src/ui/store.test.ts` — 10 tests passed; `npm run build` — passed (with existing Anthropic SDK browser externalization warnings); `npm test` — 118 tests passed.
- UI review: pending-human-test
- Blockers or coordination notes: New Travel panel changes visible UI and gameplay flow, so human UI review is required before merge under repository instructions.

## 2026-07-10 14:38 CDT - codex - feature/codex/player-travel

- Status: ready-for-review
- Summary: Follow-up travel fixes: destination search now expands radius to return at least two reachable options when possible, land travel only offers destinations on the same land feature, unreachable island/over-water destinations are hidden, and port-to-port boat travel is offered when the player starts at or near a port.
- Files changed: src/player/travel.ts, src/player/travel.test.ts, src/ui/TravelPanel.tsx, src/ui/store.test.ts, AGENT_CHANGELOG.md
- Tests run: `npx vitest run src/player/travel.test.ts src/ui/store.test.ts` — 12 tests passed; `npm run build` — passed (with existing Anthropic SDK browser externalization warnings); `npm test` — 120 tests passed.
- UI review: pending-human-test
- Blockers or coordination notes: Travel UI behavior changed; human UI review remains required before merge.

## 2026-07-10 15:03 CDT - codex - feature/codex/player-travel

- Status: ready-for-review
- Summary: Filtered travel destinations down to true point destinations only. Named geography/features such as mountain ranges and biome regions remain available to the inspector, but no longer appear as valid travel targets.
- Files changed: src/player/travel.ts, src/player/travel.test.ts, AGENT_CHANGELOG.md
- Tests run: `npx vitest run src/player/travel.test.ts src/ui/store.test.ts` — 13 tests passed; `npm run build` — passed (with existing Anthropic SDK browser externalization warnings); `npm test` — 121 tests passed.
- UI review: pending-human-test
- Blockers or coordination notes: Travel destination list changed; human UI review remains required before merge.

## 2026-07-10 15:28 CDT - codex - feature/codex/player-travel

- Status: ready-for-review
- Summary: Port-city travel now reserves a separate broader boat-destination pool. When the player is at or near a port, up to eight boat-only ports within 900 miles are listed in addition to normal nearby land destinations, preventing local land points from crowding out close island ports such as Oladar from Domasalyesi.
- Files changed: src/player/travel.ts, src/player/travel.test.ts, AGENT_CHANGELOG.md
- Tests run: `npx vitest run src/player/travel.test.ts src/ui/store.test.ts` — 15 tests passed; `npm run build` — passed (with existing Anthropic SDK browser externalization warnings); `npm test` — 123 tests passed.
- UI review: pending-human-test
- Blockers or coordination notes: Travel destination list changed for port locations; human UI review remains required before merge.

## 2026-07-10 15:35 CDT - codex - feature/codex/player-travel

- Status: ready-for-review
- Summary: Boat travel now uses continuous crewed sailing time instead of daylight-only walking time, and the route summary labels distance, active hours, and pace by travel mode. Sea routes show sailing hours and boat passage pace; roads, trails, and off-road travel retain their own pace references.
- Files changed: src/player/travel.ts, src/player/travel.test.ts, src/ui/TravelPanel.tsx, AGENT_CHANGELOG.md
- Tests run: `npx vitest run src/player/travel.test.ts src/ui/store.test.ts` — 16 tests passed; `npm run build` — passed (with existing Anthropic SDK browser externalization warnings); `npm test` — 124 tests passed.
- UI review: pending-human-test
- Blockers or coordination notes: Travel route summary changed visibly; human UI review remains required before merge.

## 2026-07-10 15:41 CDT - codex - feature/codex/player-travel

- Status: approved
- Summary: Human approver tested the player travel UI and stated "everything is checked ok", explicitly requesting local merge and saying they will push manually.
- Files changed: AGENT_CHANGELOG.md
- Tests run: `npx vitest run src/player/travel.test.ts src/ui/store.test.ts` — 16 tests passed as of previous entry; `npm run build` — passed as of previous entry; `npm test` — 124 tests passed as of previous entry.
- UI review: approved-by-human (2026-07-10)
- Blockers or coordination notes: Proceeding to commit feature branch and merge into main locally. Do not push; human will push manually.

## 2026-07-10 11:52 CDT - codex - feature/codex/player-reputations

- Status: started
- Summary: Add player reputation ledgers with all cultures and religions initialized neutral at game start.
- Files changed: (none yet)
- Tests run: (none yet)
- UI review: pending-human-test
- Blockers or coordination notes: Working on branch per workflow; leaving untracked source world files untouched.

## 2026-07-10 11:53 CDT - codex - feature/codex/player-reputations

- Status: ready-for-review
- Summary: Player characters now include culture and religion reputation ledgers initialized from loaded world data. Every culture and religion starts at score 0 / Neutral, and pregenerated characters receive the same neutral ledgers through the shared character build path. Character sheet shows compact reputation counts and origin/faith examples.
- Files changed: AGENT_CHANGELOG.md, src/player/types.ts, src/player/reputation.ts, src/player/character.ts, src/player/character.test.ts, src/ui/CharacterBuilder.tsx, src/combat/fixtures.ts
- Tests run: `npx vitest run src/player/character.test.ts` — 9 tests passed; `npm run build` — passed (with existing Anthropic SDK browser externalization warnings); `npm test` — 112 tests passed.
- UI review: pending-human-test
- Blockers or coordination notes: Character sheet display changed, so human UI review is required before merge under repository instructions.

## 2026-07-10 12:12 CDT - codex - feature/codex/player-reputations

- Status: approved
- Summary: Human approver tested the player reputation display and stated "everything is checked ok", explicitly requesting local merge and saying they will push manually.
- Files changed: AGENT_CHANGELOG.md
- Tests run: `npx vitest run src/player/character.test.ts` — 9 tests passed as of previous entry; `npm run build` — passed as of previous entry; `npm test` — 112 tests passed as of previous entry.
- UI review: approved-by-human (2026-07-10)
- Blockers or coordination notes: Proceeding to commit feature branch and merge into main locally. Do not push; human will push manually.

## 2026-07-09 22:25 CDT - codex - feature/codex/game-clock

- Status: started
- Summary: Add 24-hour clock support to game time so later mechanics can operate below day granularity.
- Files changed: (none yet)
- Tests run: (none yet)
- UI review: pending-human-test
- Blockers or coordination notes: Working on branch per workflow; leaving untracked source world files untouched. Main includes the combat-screen merge, so clock work must preserve combat scene integration.

## 2026-07-09 22:29 CDT - codex - feature/codex/game-clock

- Status: ready-for-review
- Summary: Implemented 24-hour game clock: calendar minute utilities and formatting, reducer minute-based advancement with day-event firing only on crossed day ordinals, updated time controls with hour/rest/day/week/month/year advances, and combat scenes now use actual game clock when combat starts.
- Files changed: AGENT_CHANGELOG.md, src/sim/calendar.ts, src/sim/calendar.test.ts, src/ui/store.tsx, src/ui/store.test.ts, src/ui/TimeControls.tsx, src/ui/styles.css, src/combat/scene.ts, src/combat/scene.test.ts
- Tests run: `npx vitest run src/sim/calendar.test.ts src/ui/store.test.ts src/combat/scene.test.ts` — 16 tests passed; `npm run build` — passed (with existing Anthropic SDK browser externalization warnings); `npm test` — 110 tests passed.
- UI review: pending-human-test
- Blockers or coordination notes: Time controls changed visibly, so human UI review is required before merge under repository instructions.

## 2026-07-09 22:51 CDT - codex - feature/codex/game-clock

- Status: approved
- Summary: Human approver tested the 24-hour clock UI and stated "everything is checked ok", explicitly requesting local merge and saying they will push manually.
- Files changed: AGENT_CHANGELOG.md
- Tests run: `npx vitest run src/sim/calendar.test.ts src/ui/store.test.ts src/combat/scene.test.ts` — 16 tests passed as of previous entry; `npm run build` — passed as of previous entry; `npm test` — 110 tests passed as of previous entry.
- UI review: approved-by-human (2026-07-09)
- Blockers or coordination notes: Proceeding to commit feature branch and merge into main locally. Do not push; human will push manually.

## 2026-07-09 - claude-fable-5 - feature/claude-fable-5/combat-screen

- Status: approved / merged
- Summary: Human approver tested the combat milestone in the live UI and stated their check is finished, explicitly authorizing the merge into main ("merge and I will push manually afterwards"). Merged feature/claude-fable-5/combat-screen into main with a --no-ff merge commit. Push deferred to the human per their instruction; no release tag requested.
- Files changed: AGENT_CHANGELOG.md (this entry); merge of the combat branch (combat engine + narrator + full UI, see prior entries).
- Tests run: `npx vitest run` — 103 passed; `npx tsc --noEmit` — clean; `npm run build` — passed (all as of the ready-for-review entry).
- UI review: approved-by-human (2026-07-09)
- Blockers or coordination notes: main is merged locally but NOT pushed — the human will push manually. Do not push, re-tag, or amend main.

## 2026-07-09 - claude-fable-5 - feature/claude-fable-5/combat-screen

- Status: ready-for-review
- Summary: Combat milestone complete. Dedicated full-screen D&D 2024 combat with click-to-roll dice and full calculation breakdowns for every roll (player and enemy), initiative-ordered turns, deterministic seeded resolution, damage→injury severity with a per-combatant injury ledger (named wounds referenced on healing and in the aftermath), exhaustion tiers, morale checks, escape as an opposed check with the exact success % shown before committing, in-combat healing-potion use (persisted to inventory), and per-class signature kits (Second Wind, Rage, Feint+Sneak Attack, Martial Arts, cantrips, Cure Wounds / Lay on Hands). Scene integrates biome, weather, temperature, wind, time of day, and season from the world sim. Narration is streamed from Claude Haiku 4.5 (one conversation per battle, style = mature/visceral/grounded; scene sheet + combatant sheets + per-beat structured facts incl. injury ledgers) with a plain factual narrator fallback when no API key is set or the API errors — combat never blocks on the network. Battle test auto-starts on character creation; a "⚔ Test battle" button re-enters from the Character tab. No permadeath: defeat ends with an aftermath scene plus Replay / opponent picker (grouped easy/fair/hard) / Return to map.
- Files changed: package.json + package-lock.json (+@anthropic-ai/sdk, +@types/node), tsconfig.json (lib ES2023, types +node), src/combat/{types,dice,weapons,kits,monsters,scene,engine,fixtures}.ts, src/combat/narrator/{types,plain,prompt,claude}.ts, src/combat/{dice,kits,engine,scene}.test.ts + src/combat/narrator/narrator.test.ts, src/ui/{store.tsx,App.tsx,CharacterBuilder.tsx,CombatScreen.tsx,ApiKeyBar.tsx,combatLog.ts,combatLog.test.ts,styles.css}.
- Tests run: `npx vitest run` — 103 tests passed (14 files); `npx tsc --noEmit` — clean; `npm run build` — passed. Headless Playwright smoke (plain narrator, no key): world map renders, time advances (1 Jan → 1 Apr 1181), feed populates (6 items), map click opens inspector; character creation auto-starts combat; scene header renders; initiative + attacks resolve with full calc lines and streamed prose; potion use decrements and tends named wounds; escape % displayed; defeat overlay reached ("You have fallen") with the 10-opponent picker; zero console errors.
- UI review: pending-human-test
- Blockers or coordination notes: Live LLM narration needs a human test with a real Anthropic key pasted into the in-combat settings bar (key stored in localStorage only; cost is pennies) — the mocked narrator tests cover prompt assembly and fallback-on-error. Builds on codex's src/player module (read-only). No merge to main without explicit human approval per workflow.

## 2026-07-09 - claude-fable-5 - feature/claude-fable-5/combat-screen (start)

- Status: started
- Summary: Combat milestone — dedicated full-screen D&D 2024 combat: click-to-roll dice with full calculation display, initiative-ordered turns, injury/exhaustion tracking, escape with shown odds, in-combat potion use, biome/weather/time-of-day scene integration, LLM narration via Claude Haiku 4.5 (plain factual fallback without API key), battle test on character creation, no permadeath (replay + opponent picker). Plan approved by human.
- Files changed: package.json (+@anthropic-ai/sdk)
- Tests run: (none yet)
- UI review: pending-human-test
- Blockers or coordination notes: builds on codex's src/player module (read-only usage); combat code lives in new src/combat/ to minimize overlap.

## 2026-07-08 22:06 CDT - codex - feature/codex/starting-inventory-kit

- Status: started
- Summary: Add richer starting inventory for all player starts, including pregenerated characters: proficient weapon, healing potions, provisions, vosels, and wizard spellbook.
- Files changed: (none yet)
- Tests run: (none yet)
- UI review: pending-human-test
- Blockers or coordination notes: Working on branch per workflow; leaving untracked source world files untouched.

## 2026-07-08 22:08 CDT - codex - feature/codex/starting-inventory-kit

- Status: ready-for-review
- Summary: Starting inventory now includes climate clothing, one class-proficient weapon, 2 healing potions, 5 days of food provisions, 118 vosels, and a wizard-only spellbook. Pregenerated characters use the same build path and tests assert they receive the appropriate items.
- Files changed: AGENT_CHANGELOG.md, src/player/rules2024.ts, src/player/character.ts, src/player/types.ts, src/player/character.test.ts, src/ui/CharacterBuilder.tsx, src/ui/InventoryPanel.tsx
- Tests run: `npx vitest run src/player/character.test.ts` — 7 tests passed; `npm run build` — passed; `npm test` — 51 tests passed.
- UI review: pending-human-test
- Blockers or coordination notes: Inventory display text changed, so human UI review remains required before merge under repository instructions.

## 2026-07-08 22:17 CDT - codex - feature/codex/starting-inventory-kit

- Status: approved
- Summary: Human approver tested the starting inventory changes and stated "everything is checked ok", explicitly requesting merge and push.
- Files changed: AGENT_CHANGELOG.md
- Tests run: `npx vitest run src/player/character.test.ts` — 7 tests passed as of previous entry; `npm run build` — passed as of previous entry; `npm test` — 51 tests passed as of previous entry.
- UI review: approved-by-human (2026-07-08)
- Blockers or coordination notes: Proceeding to commit feature branch, merge into main, and push main per human approval. No release tag requested.

## 2026-07-08 22:18 CDT - codex - main

- Status: blocked
- Summary: Starting inventory kit branch committed and merged into main locally with merge commit `566fedf` after human approval.
- Files changed: AGENT_CHANGELOG.md
- Tests run: `npx vitest run src/player/character.test.ts` — 7 tests passed as of previous entry; `npm run build` — passed as of previous entry; `npm test` — 51 tests passed as of previous entry.
- UI review: approved-by-human (2026-07-08)
- Blockers or coordination notes: `git push origin main` failed because SSH authentication is unavailable in this environment: `Permission denied (publickey)`. Local `main` is ahead of `origin/main`; push requires a valid GitHub SSH key/agent or alternate authenticated remote.

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

## 2026-07-05 22:42 CDT - codex - main

- Status: blocked
- Summary: Feature branch committed and merged into main locally with merge commit `eee7de0` after human approval.
- Files changed: AGENT_CHANGELOG.md
- Tests run: `npm test` — 49 tests passed as of previous entry; `npm run build` — passed as of previous entry.
- UI review: approved-by-human (2026-07-05)
- Blockers or coordination notes: `git push origin main` failed because SSH authentication is unavailable in this environment: `Permission denied (publickey)`. Local `main` is ahead of `origin/main`; push requires a valid GitHub SSH key/agent or alternate authenticated remote.

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
