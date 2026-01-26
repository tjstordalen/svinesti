// main.js - App shell (help pane, sidebar, mode switching)

import * as PigJatin from "./PigJatin/PigJatin.js";
import * as Editor from "./editor.js";
import * as Game from "./game.js";
import { createGrid } from "./grid.js";
import { levels } from "./levels.js";
import { ui } from "./ui.js";
import { spin, notify } from "./animations.js";

const ENABLE_SPLASH_SCREEN = true;

// Apps Script endpoint for community levels (GET to fetch, POST to submit)
const COMMUNITY_LEVELS_URL = 'https://script.google.com/macros/s/AKfycbwne7UEsOMM6Aa0WD5X2KdUx0eZX8QyZQ6FcWajARqaUa9Zs_ICcfJYCuVhrWXzgHjO7Q/exec';

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

const COMMUNITY_CONSENT_KEY = 'svinesti-community-consent';

const community = {
    levels: null,       // Cached levels after successful fetch
    version: null,      // Cached version for efficient polling
    loading: false,     // Prevent concurrent fetches
    viewMode: localStorage.getItem('svinesti-community-view') || 'thumbnails', // 'thumbnails' | 'list'

    hasConsent() {
        return localStorage.getItem(COMMUNITY_CONSENT_KEY) === 'true';
    },

    setConsent(enabled) {
        localStorage.setItem(COMMUNITY_CONSENT_KEY, enabled ? 'true' : 'false');
        if (enabled && !this.levels) {
            this.preload();
        }
    },

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
        if (!this.hasConsent()) return;
        if (this.loading || this.levels === null) return;

        try {
            const newVersion = await this.fetchVersion();
            if (newVersion !== this.version) {
                this.version = newVersion;
                this.levels = await this.fetchLevels();
                // Update UI if community tab is active
                const activeTab = document.querySelector('.sidebar-tab.active');
                if (activeTab?.dataset.tab === 'community') {
                    this.showLevels();
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

    // Fetch levels in background so they're ready when user opens tab
    async preload() {
        if (!this.hasConsent()) return;
        if (this.loading || this.levels) return;
        this.loading = true;
        try {
            this.version = await this.fetchVersion();
            this.levels = await this.fetchLevels();
        } catch (e) {
            console.warn('Failed to preload community levels:', e);
        }
        this.loading = false;
        // Update UI if community tab is active
        const activeTab = document.querySelector('.sidebar-tab.active');
        if (activeTab?.dataset.tab === 'community') {
            this.showLevels();
        }
    },

    // Parse response: base64<TAB>stars per line
    parse(text) {
        const levels = [];
        for (const line of text.trim().split('\n')) {
            if (!line) continue;
            try {
                const [encoded, stars] = line.split('\t');
                const level = JSON.parse(atob(encoded));
                level.stars = parseInt(stars, 10) || 0;
                levels.push(level);
            } catch (e) {
                console.warn('Failed to parse level:', e);
            }
        }
        return levels;
    },

    // Star or unstar a level
    starLevel(uid) {
        if (!this.hasConsent()) return;

        const key = `starred-${uid}`;
        const isStarred = localStorage.getItem(key) === '1';

        // Optimistic update
        localStorage.setItem(key, isStarred ? '0' : '1');
        const level = this.levels.find(l => l.uid === uid);
        if (level) level.stars += isStarred ? -1 : 1;
        this.showLevels();

        // Fire and forget
        fetch(COMMUNITY_LEVELS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'star', uid, starred: !isStarred })
        });
    },

    searchQuery: '',    // Current search filter

    // Manual refresh: check version, fetch if changed, update in background
    // Returns true if new levels were found, false otherwise
    async forceRefresh() {
        if (!this.hasConsent()) return false;
        try {
            const newVersion = await this.fetchVersion();
            if (newVersion === this.version) return false; // No changes
            this.version = newVersion;
            this.levels = await this.fetchLevels();
            // Update UI if community tab is still active
            const activeTab = document.querySelector('.sidebar-tab.active');
            if (activeTab?.dataset.tab === 'community') {
                this.showLevels();
            }
            return true;
        } catch (e) {
            console.warn('Failed to refresh community levels:', e);
            return false;
        }
    },

    // Show community tab content
    async showTab() {
        // If no consent, show consent request
        if (!this.hasConsent()) {
            this.showConsentRequest();
            return;
        }

        // If already loading, show loading message
        if (this.loading) {
            this.showLoading();
            return;
        }

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
            this.showLevels();
        } else {
            this.showEmpty();
        }
    },

    // Show search field and filtered levels (sorted by stars)
    showLevels() {
        const sorted = [...this.levels].sort((a, b) => (b.stars || 0) - (a.stars || 0));
        const filtered = this.searchQuery
            ? sorted.filter(l => l.name?.toLowerCase().includes(this.searchQuery))
            : sorted;

        ui.levelList.innerHTML = '';

        // Header: search + view toggle
        const header = document.createElement('div');
        header.className = 'community-header';

        const search = document.createElement('input');
        search.type = 'text';
        search.className = 'community-search';
        search.placeholder = 'Search levels...';
        search.value = this.searchQuery;
        search.addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.showLevels();
        });
        header.appendChild(search);

        // View toggle
        const toggleLabel = document.createElement('label');
        toggleLabel.className = 'toggle-switch';
        toggleLabel.title = 'Toggle list view';
        const toggleInput = document.createElement('input');
        toggleInput.type = 'checkbox';
        toggleInput.checked = this.viewMode === 'list';
        toggleInput.addEventListener('change', () => {
            this.viewMode = toggleInput.checked ? 'list' : 'thumbnails';
            localStorage.setItem('svinesti-community-view', this.viewMode);
            this.showLevels();
        });
        const toggleSlider = document.createElement('span');
        toggleSlider.className = 'toggle-slider';
        toggleLabel.appendChild(toggleInput);
        toggleLabel.appendChild(toggleSlider);
        header.appendChild(toggleLabel);

        const viewLabel = document.createElement('span');
        viewLabel.className = 'community-view-label';
        viewLabel.textContent = 'Compact';
        header.appendChild(viewLabel);

        const refreshBtn = document.createElement('button');
        refreshBtn.className = 'community-refresh-btn';
        refreshBtn.title = 'Refresh levels';
        refreshBtn.innerHTML = '<img src="icons/arrow-counterclockwise.svg" alt="">';

        const refreshNotification = document.createElement('div');
        refreshNotification.className = 'notification';

        refreshBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            refreshBtn.disabled = true;
            const anim = spin(refreshBtn.querySelector('img'));
            this.forceRefresh().then((hasNew) => {
                anim.cancel();
                if (!hasNew) notify(refreshNotification, 'No new levels', false, 2000);
            });
            setTimeout(() => refreshBtn.disabled = false, 30000);
        });
        header.appendChild(refreshBtn);
        header.appendChild(refreshNotification);

        ui.levelList.appendChild(header);

        // Levels
        if (filtered.length > 0) {
            const container = document.createElement('div');
            container.className = 'community-levels-container';
            if (this.viewMode === 'list') container.classList.add('list-view');
            populateLevelList(filtered, {}, container);
            ui.levelList.appendChild(container);
        } else if (this.searchQuery) {
            const msg = document.createElement('div');
            msg.className = 'community-message';
            msg.textContent = 'No levels match your search.';
            ui.levelList.appendChild(msg);
        }

        // Re-focus search if actively searching
        if (this.searchQuery) {
            search.focus();
            search.selectionStart = search.selectionEnd = search.value.length;
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

    showConsentRequest() {
        ui.levelList.innerHTML = `
            <div class="community-consent">
                <h3>Community Levels</h3>
                <p>Community levels are stored on Google's servers. To browse and share levels, this app will contact Google.</p>
                <p><strong>What's stored:</strong></p>
                <ul>
                    <li>Levels you share (grid layout, name)</li>
                    <li>Star counts for levels</li>
                </ul>
                <p><strong>Note:</strong> Google receives your IP address when requests are made. Svinesti does not store any personal data. You can withdraw consent in the help menu.</p>
                <button class="btn btn-primary" id="community-consent-btn">Enable Community Levels</button>
            </div>
        `;
        document.getElementById('community-consent-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.setConsent(true);
            ui.communityConsentToggle.checked = true;
            this.showTab();
        });
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
