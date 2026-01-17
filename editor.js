// editor.js - Level Editor

import { TILE_CLASSES, DEFAULT_LEVEL } from "./levels.js";
import { ui } from "./ui.js";

// --- Constants ---

const EMPTY = 'empty';
const TARGET = 'target';
const COLORS = ['red', 'green', 'blue'];
const [RED, GREEN, BLUE] = COLORS;
const PIG_DIRS = ['pig-right', 'pig-down', 'pig-left', 'pig-up'];
const [PIG_RIGHT, PIG_DOWN, PIG_LEFT, PIG_UP] = PIG_DIRS;

// --- State ---

const state = {
    level: null,
    drag: {
        source: null,
        isPig: false,
        active: false,
    },
};


const tileAt = (e) => document.elementFromPoint(e.clientX, e.clientY)?.closest('.tile');
const firstMatch = (tile, classes) => classes.find(c => tile.classList.contains(c));
const isColor = (tile) => firstMatch(tile, COLORS);
const isPig = (tile) => firstMatch(tile, PIG_DIRS);

function serialize() {
	const { nRows, nCols } = state.level;
	const tiles = [...ui.editorGrid.children];

	const tileToChar = (tile) => {
		const color = firstMatch(tile, [RED, GREEN, BLUE, EMPTY]);
		const hasTarget = tile.classList.contains(TARGET);
		const ch = color === EMPTY ? '.' : color[0];
		return hasTarget ? ch.toUpperCase() : ch.toLowerCase();
	};

	const chars = tiles.map(tileToChar);
	const grid = [];
	while (chars.length > 0) {
		const row = chars.splice(0, nCols);
		grid.push(row.join(''));
	}

	// Find pig position and direction
	const pigIndex = tiles.findIndex(isPig);
	if (pigIndex < 0) throw new Error('No pig found in grid');
	const pigRow = Math.floor(pigIndex / nCols);
	const pigCol = pigIndex % nCols;
	const start = [pigRow, pigCol];
	const pigClass = firstMatch(tiles[pigIndex], PIG_DIRS);
	const direction = pigClass.slice('pig-'.length);

	return { nRows, nCols, grid, start, direction };
}

function load(level) {
    state.level = level;

    document.documentElement.style.setProperty('--grid-n-rows', level.nRows);
    document.documentElement.style.setProperty('--grid-n-cols', level.nCols);

    ui.editorGrid.innerHTML = '';
    for (const ch of level.grid.join('')) {
        const tile = document.createElement('div');
        tile.className = 'tile ' + TILE_CLASSES[ch];
        ui.editorGrid.appendChild(tile);
    }

    // Place pig
    const pigIndex = level.start[0] * level.nCols + level.start[1];
    ui.editorGrid.children[pigIndex].classList.add('pig-' + level.dir);
}

// --- Click Cycling Maps ---

// Left-click cycles through these replacements, applying the first match.
// Order matters: pig directions are checked before colors, so clicking a
// tile with "tile blue pig-right" matches "pig-right" first and rotates
// the pig, rather than changing the tile color.
const leftClickReplacements = [
    // Pig directions (clockwise) - checked first
    [PIG_RIGHT, PIG_DOWN],
    [PIG_DOWN, PIG_LEFT],
    [PIG_LEFT, PIG_UP],
    [PIG_UP, PIG_RIGHT],

    // Tile colors - checked if no pig class present
    [EMPTY, BLUE],
    [BLUE, GREEN],
    [GREEN, RED],
    [RED, EMPTY],
]

function handleLeftClick(e) {
    const tile = e.target.closest('.tile');
    if (!tile) return;
    for (const [from, to] of leftClickReplacements) {
        if (tile.classList.replace(from, to)) {
            if (to === EMPTY) tile.classList.remove(TARGET);
            return;
        }
    }
}

// --- Pig Drag Handlers ---

function handlePointerDown(e) {
    if (!e.isPrimary || e.button !== 0) return;
    e.preventDefault();
    e.target.setPointerCapture(e.pointerId);

    state.drag.source = e.target.closest('.tile');
    state.drag.active = false;

    // Set ghost class: pig only for pig tiles, otherwise copy full class
    const pigClass = isPig(state.drag.source);
    state.drag.isPig = pigClass !== undefined;
    ui.ghost.className = 'ghost ' + (pigClass ? pigClass : state.drag.source?.className);
}

function handlePointerMove(e) {
    if (state.drag.source === null) return;  // No active drag
    const targetTile = tileAt(e);

    // Detect drag: pointer moved to a different tile
    if (!state.drag.active && targetTile && targetTile !== state.drag.source) {
        state.drag.active = true;
        ui.ghost.style.visibility = 'visible';
    }

    if (!state.drag.active) return;

    ui.ghost.style.left = e.clientX + 'px';
    ui.ghost.style.top = e.clientY + 'px';

    // Paint mode: copy source color to tiles we drag over
    if (!state.drag.isPig && targetTile) {
        const pigClass = isPig(targetTile);
        // Skip if painting empty over pig (would erase tile under pig)
        if (pigClass && state.drag.source.classList.contains('empty')) return;
        targetTile.className = state.drag.source.className + (pigClass ? ' ' + pigClass : '');
    }
}

function handlePointerUp(e) {
    if (state.drag.source === null) return;  // No active drag

    if (!state.drag.active) {
        // Click: cycle the tile
        handleLeftClick({ target: state.drag.source });
    } else if (state.drag.isPig) {
        // Pig drag: move pig to target tile
        const targetTile = tileAt(e);
        if (targetTile && targetTile !== state.drag.source) {
            const pigClass = isPig(state.drag.source);
            // Keep target's color if it has one, otherwise inherit source's color
            const targetColor = isColor(targetTile);
            const sourceColor = isColor(state.drag.source);
            const color = targetColor || sourceColor;
            targetTile.className = 'tile ' + color + ' ' + pigClass;
            state.drag.source.classList.remove(pigClass);
        }
    }
    // Paint drag: already handled in handlePointerMove

    ui.ghost.style.visibility = 'hidden';
    state.drag.source = null;
}

function handleRightClick(e) {
    e.preventDefault();
    if (state.drag.source) return; // Ignore during drag
    const tile = e.target.closest('.tile');
    if (!tile) return;
    if (isColor(tile) && !isPig(tile)) tile.classList.toggle('target');
}

function enter() {
    load(DEFAULT_LEVEL);

    ui.editorGrid.addEventListener('contextmenu', handleRightClick);
    ui.editorGrid.addEventListener('pointerdown', handlePointerDown);
    ui.editorGrid.addEventListener('pointermove', handlePointerMove);
    ui.editorGrid.addEventListener('pointerup', handlePointerUp);
    ui.editorGrid.addEventListener('pointercancel', handlePointerUp);
}

function exit() {
    ui.editorGrid.removeEventListener('contextmenu', handleRightClick);
    ui.editorGrid.removeEventListener('pointerdown', handlePointerDown);
    ui.editorGrid.removeEventListener('pointermove', handlePointerMove);
    ui.editorGrid.removeEventListener('pointerup', handlePointerUp);
    ui.editorGrid.removeEventListener('pointercancel', handlePointerUp);
}

export { enter, exit, load, serialize };
