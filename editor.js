// editor.js - Level Editor
//
// State-driven editor using the level format's character representation.
// A single render() function syncs state to DOM on every change.

import { DEFAULT_LEVEL } from "./levels.js";
import { createGrid, TILE_CLASSES } from "./grid.js";
import { ui } from "./ui.js";
import * as animations from "./animations.js";

// --- Constants ---

const STORAGE_KEY = 'svinesti-custom-levels';

// Left-click cycles tile colors (preserves target status)
const COLOR_CYCLE = {
    '.': 'b', 'b': 'g', 'g': 'r', 'r': '.',
              'B': 'G', 'G': 'R', 'R': '.'
};

// Right-click toggles target (star) on/off
const TARGET_CYCLE = {
    '.': '.', 'b': 'B', 'B': 'b', 'g': 'G', 'G': 'g', 'r': 'R', 'R': 'r'
};

// Pig rotation (clockwise)
const DIR_CYCLE = { right: 'down', down: 'left', left: 'up', up: 'right' };

// For ghost rendering
const CHAR_TO_COLOR = { '.': 'empty', 'r': 'red', 'g': 'green', 'b': 'blue' };

// --- State ---

const state = {
    cells: [],       // 1D array of chars: '.rgbRGB'
    nRows: 0,
    nCols: 0,
    pigIndex: 0,
    pigDir: 'right',
    cursor: 0,
    clipboard: null, // char when in paint mode, null otherwise
    paintHeld: false,
    isMouseDown: false,
    isDraggingPig: false,
    grid: null,      // grid object for DOM refs
};

const inPaintMode = () => state.clipboard !== null;
const isTarget = (c) => c !== '.' && c === c.toUpperCase();

// --- Rendering ---

function render() {
    state.cells.forEach((char, i) => {
        const tile = state.grid.tiles[i];
        tile.className = 'tile ' + TILE_CLASSES[char];
        if (i === state.cursor) tile.classList.add('cursor');
        if (i === state.pigIndex) tile.classList.add('pig-' + state.pigDir);
    });

    const g = ui.editorGrid.style;
    ui.editorGrid.classList.remove('ghost-red', 'ghost-green', 'ghost-blue');
    if (state.isDraggingPig && state.cursor !== state.pigIndex) {
        g.setProperty('--ghost-pig', `url(/pigs/${state.pigDir}-1.png)`);
        g.setProperty('--ghost-color', 'transparent');
        g.setProperty('--ghost-visible', 'visible');
    } else if (state.clipboard) {
        g.removeProperty('--ghost-pig');
        const color = CHAR_TO_COLOR[state.clipboard.toLowerCase()];
        if (color !== 'empty') ui.editorGrid.classList.add('ghost-' + color);
        g.setProperty('--ghost-color', `var(--tile-${color})`);
        g.setProperty('--ghost-star', isTarget(state.clipboard) ? 'url(/img/golden-apple.png)' : 'none');
        g.setProperty('--ghost-visible', 'visible');
    } else {
        g.removeProperty('--ghost-pig');
        g.setProperty('--ghost-visible', 'hidden');
    }
}

// --- State Mutations ---

function cycleColor(i) {
    if (i === state.pigIndex) {
        state.pigDir = DIR_CYCLE[state.pigDir];
    } else {
        state.cells[i] = COLOR_CYCLE[state.cells[i]];
    }
    render();
}

function cycleTarget(i) {
    if (i === state.pigIndex) return;
    state.cells[i] = TARGET_CYCLE[state.cells[i]];
    render();
}

function movePigTo(i) {
    if (state.cells[i] === '.') {
        state.cells[i] = state.cells[state.pigIndex].toLowerCase();
    }
    state.pigIndex = i;
    render();
}

function pasteCell(i) {
    if (state.clipboard) {
        state.cells[i] = state.clipboard;
        render();
    }
}

function moveCursor(direction) {
    const i = state.cursor;
    let next;

    switch (direction) {
        case 'up':
            next = i - state.nCols;
            if (next < 0) return;
            break;
        case 'down':
            next = i + state.nCols;
            if (next >= state.cells.length) return;
            break;
        case 'left':
            if (i % state.nCols === 0) return;
            next = i - 1;
            break;
        case 'right':
            if ((i + 1) % state.nCols === 0) return;
            next = i + 1;
            break;
        default:
            return;
    }

    state.cursor = next;
    if (inPaintMode() && state.paintHeld) {
        pasteCell(next);
    } else {
        render();
    }
}

// --- Load / Serialize ---

function load(level) {
    state.nRows = level.nRows;
    state.nCols = level.nCols;
    state.cells = level.grid.join('').split('');
    state.pigIndex = level.start[0] * level.nCols + level.start[1];
    state.pigDir = level.dir;
    state.cursor = state.pigIndex;
    state.clipboard = null;

    state.grid = createGrid(ui.editorGrid, level.nRows, level.nCols, level);
    state.grid.tiles.forEach((tile, i) => tile.index = i);
    state.grid.pig.remove();
    render();
}

function serialize() {
    const rows = [];
    for (let r = 0; r < state.nRows; r++) {
        const start = r * state.nCols;
        const end = start + state.nCols;
        const row = state.cells.slice(start, end).join('');
        rows.push(row);
    }

    const pigRow = Math.floor(state.pigIndex / state.nCols);
    const pigCol = state.pigIndex % state.nCols;

    return {
        nRows: state.nRows,
        nCols: state.nCols,
        grid: rows,
        start: [pigRow, pigCol],
        dir: state.pigDir
    };
}

// --- Validation ---

// Checks that a level is playable:
// 1. Has at least one target (star)
// 2. Pig is on a colored tile
// 3. All colored tiles are reachable from the pig
function validate(level) {
    if (!level.grid || !level.start || !level.nRows || !level.nCols) {
        return 'Invalid level data';
    }

    const { nCols, grid, start } = level;

    if (!/[RGB]/.test(grid.join(''))) {
        return 'Level must have at least one target';
    }

    // Pad each row with '.' sentinels on left and right.
    // This lets us use i+1/i-1 for horizontal neighbors without
    // accidentally wrapping to the adjacent row.
    const cells = grid.map(row => '.' + row + '.').join('').split('');
    const stride = nCols + 2; // padded row width
    const pigIndex = start[0] * stride + start[1] + 1; // +1 for left padding

    if (cells[pigIndex] === '.') {
        return 'Pig must be on a colored tile';
    }

    // Flood-fill from pig position, marking visited cells as '.'
    function dfs(i) {
        const c = cells[i] || '.';
        if (c === '.') return;
        cells[i] = '.';
        // Horizontal neighbors are safe due to sentinels
        // Vertical neighbors use stride to skip padding
        dfs(i + 1);
        dfs(i - 1);
        dfs(i + stride);
        dfs(i - stride);
    }
    dfs(pigIndex);

    // If any colored tiles remain, they weren't reachable
    if (cells.some(c => c !== '.')) {
        return 'All colored tiles must be reachable from the pig';
    }

    return null;
}

// --- Keyboard Events ---

function handleKeyDown(e) {
    switch (e.key) {
        case ' ':
            e.preventDefault();
            state.paintHeld = true;
            if (inPaintMode()) pasteCell(state.cursor);
            else cycleColor(state.cursor);
            break;

        case 'ArrowUp':
            e.preventDefault();
            ui.editorGrid.classList.add('keyboard-nav');
            moveCursor('up');
            break;

        case 'ArrowDown':
            e.preventDefault();
            ui.editorGrid.classList.add('keyboard-nav');
            moveCursor('down');
            break;

        case 'ArrowLeft':
            e.preventDefault();
            ui.editorGrid.classList.add('keyboard-nav');
            moveCursor('left');
            break;

        case 'ArrowRight':
            e.preventDefault();
            ui.editorGrid.classList.add('keyboard-nav');
            moveCursor('right');
            break;

        case 's':
            cycleTarget(state.cursor);
            break;

        case 'p':
            movePigTo(state.cursor);
            break;

        case 'c':
            state.clipboard = inPaintMode() ? null : state.cells[state.cursor];
            render();
            break;
    }
}

function handleKeyUp(e) {
    if (e.key === ' ') {
        state.paintHeld = false;
    }
}

// --- Mouse Events ---

function tileIndexFromEvent(e) {
    const tile = e.target.closest('.tile');
    return tile ? tile.index : null;
}

function handleMouseDown(e) {
    const i = tileIndexFromEvent(e);
    if (i === null) return;

    e.preventDefault();
    ui.editorGrid.classList.remove('keyboard-nav');
    state.cursor = i;

    if (e.button === 2) {
        // Right-click
        if (inPaintMode()) {
            state.clipboard = null;
            render();
        } else {
            cycleTarget(i);
        }
        return;
    }

    // Left-click
    if (e.shiftKey) {
        state.clipboard = state.cells[i];
        render();
    } else if (inPaintMode()) {
        state.isMouseDown = true;
        pasteCell(i);
    } else if (i === state.pigIndex) {
        state.isDraggingPig = true;
        render();
    } else {
        cycleColor(i);
    }
}

function handleMouseMove(e) {
    const i = tileIndexFromEvent(e);
    if (i === null || i === state.cursor) return;

    state.cursor = i;

    if (inPaintMode() && state.isMouseDown) {
        pasteCell(i);
    } else {
        render();
    }
}

function handleMouseUp(e) {
    if (state.isDraggingPig) {
        if (state.cursor === state.pigIndex) {
            state.pigDir = DIR_CYCLE[state.pigDir];
            render();
        } else {
            movePigTo(state.cursor);
        }
        state.isDraggingPig = false;
    }
    state.isMouseDown = false;
}

function handleContextMenu(e) {
    e.preventDefault();
}

// --- Share ---

// Trims empty rows/columns from edges of level
function compact(level) {
    const { grid, start, dir } = level;
    const nRows = grid.length;
    const nCols = grid[0].length;

    // Find bounds of non-empty content
    let minRow = nRows, maxRow = -1;
    let minCol = nCols, maxCol = -1;

    for (let r = 0; r < nRows; r++) {
        for (let c = 0; c < nCols; c++) {
            if (grid[r][c] !== '.') {
                if (r < minRow) minRow = r;
                if (r > maxRow) maxRow = r;
                if (c < minCol) minCol = c;
                if (c > maxCol) maxCol = c;
            }
        }
    }

    // Extract the bounded region
    const newGrid = [];
    for (let r = minRow; r <= maxRow; r++) {
        newGrid.push(grid[r].slice(minCol, maxCol + 1));
    }

    return {
        nRows: maxRow - minRow + 1,
        nCols: maxCol - minCol + 1,
        grid: newGrid,
        start: [start[0] - minRow, start[1] - minCol],
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

// --- Enter / Exit ---

function enter() {
    load(DEFAULT_LEVEL);

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('mouseup', handleMouseUp);
    ui.editorGrid.addEventListener('mousedown', handleMouseDown);
    ui.editorGrid.addEventListener('mousemove', handleMouseMove);
    ui.editorGrid.addEventListener('contextmenu', handleContextMenu);
    ui.editorSave.addEventListener('click', handleSaveClick);
    ui.editorShare.addEventListener('click', handleShareClick);
}

function exit() {
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('keyup', handleKeyUp);
    document.removeEventListener('mouseup', handleMouseUp);
    ui.editorGrid.removeEventListener('mousedown', handleMouseDown);
    ui.editorGrid.removeEventListener('mousemove', handleMouseMove);
    ui.editorGrid.removeEventListener('contextmenu', handleContextMenu);
    ui.editorSave.removeEventListener('click', handleSaveClick);
    ui.editorShare.removeEventListener('click', handleShareClick);
}

export { enter, exit, load, serialize, validate, importFromURL, getCustomLevels };
