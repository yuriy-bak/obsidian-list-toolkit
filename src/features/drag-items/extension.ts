import type { Extension } from '@codemirror/state';
import { draggedLinesField } from './drag';
import { handlePlugin } from './handle';

/** The CodeMirror extensions of the feature. */
export function dragItemsExtension(): Extension {
	return [draggedLinesField, handlePlugin];
}
