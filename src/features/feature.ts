import type ListToolkitPlugin from '../main';

/**
 * One list tool. Each lives in its own folder under `src/features/` and is listed in `FEATURES` in `main.ts`.
 * Everything a feature registers goes through the plugin (`registerEditorExtension`, `registerDomEvent`, …),
 * so it is removed when the plugin is disabled.
 */
export interface Feature {
	id: string;
	load(plugin: ListToolkitPlugin): void;
}
