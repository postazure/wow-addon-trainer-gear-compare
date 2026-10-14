# TrainerUpgrades (WoW Forever)

Shows, in the profession trainer window, whether each recipe's item would be
an upgrade over your equipped gear.

**Status: step 1 of 2.** This repo has only the API probe for now. The real
addon will be built from what the probe reports in the WoW Forever client.

## Layout

```
probe/TrainerUpgradesProbe/   Debug addon. Plain Lua, no build step.
```

The real addon will add `src/` (TypeScript), a build config, and a build
output folder `dist/TrainerUpgrades/`.

## Step 1: run the probe

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

### Slash commands

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
