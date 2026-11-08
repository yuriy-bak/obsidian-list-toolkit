import type { Extension } from '@codemirror/state';
import { draggedLinesField } from './drag';
import { handleMenu, HandleMenuOpener, handlePlugin, HandleSide, handleSide } from './handle';

/**
 * The CodeMirror extensions of the feature. `openMenu` shows the branch menu on a long press of the handle;
 * `side` puts the handle before the list marker or after the end of the line.
 */
export function dragItemsExtension(openMenu?: HandleMenuOpener, side: HandleSide = 'start'): Extension {
	return [draggedLinesField, handlePlugin, handleSide.of(side), openMenu ? handleMenu.of(openMenu) : []];
}
