// main.js - App shell (help pane, sidebar, mode switching)

import * as PigJatin from "./PigJatin/PigJatin.js";
import * as Editor from "./editor.js";
import * as Game from "./game.js";
import { createGrid } from "./grid.js";
import { levels } from "./levels.js";
import { ui } from "./ui.js";

const ENABLE_SPLASH_SCREEN = true;

// --- Help pane ---

const help = {
    previousFocus: null,

    enter() {
        this.previousFocus = ui.editor.hasFocus()
            ? ui.editor.getInputField()
            : document.activeElement;
        ui.helpPane.classList.add("show");
        ui.helpPane.focus();
    },

    exit() {
        ui.helpPane.classList.remove("show");
        this.previousFocus?.focus();
        this.previousFocus = null;
    },
};

// --- Level list ---

function populateLevelList(levelArray) {
    ui.levelList.innerHTML = '';
    for (const lvl of levelArray) {
        const item = document.createElement('div');
        item.className = 'sidebar-level-item';

        const miniGrid = document.createElement('div');
        miniGrid.className = 'mini-grid';
        createGrid(miniGrid, lvl.nRows, lvl.nCols, lvl);

        const name = document.createElement('div');
        name.className = 'sidebar-level-name';
        name.textContent = lvl.name || 'Untitled';

        item.appendChild(miniGrid);
        item.appendChild(name);
        ui.levelList.appendChild(item);

        item.addEventListener('click', () => {
            if (document.body.classList.contains('editor-mode')) {
                Editor.load(lvl);
            } else {
                Game.selectLevel(lvl);
            }
            ui.levelList.querySelectorAll('.sidebar-level-item').forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            ui.sidebar.classList.add('collapsed');
        });
    }
}

function shuffled(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

// --- Initialize ---

// Hide splash screen if disabled
if (!ENABLE_SPLASH_SCREEN && ui.splashScreen) {
    ui.splashScreen.style.display = "none";
}

// Prepare levels (convert uppercase start tiles to lowercase)
for (let lvl of levels) {
    const [r, c] = lvl.start;
    const row = lvl.grid[r].split("");
    row[c] = row[c].toLowerCase() || row[c];
    lvl.grid[r] = row.join("");
}

// Initialize game module
Game.init({
    shortcutsContainer: ui.shortcutsContainer,
});

// Build level list
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
    Game.selectLevel(sharedLevel);
} else {
    ui.levelList.querySelector(".sidebar-level-item")?.click();
}

// Start in game mode
Game.enter();

// --- Event handlers ---

// Sidebar toggle
ui.sidebarToggle.onclick = () => {
    ui.sidebar.classList.toggle("collapsed");
};

// Help pane
ui.helpButton.onclick = () => ui.helpPane.classList.contains("show") ? help.exit() : help.enter();
ui.helpClose.onclick = () => help.exit();
ui.helpOverlay.onclick = () => help.exit();

// Mode toggle
ui.modePlay.onclick = () => {
    Editor.exit();
    document.body.classList.remove('editor-mode');
    ui.playPane.hidden = false;
    ui.editorPane.hidden = true;
    ui.modePlay.classList.add("active");
    ui.modeEdit.classList.remove("active");
    ui.sidebarToggle.disabled = false;
    Game.enter();
};

ui.modeEdit.onclick = () => {
    Game.exit();
    document.body.classList.add('editor-mode');
    ui.playPane.hidden = true;
    ui.editorPane.hidden = false;
    ui.modePlay.classList.remove("active");
    ui.modeEdit.classList.add("active");
    ui.sidebar.classList.add('collapsed');
    ui.sidebarToggle.disabled = true;
    Editor.enter();
};

// Global shortcuts (editor mode only - game mode uses shortcuts.js)
document.addEventListener('keydown', (e) => {
    // Help toggle - only in editor mode when not typing
    if (e.key === '?' && document.body.classList.contains('editor-mode') && !ui.editor.hasFocus()) {
        e.preventDefault();
        ui.helpPane.classList.contains("show") ? help.exit() : help.enter();
    }
    // Escape closes help pane
    if (e.key === 'Escape' && ui.helpPane.classList.contains('show')) {
        e.preventDefault();
        help.exit();
    }
});

// Run PigJatin tests
PigJatin.loadTestCases("./PigJatin/testcases.txt").then(PigJatin.runTests);
