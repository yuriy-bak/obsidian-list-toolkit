import { getLanguage } from 'obsidian';

const EN = {
	dragHandle: 'Drag to move the list item',
	settingDragOnDesktop: 'Drag list items on desktop',
	settingDragOnDesktopDesc:
		'Show the drag handle with the mouse too. Off by default: on desktop, the Outliner plugin can already drag list items.',
	toggleFold: 'Fold or unfold',
	copyBranch: 'Copy list item with sub-items',
	deleteBranch: 'Delete list item with sub-items',
	moveBranch: 'Move list item with sub-items to another note',
	pickNote: 'Note to move the list item to',
	copied: 'List item copied',
	movedTo: 'Moved to {note}',
};

type Strings = typeof EN;

const RU: Strings = {
	dragHandle: 'Потяните, чтобы перенести пункт списка',
	settingDragOnDesktop: 'Перетаскивание пунктов на компьютере',
	settingDragOnDesktopDesc:
		'Показывать ручку перетаскивания и для мыши. По умолчанию выключено: на компьютере пункты умеет перетаскивать плагин Outliner.',
	toggleFold: 'Свернуть или развернуть',
	copyBranch: 'Скопировать пункт с подпунктами',
	deleteBranch: 'Удалить пункт с подпунктами',
	moveBranch: 'Перенести пункт с подпунктами в другую заметку',
	pickNote: 'Заметка, куда перенести пункт',
	copied: 'Пункт скопирован',
	movedTo: 'Перенесено в {note}',
};

export function t(key: keyof Strings): string {
	return (getLanguage() === 'ru' ? RU : EN)[key];
}
