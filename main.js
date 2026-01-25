// main.js - App shell (help pane, sidebar, mode switching)

import * as PigJatin from "./PigJatin/PigJatin.js";
import * as Editor from "./editor.js";
import * as Game from "./game.js";
import { createGrid } from "./grid.js";
import { levels } from "./levels.js";
import { ui } from "./ui.js";

const ENABLE_SPLASH_SCREEN = true;

// Apps Script endpoint for community levels (GET to fetch, POST to submit)
const COMMUNITY_LEVELS_URL = 'https://script.google.com/macros/s/AKfycbwZUIdxptq5nfy9Tcea89TqcizBdPxP_DQrWAoiI2hnHjbEx23UceIVBfxkf77ZZ8dSrw/exec';

// --- Help pane ---

const help = {
    previousFocus: null,

    helpIsOpen() {
        return ui.helpPane.classList.contains("show");
    },

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

    toggle() {
        if (this.helpIsOpen()) this.exit();
        else this.enter();
    },
};

// --- Community levels ---

const REFRESH_INTERVAL = 3 * 60 * 1000; // 3 minutes

const community = {
    levels: null,       // Cached levels after successful fetch
    version: null,      // Cached version for efficient polling
    loading: false,     // Prevent concurrent fetches

    // Fetch just the version number (lightweight, no sheet read)
    async fetchVersion() {
        const response = await fetch(`${COMMUNITY_LEVELS_URL}?version`);
        const text = await response.text();
        if (text.startsWith('Error:')) throw new Error(text);
        return parseInt(text, 10);
    },

    // Fetch all levels from the community Apps Script endpoint
    async fetchLevels() {
        const response = await fetch(COMMUNITY_LEVELS_URL);
        const text = await response.text();

        if (text.startsWith('Error:')) {
            throw new Error(text);
        }

        return this.parse(text);
    },

    // Check for new levels and update list if changed
    async refresh() {
        if (this.loading || this.levels === null) return;

        try {
            const newVersion = await this.fetchVersion();
            if (newVersion !== this.version) {
                this.version = newVersion;
                this.levels = await this.fetchLevels();
                // Update UI if community tab is active
                const activeTab = document.querySelector('.sidebar-tab.active');
                if (activeTab?.dataset.tab === 'community') {
                    populateLevelList(this.levels);
                }
            }
        } catch (e) {
            console.warn('Failed to refresh community levels:', e);
        }
    },

    // Start periodic polling
    startPolling() {
        setInterval(() => this.refresh(), REFRESH_INTERVAL);
    },

    // Parse response: one base64-encoded level per line
    parse(text) {
        const levels = [];
        for (const line of text.trim().split('\n')) {
            if (!line) continue;
            try {
                levels.push(JSON.parse(atob(line)));
            } catch (e) {
                console.warn('Failed to parse level:', e);
            }
        }
        return levels;
    },

    // Show community tab content
    async showTab() {
        // If already loading, wait
        if (this.loading) return;

        // If no cached levels, fetch them
        if (!this.levels) {
            this.loading = true;
            this.showLoading();
            try {
                this.version = await this.fetchVersion();
                this.levels = await this.fetchLevels();
            } catch (e) {
                console.error('Failed to fetch community levels:', e);
                this.showError(this.formatError(e.message));
                this.loading = false;
                return;
            }
            this.loading = false;
        }

        // Show levels or empty message
        if (this.levels.length > 0) {
            populateLevelList(this.levels);
        } else {
            this.showEmpty();
        }
    },

    showLoading() {
        ui.levelList.innerHTML = '<div class="community-message">Loading community levels...</div>';
    },

    showEmpty() {
        ui.levelList.innerHTML = `
            <div class="community-message">
                No community levels yet.<br>
                Share your levels from the Level Creator!
            </div>
        `;
    },

    showError(message) {
        ui.levelList.innerHTML = `
            <div class="community-message">
                <span class="community-error">${message}</span>
            </div>
        `;
    },

    // Convert fetch errors to helpful messages
    formatError(message) {
        if (message.includes('401') || message.includes('403')) {
            return 'Community levels temporarily unavailable.';
        }
        if (message.includes('404')) {
            return 'Community levels not found.';
        }
        if (message.includes('Invalid URL')) {
            return 'Configuration error.';
        }
        return `Failed to load: ${message}`;
    },
};

// --- Level list ---

function populateLevelList(levelArray, { deletable = false } = {}) {
    ui.levelList.innerHTML = '';
    for (const lvl of levelArray) {
        const item = document.createElement('div');
        item.className = 'sidebar-level-item';

        const wrapper = document.createElement('div');
        wrapper.className = 'thumbnail-wrapper';
        const grid = document.createElement('div');
        createGrid(grid, lvl.nRows, lvl.nCols, lvl);
        wrapper.appendChild(grid);

        const name = document.createElement('div');
        name.className = 'sidebar-level-name';
        name.textContent = lvl.name || 'Untitled';

        item.appendChild(wrapper);
        item.appendChild(name);

        if (deletable && lvl.id) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-level-btn';
            deleteBtn.innerHTML = '<svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M11 1.5v1h3.5a.5.5 0 0 1 0 1h-.538l-.853 10.66A2 2 0 0 1 11.115 16h-6.23a2 2 0 0 1-1.994-1.84L2.038 3.5H1.5a.5.5 0 0 1 0-1H5v-1A1.5 1.5 0 0 1 6.5 0h3A1.5 1.5 0 0 1 11 1.5m-5 0v1h4v-1a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5M4.5 5.029l.5 8.5a.5.5 0 1 0 .998-.06l-.5-8.5a.5.5 0 1 0-.998.06m6.53-.528a.5.5 0 0 0-.528.47l-.5 8.5a.5.5 0 0 0 .998.058l.5-8.5a.5.5 0 0 0-.47-.528M8 4.5a.5.5 0 0 0-.5.5v8.5a.5.5 0 0 0 1 0V5a.5.5 0 0 0-.5-.5"/></svg>';
            deleteBtn.title = 'Delete level';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Delete "${lvl.name}"?`)) {
                    Editor.deleteCustomLevel(lvl.id);
                    populateLevelList(Editor.getCustomLevels(), { deletable: true });
                }
            });
            item.appendChild(deleteBtn);
        }

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

// --- Initialize ---

// Hide splash screen if disabled
if (!ENABLE_SPLASH_SCREEN && ui.splashScreen) {
    ui.splashScreen.style.display = "none";
}

// TODO: move this to validate? I guess it is not even possible to generate a level like this 
// at the moment. Maybe just remove from the standard levels and we're good 
// Prepare levels (convert uppercase start tiles to lowercase)
for (let lvl of levels) {
    const [r, c] = lvl.start;
    const row = lvl.grid[r].split("");
    row[c] = row[c].toLowerCase() || row[c];
    lvl.grid[r] = row.join("");
}

// Initialize game and editor modules
Game.init();
Editor.init();

// Build level list
ui.sidebarTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        ui.sidebarTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const tabName = tab.dataset.tab;
        if (tabName === 'default') {
            populateLevelList(levels);
        } else if (tabName === 'my-levels') {
            populateLevelList(Editor.getCustomLevels(), { deletable: true });
        } else if (tabName === 'community') {
            community.showTab();
        }
    });
});

populateLevelList(levels);

// Refresh My Levels tab when levels change
window.addEventListener('levels-updated', () => {
    const activeTab = document.querySelector('.sidebar-tab.active');
    if (activeTab?.dataset.tab === 'my-levels') {
        populateLevelList(Editor.getCustomLevels(), { deletable: true });
    }
});

// Refresh community levels when a level is shared
window.addEventListener('community-levels-updated', () => {
    community.refresh();
});

// Start polling for new community levels
community.startPolling();

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

// Sidebar pull-tab and click-outside-to-close
ui.sidebarPullTab.onclick = () => ui.sidebar.classList.toggle("collapsed");
document.addEventListener('click', (e) => {
    const isOutside = !ui.sidebar.contains(e.target);
    const isModeToggle = e.target.closest('.mode-toggle');
    if (isOutside && !isModeToggle) {
        ui.sidebar.classList.add("collapsed");
    }
});

// Help pane
ui.helpButton.onclick = () => help.toggle();
ui.helpClose.onclick = () => help.exit();
ui.helpOverlay.onclick = () => help.exit();

// Colorblind mode toggle
const colorblindEnabled = localStorage.getItem('colorblind-mode') === 'true';
document.body.classList.toggle('colorblind-mode', colorblindEnabled);
ui.colorblindToggle.checked = colorblindEnabled;
ui.colorblindToggle.onchange = () => {
    const enabled = ui.colorblindToggle.checked;
    document.body.classList.toggle('colorblind-mode', enabled);
    localStorage.setItem('colorblind-mode', enabled);
};

// Mode toggle
ui.modePlay.onclick = () => {
    Editor.exit();
    document.body.classList.remove('editor-mode');
    ui.playPane.hidden = false;
    ui.editorPane.hidden = true;
    ui.modePlay.classList.add("active");
    ui.modeEdit.classList.remove("active");
    Game.enter();
};

ui.modeEdit.onclick = () => {
    Game.exit();
    document.body.classList.add('editor-mode');
    ui.playPane.hidden = true;
    ui.editorPane.hidden = false;
    ui.modePlay.classList.remove("active");
    ui.modeEdit.classList.add("active");
    // Switch to My Levels tab
    ui.sidebarTabs.forEach(t => t.classList.remove('active'));
    document.querySelector('[data-tab="my-levels"]').classList.add('active');
    populateLevelList(Editor.getCustomLevels(), { deletable: true });
    Editor.enter();
};

// Global shortcuts (editor mode only - game mode uses shortcuts.js)
document.addEventListener('keydown', (e) => {
    // Help toggle - only in editor mode when not typing
    if (e.key === '?' && document.body.classList.contains('editor-mode') && !ui.editor.hasFocus()) {
        e.preventDefault();
		help.toggle();
    }
    // Escape closes help pane
    if (e.key === 'Escape' && ui.helpPane.classList.contains('show')) {
        e.preventDefault();
        help.exit();
    }
});

// Run PigJatin tests
PigJatin.loadTestCases("./PigJatin/testcases.txt").then(PigJatin.runTests);
