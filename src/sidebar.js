// sidebar.js - Sidebar level list rendering

import { createGrid } from "./grid.js?v=@version-placeholder@";
import * as Editor from "./editor.js?v=@version-placeholder@";
import * as Game from "./game.js?v=@version-placeholder@";
import * as community from "./community.js?v=@version-placeholder@";
import { spin, notify } from "./animations.js?v=@version-placeholder@";
import { mode, levels, prefs, starred, secrets } from "./app.js?v=@version-placeholder@";
import { TAB } from "./constants.js?v=@version-placeholder@";
import { isValid } from "./levels.js?v=@version-placeholder@"; 
import {
    SIDEBAR_LOADING, SIDEBAR_TRASH_EMPTY, SIDEBAR_NO_COMMUNITY_LEVELS,
    SIDEBAR_SEARCH_PLACEHOLDER, SIDEBAR_NO_MATCHES, SIDEBAR_SERVER_ERROR,
    SIDEBAR_NO_NEW_LEVELS, SIDEBAR_BADGE_PUBLIC, SIDEBAR_BADGE_PRIVATE,
    SIDEBAR_BADGE_COMMUNITY, ICON,
} from "./config.js?v=@version-placeholder@";

// --- DOM References ---

const $ = id => document.getElementById(id);
const sidebar = $('sidebar');
const sidebarPullTab = document.querySelector('.sidebar-pull-tab');
const sidebarTabs = document.querySelectorAll('.sidebar-tab');
const levelList = $('level-list');

// --- Helpers ---

const parser = new DOMParser();
const html = (str) => parser.parseFromString(str, 'text/html').body.firstElementChild;

// --- State ---

const state = {
    activeTab: 'default',
    searchQuery: '',
};

// --- Level Card ---

function badgeHTML(level, type) {
    if (type === TAB.DEFAULT || type === TAB.TRASH) return '';
    const owned = type === TAB.CUSTOM || secrets.isOwned(level.uid);
    const published = owned && secrets.isPublished(level.uid);
    const icon = owned ? (published ? ICON.EYE : ICON.EYE_SLASH) : ICON.GLOBE;
    const label = owned ? (published ? SIDEBAR_BADGE_PUBLIC : SIDEBAR_BADGE_PRIVATE) : SIDEBAR_BADGE_COMMUNITY;
    const cls = owned ? (published ? 'published' : 'unpublished') : 'community';
    return `
        <div class="ownership-badge ${cls}">
            <img src="${icon}" alt="" width="14" height="14">
            <span>${label}</span>
        </div>`;
}

function makeLevelItemCard(level, type, onRefresh) {
    const item = html(`
        <div class="sidebar-level-item">
            ${badgeHTML(level, type)}
            <div class="thumbnail-wrapper"><div class="grid"></div></div>
            <div class="sidebar-level-name"></div>
        </div>
    `);

    createGrid(item.querySelector('.grid'), level.nRows, level.nCols, level);
    item.querySelector('.sidebar-level-name').textContent = level.name || 'Untitled';

    const loadLevel = () => {
        (mode.isEditor() ? Editor.load : Game.load)(level);
        levelList.querySelectorAll('.sidebar-level-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        sidebar.classList.add('collapsed');
    };

    switch (type) {
        case TAB.DEFAULT:
            item.addEventListener('click', loadLevel);
            break;

        case TAB.CUSTOM:
            item.addEventListener('click', loadLevel);
            if (!mode.isEditor()) break;

            const deleteBtn = html(`
                <button class="delete-level-btn" title="Delete level">
                    <img src="${ICON.TRASH}" alt="" width="16" height="16">
                </button>
            `);
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (secrets.isOwned(level.uid) &&
                    !confirm('This level is published. Deleting it will also remove it from community levels.')) {
                    return;
                }
                if (secrets.isOwned(level.uid)) {
                    community.unpublishLevel(level.uid);
                }
                levels.delete(level.id);
                onRefresh?.();
            });
            item.appendChild(deleteBtn);
            break;

        case TAB.COMMUNITY: {
            item.addEventListener('click', loadLevel);

            const isStarred = starred.is(level.uid);
            const starBtn = html(`
                <button class="star-btn${isStarred ? ' starred' : ''}" title="${isStarred ? 'Remove star' : 'Star this level'}">
                    <img src="assets/img/golden-apple.png" alt=""><span>${level.stars || 0}</span>
                </button>
            `);

            starBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const wasStarred = starred.is(level.uid);
                const newStarred = !wasStarred;

                // Optimistic update
                starred.set(level.uid, newStarred);
                level.stars += newStarred ? 1 : -1;
                onRefresh?.();

                community.sendStar(level.uid, newStarred).catch(() => {
                    // Revert on failure
                    starred.set(level.uid, wasStarred);
                    level.stars += wasStarred ? 1 : -1;
                    onRefresh?.();
                    const notif = document.querySelector('.community-header .notification');
                    if (notif) notify(notif, SIDEBAR_SERVER_ERROR, true, 2000);
                });
            });
            item.appendChild(starBtn);
            break;
        }

        case TAB.TRASH:
            item.classList.add('restorable');
            item.addEventListener('click', () => {
                levels.restore(level.id);
                onRefresh?.();
            });
            break;
    }

    return item;
}

function renderLevels(levelArray, type, container = levelList) {
    for (const level of levelArray) {
        container.appendChild(makeLevelItemCard(level, type, refreshActiveTab));
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
    levelList.innerHTML = '';
    renderLevels(levels.builtIn(), TAB.DEFAULT);
}

export function showMyLevelsTab() {
    levelList.innerHTML = '';
	const levelsToAdd = mode.isGame() ?	levels.custom().filter(isValid) : levels.custom();  
    renderLevels(levelsToAdd, TAB.CUSTOM);
}

export function showTrashTab() {
    const deleted = levels.deleted();
    levelList.innerHTML = '';

    if (deleted.length === 0) {
        levelList.appendChild(html(`<div class="community-message">${SIDEBAR_TRASH_EMPTY}</div>`));
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
    levelList.appendChild(header);

    renderLevels(deleted, TAB.TRASH);
}

// --- Community Tab ---

export async function showCommunityTab() {
    if (!prefs.communityConsent.get()) {
        showConsentRequest();
        return;
    }

    levelList.innerHTML = `<div class="community-message">${SIDEBAR_LOADING}</div>`;

    const result = await community.fetchIfNeeded();
    if (result.error) {
        levelList.innerHTML = `<div class="community-message"><span class="community-error">${result.error}</span></div>`;
        return;
    }

    if (result.levels.length === 0) {
        levelList.innerHTML = `<div class="community-message">${SIDEBAR_NO_COMMUNITY_LEVELS}</div>`;
    } else {
        showCommunityLevels();
    }
}

function showCommunityLevels() {
    const communityLevels = community.getLevels();
    const sorted = [...communityLevels].sort((a, b) => (b.stars || 0) - (a.stars || 0));
    const filtered = state.searchQuery
        ? sorted.filter(l => l.name?.toLowerCase().includes(state.searchQuery))
        : sorted;

    levelList.innerHTML = '';

    // Header
    const header = html(`
        <div class="community-header">
            <input type="text" class="community-search" placeholder="${SIDEBAR_SEARCH_PLACEHOLDER}">
            <label class="toggle-switch" title="Toggle list view">
                <input type="checkbox">
                <span class="toggle-slider"></span>
            </label>
            <span class="community-view-label">Compact</span>
            <button class="community-refresh-btn" title="Refresh levels">
                <img src="${ICON.REFRESH}" alt="">
            </button>
            <div class="notification"></div>
        </div>
    `);

    const search = header.querySelector('.community-search');
    search.value = state.searchQuery;
    search.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.toLowerCase();
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
            else if (result === false) notify(refreshNotif, SIDEBAR_NO_NEW_LEVELS, false, 2000);
            else notify(refreshNotif, SIDEBAR_SERVER_ERROR, true, 2000);
        });
        setTimeout(() => refreshBtn.disabled = false, 30000);
    });

    levelList.appendChild(header);

    // Levels
    if (filtered.length > 0) {
        const container = html(`<div class="community-levels-container${prefs.communityViewMode.get() === 'list' ? ' list-view' : ''}"></div>`);
        renderLevels(filtered, TAB.COMMUNITY, container);
        levelList.appendChild(container);
    } else if (state.searchQuery) {
        levelList.appendChild(html(`<div class="community-message">${SIDEBAR_NO_MATCHES}</div>`));
    }

    // Re-focus search if actively searching
    if (state.searchQuery) {
        search.focus();
        search.selectionStart = search.selectionEnd = search.value.length;
    }
}

function showConsentRequest() {
    levelList.innerHTML = `
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
        showCommunityTab();
    });
}

// --- Init ---

export function init() {
    // Tab click handlers
    sidebarTabs.forEach(tab => {
        tab.addEventListener('click', () => setActiveTab(tab.dataset.tab));
    });

    // Collapse behavior
    sidebarPullTab.onclick = () => sidebar.classList.toggle('collapsed');
    document.addEventListener('click', (e) => {
        const isOutside = !sidebar.contains(e.target);
        const isModeToggle = e.target.closest('.mode-toggle');
        if (isOutside && !isModeToggle) {
            sidebar.classList.add('collapsed');
        }
    });

    levels.onChange(refreshActiveTab);
    community.onChange(refreshActiveTab);
}

function setActiveTab(name) {
    state.activeTab = name;
    sidebarTabs.forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    TAB_HANDLERS[name]?.();
}

export function refreshActiveTab() {
    let tab = state.activeTab;
    if (tab === 'trash' && mode.isGame()) tab = 'default';
    else if (tab === 'default' && mode.isEditor()) tab = 'my-levels';
    if (tab === state.activeTab && tab === 'community') showCommunityLevels();
    else setActiveTab(tab);
}
