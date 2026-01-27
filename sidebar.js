// sidebar.js - Sidebar level list rendering
//
// All tab rendering for Default, My Levels, Community, Trash.
// Unified populateLevelList with options for delete/restore buttons.

import { createGrid } from "./grid.js";
import { ui } from "./ui.js";
import * as Editor from "./editor.js";
import * as Game from "./game.js";
import * as community from "./community.js";
import { spin, notify } from "./animations.js";
import { isEditorMode, getBuiltInLevels, getCustomLevels, deleteCustomLevel, getDeletedLevels, restoreLevel, emptyTrash, onLevelsChange, getCommunityLevels, isStarred as isLevelStarred } from "./app.js";

// --- State ---

const state = {
    viewMode: localStorage.getItem('svinesti-community-view') || 'thumbnails',
    searchQuery: '',
};

// --- Unified Level List ---

function populateLevelList(levelArray, { deletable = false, restorable = false, append = false } = {}, container = null) {
    const target = container || ui.levelList;
    if (!container && !append) target.innerHTML = '';

    // Only allow delete in editor mode
    const canDelete = deletable && isEditorMode();

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

        // Delete button (My Levels, editor mode only)
        if (canDelete) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-level-btn';
            deleteBtn.innerHTML = '<img src="icons/trash3-fill.svg" alt="" width="16" height="16">';
            deleteBtn.title = 'Delete level';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteCustomLevel(lvl.id);
                showMyLevelsTab();
            });
            item.appendChild(deleteBtn);
        }

        // Restorable items (Trash) - special styling
        if (restorable) {
            item.classList.add('restorable');
        }

        // Star button (Community)
        if (lvl.stars !== undefined && lvl.uid) {
            const starred = isLevelStarred(lvl.uid);
            const starBtn = document.createElement('button');
            starBtn.className = 'star-btn' + (starred ? ' starred' : '');
            starBtn.innerHTML = `<img src="/img/golden-apple.png" alt=""><span>${lvl.stars}</span>`;
            starBtn.title = starred ? 'Remove star' : 'Star this level';
            starBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                community.starLevel(lvl.uid, showCommunityLevels, () => {
                    const notif = document.querySelector('.community-header .notification');
                    if (notif) notify(notif, 'Could not reach server', true, 2000);
                });
            });
            item.appendChild(starBtn);
        }

        target.appendChild(item);

        if (restorable && lvl.id) {
            // Trash: clicking restores the level
            item.addEventListener('click', () => {
                restoreLevel(lvl.id);
                showTrashTab();
            });
        } else {
            // Normal: clicking loads the level
            item.addEventListener('click', () => {
                if (isEditorMode()) {
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
}

// --- Tab Functions ---

export function showDefaultTab() {
    ui.levelList.innerHTML = '';
    populateLevelList(getBuiltInLevels());
}

export function showMyLevelsTab() {
    ui.levelList.innerHTML = '';
    populateLevelList(getCustomLevels(), { deletable: true });
}

export function showTrashTab() {
    const deleted = getDeletedLevels();
    ui.levelList.innerHTML = '';

    if (deleted.length === 0) {
        const msg = document.createElement('div');
        msg.className = 'community-message';
        msg.textContent = 'Trash is empty';
        ui.levelList.appendChild(msg);
        return;
    }

    const header = document.createElement('div');
    header.className = 'trash-header';

    const emptyBtn = document.createElement('button');
    emptyBtn.className = 'btn empty-trash-btn';
    emptyBtn.textContent = 'Empty Trash';
    emptyBtn.addEventListener('click', () => {
        if (confirm('Permanently delete all levels in trash?')) {
            emptyTrash();
            showTrashTab();
        }
    });
    header.appendChild(emptyBtn);

    const hint = document.createElement('div');
    hint.className = 'trash-hint';
    hint.textContent = 'Click a level to restore it';
    header.appendChild(hint);

    ui.levelList.appendChild(header);

    populateLevelList(deleted, { restorable: true, append: true });
}

// --- Community Tab ---

export async function showCommunityTab() {
    if (!community.hasConsent()) {
        showConsentRequest();
        return;
    }

    if (community.isLoading()) {
        showCommunityLoading();
        return;
    }

    const result = await community.fetchIfNeeded();
    if (result.error) {
        showCommunityError(result.error);
        return;
    }

    if (result.levels.length === 0) {
        showCommunityEmpty();
    } else {
        showCommunityLevels();
    }
}

function showCommunityLevels() {
    const levels = getCommunityLevels();
    const sorted = [...levels].sort((a, b) => (b.stars || 0) - (a.stars || 0));
    const filtered = state.searchQuery
        ? sorted.filter(l => l.name?.toLowerCase().includes(state.searchQuery))
        : sorted;

    ui.levelList.innerHTML = '';

    // Header: search + view toggle + refresh
    const header = document.createElement('div');
    header.className = 'community-header';

    const search = document.createElement('input');
    search.type = 'text';
    search.className = 'community-search';
    search.placeholder = 'Search levels...';
    search.value = state.searchQuery;
    search.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.toLowerCase();
        showCommunityLevels();
    });
    header.appendChild(search);

    // View toggle
    const toggleLabel = document.createElement('label');
    toggleLabel.className = 'toggle-switch';
    toggleLabel.title = 'Toggle list view';
    const toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.checked = state.viewMode === 'list';
    toggleInput.addEventListener('change', () => {
        state.viewMode = toggleInput.checked ? 'list' : 'thumbnails';
        localStorage.setItem('svinesti-community-view', state.viewMode);
        showCommunityLevels();
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
        community.forceRefresh().then((result) => {
            anim.cancel();
            if (result === true) showCommunityLevels();
            else if (result === false) notify(refreshNotification, 'No new levels', false, 2000);
            else notify(refreshNotification, 'Could not reach server', true, 2000);
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
        if (state.viewMode === 'list') container.classList.add('list-view');
        populateLevelList(filtered, {}, container);
        ui.levelList.appendChild(container);
    } else if (state.searchQuery) {
        const msg = document.createElement('div');
        msg.className = 'community-message';
        msg.textContent = 'No levels match your search.';
        ui.levelList.appendChild(msg);
    }

    // Re-focus search if actively searching
    if (state.searchQuery) {
        search.focus();
        search.selectionStart = search.selectionEnd = search.value.length;
    }
}

function showCommunityLoading() {
    ui.levelList.innerHTML = '<div class="community-message">Loading community levels...</div>';
}

function showCommunityEmpty() {
    ui.levelList.innerHTML = `
        <div class="community-message">
            No community levels yet.<br>
            Share your levels from the Level Creator!
        </div>
    `;
}

function showCommunityError(message) {
    ui.levelList.innerHTML = `
        <div class="community-message">
            <span class="community-error">${message}</span>
        </div>
    `;
}

function showConsentRequest() {
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
        community.setConsent(true);
        ui.communityConsentToggle.checked = true;
        showCommunityTab();
    });
}

// --- Init ---

export function init() {
    ui.sidebarTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            ui.sidebarTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const tabName = tab.dataset.tab;
            if (tabName === 'default') showDefaultTab();
            else if (tabName === 'my-levels') showMyLevelsTab();
            else if (tabName === 'community') showCommunityTab();
            else if (tabName === 'trash') showTrashTab();
        });
    });

    onLevelsChange(() => refreshActiveTab());
}

export function refreshActiveTab() {
    const activeTab = document.querySelector('.sidebar-tab.active');
    const tabName = activeTab?.dataset.tab;
    if (tabName === 'my-levels') showMyLevelsTab();
    else if (tabName === 'trash') showTrashTab();
    else if (tabName === 'community') showCommunityLevels();
}
