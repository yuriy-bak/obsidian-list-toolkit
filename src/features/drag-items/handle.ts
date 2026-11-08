import { syntaxTree } from '@codemirror/language';
import { EditorState, Facet, Line } from '@codemirror/state';
import { EditorView, PluginValue, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { setIcon } from 'obsidian';
import { parseListItem, quotePrefix } from '../../lib/list-parse';
import { t } from '../../i18n';
import { DragSession, toScroller } from './drag';

/** Opens the menu of the list item at the cursor, at a point in viewport coordinates. */
export type HandleMenuOpener = (view: EditorView, at: { x: number; y: number }) => void;

export const handleMenu = Facet.define<HandleMenuOpener, HandleMenuOpener | null>({
	combine: (values) => values[0] ?? null,
});

/** Where the handle stands: left of the list marker or right after the end of the line. */
export type HandleSide = 'start' | 'end';

export const handleSide = Facet.define<HandleSide, HandleSide>({
	combine: (values) => values[0] ?? 'start',
});

/** Space between the end of the line text and the handle, px. */
const END_GAP = 4;

/** A touch held this long without moving opens the menu, ms. */
const LONG_PRESS = 500;

/** Size of the touch area of the handle, px. The icon inside is smaller. */
export const HANDLE_SIZE = 32;

/** Syntax nodes of Obsidian's Markdown parser where list items are not dragged. */
const EXCLUDED_NODES = /codeblock|frontmatter|math|table|comment/i;
/** Outside quotes and callouts, a quote node means the list is not ours to parse (lazy continuation). */
const QUOTE_NODE = /quote/i;

function insideExcludedBlock(state: EditorState, line: Line, quoted: boolean): boolean {
	let excluded = false;
	syntaxTree(state).iterate({
		from: line.from,
		to: Math.max(line.from + 1, line.to),
		enter: (node) => {
			if (EXCLUDED_NODES.test(node.name) || (!quoted && QUOTE_NODE.test(node.name))) excluded = true;
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
	const prefix = quotePrefix(line.text);
	const item = parseListItem(line.text.slice(prefix.length), state.tabSize);
	if (!item || insideExcludedBlock(state, line, prefix !== '')) return null;
	return line;
}

interface HandlePlace {
	line: number;
	top: number;
	left: number;
}

/**
 * Draws the drag handle left of the list marker of the cursor line (or after its end, see `handleSide`). The handle is an absolutely positioned
 * element in the scroll container, not a widget inside the line: Live Preview replaces list markers with
 * its own widgets, and anything inserted into the line would shift the text.
 */
export class HandleView implements PluginValue {
	readonly dom: HTMLElement;
	/** 1-based number of the line the handle stands at, or null when it is hidden. */
	line: number | null = null;
	/** While a drag is in progress, the handle keeps its line and position. */
	frozen = false;
	private session: DragSession | null = null;
	private pointerId: number | null = null;
	private pointerType = '';
	private longPress = 0;

	constructor(readonly view: EditorView) {
		this.dom = view.scrollDOM.createDiv({ cls: 'list-toolkit-handle', attr: { 'aria-label': t('dragHandle') } });
		setIcon(this.dom, 'grip-vertical');
		this.dom.addEventListener('pointerdown', this.onPointerDown);
		this.dom.addEventListener('pointermove', this.onPointerMove);
		this.dom.addEventListener('pointerup', this.onPointerUp);
		this.dom.addEventListener('pointercancel', this.onCancel);
		this.dom.addEventListener('lostpointercapture', this.onCancel);
		// Keep the editor from taking focus (and the phone from opening the keyboard) on a touch of the handle.
		for (const type of ['mousedown', 'touchstart'] as const) {
			this.dom.addEventListener(type, this.swallow, { passive: false });
		}
		this.dom.addEventListener('contextmenu', this.onContextMenu);
		this.schedule();
	}

	private readonly swallow = (event: Event): void => {
		event.preventDefault();
		event.stopPropagation();
	};

	private readonly onPointerDown = (event: PointerEvent): void => {
		this.swallow(event);
		this.pointerType = event.pointerType;
		if (this.session || this.line === null || event.button > 0) return;
		const session = DragSession.start(this.view, this.line - 1, event, () => this.endSession());
		if (!session) return;
		this.session = session;
		this.pointerId = event.pointerId;
		if (event.pointerType !== 'mouse') {
			this.longPress = this.view.dom.win.setTimeout(() => {
				if (this.session && !this.session.isStarted) {
					this.session.cancel();
					if (typeof navigator.vibrate === 'function') navigator.vibrate(10);
					this.openMenu();
				}
			}, LONG_PRESS);
		}
		this.frozen = true;
		this.dom.addClass('is-active');
		this.dom.setPointerCapture(event.pointerId);
		// A second finger or Escape cancels the drag.
		activeDocument.addEventListener('pointerdown', this.onOtherPointer, true);
		activeDocument.addEventListener('keydown', this.onKey, true);
	};

	private readonly onPointerMove = (event: PointerEvent): void => {
		if (event.pointerId !== this.pointerId) return;
		this.swallow(event);
		this.session?.move(event);
	};

	private readonly onPointerUp = (event: PointerEvent): void => {
		if (event.pointerId !== this.pointerId) return;
		this.swallow(event);
		this.session?.drop(event);
	};

	private readonly onCancel = (): void => {
		this.session?.cancel();
	};

	/** Right click on desktop; a long touch is handled by the timer, so the browser's own long-press menu is ignored. */
	private readonly onContextMenu = (event: MouseEvent): void => {
		this.swallow(event);
		if (this.pointerType !== 'mouse' && this.pointerType !== '') return;
		this.session?.cancel();
		this.openMenu();
	};

	private openMenu(): void {
		const open = this.view.state.facet(handleMenu);
		if (!open || this.line === null) return;
		const box = this.dom.getBoundingClientRect();
		open(this.view, { x: box.left, y: box.bottom });
	}

	private readonly onOtherPointer = (event: PointerEvent): void => {
		if (event.pointerId !== this.pointerId) this.session?.cancel();
	};

	private readonly onKey = (event: KeyboardEvent): void => {
		if (event.key !== 'Escape') return;
		this.swallow(event);
		this.session?.cancel();
	};

	private endSession(): void {
		this.view.dom.win.clearTimeout(this.longPress);
		activeDocument.removeEventListener('pointerdown', this.onOtherPointer, true);
		activeDocument.removeEventListener('keydown', this.onKey, true);
		if (this.pointerId !== null && this.dom.hasPointerCapture(this.pointerId)) {
			this.dom.releasePointerCapture(this.pointerId);
		}
		this.session = null;
		this.pointerId = null;
		this.frozen = false;
		this.dom.removeClass('is-active');
		this.schedule();
	}

	update(update: ViewUpdate): void {
		// A change from elsewhere (sync, another pane) makes the drag plan stale.
		if (this.session && update.docChanged && !update.transactions.some((tr) => tr.isUserEvent('move.drop'))) {
			this.session.cancel();
		}
		if (this.frozen) return;
		const sideChanged = update.startState.facet(handleSide) !== update.state.facet(handleSide);
		if (sideChanged || update.selectionSet || update.docChanged || update.geometryChanged || update.viewportChanged) {
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
		if (view.state.facet(handleSide) === 'end') {
			const coords = view.coordsAtPos(line.to, -1);
			if (!coords) return null;
			const point = toScroller(view, coords.right + END_GAP, (coords.top + coords.bottom) / 2);
			// A line that runs to the right edge keeps the handle inside the editor, over its last characters.
			const maxLeft = view.scrollDOM.scrollLeft + view.scrollDOM.clientWidth - HANDLE_SIZE;
			return { line: line.number, top: point.y - HANDLE_SIZE / 2, left: Math.max(0, Math.min(point.x, maxLeft)) };
		}
		const prefix = quotePrefix(line.text);
		const item = parseListItem(line.text.slice(prefix.length), view.state.tabSize);
		const coords = view.coordsAtPos(line.from + prefix.length + (item?.indent.length ?? 0), 1);
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
		this.session?.cancel();
		this.dom.remove();
	}
}

export const handlePlugin = ViewPlugin.fromClass(HandleView);
