# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Svinesti is a browser-based educational programming game where students control a pig on a grid to collect stars. Students write code in either Python 3 or "PigJatin" (a minimal Java-like language) to guide the pig using movement and color-sensing functions.

## Architecture

### Core Files

- **index.html** - Markup with CodeMirror editor, thumbnail-based level sidebar, and playback controls
- **main.js** - App shell: help modal, sidebar, mode switching (see structure below)
- **game.js** - Game mode: code editor, playback, worker (see structure below)
- **grid.js** - Unified grid rendering module (see structure below)
- **animations.js** - All animation logic (keyframes, walk/move/turn/hudFlash/celebrate/lose/notify/confetti), `pigSpriteUrl()` helper
- **editor.js** - Level editor module (DOM-based editing, serialization, enter/exit mode switching)
- **shortcuts.js** - Keyboard shortcut factory function with enable/disable lifecycle
- **levels.js** - Level definitions and `DEFAULT_LEVEL` for editor
- **worker.js** - Web Worker that loads Pyodide and executes student code with 1-second timeout
- **svinesti.py** - Python game engine running in Pyodide. Defines `move()`, `turnLeft()`, `turnRight()`, `isRed()`, `isGreen()`, `isBlue()` and execution tracing

### CSS Structure

Styles are organized in `css/` directory with modular files:

| File | Contents |
|------|----------|
| `base.css` | CSS variables, reset, body, scrollbar, notification utility |
| `layout.css` | App container, main content, play/editor panes, responsive breakpoints |
| `header.css` | App header, title, mode toggle (Play/Edit), icon buttons |
| `sidebar.css` | Sidebar, tabs, level list, mini-grid thumbnails |
| `code-editor.css` | Code section, language tabs, CodeMirror overrides, playback toolbar, buttons |
| `game.css` | Grid, tiles, colors, pig sprites, ghost, pig element, color HUD, confetti |
| `help.css` | Help modal, shortcuts list, toggle switch, fadeIn/slideUp keyframes |
| `splash.css` | Splash screen overlay, animated pig, walk/shadow keyframes |

**Design notes:**
- Each file has a header comment listing its contents
- Tile colors use standalone classes (`.red`, `.green`, `.blue`, `.empty`) shared across grid, mini-grid, and ghost
- Pig sprites also use standalone classes (`.pig-right`, `.pig-down`, `.pig-left`, `.pig-up`)
- Mini-grid uses `.mini-grid .tile` for container scoping rather than a separate `.mini-tile` class
- All gameplay animations use Web Animations API; only splash screen uses CSS keyframes (intentionally, for pre-JS loading)

### main.js Structure

App shell. Orchestrates modes and global UI:

```javascript
const state = {
    focusedElementBeforeHelp: null,  // Track focus for help modal
};
```

Sections:
- **Help modal** - `showHelp()`, `hideHelp()`, `toggleHelp()`
- **Level list** - `populateLevelList()`, `shuffled()`
- **Initialize** - Game.init(), level list setup, URL import, Game.enter()
- **Event handlers** - Sidebar toggle, help modal, mode toggle, global shortcuts

### game.js Structure

Game mode module. Owns everything inside `#play-pane`:

```javascript
const state = {
    level: null,              // Current level object
    grid: null,               // Grid object from createGrid()
    status: "idle",           // "idle" | "playing" | "paused"
    trace: null,              // Array of events from execution
    index: 0,                 // Current position in trace
    worker: null,             // Web Worker instance
    workerTimeout: null,      // Timeout for worker restart
    isSingleStepping: false,  // Step mode flag
    currentDirection: null,   // Pig direction during playback
};
```

**Exports:**
- `init({ shortcutsContainer, onWorkerReady })` - Initialize module
- `enter()` - Activate game mode (enable shortcuts)
- `exit()` - Deactivate game mode (disable shortcuts, reset playback)
- `selectLevel(level)` - Store code, load level, reset playback
- `getLevel()` - Returns current level
- `getStatus()` - Returns playback status
- `enterIdle({ resetBoard? })` - Reset to idle state
- `enterPlaying({ trace? })` - Start/resume playback
- `enterPaused({ trace? })` - Pause playback

**Internal sections:**
- **Grid rendering** - `loadLevel()` (creates grid via `createGrid()`)
- **Code storage** - `storeCode()`, `loadCode()`, `switchLanguage()`
- **State machine** - `enterIdle()`, `enterPlaying()`, `enterPaused()`
- **Playback** - `step()`, `moveAnimated()`
- **Worker** - `initWorker()`, `submitCode()`, `hideSplashScreen()`
- **Shortcuts** - Game-mode shortcuts (play/pause, step, reset, focus editor)

### grid.js Structure

Unified grid rendering for all contexts (game, editor, thumbnails). Factory function returns an object with direct access to DOM elements:

```javascript
const grid = createGrid(container, nRows, nCols, level);
// Returns:
{
    container,              // The grid container element
    tiles,                  // Array of tile elements (direct access, no DOM queries)
    pig,                    // The pig element
    nRows,
    nCols,
    getCell(row, col),      // Returns tiles[row * nCols + col]
    placePig(row, col, dir) // Moves pig to cell, sets sprite
}
```

**Key design decisions:**
- Tiles stored in array eliminates DOM queries and avoids selector collisions (e.g., `#comparison-tile` inside HUD also has `.tile` class)
- Single `createGrid()` handles all contexts — game grid, editor grid, sidebar thumbnails
- Pig element created dynamically, positioned via `placePig()`
- CSS variables `--rows` and `--cols` set on container for grid layout

**Exports:**
- `createGrid(container, nRows, nCols, level?)` - Factory function
- `TILE_CLASSES` - Character-to-class mapping (`.`, `r`, `g`, `b`, `R`, `G`, `B`)

### Promise-Based Playback (Web Animations API)

The playback system uses the **Web Animations API** with async/await to coordinate animations sequentially. This provides clear control flow and ensures animations complete before continuing.

**How it works:**

1. `step()` is an async function that processes one trace event
2. For animated events, it calls functions from `animations.js` which use the Web Animations API
3. `await` pauses execution until the animation completes
4. After animation completes (or immediately for non-animated events), execution continues
5. If `status === "playing"`, `step()` calls itself recursively (non-blocking)

```
step() → animations.move() → await → step() → animations.turn() → ...
```

**Animation types:**

| Event | Implementation | Behavior |
|-------|---------------|----------|
| `move` | `animations.walk()` + `animations.move()` | Sprite animation + translation |
| `turn` | `animations.turn()` | Hop up → swap sprite → hop down |
| `isColor` | `animations.hudFlash()` | Flash HUD, then continue |
| `collected` | No animation | Immediate `step()` call |
| `gameover` | `animations.celebrate()` or `animations.lose()` | Win/lose animation |
| `lineExecuted` | No animation | Immediate recursive `step()` call |

**Keyframe definitions:**

All keyframes are defined in `animations.js`:
- `KEYFRAMES.WALK` - Object with keyframes for each direction (right, down, left, up)
- `KEYFRAMES.HOP_UP` / `KEYFRAMES.HOP_DOWN` - Turn animation phases
- `KEYFRAMES.HUD_FLASH` - Color comparison HUD fade in/out
- `KEYFRAMES.CELEBRATE` - Win bounce animation
- `KEYFRAMES.SHAKE` - Loss grid shake
- `KEYFRAMES.NOTIFICATION` - Toast fade in/out
- `makeConfettiKeyframes(drift, rotation)` - Dynamic confetti fall (per-piece drift/rotation)

**Pause behavior:**

- **Pause during playback**: Current animation completes naturally, then chain stops (respects committed actions)
- **Stop/Reset**: Cancels running animation immediately via `animation.cancel()` for clean visual state

**Why this design:**

- **Sequential code is actually sequential**: Turn animation logic is three lines in order, not scattered across listener
- **No event listeners needed**: Promises tell us when animations finish
- **Speed slider works instantly**: Duration recalculated fresh for each animation via `getAnimSpeed()`
- **Pause/resume is simple**: Just check `status` before calling `step()` - no intervals or callbacks to manage
- **Clean control flow**: Adding animations is just defining keyframes and calling `.animate()`

### PigJatin Language (Java-like alternative)

Located in `PigJatin/`:
- **PigJatin.g4** - ANTLR4 grammar (if/else, while loops, int/boolean variables, expressions)
- **PigJatin.js** - Transpilation entry point and test runner
- **visitors.js** - Static analysis and Python code generation
- **testcases.txt** - Tests using `#EXPECT <ERROR_TYPE> [name]` directives

### Execution Flow

1. User writes code in CodeMirror editor (Python or PigJatin)
2. If PigJatin: transpiled to Python via ANTLR-generated parser
3. Python code sent to web worker running Pyodide
4. svinesti.py wraps user code in `submitted_code()` and executes with line tracing
5. Execution generates trace of events (moves, turns, collections, game over)
6. Trace sent back to main thread for animated playback

## Development

### Running Locally

Serve with any static HTTP server (required for module imports and fetch):
```bash
python -m http.server 8000
```

### Regenerating ANTLR Parser

If `PigJatin.g4` is modified:
```bash
antlr4 -Dlanguage=JavaScript -visitor PigJatin/PigJatin.g4 -o PigJatin/antlr
```

### Testing PigJatin

Tests run automatically on page load. Check browser console for results.

## Level Format

```javascript
{
    name: "Level 1",
    nRows: 7,
    nCols: 8,
    grid: ["......bB", ...],  // r,g,b = tiles; R,G,B = tiles with stars; . = empty
    start: [6, 0],            // starting [row, col]
    dir: "right"              // "right" | "down" | "left" | "up"
}
```

## Data-Driven Mappings

Prefer lookup tables over conditionals. A mapping with a loop is cleaner than a chain of if-statements.

**TILE_CLASSES** (grid.js) — Maps grid characters to CSS classes:

```javascript
const TILE_CLASSES = {
    ".": "empty",
    "r": "red",
    "g": "green",
    "b": "blue",
    "R": "red target",
    "G": "green target",
    "B": "blue target",
};
```

Used when rendering the grid — one loop, no conditionals:

```javascript
for (const char of level.grid.join('')) {
    tile.className = 'tile ' + TILE_CLASSES[char];
}
```

**editor.js** uses the same pattern for serialization (reverse mapping) and click cycling:

```javascript
const classToChar = { empty: '.', red: 'r', green: 'g', blue: 'b' };
const leftClickReplacements = [
    ["pig-right", "pig-down"],
    ["pig-down", "pig-left"],
    // ...
    ["empty", "blue"],
    ["blue", "green"],
    // ...
];
```

## Level Editor

The level editor (`editor.js`) uses DOM classes as the source of truth during editing, then serializes to the level format for saving/sharing.

**Controls:**
- **Left-click** — Cycle tile color (empty → blue → green → red → empty) or rotate pig (right → down → left → up)
- **Left-drag** — Paint mode: copies source tile's color to tiles dragged over (preserves pig if present)
- **Pig drag** — Move pig to a new tile; target keeps its color if colored, otherwise inherits source color
- **Right-click** — Toggle target (star) on colored tiles

**Key functions:**
- `enter()` / `exit()` — Mode switching, attaches/detaches event listeners
- `serialize()` — Converts current DOM state to level format

**Design:** DOM-as-truth is simpler for editing (no sync between model and view). Serialization walks the grid once on save.

## Sidebar Level List

The sidebar displays levels as visual mini-grid thumbnails rather than text buttons. Each thumbnail shows:
- Tile colors using the same `TILE_CLASSES` mapping
- Pig element (same as game grid, created by `createGrid()`)
- Apple icon for target tiles

All grids (game, editor, thumbnails) use `createGrid()` with shared `.tile` and `.pig` classes. Mini-grid specifics are scoped via `.mini-grid`.

## Keyboard Shortcuts

Game mode shortcuts (managed by game.js):
- `H` - Play / Pause (also `Ctrl+H` from editor)
- `J` - Step (also `Ctrl+J` from editor)
- `K` - Reset
- `I` - Focus editor
- `Escape` - Unfocus editor

Global shortcuts (always active):
- `?` - Toggle help modal
- `Escape` - Close help modal

Shortcuts are managed by `shortcuts.js`, which exports a `createShortcuts(storageKey)` factory function. Each mode creates its own shortcuts instance and calls `enable()`/`disable()` on enter/exit. This allows modal shortcuts that don't conflict between game and editor modes.

## Browser Quirks

### Modifier key keydown timing

When a modifier key (Ctrl, Alt, Shift, Meta) is pressed, browsers are inconsistent about when `keydown` fires:
- Some browsers fire `keydown` immediately when the modifier alone is pressed
- Others wait until a non-modifier key is also pressed

This affects shortcut rebinding: if the user wants to bind `Ctrl+A`, some browsers would fire a `keydown` for `Control` alone before the user presses `A`. The shortcut system handles this by ignoring `keydown` events where `event.key` is a modifier name (`Control`, `Alt`, `Shift`, `Meta`).
