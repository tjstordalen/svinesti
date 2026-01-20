// editor.js - Level Editor
//
// TODO: Remaining features from editor.js.old:
// - Custom levels storage (localStorage persistence)
// - Save/New button handlers
// - Level name input handling
// - onLevelSaved callback to refresh level list in main.js

import { DEFAULT_LEVEL } from "./levels.js";
import { createGrid, TILE_CLASSES } from "./grid.js";
import { ui } from "./ui.js";
import * as animations from "./animations.js";

// --- Constants ---

const STORAGE_KEY = 'svinesti-custom-levels';
const EMPTY = 'empty';
const TARGET = 'target';
const COLORS = ['red', 'green', 'blue'];
const [RED, GREEN, BLUE] = COLORS;
const PIG_DIRS = ['pig-right', 'pig-down', 'pig-left', 'pig-up'];
const [PIG_RIGHT, PIG_DOWN, PIG_LEFT, PIG_UP] = PIG_DIRS;

// --- Validation ---

function validate(level) {
    if (!level.grid || !level.start || !level.nRows || !level.nCols) {
        return 'Invalid level data';
    }

    const { nCols, grid, start } = level;

    if (!/[RGB]/.test(grid.join(''))) return 'Level must have at least one target';

    // Add sentinel columns on left and right edges so that two elements from two
	// different rows are not adjacent when we linearize the grid below
    const paddedRows = grid.map(row => '.' + row + '.');
    const cells = paddedRows.join('').split('');
    const stride = nCols + 2; // each row is now two characters wider
    const pigIndex = start[0] * stride + start[1] + 1;

    if (cells[pigIndex] === '.') return 'Pig must be on a colored tile';

    function dfs(i) {
        const c = cells[i] || '.'; // because we can index out of bounds
        if (c === '.') return;
        cells[i] = '.';
        [i+1, i-1, i+stride, i-stride].forEach(dfs);
    }
    dfs(pigIndex);

    if (cells.some(c => c !== '.')) return 'All colored tiles must be reachable from the pig';

    return null;
}

// --- State ---

const state = {
    level: null,
    grid: null,
    drag: {
        source: null,
        isPig: false,
        active: false,
        carrying: false,
        justStartedCarrying: false,
    },
};


const tileAt = (e) => document.elementFromPoint(e.clientX, e.clientY)?.closest('.tile');
const firstMatch = (tile, classes) => classes.find(c => tile.classList.contains(c));
const isColor = (tile) => firstMatch(tile, COLORS);
const isPig = (tile) => firstMatch(tile, PIG_DIRS);

function serialize() {
	const { nRows, nCols, tiles } = state.grid;

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
	const dir = pigClass.slice('pig-'.length);

	return { nRows, nCols, grid, start, dir };
}

function load(level) {
    state.level = level;
    state.grid = createGrid(ui.editorGrid, level.nRows, level.nCols, level);

    // Add pig-* class to tile for editor click cycling logic
    const [row, col] = level.start;
    state.grid.getCell(row, col).classList.add('pig-' + level.dir);
}

function syncPigToClass() {
    const { tiles, nCols } = state.grid;
    const pigTile = tiles.find(t => PIG_DIRS.some(d => t.classList.contains(d)));
    if (!pigTile) return;

    const index = tiles.indexOf(pigTile);
    const row = Math.floor(index / nCols);
    const col = index % nCols;
    const dir = PIG_DIRS.find(d => pigTile.classList.contains(d)).slice(4);

    state.grid.placePig(row, col, dir);
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
            syncPigToClass();
            return;
        }
    }
}

// --- Pig Drag Handlers ---

function handlePointerDown(e) {
    if (!e.isPrimary || e.button !== 0) return;
    if (state.drag.carrying) return;  // Placement handled by click
    e.preventDefault();
    e.target.setPointerCapture(e.pointerId);

    state.drag.source = e.target.closest('.tile');
    state.drag.active = false;

    const pigClass = isPig(state.drag.source);
    state.drag.isPig = pigClass !== undefined;
    ui.ghost.className = pigClass ? 'ghost ' + pigClass : 'ghost ' + state.drag.source?.className;
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
}

function handlePointerUp(e) {
    if (state.drag.source === null) return;  // No active drag
    if (state.drag.carrying) return;  // Placement handled by click

    if (!state.drag.active) {
        // Click: cycle the tile
        handleLeftClick({ target: state.drag.source });
        state.drag.source = null;
    } else {
        // Drag detected: enter carrying mode
        state.drag.carrying = true;
        state.drag.justStartedCarrying = true;
    }
}

function handleMouseMove(e) {
    if (!state.drag.carrying) return;
    ui.ghost.style.left = e.clientX + 'px';
    ui.ghost.style.top = e.clientY + 'px';

    // Paint tiles while carrying a non-pig (if mouse button held)
    if (!state.drag.isPig && e.buttons === 1) {
        const targetTile = tileAt(e);
        if (targetTile) {
            const pigClass = isPig(targetTile);
            if (!(pigClass && state.drag.source.classList.contains('empty'))) {
                targetTile.className = state.drag.source.className + (pigClass ? ' ' + pigClass : '');
            }
        }
    }
}

function handleGridClick(e) {
    if (!state.drag.carrying) return;

    // Skip the click that fired immediately after entering carrying mode
    if (state.drag.justStartedCarrying) {
        state.drag.justStartedCarrying = false;
        return;
    }

    const targetTile = tileAt(e);
    if (targetTile) {
        if (state.drag.isPig) {
            // Move pig to target tile, then exit carrying mode
            const pigClass = isPig(state.drag.source);
            const targetColor = isColor(targetTile);
            const sourceColor = isColor(state.drag.source);
            const color = targetColor || sourceColor;
            targetTile.className = 'tile ' + color + ' ' + pigClass;
            state.drag.source.classList.remove(pigClass);

            // Reset carrying state
            ui.ghost.style.visibility = 'hidden';
            state.drag.source = null;
            state.drag.active = false;
            state.drag.carrying = false;
            state.drag.justStartedCarrying = false;

            syncPigToClass();
        } else {
            // Stamp source color to target tile, stay in carrying mode
            const pigClass = isPig(targetTile);
            if (!(pigClass && state.drag.source.classList.contains('empty'))) {
                targetTile.className = state.drag.source.className + (pigClass ? ' ' + pigClass : '');
            }
        }
    }
}

function handleRightClick(e) {
    e.preventDefault();

    // Cancel carrying mode
    if (state.drag.carrying) {
        ui.ghost.style.visibility = 'hidden';
        state.drag.source = null;
        state.drag.active = false;
        state.drag.carrying = false;
        state.drag.justStartedCarrying = false;
        return;
    }

    if (state.drag.source) return; // Ignore during drag
    const tile = e.target.closest('.tile');
    if (!tile) return;
    if (isColor(tile) && !isPig(tile)) tile.classList.toggle('target');
}

// --- Share ---

function compact(level) {
    const { grid, start, dir } = level;

	const rows = grid;
	const col = i => grid.map(row => row[i]).join('');
	const columns = [...grid[0]].map((_,i) => col(i));

    const hasColor = s => /[^.]/.test(s);
    const minR = rows.findIndex(hasColor);
    const maxR = rows.findLastIndex(hasColor);
    const minC = columns.findIndex(hasColor);
    const maxC = columns.findLastIndex(hasColor);

    const newGrid = [];
    for (let r = minR; r <= maxR; r++) {
        newGrid.push(grid[r].slice(minC, maxC + 1));
    }

    return {
        nRows: maxR - minR + 1,
        nCols: maxC - minC + 1,
        grid: newGrid,
        start: [start[0] - minR, start[1] - minC],
        dir,
    };
}

function exportToURL(level) {
    const encoded = btoa(JSON.stringify(level));
    return `${location.origin}${location.pathname}#level=${encoded}`;
}

function importFromURL() {
    if (!location.hash.startsWith('#level=')) return null;
    try {
        const encoded = location.hash.slice(7);
        const level = JSON.parse(atob(encoded));
        if (validate(level)) {
            console.error('Invalid level data in URL');
            return null;
        }
        history.replaceState(null, '', location.pathname);
        return level;
    } catch (e) {
        console.error('Failed to decode level from URL:', e);
        return null;
    }
}

async function handleShareClick() {
    const level = serialize();
    const error = validate(level);
    if (error) {
        animations.notify(ui.editorNotification, error, true);
        return;
    }
    const url = exportToURL(compact(level));
    try {
        await navigator.clipboard.writeText(url);
        animations.notify(ui.editorNotification, 'Link copied to clipboard!');
    } catch (e) {
        prompt('Copy this link to share your level:', url);
    }
}

// --- Local Storage ---

function getCustomLevels() {
    const json = localStorage.getItem(STORAGE_KEY);
    return json ? JSON.parse(json) : [];
}

function saveCustomLevel(level) {
    const levels = getCustomLevels();
    levels.push(level);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(levels));
}

function handleSaveClick() {
    const level = serialize();
    const error = validate(level);
    if (error) {
        animations.notify(ui.editorNotification, error, true);
        return;
    }
    const compacted = compact(level);
    compacted.name = 'Custom';
    saveCustomLevel(compacted);
    animations.notify(ui.editorNotification, 'Level saved!');
}

function enter() {
    load(DEFAULT_LEVEL);

    ui.editorGrid.addEventListener('contextmenu', handleRightClick);
    ui.editorGrid.addEventListener('pointerdown', handlePointerDown);
    ui.editorGrid.addEventListener('pointermove', handlePointerMove);
    ui.editorGrid.addEventListener('pointerup', handlePointerUp);
    ui.editorGrid.addEventListener('pointercancel', handlePointerUp);
    ui.editorGrid.addEventListener('click', handleGridClick);
    document.addEventListener('mousemove', handleMouseMove);
    ui.editorSave.addEventListener('click', handleSaveClick);
    ui.editorShare.addEventListener('click', handleShareClick);
}

function exit() {
    ui.editorGrid.removeEventListener('contextmenu', handleRightClick);
    ui.editorGrid.removeEventListener('pointerdown', handlePointerDown);
    ui.editorGrid.removeEventListener('pointermove', handlePointerMove);
    ui.editorGrid.removeEventListener('pointerup', handlePointerUp);
    ui.editorGrid.removeEventListener('pointercancel', handlePointerUp);
    ui.editorGrid.removeEventListener('click', handleGridClick);
    document.removeEventListener('mousemove', handleMouseMove);
    ui.editorSave.removeEventListener('click', handleSaveClick);
    ui.editorShare.removeEventListener('click', handleShareClick);
}

export { enter, exit, load, serialize, validate, importFromURL, getCustomLevels };
