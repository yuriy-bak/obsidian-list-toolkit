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
		];
	}

	getControlValue(key: string): unknown {
		return this.plugin.settings[key as keyof ListToolkitSettings];
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		if (key === 'dragOnDesktop' && typeof value === 'boolean') {
			this.plugin.settings.dragOnDesktop = value;
			await this.plugin.saveSettings();
		}
	}
}
