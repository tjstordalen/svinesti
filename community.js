// community.js - Community levels (fetching, sharing, consent)

import { ui } from "./ui.js";
import { spin, notify } from "./animations.js";

// Apps Script endpoint for community levels (GET to fetch, POST to submit)
const COMMUNITY_URL = 'https://script.google.com/macros/s/AKfycbwne7UEsOMM6Aa0WD5X2KdUx0eZX8QyZQ6FcWajARqaUa9Zs_ICcfJYCuVhrWXzgHjO7Q/exec';

const REFRESH_INTERVAL = 3 * 60 * 1000; // 3 minutes
const CONSENT_KEY = 'svinesti-community-consent';

// Dependency injected via init()
let populateLevelList = null;

export function init(populateLevelListFn) {
    populateLevelList = populateLevelListFn;
}

export function hasConsent() {
    return localStorage.getItem(CONSENT_KEY) === 'true';
}

export function setConsent(enabled) {
    localStorage.setItem(CONSENT_KEY, enabled ? 'true' : 'false');
    if (enabled && !state.levels) {
        preload();
    }
}

const state = {
    levels: null,       // Cached levels after successful fetch
    version: null,      // Cached version for efficient polling
    loading: false,     // Prevent concurrent fetches
    viewMode: localStorage.getItem('svinesti-community-view') || 'thumbnails',
    searchQuery: '',    // Current search filter
};

// --- Fetching ---

function requireConsent() {
    if (!hasConsent()) throw new Error('Community features require consent');
}

async function fetchVersion() {
    requireConsent();
    const response = await fetch(`${COMMUNITY_URL}?version`);
    const text = await response.text();
    if (text.startsWith('Error:')) throw new Error(text);
    return parseInt(text, 10);
}

async function fetchLevels() {
    requireConsent();
    const response = await fetch(COMMUNITY_URL);
    const text = await response.text();
    if (text.startsWith('Error:')) throw new Error(text);
    return parse(text);
}

function parse(text) {
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
}

// --- Refresh / Polling ---

export async function refresh() {
    if (!hasConsent()) return;
    if (state.loading || state.levels === null) return;

    try {
        const newVersion = await fetchVersion();
        if (newVersion !== state.version) {
            state.version = newVersion;
            state.levels = await fetchLevels();
            if (isTabActive()) showLevels();
        }
    } catch (e) {
        console.warn('Failed to refresh community levels:', e);
    }
}

export function startPolling() {
    setInterval(() => refresh(), REFRESH_INTERVAL);
}

export async function preload() {
    if (!hasConsent()) return;
    if (state.loading || state.levels) return;
    state.loading = true;
    try {
        state.version = await fetchVersion();
        state.levels = await fetchLevels();
    } catch (e) {
        console.warn('Failed to preload community levels:', e);
    }
    state.loading = false;
    if (isTabActive()) showLevels();
}

async function forceRefresh() {
    if (!hasConsent()) return false;
    try {
        const newVersion = await fetchVersion();
        if (newVersion === state.version) return false;
        state.version = newVersion;
        state.levels = await fetchLevels();
        if (isTabActive()) showLevels();
        return true;
    } catch (e) {
        console.warn('Failed to refresh community levels:', e);
        return false;
    }
}

// --- Starring ---

export function starLevel(uid) {
    requireConsent();

    const key = `starred-${uid}`;
    const isStarred = localStorage.getItem(key) === '1';

    // Optimistic update
    localStorage.setItem(key, isStarred ? '0' : '1');
    const level = state.levels.find(l => l.uid === uid);
    if (level) level.stars += isStarred ? -1 : 1;
    showLevels();

    fetch(COMMUNITY_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'star', uid, starred: !isStarred })
    }).then(response => {
        if (!response.ok) throw new Error('Server error');
    }).catch(() => {
        // Revert optimistic update
        localStorage.setItem(key, isStarred ? '1' : '0');
        if (level) level.stars += isStarred ? 1 : -1;
        showLevels();
        const notif = document.querySelector('.community-header .notification');
        if (notif) notify(notif, 'Failed to save', true, 2000);
    });
}

// --- Submitting ---

export async function submitLevel(levelData) {
    requireConsent();
    const response = await fetch(COMMUNITY_URL, {
        method: 'POST',
        body: JSON.stringify({ level: levelData }),
    });
    return response.json();
}

// --- UI ---

function isTabActive() {
    const activeTab = document.querySelector('.sidebar-tab.active');
    return activeTab?.dataset.tab === 'community';
}

export async function showTab() {
    if (!hasConsent()) {
        showConsentRequest();
        return;
    }

    if (state.loading) {
        showLoading();
        return;
    }

    if (!state.levels) {
        state.loading = true;
        showLoading();
        try {
            state.version = await fetchVersion();
            state.levels = await fetchLevels();
        } catch (e) {
            console.error('Failed to fetch community levels:', e);
            showError(formatError(e.message));
            state.loading = false;
            return;
        }
        state.loading = false;
    }

    if (state.levels.length > 0) {
        showLevels();
    } else {
        showEmpty();
    }
}

function showLevels() {
    const sorted = [...state.levels].sort((a, b) => (b.stars || 0) - (a.stars || 0));
    const filtered = state.searchQuery
        ? sorted.filter(l => l.name?.toLowerCase().includes(state.searchQuery))
        : sorted;

    ui.levelList.innerHTML = '';

    // Header: search + view toggle
    const header = document.createElement('div');
    header.className = 'community-header';

    const search = document.createElement('input');
    search.type = 'text';
    search.className = 'community-search';
    search.placeholder = 'Search levels...';
    search.value = state.searchQuery;
    search.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.toLowerCase();
        showLevels();
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
        showLevels();
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
        forceRefresh().then((hasNew) => {
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

function showLoading() {
    ui.levelList.innerHTML = '<div class="community-message">Loading community levels...</div>';
}

function showEmpty() {
    ui.levelList.innerHTML = `
        <div class="community-message">
            No community levels yet.<br>
            Share your levels from the Level Creator!
        </div>
    `;
}

function showError(message) {
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
        setConsent(true);
        ui.communityConsentToggle.checked = true;
        showTab();
    });
}

function formatError(message) {
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
}
