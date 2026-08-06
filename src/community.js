// community.js - Community levels server interaction
//
// Fetching, submitting, starring levels. Consent management.
// UI rendering moved to sidebar.js.

import * as app from './app.js?v=@version-7455f6f@';
import { hashSecret } from './names.js?v=@version-7455f6f@';
import { COMMUNITY_URL, COMMUNITY_REFRESH_INTERVAL } from './config.js?v=@version-7455f6f@';

// --- State ---

const state = {
    levels: null,       // Cached levels after successful fetch
    version: null,      // Cached version for efficient polling
    loading: false,     // Prevent concurrent fetches
};

const changeCallbacks = [];

// --- Exports ---

export function getLevels() {
    return state.levels || [];
}

export function onChange(callback) {
    changeCallbacks.push(callback);
}

function notifyChange() {
    changeCallbacks.forEach(cb => cb());
}

// --- State Access ---

export function isLoading() {
    return state.loading;
}

// --- Fetching ---

function requireConsent() {
    if (!app.prefs.communityConsent.get()) throw new Error('Community features require consent');
}

// Conditional fetch: sends client version, server returns just version if current,
// or version + data if update needed. Returns { version, levels } or { version } only.
async function fetchConditional(clientVersion) {
    requireConsent();
    const url = clientVersion != null ? `${COMMUNITY_URL}?v=${clientVersion}` : COMMUNITY_URL;
    const response = await fetch(url);
    const text = await response.text();
    if (text.startsWith('Error:')) throw new Error(text);

    const newlineIndex = text.indexOf('\n');
    if (newlineIndex === -1) {
        // Just version — client is up to date
        return { version: parseInt(text, 10) };
    }

    // Version + data
    const version = parseInt(text.slice(0, newlineIndex), 10);
    const levels = parse(text.slice(newlineIndex + 1));
    return { version, levels };
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
        const result = await fetchConditional(null);
        state.version = result.version;
        state.levels = result.levels;
        notifyChange();
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
    if (!app.prefs.communityConsent.get()) return false;
    try {
        const result = await fetchConditional(state.version);
        state.version = result.version;
        if (!result.levels) return false;  // Up to date
        state.levels = result.levels;
        notifyChange();
        return true;
    } catch (e) {
        console.warn('Failed to refresh community levels:', e);
        return null;
    }
}

async function pollRefresh(onUpdate) {
    if (!app.prefs.communityConsent.get()) return;
    if (state.loading || state.levels === null) return;

    try {
        const result = await fetchConditional(state.version);
        state.version = result.version;
        if (result.levels) {
            state.levels = result.levels;
            notifyChange();
            if (onUpdate) onUpdate();
        }
    } catch (e) {
        console.warn('Failed to refresh community levels:', e);
    }
}

export function startPolling(onUpdate) {
    setInterval(() => pollRefresh(onUpdate), COMMUNITY_REFRESH_INTERVAL);
}

export async function preload() {
    if (!app.prefs.communityConsent.get()) return;
    if (state.loading || state.levels) return;
    state.loading = true;
    try {
        const result = await fetchConditional(null);
        state.version = result.version;
        state.levels = result.levels;
        notifyChange();
    } catch (e) {
        console.warn('Failed to preload community levels:', e);
    }
    state.loading = false;
}

// --- Starring ---

export function sendStar(uid, starred) {
    requireConsent();
    return fetch(COMMUNITY_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'star', uid, starred })
    });
}

// --- Submitting ---

export async function submitLevel(level) {
    requireConsent();

    let secret = app.secrets.secretFor(level.uid);
    if (!secret) {
        secret = crypto.randomUUID();
        level.uid = await hashSecret(secret);
    }

    const levelData = btoa(JSON.stringify(level));
    const response = await fetch(COMMUNITY_URL, {
        method: 'POST',
        body: JSON.stringify({ level: levelData, secret }),
    });
    const result = await response.json();

    if (result.success) {
        app.secrets.store(result.uid, secret);
    }

    return result;
}

export async function unpublishLevel(uid) {
    requireConsent();
    const secret = app.secrets.secretFor(uid);
    if (!secret) return { error: 'Not owned' };

    const response = await fetch(COMMUNITY_URL, {
        method: 'POST',
        body: JSON.stringify({ level: btoa('UNPUBLISHED'), secret }),
    });
    return response.json();
}
