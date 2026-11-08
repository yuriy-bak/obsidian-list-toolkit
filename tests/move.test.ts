import { test } from 'node:test';
import assert from 'node:assert/strict';
import { linesOf, quotePrefix, requote, unquotedLines } from '../src/lib/list-parse';
import {
	allowedLevels,
	buildListModel,
	computeMove,
	Cursor,
	detectIndentUnit,
	findBlock,
	nearestGap,
} from '../src/features/drag-items/move';

const TAB = 4;

/** Moves the item on `line` before `gap` at `level` and returns the whole note. */
function move(note: string[], line: number, gap: number, level: number, cursor: Cursor | null = null) {
	const lines = linesOf(note);
	const model = buildListModel(lines, line, TAB);
	assert.ok(model, 'list model');
	const block = findBlock(lines, model, line);
	assert.ok(block, 'block');
	const unit = detectIndentUnit(model, '\t');
	const result = computeMove(lines, model, block, gap, level, unit, cursor);
	if (!result) return null;
	const out = [...note.slice(0, result.from), ...result.lines, ...note.slice(result.to)];
	return { note: out, result };
}

test('the list is bounded by unindented paragraphs, blank lines inside are kept', () => {
	const note = ['Intro', '- a', '', '- b', '  more b', 'Outro'];
	const model = buildListModel(linesOf(note), 3, TAB);
	assert.deepEqual(model?.region, { start: 1, end: 5 });
	assert.deepEqual(model?.items.map((item) => item.line), [1, 3]);
	assert.equal(buildListModel(linesOf(note), 0, TAB), null);
	assert.equal(buildListModel(linesOf(note), 4, TAB), null);
});

test('levels follow the indent', () => {
	const note = ['- a', '\t- b', '\t\t- c', '\t- d', '- e'];
	const model = buildListModel(linesOf(note), 0, TAB);
	assert.deepEqual(model?.items.map((item) => item.level), [0, 1, 2, 1, 0]);
});

test('a block holds sub-items, continuation lines and blank lines inside', () => {
	const note = ['- a', '  text', '\t- b', '', '\t\t- c', '', '- d'];
	const lines = linesOf(note);
	const model = buildListModel(lines, 0, TAB);
	assert.ok(model);
	assert.deepEqual(findBlock(lines, model, 0), { start: 0, end: 5 });
	assert.deepEqual(findBlock(lines, model, 2), { start: 2, end: 5 });
	assert.deepEqual(findBlock(lines, model, 6), { start: 6, end: 7 });
	assert.equal(findBlock(lines, model, 1), null);
});

test('move an item with sub-items down, same level', () => {
	const note = ['- a', '\t- a1', '- b', '- c'];
	assert.deepEqual(move(note, 0, 4, 0)?.note, ['- b', '- c', '- a', '\t- a1']);
	assert.deepEqual(move(note, 0, 3, 0)?.note, ['- b', '- a', '\t- a1', '- c']);
});

test('move an item up', () => {
	const note = ['- a', '- b', '- c', '\t- c1'];
	const moved = move(note, 2, 0, 0);
	assert.deepEqual(moved?.note, ['- c', '\t- c1', '- a', '- b']);
	assert.equal(moved?.result.itemLine, 0);
});

test('move deeper and back out, sub-items keep their relative indent', () => {
	const note = ['- a', '- b', '\t- b1', '- c'];
	assert.deepEqual(move(note, 1, 1, 1)?.note, ['- a', '\t- b', '\t\t- b1', '- c']);
	const nested = ['- a', '\t- b', '\t\t- b1', '- c'];
	assert.deepEqual(move(nested, 1, 3, 0)?.note, ['- a', '- b', '\t- b1', '- c']);
});

test('levels allowed: up to the item above plus one, down to the next item minus one', () => {
	const note = ['- a', '\t- b', '\t\t- c', '- d', '- e'];
	const lines = linesOf(note);
	const model = buildListModel(lines, 4, TAB);
	assert.ok(model);
	const block = findBlock(lines, model, 4);
	assert.ok(block);
	assert.deepEqual(allowedLevels(model, block, 0), { min: 0, max: 0 });
	assert.deepEqual(allowedLevels(model, block, 1), { min: 0, max: 1 });
	assert.deepEqual(allowedLevels(model, block, 2), { min: 1, max: 2 });
	assert.deepEqual(allowedLevels(model, block, 3), { min: 0, max: 3 });
	assert.deepEqual(allowedLevels(model, block, 5), { min: 0, max: 1 });
	assert.equal(move(note, 4, 1, 2), null);
	assert.equal(move(note, 4, 2, 0), null);
});

test('no gap inside the moved block or before a continuation line', () => {
	const note = ['- a', '  text', '\t- a1', '- b'];
	const lines = linesOf(note);
	const model = buildListModel(lines, 0, TAB);
	assert.ok(model);
	const block = findBlock(lines, model, 0);
	assert.ok(block);
	assert.equal(allowedLevels(model, block, 1), null);
	assert.equal(allowedLevels(model, block, 2), null);
	const b = findBlock(lines, model, 3);
	assert.ok(b);
	assert.equal(allowedLevels(model, b, 1), null);
	assert.deepEqual(allowedLevels(model, b, 2), { min: 0, max: 1 });
});

test('dropping on the original place at the same level changes nothing', () => {
	const note = ['- a', '- b', '- c'];
	assert.equal(move(note, 1, 1, 0), null);
	assert.equal(move(note, 1, 2, 0), null);
});

test('checkboxes and numbers keep their marker and state', () => {
	const note = ['1. one', '2. two', '- [x] done', '- [ ] todo'];
	assert.deepEqual(move(note, 0, 4, 0)?.note, ['2. two', '- [x] done', '- [ ] todo', '1. one']);
	assert.deepEqual(move(note, 3, 0, 0)?.note, ['- [ ] todo', '1. one', '2. two', '- [x] done']);
});

test('spaces stay spaces: the indent unit comes from the list', () => {
	const two = ['- a', '  - a1', '- b', '- c'];
	assert.deepEqual(move(two, 3, 2, 1)?.note, ['- a', '  - a1', '  - c', '- b']);
	const four = ['- a', '    - a1', '- b'];
	assert.equal(detectIndentUnit(buildListModel(linesOf(four), 0, TAB)!, '\t'), '    ');
	assert.deepEqual(move(four, 2, 3, 1)?.note, ['- a', '    - a1', '    - b']);
});

test('a flat list takes the editor indent unit', () => {
	const flat = ['- a', '- b'];
	const model = buildListModel(linesOf(flat), 0, TAB)!;
	assert.equal(detectIndentUnit(model, '  '), '  ');
	assert.equal(detectIndentUnit(model, '\t'), '\t');
});

test('a new child of a numbered item takes the indent of its existing children', () => {
	const note = ['1. one', '   - x', '2. two', '- y'];
	assert.deepEqual(move(note, 3, 1, 1)?.note, ['1. one', '   - y', '   - x', '2. two']);
});

test('the cursor keeps its place in the moved item', () => {
	const note = ['- a', '- bb', '\t- c'];
	const moved = move(note, 1, 1, 1, { line: 2, ch: 4 });
	assert.deepEqual(moved?.note, ['- a', '\t- bb', '\t\t- c']);
	assert.deepEqual(moved?.result.cursor, { line: 2, ch: 5 });
	const up = move(['- a', '- b', '- c'], 2, 0, 0, { line: 2, ch: 3 });
	assert.deepEqual(up?.result.cursor, { line: 0, ch: 3 });
});

test('the last item of the list moves to the top and back', () => {
	const note = ['Text', '', '- a', '- b', '', 'End'];
	const up = move(note, 3, 2, 0);
	assert.deepEqual(up?.note, ['Text', '', '- b', '- a', '', 'End']);
	const down = move(up!.note, 2, 4, 0);
	assert.deepEqual(down?.note, note);
});

test('nearest gap skips gaps that are not allowed', () => {
	const note = ['- a', '  text', '- b', '- c'];
	const lines = linesOf(note);
	const model = buildListModel(lines, 3, TAB)!;
	const block = findBlock(lines, model, 3)!;
	assert.equal(nearestGap(model, block, 1, true), 0);
	assert.equal(nearestGap(model, block, 1, false), 2);
	assert.equal(nearestGap(model, block, 2, false), 3);
});

test('lists inside callouts move with the prefix kept', () => {
	const note = ['> [!note]', '> - a', '> \t- a1', '> - b', '>', '> - c', 'After'];
	const prefix = quotePrefix(note[3]!);
	assert.equal(prefix, '> ');
	const lines = unquotedLines(linesOf(note), prefix);
	const model = buildListModel(lines, 3, TAB)!;
	assert.deepEqual(model.region, { start: 1, end: 6 });
	const block = findBlock(lines, model, 1)!;
	assert.deepEqual(block, { start: 1, end: 3 });
	const result = computeMove(lines, model, block, 6, 0, detectIndentUnit(model, '\t'))!;
	const out = [...note.slice(0, result.from), ...result.lines.map((text) => requote(text, prefix)), ...note.slice(result.to)];
	assert.deepEqual(out, ['> [!note]', '> - b', '>', '> - c', '> - a', '> \t- a1', 'After']);
});

test('a nested quote ends the outer list', () => {
	const note = ['> - a', '> > - inner', '> - b'];
	const lines = unquotedLines(linesOf(note), '> ');
	assert.deepEqual(buildListModel(lines, 0, TAB)?.region, { start: 0, end: 1 });
	assert.equal(quotePrefix(note[1]!), '> > ');
	assert.equal(quotePrefix('- a'), '');
});
