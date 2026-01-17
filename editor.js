// editor.js - Level Editor

// --- Constants ---

const N_ROWS = 9;
const N_COLS = 16;
const EMPTY =  'empty';
const TARGET = 'target';
const COLORS = ['red', 'green', 'blue'];
const [RED, GREEN, BLUE] = COLORS;
const PIG_DIRS = ['pig-right', 'pig-down', 'pig-left', 'pig-up'];
const [PIG_RIGHT, PIG_DOWN, PIG_LEFT, PIG_UP] = PIG_DIRS;

// --- UI References ---

let ui = null;

// --- Drag State ---

let sourceTile = null;
let ghost = null;
let isPigDrag = false;
let isDragging = false;


const tileAt = (e) => document.elementFromPoint(e.clientX, e.clientY)?.closest('.tile');
const firstMatch = (tile, classes) => classes.find(c => tile.classList.contains(c));
const isColor = (tile) => firstMatch(tile, COLORS);
const isPig = (tile) => firstMatch(tile, PIG_DIRS);

function serialize() {
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
		const row = chars.splice(0, N_COLS);
		grid.push(row.join(''));
	}

	// Find pig position and direction
	const pigIndex = tiles.findIndex(isPig);
	if (pigIndex < 0) throw new Error('No pig found in grid');
	const pigRow = Math.floor(pigIndex / N_COLS);
	const pigCol = pigIndex % N_COLS;
	const start = [pigRow, pigCol];
	const pigClass = firstMatch(tiles[pigIndex], PIG_DIRS);
	const direction = pigClass.slice('pig-'.length);

	return { nRows: N_ROWS, nCols: N_COLS, grid, start, direction };
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
    const pigClass = isPig(sourceTile);
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
        const pigClass = isPig(targetTile);
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
            const pigClass = isPig(sourceTile);
            // Keep target's color if it has one, otherwise inherit source's color
            const targetColor = isColor(targetTile);
            const sourceColor = isColor(sourceTile);
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
    if (isColor(tile) && !isPig(tile)) tile.classList.toggle('target');
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
