import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adaptPastedList } from '../src/lib/paste';

test('a pasted list takes the target indent, nesting kept in the note style', () => {
	const pasted = '    - a\n        - b\n    - c\n';
	assert.deepEqual(adaptPastedList(pasted, '\t', '\t', 4), ['\t- a', '\t\t- b', '\t- c']);
	assert.deepEqual(adaptPastedList('- a\n\t- b', '  ', '  ', 4), ['  - a', '    - b']);
});

test('continuation lines keep their offset, blank lines stay blank', () => {
	assert.deepEqual(adaptPastedList('- a\n  more\n\n- b\r\n', '\t', '\t', 4), ['\t- a', '\t  more', '', '\t- b']);
});

test('text that is not a list is left to the default paste', () => {
	assert.equal(adaptPastedList('plain text', '', '\t', 4), null);
	assert.equal(adaptPastedList('- a\nparagraph', '', '\t', 4), null);
	assert.equal(adaptPastedList('\t- a\n- b', '', '\t', 4), null);
	assert.equal(adaptPastedList('', '', '\t', 4), null);
});

test('checkboxes and numbers are kept', () => {
	assert.deepEqual(adaptPastedList('1. one\n   - [x] done', '', '\t', 4), ['1. one', '\t- [x] done']);
});
