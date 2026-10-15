# Trainer Compare (WoW Forever)

Shows, in the profession trainer window, how each recipe's item compares to
your equipped gear, and whether you can use it. Facts only: it doesn't
claim anything is an "upgrade".

- **The real item**: hover a recipe and you see the normal recipe tooltip,
  then the item it makes, like any item tooltip. Nothing covers the list.
- **Compare**: always on, no Shift needed. Blizzard's normal compare,
  right of the item, with its item level and stat changes. Works for gear
  you can't use, too. The item's own red text says why you can't.
- **"Only show usable gear"** in the trainer's Settings dropdown: fades gear
  you can't use (armor type, weapon skill, level, class). Non-gear recipes
  are never faded.

There is nothing to set up and there are no slash commands. The filter is
the only option, and it's saved per account.

Built for WoW Forever 1.60.1 (interface 16001), from what the client
actually returns. See [how it works](docs/HOW-IT-WORKS.md).

## Install

Install from CurseForge. No other addon is needed. If the addon list says
"Out of date", tick **Load out of date AddOns**.

To build it yourself, see [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Bug reports

Turn on debug messages, reproduce the problem, and send a screenshot of
chat. Debug messages also show failures that are normally silent.

- On: `/run TrainerCompareDB.debug = true`
- Off: `/run TrainerCompareDB.debug = false`

Either takes effect at once and is saved. With debug on, `/reload` prints the
version, and the first trainer you open prints which hooks were installed.

Issues: https://github.com/postazure/wow-addon-trainer-gear-compare/issues

## Docs

- [How it works](docs/HOW-IT-WORKS.md): what counts as usable, what each
  item is compared against, and known limits.
- [Development](docs/DEVELOPMENT.md): build, test, code layout, and the
  release pipeline.
- [Releasing to CurseForge](docs/CURSEFORGE.md): release testing and assets
  checklists.
- [In-game test checklist](docs/TEST-CHECKLIST.md)
- [Probe findings](docs/PROBE-FINDINGS.md): what the WoW Forever client
  actually returns.
- [Changelog](CHANGELOG.md)

## License

MIT. See [LICENSE](LICENSE).
