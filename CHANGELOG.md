# Changelog

## Unreleased

- Internal: project skeleton from the Obsidian sample plugin; CI, beta and release workflows, READMEs in English and Russian.
- Internal: list line parsing and the move logic (which block moves, where it may go, how its indent changes), with unit tests.
- Drag list items on a phone: touch the handle left of the list item under the cursor and drag it. The item moves with its sub-items and continuation lines; a line shows the place and the level (move the finger right or left to nest or outdent), the editor scrolls near its edges. One undo brings the note back. Release on the original place, outside the editor, or touch with a second finger to cancel. No handle in code blocks, frontmatter, tables and callouts.
