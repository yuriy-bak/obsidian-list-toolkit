import { indentUnit } from '@codemirror/language';
import { EditorState, Range, StateEffect, StateField } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView } from '@codemirror/view';
import { Lines, indentWidth, quotePrefix, requote, unquotedLines } from '../../lib/list-parse';
import {
	allowedLevels,
	buildListModel,
	computeMove,
	detectIndentUnit,
	findBlock,
	itemAt,
	LineRange,
	ListModel,
	ModelItem,
	nearestGap,
} from './move';

/** Distance from the editor edge where auto-scroll starts, px. */
const EDGE_ZONE = 56;
/** Auto-scroll speed at the very edge, px per frame. */
const MAX_SCROLL_SPEED = 22;
/** The finger has to move this far before the drag starts, px. */
const START_DISTANCE = 4;
/** One nesting level is never narrower than this, px, so a finger can pick it. */
const MIN_LEVEL_WIDTH = 16;

/** Lines being dragged (0-based range), shown half-transparent. */
export const setDraggedLines = StateEffect.define<LineRange | null>();

export const draggedLinesField = StateField.define<DecorationSet>({
	create: () => Decoration.none,
	update(decorations, transaction) {
		let result = decorations.map(transaction.changes);
		for (const effect of transaction.effects) {
			if (!effect.is(setDraggedLines)) continue;
			const range = effect.value;
			if (!range) {
				result = Decoration.none;
				continue;
			}
			const marks: Range<Decoration>[] = [];
			const doc = transaction.state.doc;
			for (let index = range.start; index < range.end && index < doc.lines; index++) {
				marks.push(Decoration.line({ class: 'list-toolkit-dragged' }).range(doc.line(index + 1).from));
			}
			result = Decoration.set(marks);
		}
		return result;
	},
	provide: (field) => EditorView.decorations.from(field),
});

/** Converts viewport coordinates to coordinates inside the editor's scroll container. */
export function toScroller(view: EditorView, x: number, y: number): { x: number; y: number } {
	const box = view.scrollDOM.getBoundingClientRect();
	return { x: x - box.left + view.scrollDOM.scrollLeft, y: y - box.top + view.scrollDOM.scrollTop };
}

export function docLines(state: EditorState): Lines {
	const doc = state.doc;
	return { count: doc.lines, get: (index) => doc.line(index + 1).text };
}

interface Target {
	gap: number;
	level: number;
}

/**
 * One drag of a list item, from the touch on the handle to the release.
 * All coordinates the session keeps are viewport coordinates (clientX/clientY).
 */
export class DragSession {
	private readonly lines: Lines;
	private readonly model: ListModel;
	private readonly block: LineRange;
	private readonly item: ModelItem;
	private readonly unit: string;
	private readonly indicator: HTMLElement;
	private started = false;
	private finished = false;
	private x: number;
	private y: number;
	private target: Target | null = null;
	private frame = 0;
	/** Screen x of the list marker at level 0 and the width of one level. */
	private baseX = 0;
	private levelWidth = MIN_LEVEL_WIDTH;
	/** Distance from the finger to the marker of the dragged item at the start. */
	private grabOffset = 0;

	static start(view: EditorView, line: number, event: PointerEvent, onEnd: () => void): DragSession | null {
		const state = view.state;
		const prefix = quotePrefix(state.doc.line(line + 1).text);
		const lines = unquotedLines(docLines(state), prefix);
		const model = buildListModel(lines, line, state.tabSize);
		if (!model) return null;
		const block = findBlock(lines, model, line);
		const item = itemAt(model, line);
		if (!block || !item) return null;
		return new DragSession(view, lines, prefix, model, block, item, event, onEnd);
	}

	private constructor(
		private readonly view: EditorView,
		lines: Lines,
		/** Quote or callout prefix of the list lines (`> `), empty for a plain list. */
		private readonly prefix: string,
		model: ListModel,
		block: LineRange,
		item: ModelItem,
		event: PointerEvent,
		private readonly onEnd: () => void,
	) {
		this.lines = lines;
		this.model = model;
		this.block = block;
		this.item = item;
		this.unit = detectIndentUnit(model, view.state.facet(indentUnit));
		this.x = event.clientX;
		this.y = event.clientY;
		this.indicator = view.scrollDOM.createDiv({ cls: 'list-toolkit-indicator' });
	}

	get isStarted(): boolean {
		return this.started;
	}

	move(event: PointerEvent): void {
		if (this.finished) return;
		if (!this.started) {
			if (Math.hypot(event.clientX - this.x, event.clientY - this.y) < START_DISTANCE) return;
			this.begin();
		}
		this.x = event.clientX;
		this.y = event.clientY;
		this.refresh();
	}

	/** Ends the drag: moves the block if the finger is over the editor and the place differs. */
	drop(event: PointerEvent): void {
		if (this.finished) return;
		if (!this.started) {
			this.finish();
			return;
		}
		this.x = event.clientX;
		this.y = event.clientY;
		this.refresh();
		const target = this.insideEditor() ? this.target : null;
		const cursor = this.cursor();
		const result = target
			? computeMove(this.lines, this.model, this.block, target.gap, target.level, this.unit, cursor)
			: null;
		if (!result) {
			this.finish();
			return;
		}
		const doc = this.view.state.doc;
		const from = doc.line(result.from + 1).from;
		const to = doc.line(result.to).to;
		const output = result.lines.map((text) => requote(text, this.prefix));
		let anchor: number | undefined;
		if (result.cursor) {
			anchor = from + this.prefix.length + result.cursor.ch;
			for (let index = 0; index < result.cursor.line - result.from; index++) {
				anchor += (output[index] ?? '').length + 1;
			}
		}
		this.finish({
			changes: { from, to, insert: output.join('\n') },
			selection: anchor === undefined ? undefined : { anchor },
			userEvent: 'move.drop',
		});
	}

	/** Ends the drag without changing the document. */
	cancel(): void {
		if (!this.finished) this.finish();
	}

	private begin(): void {
		this.started = true;
		this.measureLevels();
		this.view.dispatch({ effects: setDraggedLines.of(this.block) });
		this.view.scrollDOM.addClass('list-toolkit-dragging');
		if (typeof navigator.vibrate === 'function') navigator.vibrate(10);
		this.frame = this.view.dom.win.requestAnimationFrame(this.autoScroll);
	}

	private finish(spec: Parameters<EditorView['dispatch']>[0] = {}): void {
		this.finished = true;
		this.view.dom.win.cancelAnimationFrame(this.frame);
		this.indicator.remove();
		this.view.scrollDOM.removeClass('list-toolkit-dragging');
		if (this.started) {
			this.view.dispatch({ ...spec, effects: setDraggedLines.of(null) });
		}
		this.onEnd();
	}

	private markerX(line: number): number | null {
		const doc = this.view.state.doc;
		const item = itemAt(this.model, line);
		if (!item || line >= doc.lines) return null;
		return this.view.coordsAtPos(doc.line(line + 1).from + this.prefix.length + item.indent.length, 1)?.left ?? null;
	}

	/** Where each level starts on screen: measured from visible items of different levels where possible. */
	private measureLevels(): void {
		const own = this.markerX(this.item.line) ?? this.x;
		this.grabOffset = this.x - own;
		const byLevel = new Map<number, number>();
		for (const item of this.model.items) {
			if (byLevel.has(item.level)) continue;
			const pos = this.view.state.doc.line(item.line + 1).from;
			if (this.view.visibleRanges.some((range) => pos >= range.from && pos <= range.to)) {
				const x = this.markerX(item.line);
				if (x !== null) byLevel.set(item.level, x);
			}
		}
		const levels = [...byLevel.keys()].sort((a, b) => a - b);
		const first = levels[0];
		const last = levels[levels.length - 1];
		let width = this.view.defaultCharacterWidth * indentWidth(this.unit, this.view.state.tabSize);
		if (first !== undefined && last !== undefined && last > first) {
			width = ((byLevel.get(last) ?? 0) - (byLevel.get(first) ?? 0)) / (last - first);
		}
		this.levelWidth = Math.max(MIN_LEVEL_WIDTH, width);
		this.baseX = own - this.item.level * this.levelWidth;
	}

	private insideEditor(): boolean {
		const box = this.view.scrollDOM.getBoundingClientRect();
		return this.x >= box.left && this.x <= box.right && this.y >= box.top && this.y <= box.bottom;
	}

	private cursor(): { line: number; ch: number } | null {
		const head = this.view.state.selection.main.head;
		const line = this.view.state.doc.lineAt(head);
		return { line: line.number - 1, ch: Math.max(0, head - line.from - this.prefix.length) };
	}

	/** Finds the drop place under the finger and draws the indicator line there. */
	private refresh(): void {
		const view = this.view;
		const height = this.y - view.documentTop;
		const lineBlock = view.lineBlockAtHeight(height);
		const line = view.state.doc.lineAt(lineBlock.from).number - 1;
		const before = height < lineBlock.top + lineBlock.height / 2;
		const gap = nearestGap(this.model, this.block, line, before);
		const range = gap === null ? null : allowedLevels(this.model, this.block, gap);
		if (gap === null || !range) {
			this.target = null;
			this.indicator.toggleClass('is-visible', false);
			return;
		}
		const wanted = Math.round((this.x - this.grabOffset - this.baseX) / this.levelWidth);
		const level = Math.min(range.max, Math.max(range.min, wanted));
		this.target = { gap, level };

		const doc = view.state.doc;
		const top = gap < doc.lines ? view.lineBlockAt(doc.line(gap + 1).from).top : view.lineBlockAt(doc.length).bottom;
		const left = this.baseX + level * this.levelWidth;
		const content = view.contentDOM.getBoundingClientRect();
		const point = toScroller(view, left, top + view.documentTop);
		this.indicator.setCssProps({
			'--list-toolkit-indicator-top': `${point.y}px`,
			'--list-toolkit-indicator-left': `${point.x}px`,
			'--list-toolkit-indicator-width': `${Math.max(MIN_LEVEL_WIDTH, content.right - left)}px`,
		});
		this.indicator.toggleClass('is-visible', this.insideEditor());
	}

	private readonly autoScroll = (): void => {
		if (this.finished) return;
		const box = this.view.scrollDOM.getBoundingClientRect();
		const zone = Math.min(EDGE_ZONE, box.height / 4);
		let speed = 0;
		if (this.y < box.top + zone) speed = -MAX_SCROLL_SPEED * Math.min(1, (box.top + zone - this.y) / zone);
		else if (this.y > box.bottom - zone) speed = MAX_SCROLL_SPEED * Math.min(1, (this.y - (box.bottom - zone)) / zone);
		if (speed !== 0) {
			const before = this.view.scrollDOM.scrollTop;
			this.view.scrollDOM.scrollTop += speed;
			if (this.view.scrollDOM.scrollTop !== before) this.refresh();
		}
		this.frame = this.view.dom.win.requestAnimationFrame(this.autoScroll);
	};
}
