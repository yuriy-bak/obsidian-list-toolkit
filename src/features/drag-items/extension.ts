import type { Extension } from '@codemirror/state';
import { draggedLinesField } from './drag';
import { handleMenu, HandleMenuOpener, handlePlugin } from './handle';

/** The CodeMirror extensions of the feature. `openMenu` shows the branch menu on a long press of the handle. */
export function dragItemsExtension(openMenu?: HandleMenuOpener): Extension {
	return [draggedLinesField, handlePlugin, openMenu ? handleMenu.of(openMenu) : []];
}
