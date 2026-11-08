import { Plugin } from 'obsidian';
import { dragItemsFeature } from './features/drag-items';
import type { Feature } from './features/feature';
import { ListToolkitSettings, mergeSettings } from './settings';

const FEATURES: readonly Feature[] = [dragItemsFeature];

export default class ListToolkitPlugin extends Plugin {
	settings!: ListToolkitSettings;
	private settingsListeners: Array<() => void> = [];

	async onload(): Promise<void> {
		await this.loadSettings();
		for (const feature of FEATURES) feature.load(this);
	}

	async loadSettings(): Promise<void> {
		this.settings = mergeSettings(await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		for (const listener of this.settingsListeners) listener();
	}

	/** Calls `listener` after every settings change. */
	onSettingsChange(listener: () => void): void {
		this.settingsListeners.push(listener);
	}
}
