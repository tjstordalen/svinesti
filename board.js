// board.js - Shared grid rendering utilities

import { TILE_CLASSES } from "./levels.js";
import { pigSpriteUrl } from "./animations.js";

function setCssVariable(name, value) {
    document.documentElement.style.setProperty(name, value.toString());
}

/**
 * Renders the grid tiles for a level
 * @param {HTMLElement} grid - The grid container element
 * @param {Object} level - Level object with nRows, nCols, grid
 * @param {Object} options
 * @param {boolean} options.addIndices - Add data-index to tiles (for editor click handling)
 */
export function renderGrid(grid, level, { addIndices = false } = {}) {
    grid.innerHTML = "";

    setCssVariable("--grid-n-rows", level.nRows);
    setCssVariable("--grid-n-cols", level.nCols);

    // Support both array of strings (levels.js) and array of arrays (editor)
    const cells = Array.isArray(level.grid[0])
        ? level.grid.flat()
        : level.grid.join("");

    for (let i = 0; i < cells.length; i++) {
        const div = document.createElement("div");
        div.className = "tile " + TILE_CLASSES[cells[i]];
        if (addIndices) div.dataset.index = i;
        grid.appendChild(div);
    }
}

/**
 * Gets a cell element by row and column
 */
export function getCell(grid, nCols, row, col) {
    return grid.children[row * nCols + col];
}

/**
 * Places the pig element in the specified cell
 */
export function placePig(grid, pig, nCols, row, col) {
    const cell = getCell(grid, nCols, row, col);
    cell.appendChild(pig);
}

/**
 * Sets the pig's direction sprite
 */
export function setPigDirection(pig, direction) {
    pig.style.backgroundImage = pigSpriteUrl(direction);
}
