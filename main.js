import * as PigJatin from "./PigJatin/PigJatin.js";
import { animations, pigSpriteUrl } from "./animations.js";
import * as Shortcuts from "./shortcuts.js";
import * as Editor from "./editor.js";
import { levels, TILE_CLASSES } from "./levels.js";
import { ui } from "./ui.js";
import * as Playback from "./playback.js";

const ENABLE_SPLASH_SCREEN = false;

// --- State ---

const state = {
    level: null,
    focusedElementBeforeHelp: null, // Track which element to refocus after help closes
};

// --- Utilities ---

function selectedLanguage() {
    return document.querySelector('.lang-btn.active').dataset.lang;
}

function showHelp() {
    // Save currently focused element to restore later
    state.focusedElementBeforeHelp = document.activeElement;
    // TODO: pause here
    // Blur editor if it has focus
    if (ui.editor.hasFocus()) {
        ui.editor.getInputField().blur();
    }
    ui.helpModal.classList.add("show");
}

function hideHelp() {
    // TODO: unpause if we were playing
    ui.helpModal.classList.remove("show");
    // Restore focus to previously focused element
    if (state.focusedElementBeforeHelp && state.focusedElementBeforeHelp.focus) {
        state.focusedElementBeforeHelp.focus();
        state.focusedElementBeforeHelp = null;
    }
}

// TODO: Provide a numbered list of all the occurrences of "agent" across all files and ask for confirmation before replacing them with "pig" across the board.

// --- Board rendering ---

function setCssVar(name, value) {
    document.documentElement.style.setProperty(name, value.toString());
}

function renderGrid(level) {
    ui.grid.innerHTML = '';
    setCssVar('--grid-n-rows', level.nRows);
    setCssVar('--grid-n-cols', level.nCols);

    const cells = level.grid.join('');
    for (const char of cells) {
        const tile = document.createElement('div');
        tile.className = 'tile ' + TILE_CLASSES[char];
        ui.grid.appendChild(tile);
    }
}

function getCell(row, col) {
    return ui.grid.children[row * state.level.nCols + col];
}

function placePig(row, col) {
    getCell(row, col).appendChild(ui.agent);
    // Flip HUD to left when near right edge (HUD needs 2 tiles of space)
    ui.agent.classList.toggle('near-right-edge', col >= state.level.nCols - 2);
}

function loadLevel(level) {
    if (level === null) return;

    // Cancel and reset pig animations/transforms
    ui.agent.getAnimations().forEach(a => a.cancel());
    ui.agent.style.transform = '';

    renderGrid(level);

    const [row, col] = level.start;
    placePig(row, col);
    ui.agent.style.backgroundImage = pigSpriteUrl(level.dir);
}

// --- Code storage ---

function storeCode() {
    if (!state.level) return;
    const key = state.level.name + selectedLanguage();
    localStorage.setItem(key, ui.editor.getValue());
}

function loadCode() {
    if (!state.level) return;
    const key = state.level.name + selectedLanguage();
    const code = localStorage.getItem(key) ?? "";
    ui.editor.setValue(code);
}

// --- Actions ---

function selectLevel(level) {
    if (document.body.classList.contains('editor-mode')) {
        console.log("We are now loading in the editor");
        Editor.load(level);
        return;
    }
    Playback.enterIdle();
    storeCode();
    state.level = level;
    loadCode();
    loadLevel(level);
    ui.codeOutput.textContent = "";
}

function switchLanguage(newLang) {
    const currentLang = selectedLanguage();
    if (currentLang === newLang) return;

    storeCode();

    // Toggle active state
    ui.langPython.classList.toggle('active', newLang === 'python');
    ui.langJava.classList.toggle('active', newLang === 'java');

    loadCode();
    const mode = newLang === "java" ? "text/x-java" : "python";
    ui.editor.setOption("mode", mode);
}

function submitCode() {
    if (Playback.getStatus() === "paused") {
        Playback.enterPlaying();
        return;
    }

    ui.codeOutput.textContent = "";
    let program = ui.editor.getValue();

    if (selectedLanguage() === "java") {
        const [success, error, code] = PigJatin.generatePythonCode(program);
        if (!success) {
            ui.codeOutput.textContent = error.msg;
            ui.codeOutput.scrollTop = ui.codeOutput.scrollHeight;
            return;
        }
        program = code;
    }

    Playback.submit(program);
}

// --- Initialize ---

// Hide splash screen immediately if disabled
if (!ENABLE_SPLASH_SCREEN && ui.splashScreen) {
    ui.splashScreen.style.display = "none";
    // showHelp(); // TODO: REMOVE THIS LINE - temporarily disabled for editor development
}

// Initialize playback system
Playback.init({
    loadLevel: loadLevel,
    getLevel: () => state.level,
    onWorkerReady: showHelp,
    onSubmit: submitCode,
});

// Initialize font size from slider
ui.editor.getWrapperElement().style.fontSize = ui.fontSizeSlider.value + "px";

// Prepare levels: if the starting position has a star (uppercase letter),
// convert it to just the tile (lowercase) so the pig doesn't start on a star.
for (let lvl of levels) {
    const [r, c] = lvl.start;
    const row = lvl.grid[r].split("");
    row[c] = row[c].toLowerCase() || row[c];
    lvl.grid[r] = row.join("");
}

// Build level list with thumbnails
function renderMiniGrid(level, container) {
    container.innerHTML = '';
    container.style.setProperty('--mini-rows', level.nRows);
    container.style.setProperty('--mini-cols', level.nCols);

    for (const ch of level.grid.join('')) {
        const tile = document.createElement('div');
        tile.className = 'tile ' + TILE_CLASSES[ch];
        container.appendChild(tile);
    }

    // Add pig indicator with direction
    const pigIndex = level.start[0] * level.nCols + level.start[1];
    container.children[pigIndex]?.classList.add('pig-' + level.dir);
}

function populateLevelList(levelArray) {
    ui.levelList.innerHTML = '';
    for (const lvl of levelArray) {
        const item = document.createElement('div');
        item.className = 'sidebar-level-item';

        const miniGrid = document.createElement('div');
        miniGrid.className = 'mini-grid';
        renderMiniGrid(lvl, miniGrid);

        const name = document.createElement('div');
        name.className = 'sidebar-level-name';
        name.textContent = lvl.name || 'Untitled';

        item.appendChild(miniGrid);
        item.appendChild(name);
        ui.levelList.appendChild(item);

        item.addEventListener('click', () => {
            selectLevel(lvl);
            ui.levelList.querySelectorAll('.sidebar-level-item').forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            ui.sidebar.classList.add('collapsed');
        });
    }
}

// Tab switching
function shuffled(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

ui.sidebarTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        ui.sidebarTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const tabName = tab.dataset.tab;
        if (tabName === 'default') {
            populateLevelList(levels);
        } else if (tabName === 'local') {
            populateLevelList(Editor.getCustomLevels());
        } else {
            populateLevelList(shuffled(levels));
        }
    });
});

populateLevelList(levels);

// Load shared level from URL, or select first level
const sharedLevel = Editor.importFromURL();
if (sharedLevel) {
    selectLevel(sharedLevel);
} else {
    ui.levelList.querySelector(".sidebar-level-item")?.click();
}

// --- Event handlers ---

ui.fontSizeSlider.addEventListener("input", (e) => {
    ui.editor.getWrapperElement().style.fontSize = e.target.value + "px";
});

ui.editor.on("change", () => {
    storeCode();

    // If paused and user edits code, automatically reset
    if (Playback.getStatus() === "paused") {
        Playback.enterIdle();
    }
});

// Show notification when trying to interact with read-only editor
ui.editor.on("mousedown", (cm, event) => {
    if (cm.getOption("readOnly") && Playback.getStatus() === "playing") {
        Playback.enterPaused();
        animations.notify(ui.gameNotification, "Paused to edit code");
    }
});

ui.editor.on("keydown", (cm, event) => {
    if (cm.getOption("readOnly") && Playback.getStatus() === "playing") {
        Playback.enterPaused();
        animations.notify(ui.gameNotification, "Paused to edit code");
    }
});

// Language button handlers
ui.langPython.onclick = () => switchLanguage('python');
ui.langJava.onclick = () => switchLanguage('java');

ui.sidebarToggle.onclick = () => {
    ui.sidebar.classList.toggle("collapsed");
};

// Help modal handlers
ui.helpButton.onclick = showHelp;
ui.helpClose.onclick = hideHelp;
ui.helpOverlay.onclick = hideHelp;

// Mode toggle handlers
ui.modePlay.onclick = () => {
    Editor.exit();
    document.body.classList.remove('editor-mode');
    ui.playPane.hidden = false;
    ui.editorPane.hidden = true;
    ui.modePlay.classList.add("active");
    ui.modeEdit.classList.remove("active");
    ui.sidebarToggle.disabled = false;
};

ui.modeEdit.onclick = () => {
    Playback.enterIdle();
    document.body.classList.add('editor-mode');
    ui.playPane.hidden = true;
    ui.editorPane.hidden = false;
    ui.modePlay.classList.remove("active");
    ui.modeEdit.classList.add("active");
    ui.sidebar.classList.add('collapsed');
    ui.sidebarToggle.disabled = true;
    Editor.enter();
};

// Run PigJatin tests
PigJatin.loadTestCases("./PigJatin/testcases.txt").then(PigJatin.runTests);

// --- Shortcuts (new system) ---

function toggleHelp() {
    if (ui.helpModal.classList.contains("show")) {
        hideHelp();
    } else {
        showHelp();
    }
}

Shortcuts.register("play-pause", "Play / Pause", () => ui.btn1.click(), "h", { ctrlNote: true });
Shortcuts.register("step", "Step", () => ui.btn2.click(), "j", { ctrlNote: true });
Shortcuts.register("reset", "Reset", () => ui.btn3.click(), "k");
Shortcuts.register("focus-editor", "Focus editor", () => {
    if (ui.editor.hasFocus()) return;
    if (ui.editor.getOption("readOnly") && Playback.getStatus() === "playing") {
        Playback.enterPaused();
        animations.notify(ui.gameNotification, "Paused to edit code");
    }
    ui.editor.focus();
    ui.editor.setCursor(ui.editor.getCursor());
}, "i");
Shortcuts.register("unfocus-editor", "Unfocus editor", () => {
    // Close help if open
    if (ui.helpModal.classList.contains("show")) {
        hideHelp();
        return;
    }
    // Unfocus editor if focused
    if (ui.editor.hasFocus()) {
        ui.editor.getInputField().blur();
    }
}, "escape");
Shortcuts.register("toggle-help", "Toggle help", toggleHelp, "?");
Shortcuts.initialize(ui.shortcutsContainer);
