import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, mergeSettings } from '../src/settings';

test('no saved data gives the defaults', () => {
	assert.deepEqual(mergeSettings(null), DEFAULT_SETTINGS);
	assert.deepEqual(mergeSettings(undefined), DEFAULT_SETTINGS);
});

test('drag on desktop is off by default', () => {
	assert.equal(DEFAULT_SETTINGS.dragOnDesktop, false);
});

test('saved values are kept, unknown keys and wrong types are dropped', () => {
	assert.deepEqual(mergeSettings({ dragOnDesktop: true, extra: 1 }), { dragOnDesktop: true, pasteLists: true });
	assert.equal(mergeSettings({ pasteLists: false }).pasteLists, false);
	assert.deepEqual(mergeSettings({ dragOnDesktop: 'yes' }), DEFAULT_SETTINGS);
});
