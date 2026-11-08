import { App, Editor, FuzzySuggestModal, MarkdownFileInfo, Menu, Notice, TFile } from 'obsidian';
import { appendBranch, Branch, branchAt, branchText, completedToEnd, Reorder, sortSiblings } from '../../lib/branch';
import { requote } from '../../lib/list-parse';
import { editorIndent, editorLines, wholeLines } from '../../editor-lines';
import { t } from '../../i18n';
import type ListToolkitPlugin from '../../main';
import type { Feature } from '../feature';

interface Commands {
	executeCommandById(id: string): boolean;
}

function cursorBranch(app: App, editor: Editor, line = editor.getCursor().line): Branch | null {
	const { tabSize, unit } = editorIndent(app);
	return branchAt(editorLines(editor), line, tabSize, unit);
}

function deleteBranch(editor: Editor, branch: Branch): void {
	const range = wholeLines(editor, branch.block.start, branch.block.end);
	editor.transaction({ changes: [{ ...range, text: '' }] });
}

/** Applies a reorder of sibling items as one change and keeps the cursor on its item. */
function applyReorder(editor: Editor, branch: Branch, reorder: Reorder | null): void {
	if (!reorder) {
		new Notice(t('cannotReorder'));
		return;
	}
	if (!reorder.changed) {
		new Notice(t('alreadyInOrder'));
		return;
	}
	const cursor = editor.getCursor();
	const last = reorder.to - 1;
	editor.transaction({
		changes: [
			{
				from: { line: reorder.from, ch: 0 },
				to: { line: last, ch: editor.getLine(last).length },
				text: reorder.lines.map((line) => requote(line, branch.prefix)).join('\n'),
			},
		],
		selection: { from: { line: reorder.moveLine(cursor.line), ch: cursor.ch } },
	});
}

async function copyBranch(branch: Branch): Promise<void> {
	await navigator.clipboard.writeText(branchText(branch));
	new Notice(t('copied'));
}

function toggleFold(app: App): void {
	(app as unknown as { commands: Commands }).commands.executeCommandById('editor:toggle-fold');
}

class NotePicker extends FuzzySuggestModal<TFile> {
	constructor(
		app: App,
		private readonly current: TFile | null,
		private readonly onPick: (file: TFile) => void,
	) {
		super(app);
		this.setPlaceholder(t('pickNote'));
	}

	getItems(): TFile[] {
		return this.app.vault
			.getMarkdownFiles()
			.filter((file) => file.path !== this.current?.path)
			.sort((a, b) => b.stat.mtime - a.stat.mtime);
	}

	getItemText(file: TFile): string {
		return file.path.replace(/\.md$/, '');
	}

	onChooseItem(file: TFile): void {
		this.onPick(file);
	}
}

function moveBranchToNote(app: App, editor: Editor, info: MarkdownFileInfo | null): void {
	const branch = cursorBranch(app, editor);
	if (!branch) return;
	const text = branchText(branch);
	const start = branch.block.start;
	const firstLine = editor.getLine(start);
	new NotePicker(app, info?.file ?? null, (file) => {
		void (async () => {
			await app.vault.process(file, (content) => appendBranch(content, text));
			// The note may have changed while the picker was open: delete only if the branch is still there.
			const again = cursorBranch(app, editor, start);
			if (again && editor.getLine(start) === firstLine) deleteBranch(editor, again);
			new Notice(t('movedTo').replace('{note}', file.basename));
		})();
	}).open();
}

/** Branch actions for the item under the cursor: commands and the menu of the drag handle. */
export class BranchActions {
	constructor(private readonly app: App) {}

	fillMenu(menu: Menu, editor: Editor, info: MarkdownFileInfo | null): void {
		const branch = cursorBranch(this.app, editor);
		if (!branch) return;
		menu.addItem((item) =>
			item.setTitle(t('toggleFold')).setIcon('chevrons-down-up').onClick(() => toggleFold(this.app)),
		);
		menu.addItem((item) =>
			item.setTitle(t('copyBranch')).setIcon('copy').onClick(() => void copyBranch(branch)),
		);
		menu.addItem((item) =>
			item.setTitle(t('moveBranch')).setIcon('file-output').onClick(() => moveBranchToNote(this.app, editor, info)),
		);
		menu.addSeparator();
		menu.addItem((item) =>
			item.setTitle(t('sortItems')).setIcon('arrow-down-a-z').onClick(() => applyReorder(editor, branch, sortSiblings(branch))),
		);
		menu.addItem((item) =>
			item
				.setTitle(t('completedToEnd'))
				.setIcon('list-checks')
				.onClick(() => applyReorder(editor, branch, completedToEnd(branch))),
		);
		menu.addSeparator();
		menu.addItem((item) =>
			item
				.setTitle(t('deleteBranch'))
				.setIcon('trash-2')
				.setWarning(true)
				.onClick(() => deleteBranch(editor, branch)),
		);
	}

	register(plugin: ListToolkitPlugin): void {
		const withBranch = (run: (editor: Editor, info: MarkdownFileInfo, branch: Branch) => void) =>
			(checking: boolean, editor: Editor, info: MarkdownFileInfo): boolean => {
				const branch = cursorBranch(this.app, editor);
				if (!branch) return false;
				if (!checking) run(editor, info, branch);
				return true;
			};
		plugin.addCommand({
			id: 'copy-branch',
			name: t('copyBranch'),
			editorCheckCallback: withBranch((_editor, _info, branch) => void copyBranch(branch)),
		});
		plugin.addCommand({
			id: 'delete-branch',
			name: t('deleteBranch'),
			editorCheckCallback: withBranch((editor, _info, branch) => deleteBranch(editor, branch)),
		});
		plugin.addCommand({
			id: 'sort-items',
			name: t('sortItems'),
			editorCheckCallback: withBranch((editor, _info, branch) => applyReorder(editor, branch, sortSiblings(branch))),
		});
		plugin.addCommand({
			id: 'completed-to-end',
			name: t('completedToEnd'),
			editorCheckCallback: withBranch((editor, _info, branch) => applyReorder(editor, branch, completedToEnd(branch))),
		});
		plugin.addCommand({
			id: 'move-branch-to-note',
			name: t('moveBranch'),
			editorCheckCallback: withBranch((editor, info) => moveBranchToNote(this.app, editor, info)),
		});
	}
}

export const branchActionsFeature: Feature = {
	id: 'branch-actions',
	load(plugin) {
		plugin.branchActions.register(plugin);
	},
};
