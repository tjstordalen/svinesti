// app.js - Central app state and coordination

import { ui } from './ui.js';
import { levels as builtInLevels } from './levels.js';

const CUSTOM_LEVELS_KEY = 'svinesti-custom-levels';
const STARRED_KEY = 'svinesti-starred';

let initialized = false;
let mode = 'game';
let customLevels = [];
let communityLevels = [];
let starred = new Set();
const levelChangeCallbacks = [];

export function init() {
    if (initialized) return;
    initialized = true;
    loadCustomLevels();
    loadStarred();
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

// --- Levels: Community ---

export function getCommunityLevels() {
    return communityLevels;
}

export function setCommunityLevels(levels) {
    communityLevels = levels;
    notifyLevelsChange();
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
