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

