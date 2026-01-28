// grid.js - Unified grid rendering

import { TILE_CLASSES } from './constants.js';

/**
 * Create a grid with tiles and a pig element.
 * Returns an object with direct access to tiles array and pig element.
 */
export function createGrid(container, nRows, nCols, level = null) {
    container.innerHTML = '';
    container.classList.add('grid');
    container.style.setProperty('--rows', nRows);
    container.style.setProperty('--cols', nCols);

    // Create tiles
    const tiles = [];
    const chars = level ? level.grid.join('') : '.'.repeat(nRows * nCols);
    for (const ch of chars) {
        const tile = document.createElement('div');
        tile.className = 'tile ' + TILE_CLASSES[ch];
        container.appendChild(tile);
        tiles.push(tile);
    }

    // Create pig element
    const pig = document.createElement('div');
    pig.className = 'pig';
    container.appendChild(pig);

    const grid = {
        container,
        tiles,
        pig,
        nRows,
        nCols,

        getCell(row, col) {
            return tiles[row * nCols + col];
        },

        placePig(row, col, dir) {
            this.getCell(row, col).appendChild(pig);
            pig.className = 'pig pig-' + dir;
            pig.style.transform = '';
            pig.classList.toggle('near-right-edge', col >= nCols - 2);
        },

        movePigTo(row, col) {
            this.getCell(row, col).appendChild(pig);
            pig.style.transform = '';
            pig.classList.toggle('near-right-edge', col >= nCols - 2);
        },
    };

    // Position pig if level provided
    if (level) {
        const [row, col] = level.start;
        grid.placePig(row, col, level.dir);
    }

    return grid;
}
