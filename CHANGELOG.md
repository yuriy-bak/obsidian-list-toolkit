# Changelog

## Unreleased

- Drag list items on a phone: touch the handle left of the list item under the cursor and drag it. The item moves with its sub-items and continuation lines; a line shows the place and the level (move the finger right or left to nest or outdent), the editor scrolls near its edges. One undo brings the note back. Release on the original place, outside the editor, or touch with a second finger to cancel. No handle in code blocks, frontmatter and tables.
- Lists inside callouts and quotes (`> - item`) can be dragged too; the `>` prefix stays in place.
- Long press on the drag handle (right click on desktop) opens a menu for the item: fold or unfold, copy, move to another note, delete — each with its sub-items. Copy, move and delete are also commands for the item under the cursor.
- **Sort list items of this level** and **Move completed items to the end** (done `[x]` and cancelled `[-]`): commands and entries of the item menu. They reorder the items of the cursor item's level under the same parent, each with its sub-items, in one change. A blank line or a change of marker (`-` / `1.`) between items starts another list, which stays as it is.
- A list pasted into an empty list item, or at the end of one, takes the level of that item: nesting is kept, indents follow the note (tabs or spaces). Setting **Fit pasted lists to the item**, on by default.
- Setting **Drag list items on desktop** (off by default): the same handle works with the mouse.
- Internal: project skeleton from the Obsidian sample plugin; CI, beta and release workflows, READMEs in English and Russian.
- Internal: list line parsing and the move logic (which block moves, where it may go, how its indent changes), with unit tests.
