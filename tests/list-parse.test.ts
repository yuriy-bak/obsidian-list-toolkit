import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indentWidth, parseListItem } from '../src/lib/list-parse';

test('bullets, numbers and checkboxes are list items', () => {
	assert.deepEqual(parseListItem('- a', 4), {
		indent: '', indentWidth: 0, marker: '-', ordered: false, checkbox: null, contentStart: 2,
	});
	assert.equal(parseListItem('* a', 4)?.marker, '*');
	assert.equal(parseListItem('+ a', 4)?.marker, '+');
	assert.equal(parseListItem('12. a', 4)?.ordered, true);
	assert.equal(parseListItem('3) a', 4)?.marker, '3)');
	const task = parseListItem('\t- [x] done', 4);
	assert.equal(task?.checkbox, 'x');
	assert.equal(task?.indentWidth, 4);
	assert.equal(task?.contentStart, 7);
	assert.equal(parseListItem('- [ ]', 4)?.checkbox, ' ');
	assert.equal(parseListItem('-', 4)?.marker, '-');
});

test('a link in brackets is text, not a checkbox', () => {
	assert.equal(parseListItem('- [link](url)', 4)?.checkbox, null);
	assert.equal(parseListItem('- [x]text', 4)?.checkbox, null);
});

test('paragraphs, rules and tags are not list items', () => {
	assert.equal(parseListItem('text', 4), null);
	assert.equal(parseListItem('---', 4), null);
	assert.equal(parseListItem('-a', 4), null);
	assert.equal(parseListItem('#tag', 4), null);
	assert.equal(parseListItem('1.5 kg', 4), null);
});

test('indent width counts tabs to the next tab stop', () => {
	assert.equal(indentWidth('\t', 4), 4);
	assert.equal(indentWidth('  \t', 4), 4);
	assert.equal(indentWidth('\t  ', 4), 6);
	assert.equal(indentWidth('    ', 2), 4);
});
