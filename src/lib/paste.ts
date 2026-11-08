import { indentWidth, isBlank, leadingWhitespace, linesOf, parseListItem } from './list-parse';
import { buildListModel, detectIndentUnit } from '../features/drag-items/move';

/**
 * Re-indents pasted text that is a list so its top items get `targetIndent` and deeper levels use `unit`.
 * Continuation lines keep their offset. Null if the text is not a list: it must start with a list item,
 * and no line may be less indented than its top items.
 */
export function adaptPastedList(text: string, targetIndent: string, unit: string, tabSize: number): string[] | null {
	const lines = text.replace(/\r\n?/g, '\n').replace(/\s+$/, '').split('\n');
	while (lines.length > 0 && isBlank(lines[0] ?? '')) lines.shift();
	const first = lines[0];
	if (first === undefined || !parseListItem(first, tabSize)) return null;

	const base = indentWidth(leadingWhitespace(first), tabSize);
	for (const line of lines) {
		if (!isBlank(line) && indentWidth(leadingWhitespace(line), tabSize) < base) return null;
	}
	const model = buildListModel(linesOf(lines), 0, tabSize);
	if (!model || model.region.end < lines.length) return null;
	const sourceUnit = detectIndentUnit(model, unit);
	const step = Math.max(1, indentWidth(sourceUnit, tabSize));

	return lines.map((line) => {
		if (isBlank(line)) return '';
		const indent = leadingWhitespace(line);
		const extra = indentWidth(indent, tabSize) - base;
		const levels = Math.floor(extra / step);
		return targetIndent + unit.repeat(levels) + ' '.repeat(extra - levels * step) + line.slice(indent.length);
	});
}
