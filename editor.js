// editor.js - Level Editor

import * as Board from "./board.js";

// --- UI References ---

let ui = null;

// --- Drag State ---

const DRAG_DELAY = 200;
let clickStart = null;
let sourceTile = null;
let ghost = null;
let isPigDrag = false;

// --- Click Cycling Maps ---

// Left-click cycles through these replacements, applying the first match.
// Order matters: pig directions are checked before colors, so clicking a
// tile with "tile blue pig-right" matches "pig-right" first and rotates
// the pig, rather than changing the tile color.
const leftClickReplacements = [
    // Pig directions (clockwise) - checked first
    ["pig-right", "pig-down"],
    ["pig-down", "pig-left"],
    ["pig-left", "pig-up"],
    ["pig-up", "pig-right"],

    // Tile colors - checked if no pig class present
    ["empty", "blue"],
    ["blue", "green"],
    ["green", "red"],
    ["red", "empty"],
]

function handleLeftClick(e) {
    const tile = e.target.closest('.tile');
    if (!tile) return;
    for (const [from, to] of leftClickReplacements) {
        if (tile.classList.replace(from, to)) return;
    }
}

// --- Pig Drag Handlers ---

function handlePointerDown(e) {
	if (!e.isPrimary || e.button !== 0) return;
	clickStart = Date.now();
	sourceTile = e.target.closest('.tile');

	// Set ghost class: pig only for pig tiles, otherwise copy full class
	const pigClass = sourceTile?.className.match(/pig-\w+/)?.[0];
	isPigDrag = pigClass !== undefined;
	ghost.className = 'ghost ' + (pigClass ? pigClass : sourceTile?.className);
}

function handlePointerMove(e) {
	if (clickStart === null) return;
	const drag = Date.now() - clickStart >= DRAG_DELAY;
	if (!drag) return;
	ghost.style.visibility = 'visible';
	ghost.style.left = e.clientX + 'px';
	ghost.style.top = e.clientY + 'px';

	// Paint mode: copy source classes to tiles we drag over
	if (!isPigDrag) {
		const targetTile = document.elementFromPoint(e.clientX, e.clientY)?.closest('.tile');
		// Skip pig's tile and source tile
		if (targetTile && targetTile !== sourceTile && !/pig-\w+/.test(targetTile.className)) {
			targetTile.className = sourceTile.className;
		}
	}
}

function handlePointerUp(e) {
	if (clickStart === null) return;
	const drag = Date.now() - clickStart >= DRAG_DELAY;
	if (!drag) {
		handleLeftClick({ target: sourceTile });
		clickStart = null;
		sourceTile = null;
		return;
	}

	// Pig drag: move pig to target tile
	if (isPigDrag) {
		const targetTile = document.elementFromPoint(e.clientX, e.clientY)?.closest('.tile');
		if (targetTile && targetTile !== sourceTile) {
			targetTile.className = sourceTile.className;
			sourceTile.className = sourceTile.className.replace(/pig-(right|down|left|up)/, '').trim();
		}
	}
	// Paint drag: already handled in handlePointerMove

	ghost.style.visibility = 'hidden';
	clickStart = null;
	sourceTile = null;
}

function handleRightClick(e) {
    e.preventDefault();
    const tile = e.target.closest('.tile');
    if (tile && !tile.classList.contains('empty')) tile.classList.toggle('target');
}

function enter() {
    const emptyLevel = {
        nRows: 9,
        nCols: 16,
        grid: Array.from({ length: 9 }, () => Array(16).fill('.')),
    };
    Board.renderGrid(ui.editorGrid, emptyLevel, { addIndices: true });

    // Add pig to a starting tile (bottom-left, facing right)
    const startTile = ui.editorGrid.children[8 * 16]; // row 8, col 0
    startTile.className = 'tile blue pig-right';

    ui.editorGrid.addEventListener('contextmenu', handleRightClick);
    ui.editorGrid.addEventListener('pointerdown', handlePointerDown);
    ui.editorGrid.addEventListener('pointermove', handlePointerMove);
    ui.editorGrid.addEventListener('pointerup', handlePointerUp);
}

function exit() {
    ui.editorGrid.removeEventListener('contextmenu', handleRightClick);
    ui.editorGrid.removeEventListener('pointerdown', handlePointerDown);
    ui.editorGrid.removeEventListener('pointermove', handlePointerMove);
    ui.editorGrid.removeEventListener('pointerup', handlePointerUp);
}

// --- Initialize ---

export function init(uiRefs) {
    ui = uiRefs;
    ghost = document.getElementById("ghost");
}

export { enter, exit };
