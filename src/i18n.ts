import { getLanguage } from 'obsidian';

const EN = {
	dragHandle: 'Drag to move the list item',
	settingDragOnDesktop: 'Drag list items on desktop',
	settingDragOnDesktopDesc:
		'Show the drag handle with the mouse too. Off by default: on desktop, the Outliner plugin can already drag list items.',
	settingHandleSide: 'Drag handle position',
	settingHandleSideDesc: 'Before the list marker, or after the end of the line.',
	handleSideStart: 'Start of the line',
	handleSideEnd: 'End of the line',
	settingPasteLists: 'Fit pasted lists to the item',
	settingPasteListsDesc:
		'A list pasted into an empty list item, or at the end of one, takes the level of that item; nesting is kept and indents follow the note.',
	toggleFold: 'Fold or unfold',
	copyBranch: 'Copy list item with sub-items',
	deleteBranch: 'Delete list item with sub-items',
	moveBranch: 'Move list item with sub-items to another note',
	pickNote: 'Note to move the list item to',
	copied: 'List item copied',
	movedTo: 'Moved to {note}',
	sortItems: 'Sort list items of this level',
	completedToEnd: 'Move completed items to the end',
	cannotReorder: 'Text between the list items: nothing was changed',
	alreadyInOrder: 'Already in order',
};

type Strings = typeof EN;

const RU: Strings = {
	dragHandle: 'Потяните, чтобы перенести пункт списка',
	settingDragOnDesktop: 'Перетаскивание пунктов на компьютере',
	settingDragOnDesktopDesc:
		'Показывать ручку перетаскивания и для мыши. По умолчанию выключено: на компьютере пункты умеет перетаскивать плагин Outliner.',
	settingHandleSide: 'Где ручка перетаскивания',
	settingHandleSideDesc: 'Перед маркером списка или после конца строки.',
	handleSideStart: 'В начале строки',
	handleSideEnd: 'В конце строки',
	settingPasteLists: 'Подгонять вставленный список под пункт',
	settingPasteListsDesc:
		'Список, вставленный в пустой пункт или в конец пункта, встаёт на его уровень; вложенность сохраняется, отступы — как в заметке.',
	toggleFold: 'Свернуть или развернуть',
	copyBranch: 'Скопировать пункт с подпунктами',
	deleteBranch: 'Удалить пункт с подпунктами',
	moveBranch: 'Перенести пункт с подпунктами в другую заметку',
	pickNote: 'Заметка, куда перенести пункт',
	copied: 'Пункт скопирован',
	movedTo: 'Перенесено в {note}',
	sortItems: 'Отсортировать пункты этого уровня',
	completedToEnd: 'Выполненные пункты в конец',
	cannotReorder: 'Между пунктами есть текст: ничего не изменено',
	alreadyInOrder: 'Порядок уже такой',
};

export function t(key: keyof Strings): string {
	return (getLanguage() === 'ru' ? RU : EN)[key];
}
