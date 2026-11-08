# Contributing

## Commands

```bash
npm install
npm run lint        # ESLint with eslint-plugin-obsidianmd
npm run typecheck   # TypeScript, no output
npm run build       # type check + production main.js
npm run build:dev   # type check + main.js with an inline source map
npm run dev         # rebuild main.js on every change
npm test            # unit tests (node:test)
```

To try the plugin, copy (or link) `main.js`, `manifest.json` and `styles.css` into `.obsidian/plugins/list-toolkit/` of a test vault.

## Structure

```
src/
  main.ts            — plugin entry: loads settings and every feature in FEATURES
  settings.ts        — settings and their defaults (no obsidian imports)
  features/
    feature.ts       — the Feature interface
    drag-items/      — drag list items: index.ts (registration), handle.ts, drag.ts, move.ts
  lib/               — helpers shared by features, such as list-parse.ts
tests/               — *.test.ts, run with node:test
```

Each list tool is a folder in `src/features/` with an `index.ts` exporting a `Feature`, added to `FEATURES` in `main.ts`. Everything a feature registers goes through the plugin (`registerEditorExtension`, `registerDomEvent`, …), so disabling the plugin removes it.

Logic that does not need the editor (parsing list lines, which block to move, where it may go, how to reindent it) lives in pure functions over line text, without `obsidian` imports, and is covered by unit tests.

## Dependencies

Only `obsidian` and `@codemirror/*` at runtime, and Obsidian provides them: they are `external` in `esbuild.config.mjs` and must stay there, a bundled second copy of CodeMirror breaks editor extensions.

## Tests

`npm test` compiles `tests/**/*.ts` and what they import into `.test-build/` (`tsconfig.test.json`, CommonJS) and runs them with the built-in Node test runner. A test that imports a module importing `obsidian` fails at runtime: keep tested code free of it.

## Releasing

The step-by-step checklist for betas and stable releases is in [RELEASING.md](RELEASING.md).

- **CI** (`ci.yml`, on PRs and `main`): bug report form versions, README "What's new", lint, build, tests.
- **Beta release** (manual): builds the chosen branch with the given pre-release version (`0.1.0-beta.1`) in the released `manifest.json`, and publishes a GitHub pre-release with attested `main.js`, `manifest.json` and `styles.css` for BRAT. Nothing is committed.
- **Release** (on a `manifest.json` change in `main`, a published release, or manual): creates the `<version>` tag and GitHub Release with the CHANGELOG section as notes and attested assets. Version `0.0.0` is skipped.
