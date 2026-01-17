// editor.js - Level Editor

// --- Constants ---

const N_ROWS = 9;
const N_COLS = 16;
const COLORS = ['red', 'green', 'blue'];
const PIG_DIRS = ['pig-right', 'pig-down', 'pig-left', 'pig-up'];

// --- UI References ---

let ui = null;

// --- Drag State ---

let sourceTile = null;
let ghost = null;
let isPigDrag = false;
let isDragging = false;






const tileAt = (e) => document.elementFromPoint(e.clientX, e.clientY)?.closest('.tile');
const hasAnyClass = (tile, classes) => classes.find(c => tile.classList.contains(c));

function serialize() {
    const grid = [];
    let row = '';
    let start = null;
    let dir = null;

    for (let i = 0; i < ui.editorGrid.children.length; i++) {
        const tile = ui.editorGrid.children[i];

        // Color: red/green/blue → r/g/b, else '.'
        const color = hasAnyClass(tile, COLORS);
        let char = color ? color[0] : '.';
        if (tile.classList.contains('target')) char = char.toUpperCase();

        // Pig position and direction
        const pigDir = hasAnyClass(tile, PIG_DIRS)?.slice(4);
        if (pigDir) {
            start = [Math.floor(i / N_COLS), i % N_COLS];
            dir = pigDir;
        }

        row += char;
        if ((i + 1) % N_COLS === 0) {
            grid.push(row);
            row = '';
        }
    }

    return { nRows: N_ROWS, nCols: N_COLS, grid, start, dir };
}

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
    e.preventDefault();
    e.target.setPointerCapture(e.pointerId);

    sourceTile = e.target.closest('.tile');
    isDragging = false;

    // Set ghost class: pig only for pig tiles, otherwise copy full class
    const pigClass = hasAnyClass(sourceTile, PIG_DIRS);
    isPigDrag = pigClass !== undefined;
    ghost.className = 'ghost ' + (pigClass ? pigClass : sourceTile?.className);
}

function handlePointerMove(e) {
    if (sourceTile === null) return;
    const targetTile = tileAt(e);

    // Detect drag: pointer moved to a different tile
    if (!isDragging && targetTile && targetTile !== sourceTile) {
        isDragging = true;
        ghost.style.visibility = 'visible';
    }

    if (!isDragging) return;

    ghost.style.left = e.clientX + 'px';
    ghost.style.top = e.clientY + 'px';

    // Paint mode: copy source color to tiles we drag over
    if (!isPigDrag && targetTile) {
        const pigClass = hasAnyClass(targetTile, PIG_DIRS);
        // Skip if painting empty over pig (would erase tile under pig)
        if (pigClass && sourceTile.classList.contains('empty')) return;
        targetTile.className = sourceTile.className + (pigClass ? ' ' + pigClass : '');
    }
}

function handlePointerUp(e) {
    if (sourceTile === null) return;

    if (!isDragging) {
        // Click: cycle the tile
        handleLeftClick({ target: sourceTile });
    } else if (isPigDrag) {
        // Pig drag: move pig to target tile
        const targetTile = tileAt(e);
        if (targetTile && targetTile !== sourceTile) {
            const pigClass = hasAnyClass(sourceTile, PIG_DIRS);
            // Keep target's color if it has one, otherwise inherit source's color
            const targetColor = hasAnyClass(targetTile, COLORS);
            const sourceColor = hasAnyClass(sourceTile, COLORS);
            const color = targetColor || sourceColor;
            targetTile.className = 'tile ' + color + ' ' + pigClass;
            sourceTile.classList.remove(pigClass);
        }
    }
    // Paint drag: already handled in handlePointerMove

    ghost.style.visibility = 'hidden';
    sourceTile = null;
}

function handleRightClick(e) {
    e.preventDefault();
    if (sourceTile) return; // Ignore during drag
    const tile = e.target.closest('.tile');
    if (!tile) return;
    const isColor = hasAnyClass(tile, COLORS);
    const isPig = hasAnyClass(tile, PIG_DIRS);
    if (isColor && !isPig) tile.classList.toggle('target');
}

function enter() {
    document.documentElement.style.setProperty('--grid-n-rows', N_ROWS);
    document.documentElement.style.setProperty('--grid-n-cols', N_COLS);

    ui.editorGrid.innerHTML = '';
    for (let i = 0; i < N_ROWS * N_COLS; i++) {
        const tile = document.createElement('div');
        tile.className = 'tile empty';
        ui.editorGrid.appendChild(tile);
    }

    // Pig starts bottom-left, facing right
    ui.editorGrid.children[(N_ROWS - 1) * N_COLS].className = 'tile blue pig-right';

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

// --- Initialize ---

export function init(uiRefs) {
    ui = uiRefs;
    ghost = document.getElementById("ghost");
}

export { enter, exit, serialize };
