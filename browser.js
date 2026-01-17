// browser.js - Community/Custom Levels Browser
//
// Simple lobby-style browser for viewing and selecting levels.
// Left panel: mini-thumbnails of levels
// Right panel: larger preview of selected level
// Click to load into play mode

import { TILE_CLASSES } from "./levels.js";
import { ui } from "./ui.js";

// --- State ---

const state = {
    levels: [],
    selectedIndex: -1,
    onSelectLevel: null, // Callback when level is selected for play
};

// --- Rendering ---

function renderMiniGrid(level, container) {
    container.innerHTML = '';
    container.style.setProperty('--mini-rows', level.nRows);
    container.style.setProperty('--mini-cols', level.nCols);

    for (const ch of level.grid.join('')) {
        const tile = document.createElement('div');
        tile.className = 'mini-tile ' + TILE_CLASSES[ch];
        container.appendChild(tile);
    }

    // Add pig indicator
    const pigIndex = level.start[0] * level.nCols + level.start[1];
    container.children[pigIndex]?.classList.add('has-pig');
}

function renderPreview(level) {
    if (!level) {
        ui.browserPreview.innerHTML = '<div class="no-selection">Select a level to preview</div>';
        return;
    }

    ui.browserPreview.innerHTML = '';

    const previewGrid = document.createElement('div');
    previewGrid.className = 'preview-grid';
    previewGrid.style.setProperty('--preview-rows', level.nRows);
    previewGrid.style.setProperty('--preview-cols', level.nCols);

    for (const ch of level.grid.join('')) {
        const tile = document.createElement('div');
        tile.className = 'tile ' + TILE_CLASSES[ch];
        previewGrid.appendChild(tile);
    }

    // Add pig to preview
    const pigIndex = level.start[0] * level.nCols + level.start[1];
    const pigTile = previewGrid.children[pigIndex];
    if (pigTile) {
        pigTile.classList.add('pig-' + level.dir);
    }

    ui.browserPreview.appendChild(previewGrid);
}

function renderLevelList() {
    ui.browserList.innerHTML = '';

    state.levels.forEach((level, index) => {
        const item = document.createElement('div');
        item.className = 'browser-item';
        if (index === state.selectedIndex) {
            item.classList.add('selected');
        }

        const miniGrid = document.createElement('div');
        miniGrid.className = 'mini-grid';
        renderMiniGrid(level, miniGrid);

        const name = document.createElement('div');
        name.className = 'browser-item-name';
        name.textContent = level.name || 'Untitled';

        item.appendChild(miniGrid);
        item.appendChild(name);
        ui.browserList.appendChild(item);

        item.addEventListener('click', () => selectItem(index));
        item.addEventListener('dblclick', () => playLevel(index));
    });
}

// --- Actions ---

function selectItem(index) {
    state.selectedIndex = index;

    // Update selection visual
    ui.browserList.querySelectorAll('.browser-item').forEach((item, i) => {
        item.classList.toggle('selected', i === index);
    });

    renderPreview(state.levels[index]);
}

function playLevel(index) {
    const level = state.levels[index];
    if (level && state.onSelectLevel) {
        state.onSelectLevel(level);
    }
}

function handlePlayClick() {
    if (state.selectedIndex >= 0) {
        playLevel(state.selectedIndex);
    }
}

// --- Public API ---

function setLevels(levels) {
    state.levels = levels;
    state.selectedIndex = levels.length > 0 ? 0 : -1;
    renderLevelList();
    renderPreview(state.levels[state.selectedIndex]);
}

function onSelectLevel(callback) {
    state.onSelectLevel = callback;
}

function enter() {
    ui.browserPlayBtn.addEventListener('click', handlePlayClick);
    renderLevelList();
    renderPreview(state.levels[state.selectedIndex]);
}

function exit() {
    ui.browserPlayBtn.removeEventListener('click', handlePlayClick);
}

export { enter, exit, setLevels, onSelectLevel };
