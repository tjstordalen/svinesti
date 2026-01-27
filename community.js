// community.js - Community levels server interaction
//
// Fetching, submitting, starring levels. Consent management.
// UI rendering moved to sidebar.js.

import * as app from './app.js';

// Apps Script endpoint for community levels (GET to fetch, POST to submit)
const COMMUNITY_URL = 'https://script.google.com/macros/s/AKfycbwne7UEsOMM6Aa0WD5X2KdUx0eZX8QyZQ6FcWajARqaUa9Zs_ICcfJYCuVhrWXzgHjO7Q/exec';

const REFRESH_INTERVAL = 3 * 60 * 1000; // 3 minutes

// --- State ---

const state = {
    levels: null,       // Cached levels after successful fetch
    version: null,      // Cached version for efficient polling
    loading: false,     // Prevent concurrent fetches
};

// --- State Access ---

export function isLoading() {
    return state.loading;
}

// --- Fetching ---

function requireConsent() {
    if (!app.hasCommunityConsent()) throw new Error('Community features require consent');
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

// --- Fetch If Needed ---

export async function fetchIfNeeded() {
    if (state.levels) return { levels: state.levels };

    state.loading = true;
    try {
        state.version = await fetchVersion();
        state.levels = await fetchLevels();
        app.setCommunityLevels(state.levels);
        return { levels: state.levels };
    } catch (e) {
        console.error('Failed to fetch community levels:', e);
        return { error: formatError(e.message) };
    } finally {
        state.loading = false;
    }
}

// --- Refresh / Polling ---

// Returns: true = new levels, false = no changes, null = error
export async function forceRefresh() {
    if (!app.hasCommunityConsent()) return false;
    try {
        const newVersion = await fetchVersion();
        if (newVersion === state.version) return false;
        state.version = newVersion;
        state.levels = await fetchLevels();
        app.setCommunityLevels(state.levels);
        return true;
    } catch (e) {
        console.warn('Failed to refresh community levels:', e);
        return null;
    }
}

async function pollRefresh(onUpdate) {
    if (!app.hasCommunityConsent()) return;
    if (state.loading || state.levels === null) return;

    try {
        const newVersion = await fetchVersion();
        if (newVersion !== state.version) {
            state.version = newVersion;
            state.levels = await fetchLevels();
            app.setCommunityLevels(state.levels);
            if (onUpdate) onUpdate();
        }
    } catch (e) {
        console.warn('Failed to refresh community levels:', e);
    }
}

export function startPolling(onUpdate) {
    setInterval(() => pollRefresh(onUpdate), REFRESH_INTERVAL);
}

export async function preload() {
    if (!app.hasCommunityConsent()) return;
    if (state.loading || state.levels) return;
    state.loading = true;
    try {
        state.version = await fetchVersion();
        state.levels = await fetchLevels();
        app.setCommunityLevels(state.levels);
    } catch (e) {
        console.warn('Failed to preload community levels:', e);
    }
    state.loading = false;
}

// --- Starring ---

export function starLevel(uid, onUpdate, onError) {
    requireConsent();

    const wasStarred = app.isStarred(uid);

    // Optimistic update
    app.setStarred(uid, !wasStarred);
    const levels = app.getCommunityLevels();
    const level = levels.find(l => l.uid === uid);
    if (level) level.stars += wasStarred ? -1 : 1;
    if (onUpdate) onUpdate();

    fetch(COMMUNITY_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'star', uid, starred: !wasStarred })
    }).then(response => {
        if (!response.ok) throw new Error('Server error');
    }).catch(() => {
        // Revert optimistic update
        app.setStarred(uid, wasStarred);
        const lvl = app.getCommunityLevels().find(l => l.uid === uid);
        if (lvl) lvl.stars += wasStarred ? 1 : -1;
        if (onUpdate) onUpdate();
        if (onError) onError();
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
