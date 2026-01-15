// Level Editor Module

import { TILE_CLASSES, pigSpriteUrl } from "./constants.js";

function cycleDirection(dir) {
    switch (dir) {
        case "right": return "down";
        case "down":  return "left";
        case "left":  return "up";
        case "up":    return "right";
    }
}

// --- Editor State ---

const editorState = {
    active: false,
    level: null,  // Working copy of level being edited
    customLevels: [], // Loaded from localStorage
    painting: false,  // Currently in paint-drag mode
    paintColor: null, // Color being painted (e.g., 'r', 'g', 'b')
    paintedCells: 0,  // Count of cells painted during drag (to distinguish from click)
};

// Color cycle order: empty -> red -> green -> blue -> empty
const COLOR_CYCLE = ['.', 'r', 'g', 'b'];

// --- Editor UI Elements ---

let editorUI = null;

// --- Grid Character Utilities ---

function isColorChar(c) {
    return 'rgbRGB'.includes(c);
}

function hasApple(c) {
    return 'RGB'.includes(c);
}

function getBaseColor(c) {
    return c.toLowerCase();
}

function toggleApple(c) {
    if (!isColorChar(c)) return c;
    return hasApple(c) ? c.toLowerCase() : c.toUpperCase();
}

function cycleColor(c) {
    const base = getBaseColor(c);
    const hadApple = hasApple(c);
    const idx = COLOR_CYCLE.indexOf(base);
    const nextBase = COLOR_CYCLE[(idx + 1) % COLOR_CYCLE.length];

    // Preserve apple if moving to a color (not empty)
    if (nextBase !== '.' && hadApple) {
        return nextBase.toUpperCase();
    }
    return nextBase;
}

// --- Level Creation ---

function createEmptyLevel() {
    const grid = [];
    for (let r = 0; r < 9; r++) {
        grid.push('.'.repeat(16));
    }
    return {
        name: "Custom Level",
        nRows: 9,
        nCols: 16,
        grid: grid,
        start: [0, 0],
        dir: "right",
    };
}

function cloneLevel(level) {
    return {
        name: level.name,
        nRows: level.nRows,
        nCols: level.nCols,
        grid: [...level.grid],
        start: [...level.start],
        dir: level.dir,
    };
}

// --- Grid Modification ---

function setCell(level, row, col, char) {
    const rowStr = level.grid[row];
    level.grid[row] = rowStr.substring(0, col) + char + rowStr.substring(col + 1);
}

function getCell(level, row, col) {
    return level.grid[row][col];
}

// --- Pig Management ---

function movePig(level, row, col) {
    // Ensure the pig is on a colored cell
    const cell = getCell(level, row, col);
    if (!isColorChar(cell)) {
        // Make the cell blue if empty
        setCell(level, row, col, 'b');
    }
    level.start = [row, col];
}


// --- Custom Levels Storage ---

const CUSTOM_LEVELS_KEY = 'svinesti-custom-levels';

function loadCustomLevels() {
    try {
        const data = localStorage.getItem(CUSTOM_LEVELS_KEY);
        editorState.customLevels = data ? JSON.parse(data) : [];
    } catch (e) {
        console.error("Failed to load custom levels:", e);
        editorState.customLevels = [];
    }
}

function saveCustomLevels() {
    try {
        localStorage.setItem(CUSTOM_LEVELS_KEY, JSON.stringify(editorState.customLevels));
    } catch (e) {
        console.error("Failed to save custom levels:", e);
    }
}

function addCustomLevel(level) {
    editorState.customLevels.push(cloneLevel(level));
    saveCustomLevels();
}

function getNextLevelName() {
    // Find lowest positive integer not used in existing level names
    const usedNumbers = new Set();
    for (const level of editorState.customLevels) {
        const match = level.name.match(/^Custom Level (\d+)$/);
        if (match) {
            usedNumbers.add(parseInt(match[1]));
        }
    }
    let n = 1;
    while (usedNumbers.has(n)) n++;
    return `Custom Level ${n}`;
}

function deleteCustomLevel(name) {
    const idx = editorState.customLevels.findIndex(l => l.name === name);
    if (idx !== -1) {
        editorState.customLevels.splice(idx, 1);
        saveCustomLevels();
        return true;
    }
    return false;
}

// --- Level Export/Import (URL sharing) ---

function compactLevel(level) {
    // Find bounding box of non-empty tiles
    let minRow = level.nRows, maxRow = -1;
    let minCol = level.nCols, maxCol = -1;

    for (let r = 0; r < level.nRows; r++) {
        for (let c = 0; c < level.nCols; c++) {
            if (level.grid[r][c] !== '.') {
                minRow = Math.min(minRow, r);
                maxRow = Math.max(maxRow, r);
                minCol = Math.min(minCol, c);
                maxCol = Math.max(maxCol, c);
            }
        }
    }

    // If empty level, return minimal 1x1
    if (maxRow < 0) {
        return { ...level, nRows: 1, nCols: 1, grid: ['.'], start: [0, 0] };
    }

    // Crop grid to bounding box
    const newGrid = [];
    for (let r = minRow; r <= maxRow; r++) {
        newGrid.push(level.grid[r].slice(minCol, maxCol + 1));
    }

    return {
        name: level.name,
        nRows: maxRow - minRow + 1,
        nCols: maxCol - minCol + 1,
        grid: newGrid,
        start: [level.start[0] - minRow, level.start[1] - minCol],
        dir: level.dir,
    };
}

function exportLevelToURL(level) {
    const compacted = compactLevel(level);
    const encoded = btoa(JSON.stringify(compacted));
    return `${location.origin}${location.pathname}#level=${encoded}`;
}

function importLevelFromURL() {
    if (!location.hash.startsWith('#level=')) return null;
    try {
        const encoded = location.hash.slice(7); // Remove '#level='
        const level = JSON.parse(atob(encoded));
        // Basic validation
        if (!level.grid || !level.start || !level.nRows || !level.nCols) {
            console.error("Invalid level data in URL");
            return null;
        }
        return level;
    } catch (e) {
        console.error("Failed to decode level from URL:", e);
        return null;
    }
}

function clearLevelFromURL() {
    history.replaceState(null, '', location.pathname);
}

// --- Level Validation ---

function findReachableTiles(level, startRow, startCol) {
    const visited = new Set();
    const queue = [[startRow, startCol]];
    const key = (r, c) => `${r},${c}`;

    while (queue.length > 0) {
        const [r, c] = queue.shift();
        const k = key(r, c);
        if (visited.has(k)) continue;
        if (r < 0 || r >= level.nRows || c < 0 || c >= level.nCols) continue;
        if (!isColorChar(getCell(level, r, c))) continue;

        visited.add(k);
        queue.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
    }
    return visited;
}

function validateLevel(level) {
    const errors = [];

    // Check pig is on a colored cell
    const pigCell = getCell(level, level.start[0], level.start[1]);
    if (!isColorChar(pigCell)) {
        errors.push("Pig must be on a colored tile");
    }

    // Check there's at least one apple
    let hasApples = false;
    for (const row of level.grid) {
        if (/[RGB]/.test(row)) {
            hasApples = true;
            break;
        }
    }
    if (!hasApples) {
        errors.push("Level must have at least one apple");
    }

    // Check all colored tiles are reachable from start
    const reachable = findReachableTiles(level, level.start[0], level.start[1]);
    for (let r = 0; r < level.nRows; r++) {
        for (let c = 0; c < level.nCols; c++) {
            if (isColorChar(getCell(level, r, c)) && !reachable.has(`${r},${c}`)) {
                errors.push("All colored tiles must be reachable from the pig");
                return errors; // Early return, one message is enough
            }
        }
    }

    return errors;
}

// --- Editor Rendering ---

function setCssVariable(id, val) {
    document.documentElement.style.setProperty(id, val.toString());
}

function renderEditorGrid() {
    const level = editorState.level;
    if (!level) return;

    editorUI.grid.innerHTML = "";

    setCssVariable("--grid-n-rows", level.nRows);
    setCssVariable("--grid-n-cols", level.nCols);

    const cells = level.grid.join("");
    for (let i = 0; i < cells.length; i++) {
        const c = cells[i];
        const div = document.createElement("div");
        div.className = "game-tile " + TILE_CLASSES[c];
        div.dataset.index = i;
        editorUI.grid.appendChild(div);
    }

    // Place pig in correct cell
    const [row, col] = level.start;
    const pigCellIndex = row * level.nCols + col;
    editorUI.grid.children[pigCellIndex].appendChild(editorUI.agent);

    // Set pig direction
    editorUI.agent.style.backgroundImage = pigSpriteUrl(level.dir);
}

// --- Mode Switching ---

function enterEditMode() {
    editorState.active = true;

    // Always create a new level
    editorState.level = createEmptyLevel(8, 8);
    setCell(editorState.level, 0, 0, 'b');

    // Update UI
    document.body.classList.add("editor-mode");
    editorUI.editorToolbar.classList.remove("hidden");
    editorUI.levelNameInput.classList.remove("hidden");
    editorUI.levelNameInput.value = "";
    editorUI.modePlay.classList.remove("active");
    editorUI.modeEdit.classList.add("active");

    // Render the editor grid
    renderEditorGrid();

    // Attach editor event listeners
    attachEditorListeners();
}

function exitEditMode() {
    editorState.active = false;

    // Update UI
    document.body.classList.remove("editor-mode");
    editorUI.editorToolbar.classList.add("hidden");
    editorUI.levelNameInput.classList.add("hidden");
    editorUI.modePlay.classList.add("active");
    editorUI.modeEdit.classList.remove("active");

    // Detach editor event listeners
    detachEditorListeners();

    return editorState.level;
}

// --- Event Handlers ---

let boundHandlers = {};

function attachEditorListeners() {
    // Grid click handler (color cycling)
    boundHandlers.gridClick = handleGridClick;
    editorUI.grid.addEventListener("click", boundHandlers.gridClick);

    // Grid right-click handler (apple toggle)
    boundHandlers.rightClick = handleRightClick;
    editorUI.grid.addEventListener("contextmenu", boundHandlers.rightClick);

    // Paint drag handlers
    boundHandlers.paintStart = handlePaintStart;
    boundHandlers.paintMove = handlePaintMove;
    boundHandlers.paintEnd = handlePaintEnd;
    editorUI.grid.addEventListener("mousedown", boundHandlers.paintStart);
    editorUI.grid.addEventListener("mousemove", boundHandlers.paintMove);
    document.addEventListener("mouseup", boundHandlers.paintEnd);

    // Pig click handler (rotation)
    boundHandlers.agentClick = handleAgentClick;
    editorUI.agent.addEventListener("click", boundHandlers.agentClick);

    // Pig drag handlers
    boundHandlers.agentDragStart = handleAgentDragStart;
    boundHandlers.gridDragOver = handleGridDragOver;
    boundHandlers.gridDrop = handleGridDrop;
    editorUI.agent.setAttribute("draggable", "true");
    editorUI.agent.addEventListener("dragstart", boundHandlers.agentDragStart);
    editorUI.grid.addEventListener("dragover", boundHandlers.gridDragOver);
    editorUI.grid.addEventListener("drop", boundHandlers.gridDrop);

    // Save button handler
    boundHandlers.saveClick = handleSaveClick;
    editorUI.saveButton.addEventListener("click", boundHandlers.saveClick);

    // New button handler
    boundHandlers.newClick = handleNewClick;
    editorUI.newButton.addEventListener("click", boundHandlers.newClick);

    // Share button handler
    boundHandlers.shareClick = handleShareClick;
    editorUI.shareButton.addEventListener("click", boundHandlers.shareClick);
}

function detachEditorListeners() {
    editorUI.grid.removeEventListener("click", boundHandlers.gridClick);
    editorUI.grid.removeEventListener("contextmenu", boundHandlers.rightClick);
    editorUI.grid.removeEventListener("mousedown", boundHandlers.paintStart);
    editorUI.grid.removeEventListener("mousemove", boundHandlers.paintMove);
    document.removeEventListener("mouseup", boundHandlers.paintEnd);
    editorUI.agent.removeEventListener("click", boundHandlers.agentClick);
    editorUI.agent.removeEventListener("dragstart", boundHandlers.agentDragStart);
    editorUI.grid.removeEventListener("dragover", boundHandlers.gridDragOver);
    editorUI.grid.removeEventListener("drop", boundHandlers.gridDrop);
    editorUI.agent.removeAttribute("draggable");

    editorUI.saveButton.removeEventListener("click", boundHandlers.saveClick);
    editorUI.newButton.removeEventListener("click", boundHandlers.newClick);
    editorUI.shareButton.removeEventListener("click", boundHandlers.shareClick);

    boundHandlers = {};
}

function getCellFromEvent(e) {
    const tile = e.target.closest(".game-tile");
    if (!tile || !tile.dataset.index) return null;

    const index = parseInt(tile.dataset.index);
    const row = Math.floor(index / editorState.level.nCols);
    const col = index % editorState.level.nCols;
    return { tile, index, row, col };
}

function handleGridClick(e) {
    // Skip cycling if we just finished a paint drag
    if (editorState.paintedCells > 0) {
        editorState.paintedCells = 0;
        return;
    }

    // Ignore clicks on the pig
    if (e.target.closest("#agent")) return;

    const cell = getCellFromEvent(e);
    if (!cell) return;

    const { row, col, tile } = cell;

    // Check if this is the pig's cell
    const [pigRow, pigCol] = editorState.level.start;
    if (row === pigRow && col === pigCol) return;

    // Cycle the color
    const currentChar = getCell(editorState.level, row, col);
    const newChar = cycleColor(currentChar);
    setCell(editorState.level, row, col, newChar);

    // Update the tile's class
    tile.className = "game-tile " + TILE_CLASSES[newChar];
}

function handlePaintStart(e) {
    if (e.target.closest("#agent")) return;

    const cell = getCellFromEvent(e);
    if (!cell) return;

    const { row, col } = cell;
    const currentChar = getCell(editorState.level, row, col);

    editorState.painting = true;
    editorState.paintColor = isColorChar(currentChar) ? getBaseColor(currentChar) : '.';
    editorState.paintedCells = 0;
}

function handlePaintMove(e) {
    if (!editorState.painting) return;

    const cell = getCellFromEvent(e);
    if (!cell) return;

    const { row, col, tile } = cell;

    // Don't paint the pig's cell
    const [pigRow, pigCol] = editorState.level.start;
    if (row === pigRow && col === pigCol) return;

    const currentChar = getCell(editorState.level, row, col);
    const currentBase = isColorChar(currentChar) ? getBaseColor(currentChar) : '.';

    // Only paint if cell is different
    if (currentBase !== editorState.paintColor) {
        // Preserve apple status if painting a color over a tile with apple
        const newChar = (editorState.paintColor !== '.' && hasApple(currentChar))
            ? editorState.paintColor.toUpperCase()
            : editorState.paintColor;
        setCell(editorState.level, row, col, newChar);
        tile.className = "game-tile " + TILE_CLASSES[newChar];
        editorState.paintedCells++;
    }
}

function handlePaintEnd() {
    editorState.painting = false;
    editorState.paintColor = null;
}

function handleRightClick(e) {
    e.preventDefault();

    // Ignore right-clicks on the pig
    if (e.target.closest("#agent")) return;

    const cell = getCellFromEvent(e);
    if (!cell) return;

    const { row, col, tile } = cell;

    // Check if this is the pig's cell - rotate pig instead
    const [pigRow, pigCol] = editorState.level.start;
    if (row === pigRow && col === pigCol) {
        editorState.level.dir = cycleDirection(editorState.level.dir);
        editorUI.agent.style.backgroundImage = pigSpriteUrl(editorState.level.dir);
        return;
    }

    // Toggle apple on colored cells only
    const currentChar = getCell(editorState.level, row, col);
    if (!isColorChar(currentChar)) return;

    const newChar = toggleApple(currentChar);
    setCell(editorState.level, row, col, newChar);

    // Update the tile's class
    tile.classList.toggle("target");
}

function handleAgentClick(e) {
    e.stopPropagation();
    editorState.level.dir = cycleDirection(editorState.level.dir);
    editorUI.agent.style.backgroundImage = pigSpriteUrl(editorState.level.dir);
}

function handleAgentDragStart(e) {
    e.dataTransfer.setData("text/plain", "pig");
    e.dataTransfer.effectAllowed = "move";
}

function handleGridDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
}

function handleGridDrop(e) {
    e.preventDefault();

    const cell = getCellFromEvent(e);
    if (!cell) return;

    const { row, col } = cell;

    // Move the pig
    movePig(editorState.level, row, col);
    renderEditorGrid();
}

function handleSaveClick() {
    const errors = validateLevel(editorState.level);
    if (errors.length > 0) {
        showNotification(errors[0], true);
        return;
    }

    const name = editorUI.levelNameInput.value.trim() || getNextLevelName();
    editorState.level.name = name;
    addCustomLevel(editorState.level);
    showNotification(`Level "${name}" saved!`);

    // Clear input for next level
    editorUI.levelNameInput.value = "";

    // Notify main.js to refresh the level list
    if (typeof onLevelSaved === "function") {
        onLevelSaved(editorState.level);
    }
}

function handleNewClick() {
    editorState.level = createEmptyLevel();
    setCell(editorState.level, 0, 0, 'b');
    editorUI.levelNameInput.value = "";
    renderEditorGrid();
}

async function handleShareClick() {
    const errors = validateLevel(editorState.level);
    if (errors.length > 0) {
        showNotification(errors[0], true);
        return;
    }

    const url = exportLevelToURL(editorState.level);

    try {
        await navigator.clipboard.writeText(url);
        showNotification("Link copied to clipboard!");
    } catch (e) {
        // Fallback: show the URL in a prompt
        prompt("Copy this link to share your level:", url);
    }
}

// Callback for when a level is saved (set by main.js)
let onLevelSaved = null;

function setOnLevelSaved(callback) {
    onLevelSaved = callback;
}

// --- Initialize Editor UI References ---

function initEditorUI() {
    editorUI = {
        modePlay: document.getElementById("mode-play"),
        modeEdit: document.getElementById("mode-edit"),
        editorToolbar: document.getElementById("editor-toolbar"),
        saveButton: document.getElementById("editor-save"),
        newButton: document.getElementById("editor-new"),
        shareButton: document.getElementById("editor-share"),
        levelNameInput: document.getElementById("level-name-input"),
        grid: document.getElementById("grid"),
        agent: document.getElementById("agent"),
        notification: document.getElementById("editor-notification"),
    };

    // Load custom levels from localStorage
    loadCustomLevels();
}

// --- Notification ---

let notificationTimeout = null;

function showNotification(message, isError = false) {
    clearTimeout(notificationTimeout);
    editorUI.notification.textContent = message;
    editorUI.notification.classList.toggle("error", isError);
    editorUI.notification.classList.add("show");

    editorUI.notification.onclick = () => {
        editorUI.notification.classList.remove("show");
    };

    notificationTimeout = setTimeout(() => {
        editorUI.notification.classList.remove("show");
    }, 3000);
}

// --- Exports ---

export {
    editorState,
    initEditorUI,
    editorUI,
    isColorChar,
    hasApple,
    getBaseColor,
    toggleApple,
    cycleColor,
    createEmptyLevel,
    setCell,
    getCell,
    movePig,
    loadCustomLevels,
    saveCustomLevels,
    addCustomLevel,
    deleteCustomLevel,
    validateLevel,
    renderEditorGrid,
    enterEditMode,
    exitEditMode,
    setOnLevelSaved,
    exportLevelToURL,
    importLevelFromURL,
    clearLevelFromURL,
};
