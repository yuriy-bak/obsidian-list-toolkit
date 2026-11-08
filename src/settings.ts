export interface ListToolkitSettings {
	/** Drag list items on desktop too. Off by default: there the Outliner plugin already drags items with the mouse. */
	dragOnDesktop: boolean;
}

export const DEFAULT_SETTINGS: ListToolkitSettings = {
	dragOnDesktop: false,
};

/** Merges saved data over the defaults, keeping only known keys of the right type. */
export function mergeSettings(data: unknown): ListToolkitSettings {
	const settings: ListToolkitSettings = { ...DEFAULT_SETTINGS };
	if (typeof data !== 'object' || data === null) return settings;
	const saved = data as Partial<Record<keyof ListToolkitSettings, unknown>>;
	if (typeof saved.dragOnDesktop === 'boolean') settings.dragOnDesktop = saved.dragOnDesktop;
	return settings;
}
