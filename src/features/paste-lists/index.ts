import { Editor } from 'obsidian';
import { branchAt } from '../../lib/branch';
import { parseListItem, quotePrefix, requote } from '../../lib/list-parse';
import { adaptPastedList } from '../../lib/paste';
import { editorIndent, editorLines } from '../../editor-lines';
import type { Feature } from '../feature';
import type ListToolkitPlugin from '../../main';

/**
 * Pasting a list into an empty list item replaces the item; pasting at the end of a list item puts the list
 * on the lines below. Either way the pasted top items take the level of the current item.
 */
function pasteList(plugin: ListToolkitPlugin, event: ClipboardEvent, editor: Editor): void {
	if (event.defaultPrevented || !plugin.settings.pasteLists || editor.somethingSelected()) return;
	const text = event.clipboardData?.getData('text/plain');
	if (!text) return;
	const cursor = editor.getCursor();
	const line = editor.getLine(cursor.line);
	const prefix = quotePrefix(line);
	const { tabSize, unit: editorUnit } = editorIndent(plugin.app);
	const item = parseListItem(line.slice(prefix.length), tabSize);
	if (!item) return;
	const empty = line.slice(prefix.length + item.contentStart).trim() === '';
	if (!empty && cursor.ch !== line.length) return;

	const unit = branchAt(editorLines(editor), cursor.line, tabSize, editorUnit)?.unit ?? editorUnit;
	const adapted = adaptPastedList(text, item.indent, unit, tabSize);
	if (!adapted) return;
	event.preventDefault();

	const insert = adapted.map((pasted) => requote(pasted, prefix)).join('\n');
	const lastLength = requote(adapted[adapted.length - 1] ?? '', prefix).length;
	if (empty) {
		editor.transaction({
			changes: [{ from: { line: cursor.line, ch: 0 }, to: { line: cursor.line, ch: line.length }, text: insert }],
			selection: { from: { line: cursor.line + adapted.length - 1, ch: lastLength } },
		});
	} else {
		editor.transaction({
			changes: [{ from: { line: cursor.line, ch: line.length }, text: `\n${insert}` }],
			selection: { from: { line: cursor.line + adapted.length, ch: lastLength } },
		});
	}
}

export const pasteListsFeature: Feature = {
	id: 'paste-lists',
	load(plugin) {
		plugin.registerEvent(
			plugin.app.workspace.on('editor-paste', (event, editor) => pasteList(plugin, event, editor)),
		);
	},
};
