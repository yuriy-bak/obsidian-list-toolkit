import { Plugin } from 'obsidian';
import { BranchActions, branchActionsFeature } from './features/branch-actions';
import { dragItemsFeature } from './features/drag-items';
import type { Feature } from './features/feature';
import { ListToolkitSettings, mergeSettings } from './settings';
import { ListToolkitSettingTab } from './settings-tab';

const FEATURES: readonly Feature[] = [dragItemsFeature, branchActionsFeature];

export default class ListToolkitPlugin extends Plugin {
	settings!: ListToolkitSettings;
	readonly branchActions = new BranchActions(this.app);
	private settingsListeners: Array<() => void> = [];

	async onload(): Promise<void> {
		await this.loadSettings();
		for (const feature of FEATURES) feature.load(this);
		this.addSettingTab(new ListToolkitSettingTab(this.app, this));
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
