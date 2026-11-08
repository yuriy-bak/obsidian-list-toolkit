import {
	indentWidth,
	isBlank,
	leadingWhitespace,
	ListItemLine,
	Lines,
	parseListItem,
} from '../../lib/list-parse';

/** Line range, `end` exclusive. */
export interface LineRange {
	start: number;
	end: number;
}

export interface ModelItem extends ListItemLine {
	line: number;
	/** Nesting level inside the list: 0 for top items, 1 for their children… */
	level: number;
}

/** The list around a line: its line range and every item in it, in order. */
export interface ListModel {
	region: LineRange;
	items: ModelItem[];
	tabSize: number;
}

export interface LevelRange {
	min: number;
	max: number;
}

export interface Cursor {
	line: number;
	ch: number;
}

/** Replace lines `from`…`to - 1` with `lines`; the moved item starts at `itemLine` afterwards. */
export interface MoveResult {
	from: number;
	to: number;
	lines: string[];
	itemLine: number;
	cursor: Cursor | null;
}

/**
 * Finds the list that contains `line`: list items, lines indented under them and blank lines between,
 * up to an unindented line that is not a list item. Null if `line` is not a list item.
 */
export function buildListModel(lines: Lines, line: number, tabSize: number): ListModel | null {
	if (line < 0 || line >= lines.count || !parseListItem(lines.get(line), tabSize)) return null;

	const belongs = (index: number): boolean => {
		const text = lines.get(index);
		return isBlank(text) || parseListItem(text, tabSize) !== null || leadingWhitespace(text).length > 0;
	};
	let start = line;
	while (start > 0 && belongs(start - 1)) start--;
	let end = line + 1;
	while (end < lines.count && belongs(end)) end++;
	// The list ends with its last non-blank line and starts with its first item.
	while (end > line + 1 && isBlank(lines.get(end - 1))) end--;
	while (start < line && !parseListItem(lines.get(start), tabSize)) start++;

	const items: ModelItem[] = [];
	const stack: ModelItem[] = [];
	for (let index = start; index < end; index++) {
		const parsed = parseListItem(lines.get(index), tabSize);
		if (!parsed) continue;
		while (stack.length > 0 && (stack[stack.length - 1]?.indentWidth ?? 0) >= parsed.indentWidth) stack.pop();
		const item: ModelItem = { ...parsed, line: index, level: stack.length };
		stack.push(item);
		items.push(item);
	}
	return { region: { start, end }, items, tabSize };
}

export function itemAt(model: ListModel, line: number): ModelItem | null {
	return model.items.find((item) => item.line === line) ?? null;
}

/**
 * The item with its sub-items and continuation lines: every following line indented deeper than the item,
 * blank lines included when an indented line follows them.
 */
export function findBlock(lines: Lines, model: ListModel, line: number): LineRange | null {
	const item = itemAt(model, line);
	if (!item) return null;
	let end = line + 1;
	let scan = line + 1;
	while (scan < model.region.end) {
		const text = lines.get(scan);
		if (isBlank(text)) {
			scan++;
			continue;
		}
		if (indentWidth(leadingWhitespace(text), model.tabSize) <= item.indentWidth) break;
		scan++;
		end = scan;
	}
	return { start: line, end };
}

function outside(block: LineRange) {
	return (item: ModelItem): boolean => item.line < block.start || item.line >= block.end;
}

function itemsAround(model: ListModel, block: LineRange, gap: number): { above: ModelItem[]; below: ModelItem[] } {
	const rest = model.items.filter(outside(block));
	return {
		above: rest.filter((item) => item.line < gap).reverse(),
		below: rest.filter((item) => item.line >= gap),
	};
}

/**
 * Whether the block may go before line `gap`, and at which levels. Gaps are item lines and the end of the list,
 * outside the block itself; `block.start` and `block.end` are both the original place.
 * Levels go from one above the next item (so it does not lose its parent) up to the item above plus one.
 */
export function allowedLevels(model: ListModel, block: LineRange, gap: number): LevelRange | null {
	if (gap < model.region.start || gap > model.region.end) return null;
	if (gap > block.start && gap < block.end) return null;
	const atItem = gap === model.region.end || gap === block.end || itemAt(model, gap) !== null;
	if (!atItem) return null;

	const { above, below } = itemsAround(model, block, gap);
	const max = above[0] ? above[0].level + 1 : 0;
	const min = below[0] ? Math.max(0, below[0].level - 1) : 0;
	return { min: Math.min(min, max), max };
}

/** The gap nearest to `line` that `allowedLevels` accepts: above the line if `before`, else below it. */
export function nearestGap(model: ListModel, block: LineRange, line: number, before: boolean): number | null {
	const candidates: number[] = [];
	for (let gap = model.region.start; gap <= model.region.end; gap++) {
		if (allowedLevels(model, block, gap)) candidates.push(gap);
	}
	if (candidates.length === 0) return null;
	const target = before ? line : line + 1;
	let best = candidates[0] ?? null;
	for (const gap of candidates) {
		if (best === null || Math.abs(gap - target) < Math.abs(best - target)) best = gap;
	}
	return best;
}

/**
 * The indent unit of the list: a tab if any item is indented with tabs, otherwise the smallest step
 * from a parent to its child in spaces; `fallback` (from the editor settings) for a flat list.
 */
export function detectIndentUnit(model: ListModel, fallback: string): string {
	if (model.items.some((item) => item.indent.includes('\t'))) return '\t';
	let step = Infinity;
	const stack: ModelItem[] = [];
	for (const item of model.items) {
		while (stack.length > 0 && (stack[stack.length - 1]?.level ?? 0) >= item.level) stack.pop();
		const parent = stack[stack.length - 1];
		if (parent) step = Math.min(step, item.indentWidth - parent.indentWidth);
		stack.push(item);
	}
	return Number.isFinite(step) && step > 0 ? ' '.repeat(step) : fallback;
}

/** The indent an item at `level` gets before line `gap`: a sibling's, else the parent's plus one unit. */
export function targetIndent(model: ListModel, block: LineRange, gap: number, level: number, unit: string): string {
	const { above, below } = itemsAround(model, block, gap);
	let parent: ModelItem | null = null;
	for (const item of above) {
		if (item.level === level) return item.indent;
		if (item.level < level) {
			parent = item;
			break;
		}
	}
	for (const item of below) {
		if (item.level === level) return item.indent;
		if (item.level < level) break;
	}
	if (parent) return parent.indent + unit.repeat(level - parent.level);
	const top = model.items.find((item) => item.level === 0);
	return top ? top.indent : '';
}

export function reindentLine(text: string, from: string, to: string, unit: string, tabSize: number): string {
	if (isBlank(text)) return text;
	if (text.startsWith(from)) return to + text.slice(from.length);
	// An indent that does not start with the item's (mixed tabs and spaces): keep its width.
	const indent = leadingWhitespace(text);
	const extra = Math.max(0, indentWidth(indent, tabSize) - indentWidth(from, tabSize));
	const unitWidth = Math.max(1, indentWidth(unit, tabSize));
	const units = Math.floor(extra / unitWidth);
	return to + unit.repeat(units) + ' '.repeat(extra - units * unitWidth) + text.slice(indent.length);
}

/**
 * Moves the block before line `gap` at `level`, with its indents shifted to the new level.
 * Null when the move is not allowed or changes nothing.
 */
export function computeMove(
	lines: Lines,
	model: ListModel,
	block: LineRange,
	gap: number,
	level: number,
	unit: string,
	cursor: Cursor | null = null,
): MoveResult | null {
	const range = allowedLevels(model, block, gap);
	const item = itemAt(model, block.start);
	if (!range || !item || level < range.min || level > range.max) return null;
	const samePlace = gap === block.start || gap === block.end;
	if (samePlace && level === item.level) return null;

	const indent = targetIndent(model, block, gap, level, unit);
	const moved: string[] = [];
	for (let index = block.start; index < block.end; index++) {
		moved.push(reindentLine(lines.get(index), item.indent, indent, unit, model.tabSize));
	}

	let from: number;
	let to: number;
	let result: string[];
	let itemLine: number;
	if (gap <= block.start) {
		from = gap;
		to = block.end;
		result = [...moved];
		for (let index = gap; index < block.start; index++) result.push(lines.get(index));
		itemLine = gap;
	} else {
		from = block.start;
		to = gap;
		result = [];
		for (let index = block.end; index < gap; index++) result.push(lines.get(index));
		itemLine = from + result.length;
		result.push(...moved);
	}

	let newCursor: Cursor | null = null;
	if (cursor && cursor.line >= block.start && cursor.line < block.end) {
		const offset = cursor.line - block.start;
		const before = lines.get(cursor.line);
		const after = moved[offset] ?? '';
		const oldIndent = leadingWhitespace(before).length;
		const newIndent = leadingWhitespace(after).length;
		const ch = cursor.ch < oldIndent ? Math.min(cursor.ch, newIndent) : cursor.ch - oldIndent + newIndent;
		newCursor = { line: itemLine + offset, ch: Math.min(ch, after.length) };
	}
	return { from, to, lines: result, itemLine, cursor: newCursor };
}
