// Level Editor Module

// --- Editor State ---

const editorState = {
    active: false,
    level: null,  // Working copy of level being edited
    customLevels: [], // Loaded from localStorage
};

// Color cycle order: empty -> red -> green -> blue -> empty
const COLOR_CYCLE = ['.', 'r', 'g', 'b'];

// Map grid characters to CSS classes
const TILE_CLASSES = {
    ".": "empty",
    "r": "red",
    "g": "green",
    "b": "blue",
    "R": "red target",
    "G": "green target",
    "B": "blue target",
};

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

function createEmptyLevel(rows, cols) {
    const grid = [];
    for (let r = 0; r < rows; r++) {
        grid.push('.'.repeat(cols));
    }
    return {
        name: "Custom Level",
        nRows: rows,
        nCols: cols,
        grid: grid,
        start: [0, 0],
        dir: 0,
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

// TODO: consider using a map mapping from row,col to a value. Potentially something like pythons
// defaultdict. I think it could simplify things. But do not take my word for it. Consider 
// and ask me my opinions. 
function setCell(level, row, col, char) {
    const rowStr = level.grid[row];
    level.grid[row] = rowStr.substring(0, col) + char + rowStr.substring(col + 1);
}

function getCell(level, row, col) {
    return level.grid[row][col];
}

// TODO (same as above) again, resizing the grid is trivial with a map: you do nothing. just allow 
// negative coordinates and normalize at the end. Or, if you prefer, normalize iemmediately by adding 1 
// to either the row or the column coordinate of each point immediately if you add a new top row or
// left column.
function resizeGrid(level, newRows, newCols) {
    const newGrid = [];

    for (let r = 0; r < newRows; r++) {
        if (r < level.nRows) {
            // Existing row - extend or truncate
            const existingRow = level.grid[r];
            if (newCols > level.nCols) {
                newGrid.push(existingRow + '.'.repeat(newCols - level.nCols));
            } else {
                newGrid.push(existingRow.substring(0, newCols));
            }
        } else {
            // New row
            newGrid.push('.'.repeat(newCols));
        }
    }

    level.grid = newGrid;
    level.nRows = newRows;
    level.nCols = newCols;

    // Clamp pig position if out of bounds
    if (level.start[0] >= newRows) level.start[0] = newRows - 1;
    if (level.start[1] >= newCols) level.start[1] = newCols - 1;
}


// TODO: easier with dict.
function addRow(level, position) {
    const newRow = '.'.repeat(level.nCols);
    if (position === 'top') {
        level.grid.unshift(newRow);
        level.start[0]++; // Shift pig down
    } else {
        level.grid.push(newRow);
    }
    level.nRows++;
}

// Same.
function removeRow(level, position) {
    if (level.nRows <= 1) return false;

    if (position === 'top') {
        level.grid.shift();
        level.start[0] = Math.max(0, level.start[0] - 1);
    } else {
        level.grid.pop();
        level.start[0] = Math.min(level.start[0], level.nRows - 2);
    }
    level.nRows--;
    return true;
}

// And here, I think. 
function addCol(level, position) {
    for (let r = 0; r < level.nRows; r++) {
        if (position === 'left') {
            level.grid[r] = '.' + level.grid[r];
        } else {
            level.grid[r] = level.grid[r] + '.';
        }
    }
    if (position === 'left') {
        level.start[1]++; // Shift pig right
    }
    level.nCols++;
}

function removeCol(level, position) {
    if (level.nCols <= 1) return false;

    for (let r = 0; r < level.nRows; r++) {
        if (position === 'left') {
            level.grid[r] = level.grid[r].substring(1);
        } else {
            level.grid[r] = level.grid[r].substring(0, level.nCols - 1);
        }
    }
    if (position === 'left') {
        level.start[1] = Math.max(0, level.start[1] - 1);
    } else {
        level.start[1] = Math.min(level.start[1], level.nCols - 2);
    }
    level.nCols--;
    return true;
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

function rotatePig(level) {
    level.dir = (level.dir + 1) % 4;
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
    level.name = `Custom Level ${editorState.customLevels.length + 1}`;
    editorState.customLevels.push(cloneLevel(level));
    saveCustomLevels();
    return level.name;
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

// Direction images for the pig
const AGENT_DIRS = ["pigs/right-1.png", "pigs/down-1.png", "pigs/left-1.png", "pigs/up-1.png"];

function setCssVariable(id, val) {
    document.documentElement.style.setProperty(id, val.toString());
}

// TODO: this looks more or less identical to the loadLevel function in main.js 
// Would it be possible to share implementation without too much hassle? 
function renderEditorGrid() {
    const level = editorState.level;
    if (!level) return;

    editorUI.grid.innerHTML = "";

    setCssVariable("--grid-n-rows", level.nRows);
    setCssVariable("--grid-n-cols", level.nCols);

    // Sync size inputs with current level
    editorUI.gridRows.value = level.nRows;
    editorUI.gridCols.value = level.nCols;

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
    editorUI.agent.style.backgroundImage = `url("${AGENT_DIRS[level.dir]}")`;
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

    // Edge button handlers
    boundHandlers.edgeTopAdd = () => { addRow(editorState.level, 'top'); renderEditorGrid(); };
    boundHandlers.edgeTopRemove = () => { removeRow(editorState.level, 'top'); renderEditorGrid(); };
    boundHandlers.edgeBottomAdd = () => { addRow(editorState.level, 'bottom'); renderEditorGrid(); };
    boundHandlers.edgeBottomRemove = () => { removeRow(editorState.level, 'bottom'); renderEditorGrid(); };
    boundHandlers.edgeLeftAdd = () => { addCol(editorState.level, 'left'); renderEditorGrid(); };
    boundHandlers.edgeLeftRemove = () => { removeCol(editorState.level, 'left'); renderEditorGrid(); };
    boundHandlers.edgeRightAdd = () => { addCol(editorState.level, 'right'); renderEditorGrid(); };
    boundHandlers.edgeRightRemove = () => { removeCol(editorState.level, 'right'); renderEditorGrid(); };

    editorUI.edgeTopAdd.addEventListener("click", boundHandlers.edgeTopAdd);
    editorUI.edgeTopRemove.addEventListener("click", boundHandlers.edgeTopRemove);
    editorUI.edgeBottomAdd.addEventListener("click", boundHandlers.edgeBottomAdd);
    editorUI.edgeBottomRemove.addEventListener("click", boundHandlers.edgeBottomRemove);
    editorUI.edgeLeftAdd.addEventListener("click", boundHandlers.edgeLeftAdd);
    editorUI.edgeLeftRemove.addEventListener("click", boundHandlers.edgeLeftRemove);
    editorUI.edgeRightAdd.addEventListener("click", boundHandlers.edgeRightAdd);
    editorUI.edgeRightRemove.addEventListener("click", boundHandlers.edgeRightRemove);

    // Size input handlers
    boundHandlers.sizeChange = handleSizeChange;
    editorUI.gridRows.addEventListener("change", boundHandlers.sizeChange);
    editorUI.gridCols.addEventListener("change", boundHandlers.sizeChange);

    // Save button handler
    boundHandlers.saveClick = handleSaveClick;
    editorUI.saveButton.addEventListener("click", boundHandlers.saveClick);

    // New button handler
    boundHandlers.newClick = handleNewClick;
    editorUI.newButton.addEventListener("click", boundHandlers.newClick);
}

function detachEditorListeners() {
    editorUI.grid.removeEventListener("click", boundHandlers.gridClick);
    editorUI.grid.removeEventListener("contextmenu", boundHandlers.rightClick);
    editorUI.agent.removeEventListener("click", boundHandlers.agentClick);
    editorUI.agent.removeEventListener("dragstart", boundHandlers.agentDragStart);
    editorUI.grid.removeEventListener("dragover", boundHandlers.gridDragOver);
    editorUI.grid.removeEventListener("drop", boundHandlers.gridDrop);
    editorUI.agent.removeAttribute("draggable");

    editorUI.edgeTopAdd.removeEventListener("click", boundHandlers.edgeTopAdd);
    editorUI.edgeTopRemove.removeEventListener("click", boundHandlers.edgeTopRemove);
    editorUI.edgeBottomAdd.removeEventListener("click", boundHandlers.edgeBottomAdd);
    editorUI.edgeBottomRemove.removeEventListener("click", boundHandlers.edgeBottomRemove);
    editorUI.edgeLeftAdd.removeEventListener("click", boundHandlers.edgeLeftAdd);
    editorUI.edgeLeftRemove.removeEventListener("click", boundHandlers.edgeLeftRemove);
    editorUI.edgeRightAdd.removeEventListener("click", boundHandlers.edgeRightAdd);
    editorUI.edgeRightRemove.removeEventListener("click", boundHandlers.edgeRightRemove);

    editorUI.gridRows.removeEventListener("change", boundHandlers.sizeChange);
    editorUI.gridCols.removeEventListener("change", boundHandlers.sizeChange);
    editorUI.saveButton.removeEventListener("click", boundHandlers.saveClick);
    editorUI.newButton.removeEventListener("click", boundHandlers.newClick);

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
        rotatePig(editorState.level);
        editorUI.agent.style.backgroundImage = `url("${AGENT_DIRS[editorState.level.dir]}")`;
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
    rotatePig(editorState.level);
    editorUI.agent.style.backgroundImage = `url("${AGENT_DIRS[editorState.level.dir]}")`;
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

function handleSizeChange() {
    const rows = parseInt(editorUI.gridRows.value) || 1;
    const cols = parseInt(editorUI.gridCols.value) || 1;
    resizeGrid(editorState.level, rows, cols);
    renderEditorGrid();
}

function handleSaveClick() {
    const errors = validateLevel(editorState.level);
    if (errors.length > 0) {
        showNotification(errors[0], true);
        return;
    }

    const name = addCustomLevel(editorState.level);
    showNotification(`Level "${name}" saved!`);

    // Notify main.js to refresh the level list
    if (typeof onLevelSaved === "function") {
        onLevelSaved(editorState.level);
    }
}

function handleNewClick() {
    const rows = parseInt(editorUI.gridRows.value) || 8;
    const cols = parseInt(editorUI.gridCols.value) || 8;
    editorState.level = createEmptyLevel(rows, cols);
    // Place pig on a blue cell at origin
    setCell(editorState.level, 0, 0, 'b');
    renderEditorGrid();
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
        gridRows: document.getElementById("grid-rows"),
        gridCols: document.getElementById("grid-cols"),
        saveButton: document.getElementById("editor-save"),
        newButton: document.getElementById("editor-new"),
        grid: document.getElementById("grid"),
        agent: document.getElementById("agent"),
        edgeTopAdd: document.getElementById("edge-top-add"),
        edgeTopRemove: document.getElementById("edge-top-remove"),
        edgeBottomAdd: document.getElementById("edge-bottom-add"),
        edgeBottomRemove: document.getElementById("edge-bottom-remove"),
        edgeLeftAdd: document.getElementById("edge-left-add"),
        edgeLeftRemove: document.getElementById("edge-left-remove"),
        edgeRightAdd: document.getElementById("edge-right-add"),
        edgeRightRemove: document.getElementById("edge-right-remove"),
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
    resizeGrid,
    addRow,
    removeRow,
    addCol,
    removeCol,
    movePig,
    rotatePig,
    loadCustomLevels,
    saveCustomLevels,
    addCustomLevel,
    deleteCustomLevel,
    validateLevel,
    renderEditorGrid,
    enterEditMode,
    exitEditMode,
    setOnLevelSaved,
};
