// app.js - Central app state and coordination

import { ui } from './ui.js';
import { levels as builtInLevels } from './levels.js';

const CUSTOM_LEVELS_KEY = 'svinesti-custom-levels';
const STARRED_KEY = 'svinesti-starred';
const PREFERENCES_KEY = 'svinesti-preferences';
const CODE_KEY = 'svinesti-code';

let initialized = false;
let ready = false;
const readyCallbacks = [];
let currentMode = 'game';
let customLevels = [];
let starred = new Set();
let codeStorage = {};
let preferences = {
    colorblind: false,
    communityConsent: false,
    showHelpOnStart: true,
    playbackSpeed: 150,
    editorFontSize: 16,
    communityViewMode: 'thumbnails',
};
const levelChangeCallbacks = [];

// --- Init ---

export function init() {
    if (initialized) return;
    initialized = true;
    loadCustomLevels();
    loadStarred();
    loadPreferences();
    loadCode();
    applyPreferences();
}

// --- Persistence helpers ---

function loadPreferences() {
    const json = localStorage.getItem(PREFERENCES_KEY);
    if (json) Object.assign(preferences, JSON.parse(json));
}

function persistPreferences() {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
}

function loadCode() {
    const json = localStorage.getItem(CODE_KEY);
    codeStorage = json ? JSON.parse(json) : {};
}

function persistCode() {
    localStorage.setItem(CODE_KEY, JSON.stringify(codeStorage));
}

function applyPreferences() {
    document.body.classList.toggle('colorblind-mode', preferences.colorblind);
}

function loadStarred() {
    const json = localStorage.getItem(STARRED_KEY);
    starred = json ? new Set(JSON.parse(json)) : new Set();
}

function persistStarred() {
    localStorage.setItem(STARRED_KEY, JSON.stringify([...starred]));
}

function loadCustomLevels() {
    const json = localStorage.getItem(CUSTOM_LEVELS_KEY);
    customLevels = json ? JSON.parse(json) : [];
}

function persistCustomLevels() {
    localStorage.setItem(CUSTOM_LEVELS_KEY, JSON.stringify(customLevels));
}

function notifyLevelsChange() {
    levelChangeCallbacks.forEach(cb => cb());
}

// --- Mode ---

export const mode = {
    get() {
        return currentMode;
    },

    set(newMode) {
        currentMode = newMode;
        document.body.classList.toggle('editor-mode', newMode === 'editor');

        if (newMode === 'editor') {
            ui.playPane.setAttribute('hidden', '');
            ui.editorPane.removeAttribute('hidden');
        } else {
            ui.editorPane.setAttribute('hidden', '');
            ui.playPane.removeAttribute('hidden');
        }
    },

    isEditor() {
        return currentMode === 'editor';
    },

    isGame() {
        return currentMode === 'game';
    },
};

// --- Preferences ---

function pref(key, onSet) {
    return {
        get() { return preferences[key]; },
        set(v) { preferences[key] = v; persistPreferences(); onSet?.(v); }
    };
}

export const prefs = {
    colorblind: pref('colorblind', v => document.body.classList.toggle('colorblind-mode', v)),
    communityConsent: pref('communityConsent'),
    showHelpOnStart: pref('showHelpOnStart'),
    playbackSpeed: pref('playbackSpeed'),
    editorFontSize: pref('editorFontSize'),
    communityViewMode: pref('communityViewMode'),
};

// --- Levels ---

export const levels = {
    builtIn() {
        return builtInLevels;
    },

    custom() {
        return customLevels.filter(l => !l.deleted);
    },

    save(level) {
        customLevels.push(level);
        persistCustomLevels();
        notifyLevelsChange();
    },

    update(id, levelData) {
        const index = customLevels.findIndex(l => l.id === id);
        if (index !== -1) {
            customLevels[index] = { ...customLevels[index], ...levelData };
            persistCustomLevels();
            notifyLevelsChange();
        }
    },

    delete(id) {
        const index = customLevels.findIndex(l => l.id === id);
        if (index !== -1) {
            customLevels[index].deleted = true;
            persistCustomLevels();
            notifyLevelsChange();
        }
    },

    deleted() {
        return customLevels.filter(l => l.deleted);
    },

    restore(id) {
        const index = customLevels.findIndex(l => l.id === id);
        if (index !== -1) {
            delete customLevels[index].deleted;
            persistCustomLevels();
            notifyLevelsChange();
        }
    },

    emptyTrash() {
        customLevels = customLevels.filter(l => !l.deleted);
        persistCustomLevels();
        notifyLevelsChange();
    },

    isStarred(uid) {
        return starred.has(uid);
    },

    setStarred(uid, value) {
        if (value) starred.add(uid);
        else starred.delete(uid);
        persistStarred();
    },

    onChange(callback) {
        levelChangeCallbacks.push(callback);
    },
};

// --- Code Storage ---

export const code = {
    get(levelKey, language) {
        return codeStorage[levelKey]?.[language] ?? '';
    },

    set(levelKey, language, value) {
        if (!codeStorage[levelKey]) codeStorage[levelKey] = {};
        codeStorage[levelKey][language] = value;
        persistCode();
    },
};

// --- Ready State ---

export function isReady() {
    return ready;
}

export function onReady(callback) {
    if (ready) callback();
    else readyCallbacks.push(callback);
}

export function setReady() {
    ready = true;
    hideSplashScreen();
    readyCallbacks.forEach(cb => cb());
    readyCallbacks.length = 0;
}

const SPLASH_FADE_MS = 500;

function hideSplashScreen() {
    if (!ui.splashScreen) return;
    ui.splashScreen.classList.add("fade-out");
    setTimeout(() => {
        ui.splashScreen.style.display = "none";
    }, SPLASH_FADE_MS);
}
