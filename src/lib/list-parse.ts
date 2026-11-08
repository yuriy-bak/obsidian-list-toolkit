/** Read access to the lines of a note: a CodeMirror document or, in tests, an array. Indexes start at 0. */
export interface Lines {
	readonly count: number;
	get(index: number): string;
}

export function linesOf(array: readonly string[]): Lines {
	return {
		count: array.length,
		get: (index) => array[index] ?? '',
	};
}

/** A list item line: `- text`, `* text`, `+ text`, `1. text`, `1) text`, with or without `[ ]`. */
export interface ListItemLine {
	/** Leading tabs and spaces. */
	indent: string;
	/** Visual width of the indent, tabs counted up to the next tab stop. */
	indentWidth: number;
	/** `-`, `*`, `+`, `1.` or `1)`. */
	marker: string;
	ordered: boolean;
	/** The character inside `[ ]`, or null without a checkbox. */
	checkbox: string | null;
	/** Offset of the item text in the line. */
	contentStart: number;
}

const LIST_ITEM = /^([ \t]*)([-*+]|\d{1,9}[.)])(?:[ \t]+\[(.)\])?(?:[ \t]|$)/;

export function parseListItem(text: string, tabSize: number): ListItemLine | null {
	const match = LIST_ITEM.exec(text);
	if (!match) return null;
	const indent = match[1] ?? '';
	const marker = match[2] ?? '';
	return {
		indent,
		indentWidth: indentWidth(indent, tabSize),
		marker,
		ordered: /\d/.test(marker),
		checkbox: match[3] ?? null,
		contentStart: match[0].length,
	};
}

export function leadingWhitespace(text: string): string {
	return /^[ \t]*/.exec(text)?.[0] ?? '';
}

export function indentWidth(indent: string, tabSize: number): number {
	let width = 0;
	for (const char of indent) {
		if (char === '\t') width += tabSize - (width % tabSize);
		else if (char === ' ') width += 1;
		else break;
	}
	return width;
}

export function isBlank(text: string): boolean {
	return text.trim() === '';
}

const QUOTE_PREFIX = /^(?:[ \t]{0,3}>[ \t]?)+/;

/** The `> ` prefix of a line in a quote or callout (`> > ` when nested), or an empty string. */
export function quotePrefix(text: string): string {
	return QUOTE_PREFIX.exec(text)?.[0] ?? '';
}

/** A line that is never part of a list: ends a list at a line outside the quote. */
const OUTSIDE = '\u0000';

/**
 * The lines of a quote or callout without its `prefix`, so list logic works inside it as in plain text.
 * Lines with another prefix read as an unindented paragraph, which ends the list there.
 */
export function unquotedLines(lines: Lines, prefix: string): Lines {
	if (prefix === '') return lines;
	const bare = prefix.trimEnd();
	return {
		count: lines.count,
		get: (index) => {
			const text = lines.get(index);
			if (text.trimEnd() === bare) return '';
			if (!text.startsWith(prefix) || quotePrefix(text) !== prefix) return OUTSIDE;
			return text.slice(prefix.length);
		},
	};
}

/** Puts the quote `prefix` back on a line produced from `unquotedLines`. */
export function requote(text: string, prefix: string): string {
	if (prefix === '') return text;
	return text === '' ? prefix.trimEnd() : prefix + text;
}
