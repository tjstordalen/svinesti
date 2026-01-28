// sidebar.js - Sidebar level list rendering

import { createGrid } from "./grid.js";
import { ui } from "./ui.js";
import * as Editor from "./editor.js";
import * as Game from "./game.js";
import * as community from "./community.js";
import { spin, notify } from "./animations.js";
import { mode, levels, prefs } from "./app.js";

// --- Helpers ---

const parser = new DOMParser();
const html = (str) => parser.parseFromString(str, 'text/html').body.firstElementChild;

const TYPE = {
    DEFAULT: 'default',
    CUSTOM: 'custom',
    COMMUNITY: 'community',
    TRASH: 'trash',
};

// --- State ---

let searchQuery = '';

// --- Level Card ---

function makeLevelItemCard(level, type, onRefresh) {
    const item = html(`
        <div class="sidebar-level-item">
            <div class="thumbnail-wrapper"><div class="grid"></div></div>
            <div class="sidebar-level-name"></div>
        </div>
    `);

    createGrid(item.querySelector('.grid'), level.nRows, level.nCols, level);
    item.querySelector('.sidebar-level-name').textContent = level.name || 'Untitled';

    const loadLevel = () => {
        (mode.isEditor() ? Editor.load : Game.selectLevel)(level);
        ui.levelList.querySelectorAll('.sidebar-level-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        ui.sidebar.classList.add('collapsed');
    };

    switch (type) {
        case TYPE.DEFAULT:
            item.addEventListener('click', loadLevel);
            break;

        case TYPE.CUSTOM:
            item.addEventListener('click', loadLevel);
            if (!mode.isEditor()) break;

            const deleteBtn = html(`
                <button class="delete-level-btn" title="Delete level">
                    <img src="icons/trash3-fill.svg" alt="" width="16" height="16">
                </button>
            `);
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                levels.delete(level.id);
                onRefresh?.();
            });
            item.appendChild(deleteBtn);
            break;

        case TYPE.COMMUNITY: {
            item.addEventListener('click', loadLevel);

            const starred = levels.isStarred(level.uid);
            const starBtn = html(`
                <button class="star-btn${starred ? ' starred' : ''}" title="${starred ? 'Remove star' : 'Star this level'}">
                    <img src="/img/golden-apple.png" alt=""><span>${level.stars || 0}</span>
                </button>
            `);

            starBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const wasStarred = levels.isStarred(level.uid);
                const newStarred = !wasStarred;

                // Optimistic update
                levels.setStarred(level.uid, newStarred);
                level.stars += newStarred ? 1 : -1;
                onRefresh?.();

                community.sendStar(level.uid, newStarred).catch(() => {
                    // Revert on failure
                    levels.setStarred(level.uid, wasStarred);
                    level.stars += wasStarred ? 1 : -1;
                    onRefresh?.();
                    const notif = document.querySelector('.community-header .notification');
                    if (notif) notify(notif, 'Could not reach server', true, 2000);
                });
            });
            item.appendChild(starBtn);
            break;
        }

        case TYPE.TRASH:
            item.classList.add('restorable');
            item.addEventListener('click', () => {
                levels.restore(level.id);
                onRefresh?.();
            });
            break;
    }

    return item;
}

function renderLevels(levelArray, type, container = ui.levelList) {
    const onRefresh = () => refreshActiveTab();
    for (const level of levelArray) {
        container.appendChild(makeLevelItemCard(level, type, onRefresh));
    }
}

// --- Tabs ---

const TAB_HANDLERS = {
    'default': showDefaultTab,
    'my-levels': showMyLevelsTab,
    'community': showCommunityTab,
    'trash': showTrashTab,
};

export function showDefaultTab() {
    ui.levelList.innerHTML = '';
    renderLevels(levels.builtIn(), TYPE.DEFAULT);
}

export function showMyLevelsTab() {
    ui.levelList.innerHTML = '';
    renderLevels(levels.custom(), TYPE.CUSTOM);
}

export function showTrashTab() {
    const deleted = levels.deleted();
    ui.levelList.innerHTML = '';

    if (deleted.length === 0) {
        ui.levelList.appendChild(html(`<div class="community-message">Trash is empty</div>`));
        return;
    }

    const header = html(`
        <div class="trash-header">
            <button class="btn empty-trash-btn">Empty Trash</button>
            <div class="trash-hint">Click a level to restore it</div>
        </div>
    `);
    header.querySelector('.empty-trash-btn').addEventListener('click', () => {
        if (confirm('Permanently delete all levels in trash?')) {
            levels.emptyTrash();
            showTrashTab();
        }
    });
    ui.levelList.appendChild(header);

    renderLevels(deleted, TYPE.TRASH);
}

// --- Community Tab ---

export async function showCommunityTab() {
    if (!prefs.communityConsent.get()) {
        showConsentRequest();
        return;
    }

    if (community.isLoading()) {
        ui.levelList.innerHTML = '<div class="community-message">Loading community levels...</div>';
        return;
    }

    const result = await community.fetchIfNeeded();
    if (result.error) {
        ui.levelList.innerHTML = `<div class="community-message"><span class="community-error">${result.error}</span></div>`;
        return;
    }

    if (result.levels.length === 0) {
        ui.levelList.innerHTML = `
            <div class="community-message">
                No community levels yet.<br>
                Share your levels from the Level Creator!
            </div>
        `;
    } else {
        showCommunityLevels();
    }
}

function showCommunityLevels() {
    const communityLevels = community.getLevels();
    const sorted = [...communityLevels].sort((a, b) => (b.stars || 0) - (a.stars || 0));
    const filtered = searchQuery
        ? sorted.filter(l => l.name?.toLowerCase().includes(searchQuery))
        : sorted;

    ui.levelList.innerHTML = '';

    // Header
    const header = html(`
        <div class="community-header">
            <input type="text" class="community-search" placeholder="Search levels...">
            <label class="toggle-switch" title="Toggle list view">
                <input type="checkbox">
                <span class="toggle-slider"></span>
            </label>
            <span class="community-view-label">Compact</span>
            <button class="community-refresh-btn" title="Refresh levels">
                <img src="icons/arrow-counterclockwise.svg" alt="">
            </button>
            <div class="notification"></div>
        </div>
    `);

    const search = header.querySelector('.community-search');
    search.value = searchQuery;
    search.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        showCommunityLevels();
    });

    const toggle = header.querySelector('input[type="checkbox"]');
    toggle.checked = prefs.communityViewMode.get() === 'list';
    toggle.addEventListener('change', () => {
        prefs.communityViewMode.set(toggle.checked ? 'list' : 'thumbnails');
        showCommunityLevels();
    });

    const refreshBtn = header.querySelector('.community-refresh-btn');
    const refreshNotif = header.querySelector('.notification');
    refreshBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        refreshBtn.disabled = true;
        const anim = spin(refreshBtn.querySelector('img'));
        community.forceRefresh().then((result) => {
            anim.cancel();
            if (result === true) showCommunityLevels();
            else if (result === false) notify(refreshNotif, 'No new levels', false, 2000);
            else notify(refreshNotif, 'Could not reach server', true, 2000);
        });
        setTimeout(() => refreshBtn.disabled = false, 30000);
    });

    ui.levelList.appendChild(header);

    // Levels
    if (filtered.length > 0) {
        const container = html(`<div class="community-levels-container${prefs.communityViewMode.get() === 'list' ? ' list-view' : ''}"></div>`);
        renderLevels(filtered, TYPE.COMMUNITY, container);
        ui.levelList.appendChild(container);
    } else if (searchQuery) {
        ui.levelList.appendChild(html(`<div class="community-message">No levels match your search.</div>`));
    }

    // Re-focus search if actively searching
    if (searchQuery) {
        search.focus();
        search.selectionStart = search.selectionEnd = search.value.length;
    }
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
        prefs.communityConsent.set(true);
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
            TAB_HANDLERS[tab.dataset.tab]?.();
        });
    });

    levels.onChange(refreshActiveTab);
    community.onChange(refreshActiveTab);
}

export function refreshActiveTab() {
    const tabName = document.querySelector('.sidebar-tab.active')?.dataset.tab;
    if (tabName === 'community') showCommunityLevels(); // Skip fetch, just re-render
    else TAB_HANDLERS[tabName]?.();
}
