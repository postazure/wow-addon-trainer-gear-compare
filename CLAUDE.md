# CLAUDE.md

Trainer Compare: a WoW Forever addon. At a profession trainer it shows how a
recipe's gear compares to what the player wears. TypeScript, compiled to one
Lua 5.1 file by TypeScriptToLua (TSTL). Layout and details:
`docs/DEVELOPMENT.md`; behavior: `docs/HOW-IT-WORKS.md`.

## Commands

- `npm test`: build, then run both mock-client suites and the release-script
  tests. Run before every commit.
- `npm run typecheck`: types only.
- `npm run package`: test, then `release/TrainerCompare-<version>.zip`.
- Releases follow `docs/CURSEFORGE.md` (testing and assets checklists).

## Releases

- A release is an annotated `v<version>` tag on `main`, made with the
  release skill (`/release`, `.claude/skills/release/`). The version bump
  and changelog go through a release PR like any change; the tag goes on
  `main` after it merges. Only make a release tag through that skill, and
  push it only when the owner says yes.
- The tag's message is the release notes. No AI runs in the workflows: they
  publish the tag's notes as they are (`scripts/tag-notes.mjs`).
- Tag with `git tag -a -F <file> --cleanup=verbatim`. Without it, git drops
  lines starting with `#`, so Markdown headings vanish.
- `actions/checkout` keeps only the commit, not the tag's message. The
  workflow fetches the tag again before reading it.
- The tag must match `package.json`, and `CHANGELOG.md` needs a
  `## <version>` section written for players. `scripts/check-release.mjs`
  checks all three before anything is published.
- `.github/workflows/release.yml`: check, build and test, then the GitHub
  release with the tag's notes.
- `.github/workflows/curseforge.yml` is separate on purpose: it reads the zip
  and notes from the GitHub release, can be re-run by hand for any tag, and
  skips (not fails) while `CURSEFORGE_TOKEN` / `CURSEFORGE_PROJECT_ID` are
  unset.
- Lint workflow changes with `actionlint` before pushing.

## How we work

- Every change goes through a pull request to `main`. Work on a branch,
  push it, and open the PR. The owner reviews and merges. Never push to
  `main` directly. The Test workflow runs `npm test` on every PR; it must
  be green before merging.
- The owner tests in game; I can't. Every summary says what was tested here
  (mock client) and what still needs an in-game check. Never say something
  works in game until the owner confirms it.
- Don't claim compatibility with other addons (ForeverGear, GearSetImprover
  and so on) in docs or descriptions until it has been tested.
- Plain English, short sentences, in docs, commits and replies.
- The version lives only in `package.json`.
- If a commit changes something a player can notice, add a line under
  `## Unreleased` in `CHANGELOG.md` in the same commit. Write it for players,
  with the same rules as release notes. Skip internal changes (refactors,
  tests, docs, CI).
- Display name is "Trainer Compare"; code, folder and file names are
  `TrainerCompare` (no space). The old name
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
  player can't use, too. The header must have text: "Equipped" (the longer
  "Currently Equipped" overflowed it in game).
- **Tooltip lines are always on** (no setting): "Item level X vs Y (slot)",
  then the built-in "If you replace this item..." heading and one stat per
  line. The number is green or red; the stat name is white.
- No "can't use" line: the item's own red text already says it.
- **Prices, for any crafted item** (always on): cost to learn, auction house
  price and age, reagent cost, profit, vendor price. Auction, reagent and
  profit lines need Auctionator. Reagents come from
  `C_TradeSkillUI.GetRecipeSchematic`; each is priced like Auctionator does
  (merchant price if known, else auction price). Profit = auction price x
  number made x 0.95 (the AH cut) - reagent cost, shown only when every
  price is known. No auction line or profit for items that bind on pickup.
  Disenchantry has no public API, so it's skipped.
- **No slash commands.** Everything a player does has UI in the trainer
  window. Debug is a saved setting:
  `/run TrainerCompareDB.debug = true` (or `false`), at once and saved.
- **No scores.** Item level and stat changes are facts; stat weights were
  guesses and were removed. Rings, trinkets and dual-wield hands compare
  against the one with the lower item level.

## Don't assume the WoW API

WoW Forever is Classic data on a modern, retail-style engine. Classic and
retail docs are both wrong in places. What we learned (more in
`docs/PROBE-FINDINGS.md`):

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
  probe (`probe/`) and ask the owner to run it. Build from what the client
  returns. Diagnostics live in the probe, not the shipped addon.
- WoW chat text can't be selected. Any diagnostic must end in a copy window
  (the probe's `/tcprobe show`) so the owner can paste the result.
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
- Every event and hook handler runs inside `safe()`: errors stay silent
  unless debug is on. No Lua errors in chat, ever.

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
