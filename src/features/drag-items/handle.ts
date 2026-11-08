import { syntaxTree } from '@codemirror/language';
import { EditorState, Line } from '@codemirror/state';
import { EditorView, PluginValue, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { setIcon } from 'obsidian';
import { parseListItem } from '../../lib/list-parse';
import { t } from '../../i18n';

/** Size of the touch area of the handle, px. The icon inside is smaller. */
export const HANDLE_SIZE = 32;

/** Syntax nodes of Obsidian's Markdown parser where list items are not dragged. */
const EXCLUDED_NODES = /codeblock|frontmatter|math|table|quote|comment/i;

function insideExcludedBlock(state: EditorState, line: Line): boolean {
	let excluded = false;
	syntaxTree(state).iterate({
		from: line.from,
		to: Math.max(line.from + 1, line.to),
		enter: (node) => {
			if (EXCLUDED_NODES.test(node.name)) excluded = true;
			return !excluded;
		},
	});
	return excluded;
}

/** The list item line the handle belongs to: the line of the cursor, if it is a draggable list item. */
export function handleLine(state: EditorState): Line | null {
	const selection = state.selection.main;
	if (!selection.empty) return null;
	const line = state.doc.lineAt(selection.head);
	const item = parseListItem(line.text, state.tabSize);
	if (!item || insideExcludedBlock(state, line)) return null;
	return line;
}

interface HandlePlace {
	line: number;
	top: number;
	left: number;
}

/** Converts viewport coordinates to coordinates inside the editor's scroll container. */
export function toScroller(view: EditorView, x: number, y: number): { x: number; y: number } {
	const box = view.scrollDOM.getBoundingClientRect();
	return { x: x - box.left + view.scrollDOM.scrollLeft, y: y - box.top + view.scrollDOM.scrollTop };
}

/**
 * Draws the drag handle left of the list marker of the cursor line. The handle is an absolutely positioned
 * element in the scroll container, not a widget inside the line: Live Preview replaces list markers with
 * its own widgets, and anything inserted into the line would shift the text.
 */
export class HandleView implements PluginValue {
	readonly dom: HTMLElement;
	/** 1-based number of the line the handle stands at, or null when it is hidden. */
	line: number | null = null;
	/** While a drag is in progress, the handle keeps its line and position. */
	frozen = false;

	constructor(readonly view: EditorView) {
		this.dom = view.scrollDOM.createDiv({ cls: 'list-toolkit-handle', attr: { 'aria-label': t('dragHandle') } });
		setIcon(this.dom, 'grip-vertical');
		this.schedule();
	}

	update(update: ViewUpdate): void {
		if (this.frozen) return;
		if (update.selectionSet || update.docChanged || update.geometryChanged || update.viewportChanged) {
			this.schedule();
		}
	}

	schedule(): void {
		this.view.requestMeasure({
			key: this,
			read: (view) => this.measure(view),
			write: (place) => this.place(place),
		});
	}

	private measure(view: EditorView): HandlePlace | null {
		const line = handleLine(view.state);
		if (!line) return null;
		const item = parseListItem(line.text, view.state.tabSize);
		const coords = view.coordsAtPos(line.from + (item?.indent.length ?? 0), 1);
		if (!coords) return null;
		const point = toScroller(view, coords.left, (coords.top + coords.bottom) / 2);
		return {
			line: line.number,
			top: point.y - HANDLE_SIZE / 2,
			left: Math.max(0, point.x - HANDLE_SIZE),
		};
	}

	private place(place: HandlePlace | null): void {
		if (this.frozen) return;
		this.line = place?.line ?? null;
		this.dom.toggleClass('is-visible', place !== null);
		if (place) {
			this.dom.setCssProps({
				'--list-toolkit-handle-top': `${place.top}px`,
				'--list-toolkit-handle-left': `${place.left}px`,
			});
		}
	}

	destroy(): void {
		this.dom.remove();
	}
}

export const handlePlugin = ViewPlugin.fromClass(HandleView);
