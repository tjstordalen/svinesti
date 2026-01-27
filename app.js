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
let mode = 'game';
let customLevels = [];
let starred = new Set();
let code = {};  // { [levelKey]: { python: '...', java: '...' } }
let preferences = {
    colorblind: false,
    communityConsent: false,
    showHelpOnStart: true,
    playbackSpeed: 150,
    editorFontSize: 16,
};
const levelChangeCallbacks = [];

export function init() {
    if (initialized) return;
    initialized = true;
    loadCustomLevels();
    loadStarred();
    loadPreferences();
    loadCode();
    applyPreferences();
}

function loadPreferences() {
    const json = localStorage.getItem(PREFERENCES_KEY);
    if (json) Object.assign(preferences, JSON.parse(json));
}

function persistPreferences() {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
}

function loadCode() {
    const json = localStorage.getItem(CODE_KEY);
    code = json ? JSON.parse(json) : {};
}

function persistCode() {
    localStorage.setItem(CODE_KEY, JSON.stringify(code));
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

export function getMode() {
    return mode;
}

export function setMode(newMode) {
    mode = newMode;
    document.body.classList.toggle('editor-mode', newMode === 'editor');

    // Toggle pane visibility
    if (newMode === 'editor') {
        ui.playPane.setAttribute('hidden', '');
        ui.editorPane.removeAttribute('hidden');
    } else {
        ui.editorPane.setAttribute('hidden', '');
        ui.playPane.removeAttribute('hidden');
    }
}

export function isEditorMode() {
    return mode === 'editor';
}

export function isGameMode() {
    return mode === 'game';
}

// --- Levels: Built-in ---

export function getBuiltInLevels() {
    return builtInLevels;
}

// --- Levels: Custom ---

export function getCustomLevels() {
    return customLevels.filter(l => !l.deleted);
}

export function saveCustomLevel(level) {
    customLevels.push(level);
    persistCustomLevels();
    notifyLevelsChange();
}

export function updateCustomLevel(id, levelData) {
    const index = customLevels.findIndex(l => l.id === id);
    if (index !== -1) {
        customLevels[index] = { ...customLevels[index], ...levelData };
        persistCustomLevels();
        notifyLevelsChange();
    }
}

export function deleteCustomLevel(id) {
    const index = customLevels.findIndex(l => l.id === id);
    if (index !== -1) {
        customLevels[index].deleted = true;
        persistCustomLevels();
        notifyLevelsChange();
    }
}

export function getDeletedLevels() {
    return customLevels.filter(l => l.deleted);
}

export function restoreLevel(id) {
    const index = customLevels.findIndex(l => l.id === id);
    if (index !== -1) {
        delete customLevels[index].deleted;
        persistCustomLevels();
        notifyLevelsChange();
    }
}

export function emptyTrash() {
    customLevels = customLevels.filter(l => !l.deleted);
    persistCustomLevels();
    notifyLevelsChange();
}

export function onLevelsChange(callback) {
    levelChangeCallbacks.push(callback);
}

// --- Starred ---

export function isStarred(uid) {
    return starred.has(uid);
}

export function setStarred(uid, value) {
    if (value) starred.add(uid);
    else starred.delete(uid);
    persistStarred();
}

// --- Preferences ---

export function isColorblind() {
    return preferences.colorblind;
}

export function setColorblind(enabled) {
    preferences.colorblind = enabled;
    document.body.classList.toggle('colorblind-mode', enabled);
    persistPreferences();
}

export function hasCommunityConsent() {
    return preferences.communityConsent;
}

export function setCommunityConsent(enabled) {
    preferences.communityConsent = enabled;
    persistPreferences();
}

export function showHelpOnStart() {
    return preferences.showHelpOnStart;
}

export function setShowHelpOnStart(enabled) {
    preferences.showHelpOnStart = enabled;
    persistPreferences();
}

export function getPlaybackSpeed() {
    return preferences.playbackSpeed;
}

export function setPlaybackSpeed(value) {
    preferences.playbackSpeed = value;
    persistPreferences();
}

export function getEditorFontSize() {
    return preferences.editorFontSize;
}

export function setEditorFontSize(value) {
    preferences.editorFontSize = value;
    persistPreferences();
}

// --- Code Storage ---

// levelKey: use level.id for custom levels, level.name for built-in
export function getCode(levelKey, language) {
    return code[levelKey]?.[language] ?? '';
}

export function setCode(levelKey, language, value) {
    if (!code[levelKey]) code[levelKey] = {};
    code[levelKey][language] = value;
    persistCode();
}

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
