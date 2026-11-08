import { test } from 'node:test';
import assert from 'node:assert/strict';
import { linesOf } from '../src/lib/list-parse';
import { appendBranch, branchAt, branchText } from '../src/lib/branch';

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
