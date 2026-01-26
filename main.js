// main.js - App shell (help pane, sidebar, mode switching)

import * as PigJatin from "./PigJatin/PigJatin.js";
import * as Editor from "./editor.js";
import * as Game from "./game.js";
import * as community from "./community.js";
import { createGrid } from "./grid.js";
import { levels } from "./levels.js";
import { ui } from "./ui.js";

const ENABLE_SPLASH_SCREEN = true;

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

// --- Level list ---

function populateLevelList(levelArray, { deletable = false } = {}, container = null) {
    const target = container || ui.levelList;
    if (!container) target.innerHTML = '';

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
            deleteBtn.innerHTML = '<img src="icons/trash3-fill.svg" alt="" width="16" height="16">';
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

        // Star button for community levels
        if (lvl.stars !== undefined && lvl.uid) {
            const isStarred = localStorage.getItem(`starred-${lvl.uid}`) === '1';
            const starBtn = document.createElement('button');
            starBtn.className = 'star-btn' + (isStarred ? ' starred' : '');
            starBtn.innerHTML = `<img src="/img/golden-apple.png" alt=""><span>${lvl.stars}</span>`;
            starBtn.title = isStarred ? 'Remove star' : 'Star this level';
            starBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                community.starLevel(lvl.uid);
            });
            item.appendChild(starBtn);
        }

        target.appendChild(item);

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
community.init(populateLevelList);

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

// Preload community levels and start polling
community.preload();
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

// Community consent toggle
ui.communityConsentToggle.checked = community.hasConsent();
ui.communityConsentToggle.onchange = () => {
    community.setConsent(ui.communityConsentToggle.checked);
    // Refresh community tab if active
    const activeTab = document.querySelector('.sidebar-tab.active');
    if (activeTab?.dataset.tab === 'community') {
        community.showTab();
    }
};

// Show help on start toggle (default: true)
const showHelpOnStart = localStorage.getItem('svinesti-show-help-on-start') !== 'false';
ui.showHelpOnStartToggle.checked = showHelpOnStart;
ui.showHelpOnStartToggle.onchange = () => {
    localStorage.setItem('svinesti-show-help-on-start', ui.showHelpOnStartToggle.checked);
};
if (showHelpOnStart) {
    help.enter();
}

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
