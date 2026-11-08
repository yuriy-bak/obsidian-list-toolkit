# List Toolkit

**English** | [Русский](README.ru.md)

[![Support on Boosty](https://img.shields.io/badge/Boosty-Support_the_plugin-F15F2C?logo=boosty&logoColor=white)](https://boosty.to/yuriybak)

Tools for Markdown lists in Obsidian. The first one: **drag list items and checkboxes with a finger on a phone**, together with their sub-items, up and down across several screens and in or out a level.

> **Status:** in development, not released yet. Betas for testing come out through [BRAT](#installation).

## Why this plugin

Outliner drags list items only on desktop; on a phone there are only the "Move up" and "Move down" commands, which are slow for long moves. List Toolkit adds a drag handle that works with a finger.

## Features

- **Drag list items:** put the cursor in a list item and a handle appears left of it. Drag the handle to move the item with all its sub-items and continuation lines; a line shows where it goes. Move the finger right or left to nest the item deeper or move it out, up to one level below the item above. The editor scrolls by itself near its top and bottom edges. Works with `-`, `*`, `+`, numbered items and checkboxes, tabs or spaces, in Live Preview and source mode. One undo brings everything back. To cancel, release on the original place or outside the editor, or touch the screen with a second finger. No handle in code blocks, frontmatter, tables and callouts. Numbers of numbered items are not renumbered.

## Settings

- **Drag list items on desktop:** off by default, since on desktop the Outliner plugin can already drag items with the mouse. When on, the handle works with the mouse the same way.

More list tools will follow as separate features.

## Installation

The plugin is not in the community catalog yet.

**Beta versions** are GitHub pre-releases. Install them with [BRAT](https://github.com/TfTHacker/obsidian42-brat):

1. Install and enable **BRAT** from Community plugins.
2. Run the command **BRAT: Add a beta plugin for testing**.
3. Enter `https://github.com/yuriy-bak/obsidian-list-toolkit` and pick the latest version.

**By hand:**

1. Download `main.js`, `manifest.json` and `styles.css` from a [release](https://github.com/yuriy-bak/obsidian-list-toolkit/releases).
2. Copy them into `.obsidian/plugins/list-toolkit/` in your vault.
3. Enable **List Toolkit** in Settings → Community plugins.

## Privacy

The plugin makes no network requests and changes only the note you are editing, when you move an item.

## Feedback

Found a bug or have an idea? [Open an issue](https://github.com/yuriy-bak/obsidian-list-toolkit/issues/new/choose): a few words are enough, in English or Russian. All changes, including betas in progress, are in the [changelog](CHANGELOG.md).

## Development

```bash
npm install
npm run lint
npm test
npm run build
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the structure, scripts and tests, and [RELEASING.md](RELEASING.md) for betas and releases.

## License

MIT. See [LICENSE](LICENSE).
