import { getLanguage } from 'obsidian';

const EN = {
	dragHandle: 'Drag to move the list item',
	settingDragOnDesktop: 'Drag list items on desktop',
	settingDragOnDesktopDesc:
		'Show the drag handle with the mouse too. Off by default: on desktop, the Outliner plugin can already drag list items.',
};

type Strings = typeof EN;

const RU: Strings = {
	dragHandle: 'Потяните, чтобы перенести пункт списка',
	settingDragOnDesktop: 'Перетаскивание пунктов на компьютере',
	settingDragOnDesktopDesc:
		'Показывать ручку перетаскивания и для мыши. По умолчанию выключено: на компьютере пункты умеет перетаскивать плагин Outliner.',
};

export function t(key: keyof Strings): string {
	return (getLanguage() === 'ru' ? RU : EN)[key];
}
