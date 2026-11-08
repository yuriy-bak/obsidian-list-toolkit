export interface ListToolkitSettings {
	/** Drag list items on desktop too. Off by default: there the Outliner plugin already drags items with the mouse. */
	dragOnDesktop: boolean;
	/** Where the drag handle stands: before the list marker or after the end of the line. */
	handleSide: 'start' | 'end';
	/** Re-indent a pasted list to the level of the list item it is pasted into. */
	pasteLists: boolean;
}

export const DEFAULT_SETTINGS: ListToolkitSettings = {
	dragOnDesktop: false,
	handleSide: 'start',
	pasteLists: true,
};

/** Merges saved data over the defaults, keeping only known keys of the right type. */
export function mergeSettings(data: unknown): ListToolkitSettings {
	const settings: ListToolkitSettings = { ...DEFAULT_SETTINGS };
	if (typeof data !== 'object' || data === null) return settings;
	const saved = data as Partial<Record<keyof ListToolkitSettings, unknown>>;
	if (typeof saved.dragOnDesktop === 'boolean') settings.dragOnDesktop = saved.dragOnDesktop;
	if (saved.handleSide === 'start' || saved.handleSide === 'end') settings.handleSide = saved.handleSide;
	if (typeof saved.pasteLists === 'boolean') settings.pasteLists = saved.pasteLists;
	return settings;
}
