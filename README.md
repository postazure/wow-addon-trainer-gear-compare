# TrainerUpgrades (WoW Forever)

Shows, in the profession trainer window, whether each recipe's item would be
an upgrade over your equipped gear.

**Status:** the build pipeline works. The trainer features wait on the probe
output from the WoW Forever client, so they are built from what it really
returns.

## Layout

```
addon/TrainerUpgrades.toc     TOC, copied into the build output
src/                          TypeScript source (entry: src/main.ts)
types/wow-forever.d.ts        Hand-written WoW API types (see below)
scripts/                      Post-build checks and deploy
test/smoke.mjs                Runs the built Lua in a mock client
dist/TrainerUpgrades/         Build output. This folder is the addon.
probe/TrainerUpgradesProbe/   Debug addon. Plain Lua, no build step.
```

## Build

Needs Node 20+.

```sh
npm install
npm run build       # TypeScript -> dist/TrainerUpgrades (one Lua 5.1 file)
npm test            # build, then smoke test in a mock client
npm run typecheck   # types only, no output
npm run watch       # rebuild on save (does not copy the TOC)
WOW_ADDONS_DIR=".../Interface/AddOns" npm run deploy
```

Notes:

- TypeScriptToLua 1.37 needs **TypeScript 6.0.2** exactly. TypeScript 7
  (the native Go port) does not work with it. Both are pinned.
- The output is one bundled file with only the helpers it uses
  (`luaLibImport: require-minimal`). The build fails if the output is not
  valid Lua 5.1.
- `noImplicitSelf` is on, so plain functions do not get a hidden `self`
  parameter. Widget methods are still called with `:`.

### Types

No maintained TypeScript types exist for Classic-based clients. The npm
packages target retail 9.0.5 or very old Classic builds. So
`types/wow-forever.d.ts` is hand-written. It covers only what the addon
uses. Any API the probe has not confirmed for Forever is typed as possibly
`undefined`, so the compiler makes you check for it first.

### Slash commands

| Command     | What it does          |
| ----------- | --------------------- |
| `/tu`       | Version and help      |
| `/tu debug` | Toggle debug messages |

## Run the probe

1. Copy `probe/TrainerUpgradesProbe` into
   `World of Warcraft/<client folder>/Interface/AddOns/`.
2. Start the game. If the addon list says "Out of date", tick
   **Load out of date AddOns**. The probe prints the real interface number
   (4th value of `GetBuildInfo`).
3. Talk to a profession trainer. Best: one that teaches gear you could wear
   (Blacksmithing, Leatherworking, Tailoring). Then also try Enchanting.
4. The probe prints to chat about 0.5 seconds after the window opens.
5. Type `/tuprobe all` to add a one-line summary of every row.
6. Type `/tuprobe show`. A window opens. Press Ctrl+A, then Ctrl+C, and paste
   the text back to me. Pipes show doubled (`||`). That is on purpose.

The output is also saved to
`WTF/Account/<ACCOUNT>/SavedVariables/TrainerUpgradesProbe.lua` after
`/reload` or logout.

### Probe slash commands

| Command          | What it does                                      |
| ---------------- | ------------------------------------------------- |
| `/tuprobe`       | Run again (trainer must be open), show the window |
| `/tuprobe all`   | One line per service, for the whole list          |
| `/tuprobe show`  | Show the last result                              |

### What it checks

- Client build, project ID, locale, class and level.
- Which trainer, item, spell, and skill functions exist. It also scans `_G`
  for any `*Trainer*` function or `C_` namespace it did not know about.
- The Blizzard trainer frame: does it exist, which globals can be hooked,
  and is the list a FauxScrollFrame or a ScrollBox.
- Other gear addons (ForeverGear, GearSetImprover) and any public globals.
- For the first three non-header rows: every raw return value, plus three
  ways to find the output item:
  1. `GetTrainerServiceItemLink`
  2. A hidden tooltip: `SetTrainerService`, then `GetItem` / `GetSpell`
  3. `C_TooltipInfo.GetTrainerService`, if it exists
- If an item is not cached yet, it waits for `GET_ITEM_INFO_RECEIVED` and
  prints the late result.

It is read-only. It never buys, selects, or changes filters. Every call is
wrapped in `pcall`, so it should not throw Lua errors.
