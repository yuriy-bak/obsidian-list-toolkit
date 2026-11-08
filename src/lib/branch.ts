import { leadingWhitespace, Lines, parseListItem, quotePrefix, unquotedLines } from './list-parse';
import {
	buildListModel,
	detectIndentUnit,
	findBlock,
	itemAt,
	LineRange,
	ListModel,
	ModelItem,
	reindentLine,
} from '../features/drag-items/move';

/** A list item with its sub-items and continuation lines, and the list it belongs to. */
export interface Branch {
	/** The note lines without the quote prefix. */
	lines: Lines;
	/** The quote or callout prefix of the list (`> `), empty for a plain list. */
	prefix: string;
	model: ListModel;
	block: LineRange;
	item: ModelItem;
	unit: string;
}

/** The branch of the list item on `line` (0-based), or null if the line is not a list item. */
export function branchAt(lines: Lines, line: number, tabSize: number, fallbackUnit: string): Branch | null {
	if (line < 0 || line >= lines.count) return null;
	const prefix = quotePrefix(lines.get(line));
	const bare = unquotedLines(lines, prefix);
	const model = buildListModel(bare, line, tabSize);
	if (!model) return null;
	const block = findBlock(bare, model, line);
	const item = itemAt(model, line);
	if (!block || !item) return null;
	return { lines: bare, prefix, model, block, item, unit: detectIndentUnit(model, fallbackUnit) };
}

/** The branch as text at the top level: its own indent and the quote prefix removed, inner indents kept. */
export function branchText(branch: Branch): string {
	const out: string[] = [];
	for (let index = branch.block.start; index < branch.block.end; index++) {
		out.push(reindentLine(branch.lines.get(index), branch.item.indent, '', branch.unit, branch.model.tabSize));
	}
	return out.join('\n');
}

/** Appends a branch to the end of a note: right after a list it ends with, after a blank line otherwise. */
export function appendBranch(content: string, text: string): string {
	const trimmed = content.replace(/\s+$/, '');
	if (trimmed === '') return `${text}\n`;
	const last = trimmed.slice(trimmed.lastIndexOf('\n') + 1);
	const inList = quotePrefix(last) === '' && (parseListItem(last, 4) !== null || leadingWhitespace(last).length > 0);
	return `${trimmed}${inList ? '\n' : '\n\n'}${text}\n`;
}


/** Lines `from`…`to - 1` replaced by `lines`; `moveLine` tells where a line of a reordered item ends up. */
export interface Reorder {
	from: number;
	to: number;
	lines: string[];
	moveLine(line: number): number;
	changed: boolean;
}

/** The items of the same level as the branch under the same parent, in order. */
export function siblingsOf(branch: Branch): ModelItem[] {
	const { items } = branch.model;
	const index = items.indexOf(branch.item);
	const level = branch.item.level;
	let first = index;
	while (first > 0 && (items[first - 1]?.level ?? -1) >= level) first--;
	const result: ModelItem[] = [];
	for (let at = first; at < items.length; at++) {
		const item = items[at];
		if (!item || item.level < level) break;
		if (item.level === level) result.push(item);
	}
	return result;
}

/** `-`, `*`, `+` or numbered: a change of marker kind starts a new list, as in Markdown. */
function markerKind(item: ModelItem): string {
	return item.ordered ? item.marker.slice(-1) : item.marker;
}

/**
 * Puts the sibling items (each with its sub-items) in the order `order` returns, as indexes into the siblings.
 * Only the items of the same list are reordered: a blank line between two siblings, or a change of marker kind,
 * starts another list. Null if a non-blank line that belongs to no sibling sits between two of them.
 */
export function reorderSiblings(branch: Branch, order: (siblings: ModelItem[]) => number[]): Reorder | null {
	const all = siblingsOf(branch);
	const allBlocks: LineRange[] = [];
	for (const item of all) {
		const block = findBlock(branch.lines, branch.model, item.line);
		if (!block) return null;
		allBlocks.push(block);
	}
	// The run of siblings around the branch item that is not split by blank lines or a marker change.
	const own = all.indexOf(branch.item);
	const separated = (index: number): boolean => {
		const a = all[index]!;
		const b = all[index + 1]!;
		if (markerKind(a) !== markerKind(b)) return true;
		for (let line = allBlocks[index]!.end; line < allBlocks[index + 1]!.start; line++) {
			if (branch.lines.get(line).trim() === '') return true;
		}
		return false;
	};
	let first = own;
	while (first > 0 && !separated(first - 1)) first--;
	let last = own;
	while (last + 1 < all.length && !separated(last)) last++;
	const siblings = all.slice(first, last + 1);
	const blocks = allBlocks.slice(first, last + 1);

	for (let index = 0; index + 1 < blocks.length; index++) {
		if (blocks[index]!.end !== blocks[index + 1]!.start) return null;
	}
	const sequence = order(siblings);
	const from = blocks[0]!.start;
	const to = blocks[blocks.length - 1]!.end;
	const lines: string[] = [];
	const newStart = new Map<number, number>();
	for (const blockIndex of sequence) {
		const block = blocks[blockIndex]!;
		newStart.set(blockIndex, from + lines.length);
		for (let line = block.start; line < block.end; line++) lines.push(branch.lines.get(line));
	}
	return {
		from,
		to,
		lines,
		changed: sequence.some((blockIndex, position) => blockIndex !== position),
		moveLine: (line) => {
			const index = blocks.findIndex((block) => line >= block.start && line < block.end);
			return index === -1 ? line : (newStart.get(index) ?? line) + line - blocks[index]!.start;
		},
	};
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function itemText(branch: Branch, item: ModelItem): string {
	return branch.lines.get(item.line).slice(item.contentStart).trim();
}

/** Sorted by item text without the marker and checkbox, ignoring case, numbers by value; stable. */
export function sortSiblings(branch: Branch): Reorder | null {
	return reorderSiblings(branch, (siblings) =>
		siblings
			.map((item, index) => ({ index, text: itemText(branch, item) }))
			.sort((a, b) => collator.compare(a.text, b.text) || a.index - b.index)
			.map(({ index }) => index),
	);
}

/** Done (`[x]`) and cancelled (`[-]`) items. */
export function isCompleted(item: ModelItem): boolean {
	return item.checkbox !== null && /[xX-]/.test(item.checkbox);
}

/** Completed items go after the others; the order inside both groups stays. */
export function completedToEnd(branch: Branch): Reorder | null {
	return reorderSiblings(branch, (siblings) => {
		const indexes = siblings.map((_item, index) => index);
		return [
			...indexes.filter((index) => !isCompleted(siblings[index]!)),
			...indexes.filter((index) => isCompleted(siblings[index]!)),
		];
	});
}
