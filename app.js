// app.js - Central app state and coordination

import { ui } from './ui.js';
import { levels as builtInLevels } from './levels.js';

const CUSTOM_LEVELS_KEY = 'svinesti-custom-levels';
const STARRED_KEY = 'svinesti-starred';
const PREFERENCES_KEY = 'svinesti-preferences';
const CODE_KEY = 'svinesti-code';

let initialized = false;

// --- Init ---

export function init() {
    if (initialized) return;
    initialized = true;
    levels._load();
    starred._load();
    prefs._load();
    code._load();
    prefs._apply();
}

// --- Mode ---

export const mode = {
    _current: 'game',

    get() {
        return this._current;
    },

    set(newMode) {
        this._current = newMode;
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
        return this._current === 'editor';
    },

    isGame() {
        return this._current === 'game';
    },
};

// --- Preferences ---

function makePref(key, onSet) {
    return {
        get() { return prefs._data[key]; },
        set(v) { prefs._data[key] = v; prefs._persist(); onSet?.(v); }
    };
}

export const prefs = {
    _data: {
        colorblind: false,
        communityConsent: false,
        showHelpOnStart: true,
        playbackSpeed: 150,
        editorFontSize: 16,
        communityViewMode: 'thumbnails',
    },

    _load() {
        const json = localStorage.getItem(PREFERENCES_KEY);
        if (json) Object.assign(this._data, JSON.parse(json));
    },

    _persist() {
        localStorage.setItem(PREFERENCES_KEY, JSON.stringify(this._data));
    },

    _apply() {
        document.body.classList.toggle('colorblind-mode', this._data.colorblind);
    },

    colorblind: makePref('colorblind', v => document.body.classList.toggle('colorblind-mode', v)),
    communityConsent: makePref('communityConsent'),
    showHelpOnStart: makePref('showHelpOnStart'),
    playbackSpeed: makePref('playbackSpeed'),
    editorFontSize: makePref('editorFontSize'),
    communityViewMode: makePref('communityViewMode'),
};

// --- Levels ---

export const levels = {
    _data: [],
    _callbacks: [],

    _load() {
        const json = localStorage.getItem(CUSTOM_LEVELS_KEY);
        this._data = json ? JSON.parse(json) : [];
    },

    _persist() {
        localStorage.setItem(CUSTOM_LEVELS_KEY, JSON.stringify(this._data));
    },

    _notify() {
        this._callbacks.forEach(cb => cb());
    },

    builtIn() {
        return builtInLevels;
    },

    custom() {
        return this._data.filter(l => !l.deleted);
    },

    save(level) {
        this._data.push(level);
        this._persist();
        this._notify();
    },

    update(id, levelData) {
        const index = this._data.findIndex(l => l.id === id);
        if (index !== -1) {
            this._data[index] = { ...this._data[index], ...levelData };
            this._persist();
            this._notify();
        }
    },

    delete(id) {
        const index = this._data.findIndex(l => l.id === id);
        if (index !== -1) {
            this._data[index].deleted = true;
            this._persist();
            this._notify();
        }
    },

    deleted() {
        return this._data.filter(l => l.deleted);
    },

    restore(id) {
        const index = this._data.findIndex(l => l.id === id);
        if (index !== -1) {
            delete this._data[index].deleted;
            this._persist();
            this._notify();
        }
    },

    emptyTrash() {
        this._data = this._data.filter(l => !l.deleted);
        this._persist();
        this._notify();
    },

    onChange(callback) {
        this._callbacks.push(callback);
    },
};

// --- Starred (community levels) ---

export const starred = {
    _uids: new Set(),

    _load() {
        const json = localStorage.getItem(STARRED_KEY);
        this._uids = json ? new Set(JSON.parse(json)) : new Set();
    },

    _persist() {
        localStorage.setItem(STARRED_KEY, JSON.stringify([...this._uids]));
    },

    is(uid) {
        return this._uids.has(uid);
    },

    set(uid, value) {
        if (value) this._uids.add(uid);
        else this._uids.delete(uid);
        this._persist();
    },
};

// --- Code Storage ---

export const code = {
    _storage: {},

    _load() {
        const json = localStorage.getItem(CODE_KEY);
        this._storage = json ? JSON.parse(json) : {};
    },

    _persist() {
        localStorage.setItem(CODE_KEY, JSON.stringify(this._storage));
    },

    get(levelKey, language) {
        return this._storage[levelKey]?.[language] ?? '';
    },

    set(levelKey, language, value) {
        if (!this._storage[levelKey]) this._storage[levelKey] = {};
        this._storage[levelKey][language] = value;
        this._persist();
    },
};

// --- Ready State ---

const SPLASH_FADE_MS = 500;

export const ready = {
    _done: false,
    _callbacks: [],

    is() {
        return this._done;
    },

    on(callback) {
        if (this._done) callback();
        else this._callbacks.push(callback);
    },

    set() {
        this._done = true;
        this._hideSplash();
        this._callbacks.forEach(cb => cb());
        this._callbacks.length = 0;
    },

    _hideSplash() {
        if (!ui.splashScreen) return;
        ui.splashScreen.classList.add("fade-out");
        setTimeout(() => {
            ui.splashScreen.style.display = "none";
        }, SPLASH_FADE_MS);
    },
};
