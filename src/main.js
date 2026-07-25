// main.js - App shell (help pane, mode switching)

import * as app from "./app.js?v=@version-placeholder@";
import * as Editor from "./editor.js?v=@version-placeholder@";
import * as Game from "./game.js?v=@version-placeholder@";
import * as community from "./community.js?v=@version-placeholder@";
import * as sidebar from "./sidebar.js?v=@version-placeholder@";
import * as PigJatin from "./PigJatin/PigJatin.js?v=@version-placeholder@";
import { MODE } from "./constants.js?v=@version-placeholder@";

// Dev console: await runPigJatinTests()
window.runPigJatinTests = async () => {
    const cases = await PigJatin.loadTestCases("src/PigJatin/testcases.txt");
    PigJatin.runTests(cases);
};

// --- DOM References ---

const $ = id => document.getElementById(id);
const helpButton = $('help-button');
const helpPane = $('help-modal');
const helpClose = $('help-close');
const helpOverlay = document.querySelector('.help-overlay');
const modePlay = $('mode-play');
const modeEdit = $('mode-edit');
const colorblindToggle = $('colorblind-toggle');
const communityConsentToggle = $('community-consent-toggle');
const showHelpOnStartToggle = $('show-help-on-start-toggle');
const levelList = $('level-list');

app.init();

// --- Help pane ---

const help = {
    previousFocus: null,

    helpIsOpen() {
        return helpPane.classList.contains("show");
    },

    enter() {
        // Sync toggles with current pref values
        colorblindToggle.checked = app.prefs.colorblind.get();
        communityConsentToggle.checked = app.prefs.communityConsent.get();
        showHelpOnStartToggle.checked = app.prefs.showHelpOnStart.get();

        this.previousFocus = document.activeElement;
        helpPane.classList.add("show");
        helpPane.focus();
    },

    exit() {
        helpPane.classList.remove("show");
        this.previousFocus?.focus();
        this.previousFocus = null;
    },

    toggle() {
        if (this.helpIsOpen()) this.exit();
        else this.enter();
    },
};

// --- Initialize ---

// Initialize modules
Game.init();
Editor.init();
sidebar.init();
sidebar.showDefaultTab();

// Refresh community levels when a level is shared
window.addEventListener('community-levels-updated', () => {
    community.forceRefresh().then(result => {
        if (result === true) sidebar.refreshActiveTab();
    });
});

// Preload community levels and start polling
// This does nothing if the user has not given consent
community.preload();
community.startPolling(() => sidebar.refreshActiveTab());

// Load shared level from URL, or select first level
const sharedLevel = Editor.importFromURL();
if (sharedLevel) {
    Game.load(sharedLevel);
} else {
    levelList.querySelector(".sidebar-level-item")?.click();
}

// Start in game mode
Game.enter();

// --- Event handlers ---

// Help pane
helpButton.onclick = () => help.toggle();
helpClose.onclick = () => help.exit();
helpOverlay.onclick = () => help.exit();

// Colorblind mode toggle
colorblindToggle.checked = app.prefs.colorblind.get();
colorblindToggle.onchange = () => app.prefs.colorblind.set(colorblindToggle.checked);

// Community consent toggle
communityConsentToggle.checked = app.prefs.communityConsent.get();
communityConsentToggle.onchange = () => {
    app.prefs.communityConsent.set(communityConsentToggle.checked);
    // Refresh community tab if active
    const activeTab = document.querySelector('.sidebar-tab.active');
    if (activeTab?.dataset.tab === 'community') {
        sidebar.showCommunityTab();
    }
};

// Show help on start toggle (default: true)
showHelpOnStartToggle.checked = app.prefs.showHelpOnStart.get();
showHelpOnStartToggle.onchange = () => app.prefs.showHelpOnStart.set(showHelpOnStartToggle.checked);
if (app.prefs.showHelpOnStart.get()) {
    help.enter();
}

// Mode toggle
modePlay.onclick = () => {
    Editor.exit();
    app.mode.set(MODE.GAME);
    modePlay.classList.add("active");
    modeEdit.classList.remove("active");
    sidebar.refreshActiveTab();
    Game.enter();
};

modeEdit.onclick = () => {
    Game.exit();
    app.mode.set(MODE.EDITOR);
    modePlay.classList.remove("active");
    modeEdit.classList.add("active");
    sidebar.refreshActiveTab();
    Editor.enter();
};

// Global shortcuts
document.addEventListener('keydown', (e) => {
    // Help toggle (global)
    if (e.key === '?') {
        e.preventDefault();
        help.toggle();
    }
    // Escape closes help pane
    if (e.key === 'Escape' && helpPane.classList.contains('show')) {
        e.preventDefault();
        help.exit();
    }
});

