import { test } from 'node:test';
import assert from 'node:assert/strict';
import { linesOf } from '../src/lib/list-parse';
import { appendBranch, branchAt, branchText, completedToEnd, sortSiblings } from '../src/lib/branch';

test('branch text loses its own indent and the quote prefix, keeps inner indents', () => {
	const note = ['- a', '\t- b', '\t\t- c', '\t\t  more c', '- d'];
	const branch = branchAt(linesOf(note), 1, 4, '\t')!;
	assert.deepEqual(branch.block, { start: 1, end: 4 });
	assert.equal(branchText(branch), '- b\n\t- c\n\t  more c');
	const quoted = ['> - x', '> \t- y', 'After'];
	assert.equal(branchText(branchAt(linesOf(quoted), 0, 4, '\t')!), '- x\n\t- y');
	assert.equal(branchAt(linesOf(note), 3, 4, '\t'), null);
});

test('a branch is appended right after a list, or after a blank line', () => {
	assert.equal(appendBranch('', '- x'), '- x\n');
	assert.equal(appendBranch('- a\n- b\n\n', '- x'), '- a\n- b\n- x\n');
	assert.equal(appendBranch('Text', '- x\n\t- y'), 'Text\n\n- x\n\t- y\n');
	assert.equal(appendBranch('- a\n  more a\n', '- x'), '- a\n  more a\n- x\n');
	assert.equal(appendBranch('> - quoted', '- x'), '> - quoted\n\n- x\n');
});

function apply(note: string[], line: number, run: typeof sortSiblings) {
	const branch = branchAt(linesOf(note), line, 4, '\t')!;
	const result = run(branch);
	if (!result) return null;
	return { note: [...note.slice(0, result.from), ...result.lines, ...note.slice(result.to)], result };
}

test('sort the items of one level, each with its sub-items', () => {
	const note = ['Title', '- pear', '\t- p1', '- Apple', '- item 10', '- item 9', '\t- [x] done', 'End'];
	const sorted = apply(note, 3, sortSiblings)!;
	assert.deepEqual(sorted.note, ['Title', '- Apple', '- item 9', '\t- [x] done', '- item 10', '- pear', '\t- p1', 'End']);
	assert.equal(sorted.result.moveLine(1), 5);
	assert.equal(sorted.result.moveLine(2), 6);
	assert.equal(apply(sorted.note, 1, sortSiblings)?.result.changed, false);
});

test('sorting a nested level touches only that parent', () => {
	const note = ['- b', '\t- z', '\t- y', '- a', '\t- x'];
	assert.deepEqual(apply(note, 1, sortSiblings)?.note, ['- b', '\t- y', '\t- z', '- a', '\t- x']);
});

test('checkbox and marker are ignored when sorting', () => {
	const note = ['- [x] b', '- [ ] c', '1. a'];
	assert.deepEqual(apply(note, 0, sortSiblings)?.note, ['1. a', '- [x] b', '- [ ] c']);
});

test('completed items go to the end, order kept, blank lines stay', () => {
	const note = ['- [x] one', '- [ ] two', '', '- [-] three', '\t- sub', '- [ ] four'];
	const done = apply(note, 1, completedToEnd)!;
	assert.deepEqual(done.note, ['- [ ] two', '- [ ] four', '', '- [x] one', '- [-] three', '\t- sub']);
});

test('a text line of the parent between items blocks reordering', () => {
	const note = ['- p', '\t- b', '  p text', '\t- a'];
	assert.equal(sortSiblings(branchAt(linesOf(note), 1, 4, '\t')!), null);
});
