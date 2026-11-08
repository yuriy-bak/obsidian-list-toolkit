import type { Extension } from '@codemirror/state';
import { editorInfoField, Menu, Platform } from 'obsidian';
import type { Feature } from '../feature';
import { dragItemsExtension } from './extension';

/**
 * Drag list items with a finger (or the mouse, if enabled on desktop) together with their sub-items.
 * handle.ts draws the handle, drag.ts runs the gesture, move.ts computes the change.
 */
export const dragItemsFeature: Feature = {
	id: 'drag-items',
	load(plugin) {
		// Obsidian reads this array again on updateOptions(), so the setting applies without a restart.
		const extensions: Extension[] = [];
		const extension = dragItemsExtension((view, at) => {
			const info = view.state.field(editorInfoField, false);
			if (!info?.editor) return;
			const menu = new Menu();
			plugin.branchActions.fillMenu(menu, info.editor, info);
			menu.showAtPosition(at);
		});
		const refresh = () => {
			extensions.length = 0;
			if (Platform.isMobile || plugin.settings.dragOnDesktop) extensions.push(extension);
			plugin.app.workspace.updateOptions();
		};
		plugin.registerEditorExtension(extensions);
		plugin.onSettingsChange(refresh);
		refresh();
	},
};
