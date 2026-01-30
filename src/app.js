// app.js - Central app state and coordination

import { levels as builtInLevels } from './levels.js';
import { MODE } from './constants.js';
import {
    STORAGE_KEY_CUSTOM_LEVELS, STORAGE_KEY_STARRED,
    STORAGE_KEY_PREFERENCES, STORAGE_KEY_CODE, STORAGE_KEY_SECRETS,
    DEFAULT_PREFERENCES, SPLASH_FADE_DURATION, ENABLE_SPLASH_SCREEN,
} from './config.js';

// --- DOM References ---

const $ = id => document.getElementById(id);
const splashScreen = $('splash-screen');
const playPane = $('play-pane');
const editorPane = $('editor-pane');

let initialized = false;

// --- Init ---

export function init() {
    if (initialized) return;
    initialized = true;
    levels._load();
    starred._load();
    secrets._load();
    prefs._load();
    code._load();
    prefs._apply();
}

// --- Mode ---

export const mode = {
    _current: MODE.GAME,

    get() {
        return this._current;
    },

    set(newMode) {
        this._current = newMode;
        document.body.classList.toggle('editor-mode', newMode === MODE.EDITOR);

        if (newMode === MODE.EDITOR) {
            playPane.setAttribute('hidden', '');
            editorPane.removeAttribute('hidden');
        } else {
            editorPane.setAttribute('hidden', '');
            playPane.removeAttribute('hidden');
        }
    },

    isEditor() {
        return this._current === MODE.EDITOR;
    },

    isGame() {
        return this._current === MODE.GAME;
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
    _data: { ...DEFAULT_PREFERENCES },

    _load() {
        const json = localStorage.getItem(STORAGE_KEY_PREFERENCES);
        if (json) Object.assign(this._data, JSON.parse(json));
    },

    _persist() {
        localStorage.setItem(STORAGE_KEY_PREFERENCES, JSON.stringify(this._data));
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
        const json = localStorage.getItem(STORAGE_KEY_CUSTOM_LEVELS);
        this._data = json ? JSON.parse(json) : [];
    },

    _persist() {
        localStorage.setItem(STORAGE_KEY_CUSTOM_LEVELS, JSON.stringify(this._data));
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
        const json = localStorage.getItem(STORAGE_KEY_STARRED);
        this._uids = json ? new Set(JSON.parse(json)) : new Set();
    },

    _persist() {
        localStorage.setItem(STORAGE_KEY_STARRED, JSON.stringify([...this._uids]));
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

// --- Secrets (community level ownership) ---

export const secrets = {
    _data: {},
    _unpublished: new Set(),

    _load() {
        const json = localStorage.getItem(STORAGE_KEY_SECRETS);
        const parsed = json ? JSON.parse(json) : {};
        this._data = parsed.secrets || parsed;
        this._unpublished = new Set(parsed.unpublished || []);
    },

    _persist() {
        localStorage.setItem(STORAGE_KEY_SECRETS, JSON.stringify({
            secrets: this._data,
            unpublished: [...this._unpublished],
        }));
    },

    isOwned(uid) {
        return uid != null && uid in this._data;
    },

    isPublished(uid) {
        return this.isOwned(uid) && !this._unpublished.has(uid);
    },

    setPublished(uid, value) {
        if (value) this._unpublished.delete(uid);
        else this._unpublished.add(uid);
        this._persist();
    },

    secretFor(uid) {
        return this._data[uid] || null;
    },

    store(uid, secret) {
        this._data[uid] = secret;
        this._unpublished.delete(uid);
        this._persist();
    },
};

// --- Code Storage ---

export const code = {
    _storage: {},

    _load() {
        const json = localStorage.getItem(STORAGE_KEY_CODE);
        this._storage = json ? JSON.parse(json) : {};
    },

    _persist() {
        localStorage.setItem(STORAGE_KEY_CODE, JSON.stringify(this._storage));
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
        if (!splashScreen) return;
        if (!ENABLE_SPLASH_SCREEN) {
            splashScreen.style.display = "none";
            return;
        }
        splashScreen.classList.add("fade-out");
        setTimeout(() => {
            splashScreen.style.display = "none";
        }, SPLASH_FADE_DURATION);
    },
};
