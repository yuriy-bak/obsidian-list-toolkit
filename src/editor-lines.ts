import { App, Editor, EditorPosition } from 'obsidian';
import type { Lines } from './lib/list-parse';

export function editorLines(editor: Editor): Lines {
	return { count: editor.lineCount(), get: (index) => editor.getLine(index) };
}

interface VaultConfig {
	getConfig?(key: string): unknown;
}

/** Tab width and indent unit from Obsidian's editor settings. */
export function editorIndent(app: App): { tabSize: number; unit: string } {
	const vault = app.vault as unknown as VaultConfig;
	const tabSize = Number(vault.getConfig?.('tabSize')) || 4;
	const useTab = vault.getConfig?.('useTab') !== false;
	return { tabSize, unit: useTab ? '\t' : ' '.repeat(tabSize) };
}

/** The range that removes whole lines `start`…`end - 1`, with their line break. */
export function wholeLines(editor: Editor, start: number, end: number): { from: EditorPosition; to: EditorPosition } {
	if (end < editor.lineCount()) return { from: { line: start, ch: 0 }, to: { line: end, ch: 0 } };
	if (start > 0) {
		return {
			from: { line: start - 1, ch: editor.getLine(start - 1).length },
			to: { line: end - 1, ch: editor.getLine(end - 1).length },
		};
	}
	return { from: { line: 0, ch: 0 }, to: { line: end - 1, ch: editor.getLine(end - 1).length } };
}
