---
name: release
description: Cut a Trainer Compare release on the owner's machine. Drafts the player-facing notes from the commits and CHANGELOG, bumps the version, commits, and makes the annotated v<version> tag whose message is the notes. Pushes only after the owner says yes.
disable-model-invocation: true
---

# Release Trainer Compare

The GitHub workflow publishes whatever the tag says. No AI runs there. This
skill is where the notes get written and checked, on the owner's machine,
with the owner approving each step that matters.

The pieces:

- The version lives only in `package.json`.
- `CHANGELOG.md` keeps a `## <version>` section for every release. Changes
  pile up under `## Unreleased` between releases, added as they're made.
- The tag `v<version>` is **annotated**, and its message is the release
  notes. The workflow reads them with `scripts/tag-notes.mjs` and uses them
  for the GitHub release and CurseForge.
- `scripts/check-release.mjs v<version>` checks all of that. The workflow
  runs it first and stops if it fails.

Follow the steps in order. Stop and tell the owner if any check fails. Don't
work around it.

## 1. Check the starting point

```sh
git branch --show-current          # must be main
git status --short                 # must be empty
git fetch origin main --tags
git rev-parse HEAD origin/main     # must be the same commit
```

Then `npm test` must pass.

## 2. Gather what changed

```sh
LAST=$(git describe --tags --abbrev=0 2>/dev/null)   # empty before the first release
git log --oneline ${LAST:+$LAST..}HEAD
```

Start from the `## Unreleased` section of `CHANGELOG.md`. Then read the
commits, and the diff where a message is unclear, to find anything a player
would notice that the section missed. If `package.json`'s version has no tag
yet and the CHANGELOG already has its section (the first release was set up
this way), offer to release that version, with that section plus anything
under `## Unreleased` as the starting draft.

## 3. Pick the version with the owner

Suggest one and say why: a patch (`0.6.1`) for fixes only, a minor (`0.7.0`)
for new features. A suffix makes a pre-release: `-beta.1` or `-rc.1` is a
CurseForge **Beta**, `-alpha.1` an **Alpha**. Check the tag is free:

```sh
git rev-parse -q --verify "refs/tags/v<version>"   # must print nothing
git ls-remote --tags origin "v<version>"           # must print nothing
```

## 4. Draft the notes

Write them for players, not developers.

- Plain English, short sentences, Markdown. Bullets, with `### New` and
  `### Fixed` headings when there are both kinds.
- Only what a player can notice. Leave out refactors, tests, docs, CI and
  release tooling.
- Facts only. Never call anything an "upgrade".
- Don't claim it works with other addons (ForeverGear, GearSetImprover and so
  on) unless the owner has tested it.
- Don't say something works in game unless the owner confirmed it.
- Never use the old name (TrainerUpgrades).

Show the draft to the owner. Change it until they approve it. The approved
text is used as is in both the CHANGELOG and the tag.

## 5. Write the version and the changelog

```sh
npm version <version> --no-git-tag-version   # package.json and package-lock.json
```

In `CHANGELOG.md`, put the approved notes under `## <version>`, right below
an empty `## Unreleased`. That empties `## Unreleased` for the next release.
Replace the `## <version>` section if it's already there. Then:

```sh
npm run package    # tests, then release/TrainerCompare-<version>.zip
```

## 6. Confirm the checklists

Ask the owner whether the **Release testing checklist** and the **Assets
checklist** in `docs/CURSEFORGE.md` are done. The owner tests in game; you
can't. Don't tick them yourself, and don't go on until they say yes.

## 7. Commit and tag

```sh
git add package.json package-lock.json CHANGELOG.md
git commit -m "Release v<version>"
```

Write the approved notes to a file in your scratchpad (not in the repo), then:

```sh
git tag -a "v<version>" -F <notes-file> --cleanup=verbatim
```

`--cleanup=verbatim` matters. Without it, git treats every line starting
with `#` as a comment and drops it, so the `###` headings vanish.

Check the tag:

```sh
node scripts/check-release.mjs "v<version>"
node scripts/tag-notes.mjs --tag "v<version>" --out <scratchpad>/check.md
diff <notes-file> <scratchpad>/check.md    # must print nothing
```

If anything is wrong, fix it, `git tag -d "v<version>"`, and tag again. The
tag is only local until step 8.

## 8. Push, only when the owner says so

Show the owner: the version, the release commit, and the notes. Ask: "Push
main and the tag?" Push only on a clear yes.

```sh
git push origin main
git push origin "v<version>"
```

Push `main` first, so the tagged commit is on `main` when the workflow
starts.

Then tell the owner:

- **Actions → Release** is running: check, build, GitHub release, then
  CurseForge (skipped until its token and project id are set).
- Check the GitHub release page when it's done.
- After CurseForge moderation, install from the CurseForge app, turn debug
  on (`/run TrainerCompareDB.debug = true`), `/reload`, and check chat says
  `loaded v<version>`.

## After a push

Never move or delete a pushed tag unless the owner asks.

- **Notes need a fix:** edit the GitHub release, then run **Actions → Upload
  to CurseForge** with the tag (it reads the release's notes). Fix the
  `CHANGELOG.md` section in a normal commit.
- **The workflow failed before publishing** (for example the check): fix it
  on `main`, then release the next patch version. Nothing was published, so
  re-using the same version is also fine, but only if the owner agrees to
  delete the pushed tag (`git push origin :refs/tags/v<version>`).
- **The workflow failed after the build** (GitHub or CurseForge was down):
  **Re-run failed jobs**, or **Actions → Release → Run workflow** with the
  tag.
