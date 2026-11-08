# Releasing

A checklist for every release, for a person or an AI assistant. Go through it top to bottom.

Until the first stable release, `manifest.json` and `package.json` keep version `0.0.0`. The `Release` workflow skips `0.0.0`; any other version that lands on `main` is published as a stable release.

## Beta (for testing with BRAT)

Every finished feature or fix goes out as a beta first. Betas do not touch `main` or the community catalog.

Every PR with a change users notice adds a line to the `## Unreleased` section at the top of `CHANGELOG.md` (create the section if it is missing). Internal changes go last and start with "Internal:". So the stable release finds the list already collected.

1. Pick the version: the next stable version plus `-beta.N`. Before the first release, betas are `0.1.0-beta.1`, `0.1.0-beta.2`, …; after stable `0.1.0`, they are `0.1.1-beta.N`. Look at the latest [pre-releases](https://github.com/yuriy-bak/obsidian-list-toolkit/releases) first: several branches may be in progress, so take the next free number. A beta numbered below the latest stable version is not offered by BRAT.
2. Run **Actions → Beta release → Run workflow** with that version and the branch of the PR. The workflow sets the version only in the released `manifest.json`; nothing is committed.
3. Install it with BRAT and check the change on a phone (Android, iOS) and, if it touches desktop behavior, on desktop.

## Stable release

Only when the owner decides to release.

1. **Version.** The next patch version after the latest stable release, the same base as the betas (betas `0.1.1-beta.N` → `0.1.1`). The first release is `0.1.0`. A new minor version only for a large feature, by the owner's decision.
2. **minAppVersion.** If the release needs a newer Obsidian, change `minAppVersion` in `manifest.json` before step 3, so `versions.json` gets the right value.
3. **Bump.** On a new branch, run `npm run release:bump -- <version> "<short title>"`. It updates `manifest.json`, `package.json`, `package-lock.json`, `versions.json` and the plugin version list of the bug report form, and renames `## Unreleased` in `CHANGELOG.md` to `## <version> - <short title>`.
4. **CHANGELOG.md.** Check the `## <version> - <short title>` section: everything users notice since the last stable release, from all the betas. Internal changes go last and are marked "Internal".
5. **README.md and README.ru.md.** Both files, same content:
   - "What's new in <version>" / «Что нового в <version>», after "Features" / «Возможности»: 3–5 main changes since the previous stable release, with a link to `CHANGELOG.md`. `npm run readme:check` (also run by CI) fails until both name the version in `manifest.json`. For the first release, add the sections and remove the "Status: in development" note;
   - new features, settings and commands in Features;
   - Installation: once the plugin is in the community catalog, put the catalog first;
   - screenshots and GIF, if the UI they show has changed.
6. **Checks.** `npm run lint`, `npm test` and `npm run readme:check` pass. CI also checks that the bug report form lists the new version.
7. **PR → merge.** When the PR lands on `main`, the `Release` workflow creates the tag (no `v` prefix) and the GitHub Release with the CHANGELOG section as notes, and attaches `main.js`, `manifest.json` and `styles.css`.
8. **After the release.** Check that the release has the three files. Once the plugin is in the community catalog, the catalog picks new versions up by itself within a few hours.

The `description` in `manifest.json` reaches the community catalog only with a stable release.
