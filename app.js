// app.js - Central app state and coordination

import { ui } from './ui.js';
import { levels as builtInLevels } from './levels.js';

let initialized = false;
let mode = 'game';

export function init() {
    if (initialized) return;
    initialized = true;
    console.log('app.init() called');
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
