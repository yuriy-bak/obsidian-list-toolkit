import type { Feature } from '../feature';

/**
 * Drag list items with a finger (or the mouse, if enabled on desktop) together with their sub-items.
 * The handle, the gesture and the move transaction come in the next stages: handle.ts, drag.ts, move.ts.
 */
export const dragItemsFeature: Feature = {
	id: 'drag-items',
	load() {
		// The CodeMirror extension is registered here once it exists.
	},
};
