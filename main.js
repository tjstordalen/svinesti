// main.js - App shell (help pane, mode switching)

import * as PigJatin from "./PigJatin/PigJatin.js";
import * as Editor from "./editor.js";
import * as Game from "./game.js";
import * as community from "./community.js";
import * as sidebar from "./sidebar.js";
import { levels } from "./levels.js";
import { ui } from "./ui.js";
import { setMode, isEditorMode } from "./mode.js";

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

// Initialize modules
Game.init();
Editor.init();
sidebar.init();
sidebar.showDefaultTab();

// Refresh sidebar when levels change
window.addEventListener('levels-updated', () => sidebar.refreshActiveTab());

// Refresh community levels when a level is shared
window.addEventListener('community-levels-updated', () => {
    community.forceRefresh().then(result => {
        if (result === true) sidebar.refreshActiveTab();
    });
});

// Preload community levels and start polling
community.preload();
community.startPolling(() => sidebar.refreshActiveTab());

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
        sidebar.showCommunityTab();
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
    setMode('game');
    ui.modePlay.classList.add("active");
    ui.modeEdit.classList.remove("active");
    // Switch away from Trash tab (not visible in play mode)
    const activeTab = document.querySelector('.sidebar-tab.active');
    if (activeTab?.dataset.tab === 'trash') {
        ui.sidebarTabs.forEach(t => t.classList.remove('active'));
        document.querySelector('[data-tab="default"]').classList.add('active');
        sidebar.showDefaultTab();
    }
    Game.enter();
};

ui.modeEdit.onclick = () => {
    Game.exit();
    setMode('editor');
    ui.modePlay.classList.remove("active");
    ui.modeEdit.classList.add("active");
    // Switch to My Levels tab
    ui.sidebarTabs.forEach(t => t.classList.remove('active'));
    document.querySelector('[data-tab="my-levels"]').classList.add('active');
    sidebar.showMyLevelsTab();
    Editor.enter();
};

// Global shortcuts (editor mode only - game mode uses shortcuts.js)
document.addEventListener('keydown', (e) => {
    // Help toggle - only in editor mode when not typing
    if (e.key === '?' && isEditorMode() && !ui.editor.hasFocus()) {
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
