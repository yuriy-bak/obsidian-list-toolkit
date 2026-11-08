import { App, PluginSettingTab, SettingDefinitionItem } from 'obsidian';
import type ListToolkitPlugin from './main';
import { DEFAULT_SETTINGS, ListToolkitSettings } from './settings';
import { t } from './i18n';

export class ListToolkitSettingTab extends PluginSettingTab {
	constructor(app: App, private readonly plugin: ListToolkitPlugin) {
		super(app, plugin);
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: t('settingDragOnDesktop'),
				desc: t('settingDragOnDesktopDesc'),
				control: { type: 'toggle', key: 'dragOnDesktop', defaultValue: DEFAULT_SETTINGS.dragOnDesktop },
			},
			{
				name: t('settingPasteLists'),
				desc: t('settingPasteListsDesc'),
				control: { type: 'toggle', key: 'pasteLists', defaultValue: DEFAULT_SETTINGS.pasteLists },
			},
		];
	}

	getControlValue(key: string): unknown {
		return this.plugin.settings[key as keyof ListToolkitSettings];
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		if ((key === 'dragOnDesktop' || key === 'pasteLists') && typeof value === 'boolean') {
			this.plugin.settings[key] = value;
			await this.plugin.saveSettings();
		}
	}
}
