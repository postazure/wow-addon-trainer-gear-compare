# CLAUDE.md

Trainer Compare: a WoW Forever addon. At a profession trainer it shows how a
recipe's gear compares to what the player wears. TypeScript, compiled to one
Lua 5.1 file by TypeScriptToLua (TSTL). Layout and details: `README.md`.

## Commands

- `npm test`: build, then run both mock-client suites. Run before every commit.
- `npm run typecheck`: types only.
- `npm run package`: test, then `release/TrainerCompare-<version>.zip`.
- Releases follow `docs/CURSEFORGE.md` (testing and assets checklists).

## Releases

- A release is a `v<version>` tag on `main` (no release branch). The owner
  pushes the tag; never create or push release tags yourself unless asked.
- The tag must match `package.json`, and `CHANGELOG.md` needs a
  `## <version>` section written for players. `scripts/check-release.mjs`
  enforces both before anything is published.
- `.github/workflows/release.yml`: build and test, Claude-written notes
  (`scripts/release-notes.mjs`, falls back to the CHANGELOG section and must
  never fail the release), then the GitHub release.
- `.github/workflows/curseforge.yml` is separate on purpose: it reads the zip
  and notes from the GitHub release, can be re-run by hand for any tag, and
  skips (not fails) while `CURSEFORGE_TOKEN` / `CURSEFORGE_PROJECT_ID` are
  unset.
- Lint workflow changes with `actionlint` before pushing.

## How we work

- Commit straight to `main` and push after each change. No PRs, no feature
  branches.
- The owner tests in game; I can't. Every summary says what was tested here
  (mock client) and what still needs an in-game check. Never say something
  works in game until the owner confirms it.
- Don't claim compatibility with other addons (ForeverGear, GearSetImprover
  and so on) in docs or descriptions until it has been tested.
- Plain English, short sentences, in docs, commits and replies.
- The version lives only in `package.json`.
- Display name is "Trainer Compare"; code, folder and file names are
  `TrainerCompare` (no space). Slash command `/tc`. The old name
  (TrainerUpgrades) must not appear anywhere.

## Product rules (decided with the owner; don't undo without asking)

- **Facts only.** Never say "upgrade" to the player. Show item level vs
  equipped and stat changes; the player decides.
- **No marks on recipe rows.** The only row change is fading.
- **Filter = "Only show usable gear".** It fades (never hides or removes)
  gear the player can't use. Non-gear and loading rows are never faded.
- The filter toggle lives in the trainer's Settings dropdown via
  `Menu.ModifyMenu("MENU_TRAINER_FILTER", ...)`: just the checkbox, no header,
  no divider. The "Usable" checkbox by the Train button is only a fallback
  for clients without the Menu API.
- **Compare:** use Blizzard's native compare first
  (`TooltipComparisonManager`), fall back to filling `ShoppingTooltip1/2`.
  Equipped item on the **left**, recipe on the right. Show it for gear the
  player can't use, too. The "Currently Equipped" header must have text.
- **Tooltip lines are always on** (no setting): "Item level X vs Y (slot)",
  then the built-in "If you replace this item..." heading and one stat per
  line. The number is green or red; the stat name is white.
- No "can't use" line: the item's own red text already says it.
- The stat-weight score line shows only if the player picks `/tc scoring statWeights`.

## Don't assume the WoW API

WoW Forever is Classic data on a modern, retail-style engine. Classic and
retail docs are both wrong in places. What we learned (more in README
"Probe findings"):

- `GetTrainerServiceInfo` returns name, **type**, icon, ?, "", category
  (Classic puts the type 3rd).
- `GetTrainerServiceItemLink` gives the crafted item. Only `C_Item.*` item
  functions exist; `GetItemInfo` and friends are gone.
- No skill-line API. Proficiency is checked with `IsPlayerSpell` and Classic
  spell ids, with a Cloth canary: if `IsPlayerSpell(Cloth)` is false, skip
  the check instead of hiding everything.
- The trainer list is a ScrollBox. The trainer tooltip is a **spell**
  tooltip with the item embedded, so item-tooltip hooks and the built-in
  compare never fire for it.

Rules:

- Before using an API that hasn't been confirmed, find out first: extend the
  probe (`probe/`) or `/tc menus`, and ask the owner to run it. Build from
  what the client returns.
- WoW chat text can't be selected. Any diagnostic must end in a copy window
  (see `src/copyWindow.ts`) so the owner can paste the result.
- Feature-detect everything that isn't confirmed. In `types/wow-forever.d.ts`,
  type unconfirmed APIs as possibly `undefined`, and note the source of each.
- Keep `types/wow-forever.d.ts` to what the code uses. There are no
  maintained TypeScript types for Classic-based clients.

## TSTL gotchas (each one bit us)

- TSTL 1.37 needs **TypeScript 6.0.2** exactly. Don't upgrade to TS 7.
- **Call style.** Methods in an interface or object type compile to colon
  calls (`obj:Method()`). Plain library functions (`C_Timer.After`,
  `C_Item.*`, `Menu.ModifyMenu`) must be declared in a `namespace` or with
  `this: void`, or they compile to `C_Timer:After(...)` and fail silently.
  After touching declarations, grep the built Lua for wrong colon calls.
- **Truthiness.** In Lua, `0` and `""` are true. Never use `||` or `if (x)`
  on numbers or strings; compare explicitly. Treat every TSTL "Only false and
  nil evaluate to false" warning as a bug.
- **Comments.** TSTL drops `//` comments. Only `/** */` directly above a
  declaration reaches the Lua. Put explanations there, and put names into
  data instead of trailing comments, so the shipped Lua stays readable.
- No circular imports between modules (the bundle's `require` can't handle them).
- `luaLibImport: require-minimal` keeps the bundle small; the build fails if
  the output isn't valid Lua 5.1.

## Taint and safety

- Only post-hooks (`hooksecurefunc`, `HookScript`) and Blizzard-supported
  callbacks (`Menu.ModifyMenu`, `ScrollUtil`). Never replace Blizzard
  functions or edit Blizzard data (ScrollBox data providers included).
- Never write fields onto Blizzard frames; keep our own tables keyed by frame.
- Only hide tooltips we showed. Never hide a compare Blizzard showed itself.
- Every event, hook and slash handler runs inside `safe()`: errors stay
  silent unless `/tc debug` is on. No Lua errors in chat, ever.

## Testing

- `test/wow-mock.lua` is a mock client seeded with real probe values. Two
  suites run in fresh Lua states: `test/trainer.test.lua` (the client as
  probed) and `test/fallback.test.lua` (no Menu API, no native compare).
  Shared setup is in `test/fixtures.lua`.
- New behavior gets checks in the suite(s) it affects. When a check is new,
  prove it can fail (flip it once) before trusting it.
- The main suite runs with debug on and fails on any hidden "failed" line, so
  a silently caught error is still caught.
- When a test fails, decide whether the code or the test is wrong before
  changing either.
