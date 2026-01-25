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
- **animations.js** - All animation logic as direct exports (walk, move, turn, hudFlash, celebrate, lose, timeout, notify, flash, confetti), plus `pigSpriteUrl()` helper and `ABORT` constant
- **editor.js** - Level editor module (DOM-based editing, serialization, enter/exit mode switching)
- **shortcuts.js** - Keyboard shortcut factory with rebindable keys, persistence, and enable/disable lifecycle
- **levels.js** - Level definitions and `DEFAULT_LEVEL` for editor
- **names.js** - Random level name generator (two-word combinations from adjectives, nouns, verbs) and UID generator
- **worker.js** - Web Worker that loads Pyodide and executes student code in isolated namespaces
- **svinesti.py** - Python game engine with operation counting for infinite loop detection (MAX_OPS = 10,000)

### CSS Structure

Styles are organized in `css/` directory with modular files:

| File | Contents |
|------|----------|
| `base.css` | CSS variables, reset, body, scrollbar, notification utility (including `.light` variant) |
| `layout.css` | App container, main content, play/editor panes, editor name input, responsive breakpoints |
| `header.css` | App header, title, mode toggle (Play/Edit), icon buttons |
| `sidebar.css` | Sidebar, pull-tab, tabs (with editor-mode hiding), level list, thumbnails, delete button |
| `code-editor.css` | Code section, language tabs, CodeMirror overrides, playback toolbar, buttons |
| `game.css` | Grid, tiles, colors, pig sprites, pig element, color HUD, confetti |
| `help.css` | Help modal, shortcuts list, toggle switch, lock icon shake, fadeIn/slideUp keyframes |
| `splash.css` | Splash screen overlay, animated pig, typewriter loading text, walk/shadow keyframes |

**Design notes:**
- Each file has a header comment listing its contents
- Tile colors use standalone classes (`.red`, `.green`, `.blue`, `.empty`)
- Pig sprites also use standalone classes (`.pig-right`, `.pig-down`, `.pig-left`, `.pig-up`)
- All gameplay animations use Web Animations API; only splash screen uses CSS keyframes (intentionally, for pre-JS loading)

### Help Pages

Static help content in `help/` directory:
- **infinite-loop.html** - Explains infinite loops with side-by-side good/bad code examples
- **help.css** - Standalone styles for help pages (can be viewed outside the app)

### main.js Structure

App shell. Orchestrates modes and global UI:

```javascript
const help = {
    previousFocus: null,
    enter(),   // Show help, focus pane, capture previous focus
    exit(),    // Hide help, restore focus
};
```

Sections:
- **Help pane** - `help.enter()`, `help.exit()`
- **Community levels** - `community.showTab()`, `community.fetchLevels()`, `community.parse()`, `community.invalidateCache()`
- **Level list** - `populateLevelList(levelArray, { deletable? })` with optional delete buttons
- **Initialize** - Game.init(), level list setup, URL import, Game.enter()
- **Event handlers** - Sidebar pull-tab click, click-outside-to-close, help pane, mode toggle, global shortcuts, `'levels-updated'` and `'community-levels-updated'` listeners

### game.js Structure

Game mode module. Owns everything inside `#play-pane`:

```javascript
const state = {
    level: null,              // Current level object
    grid: null,               // Grid object from createGrid()
    status: "idle",           // "idle" | "playing" | "paused"
    worker: null,             // Web Worker instance
    pendingResolve: null,     // Promise resolver for worker response
};

const playback = {
    trace: null,              // Reversed array, consumed via pop()
    stepping: false,          // Mutex to prevent overlapping step animations
    load(trace),              // Reverse and store trace
    next(),                   // Pop next event (returns undefined when empty)
    clear(),                  // Reset trace to null
    play(),                   // Process events while status === "playing"
    step(),                   // Process single event with mutex guard
};
```

**Exports:**
- `init({ shortcutsContainer })` - Initialize module
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
- **State machine** - `enterState()`, `BUTTON_HANDLERS` table, `submitAndEnter()`
- **Playback** - `processEvent()`, `moveAnimated()`, `highlightLine()`
- **Worker** - `initWorker()`, `getCode()`, `execute()`, `hideSplashScreen()`
- **Shortcuts** - Game-mode shortcuts (play/pause, step, reset, run-code, help)

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

### Infinite Loop Detection

Student code that runs too long is detected and handled gracefully. The key insight is that we trace **every line of student code**, not just calls to svinesti functions like `move()`. This catches all infinite loops, including `while True: x = 1` that never interacts with the game.

**Python-side detection (svinesti.py):**
- Uses `sys.settrace(line_tracer)` to intercept every line executed in `submitted_code()`
- Each line increments `state.op_count`
- When count exceeds `MAX_OPS` (10,000), traces gameover with `reason: "timeout"` and raises `GracefulExit`
- No JS-side timeout needed — Python controls termination completely

**JS-side handling (game.js `submitAndEnter()`):**
- Detects `reason: "timeout"` in last trace event
- Shows error in code output with pulsing red flash animation
- Shows notification linking to `help/infinite-loop.html`
- Truncates trace to last 100 events for replay
- Plays timeout animation (grid wobble + pig ragdoll) immediately

**Why this design (vs. JS timeout):**
- Catches ALL infinite loops, not just ones calling game functions
- Python controls termination, so trace is complete up to the cutoff
- We can replay the last N operations to show WHERE the loop is stuck
- No race conditions between timeout and normal completion

### Promise-Based Playback (Web Animations API)

The playback system uses the **Web Animations API** with async/await to coordinate animations sequentially. This provides clear control flow and ensures animations complete before continuing.

**How it works:**

1. `playback.play()` loops while `status === "playing"`, calling `processEvent()` for each trace event
2. `playback.step()` processes a single event with a mutex guard (`stepping` flag) to prevent overlapping animations
3. `processEvent()` highlights the line (from `msg.lineno`), then handles the event type
4. For animated events, it calls functions from `animations.js` which use the Web Animations API
5. `await` pauses execution until the animation completes

```
playback.play() → processEvent() → animations.move() → processEvent() → ...
```

**Event types:**

| Event | Implementation | Behavior |
|-------|---------------|----------|
| `lineExecuted` | `highlightLine()` + delay | Pause for `LINE_PAUSE_MULTIPLIER * animSpeed` |
| `move` | `animations.walk()` + `animations.move()` | Sprite animation + translation |
| `turn` | `animations.turn()` | Hop up → swap sprite → hop down |
| `isColor` | `animations.hudFlash()` | Flash HUD, then continue |
| `collected` | Remove `.target` class | Instant, no animation |
| `gameover` | `animations.celebrate()` or `animations.lose()` | Win/lose animation, then `enterIdle()` |

**Line number attachment (svinesti.py):**

The Python `trace()` method attaches line numbers to events:
- `lineExecuted` events are pushed to trace normally
- Animated events (move, turn, isColor) pop the preceding `lineExecuted` and copy its `lineno`
- Consequence events (collected, gameover) inherit `lineno` from the previous event

This allows JS to highlight the correct line AS the animation plays, not before.

**Abort handling (animations.js):**

Animation functions are wrapped with `handleAbortException()`:
- If animation is cancelled (user pauses/resets), `AbortError` is caught
- Returns `animations.ABORT` constant instead of throwing
- Callers check for `ABORT` to exit early (e.g., skip `movePigTo()` after cancelled move)

**Keyframe definitions:**

All keyframes are defined in `animations.js`:
- `KEYFRAMES.WALK` - Object with keyframes for each direction (right, down, left, up)
- `KEYFRAMES.HOP_UP` / `KEYFRAMES.HOP_DOWN` - Turn animation phases
- `KEYFRAMES.HUD_FLASH` - Color comparison HUD fade in/out
- `KEYFRAMES.CELEBRATE` - Win bounce animation
- `KEYFRAMES.SHAKE` - Loss grid shake
- `KEYFRAMES.NOTIFICATION` - Toast fade in/out
- `KEYFRAMES.TIMEOUT_GRID` - Wobble with pulsing red glow
- `KEYFRAMES.TIMEOUT_PIG` - Ragdoll motion in cell
- `KEYFRAMES.FLASH` - Pulsing red inset glow (3 pulses)
- `makeConfettiKeyframes(drift, rotation)` - Dynamic confetti fall (per-piece drift/rotation)

**Pause behavior:**

- **Pause during playback**: Current animation completes naturally, then chain stops (respects committed actions)
- **Stop/Reset**: Cancels running animation immediately via `animation.cancel()` for clean visual state

**Why this design:**

- **Sequential code is actually sequential**: Turn animation logic is three lines in order, not scattered across listener
- **No event listeners needed**: Promises tell us when animations finish
- **Speed slider works instantly**: Duration recalculated fresh for each animation via `getAnimSpeed()`
- **Pause/resume is simple**: Just check `status` before calling `play()` - no intervals or callbacks to manage
- **Clean control flow**: Adding animations is just defining keyframes and calling `.animate()`
- **Step mutex**: Prevents animation overlap when spam-clicking step button

### Worker Architecture

The web worker (`worker.js`) runs student code in Pyodide:

```javascript
// Initialization
loadPyodide() → fetch svinesti.py → postMessage({ type: 'ready' })

// Execution (each submission)
handleMessage() {
    isolatedNamespace = pyodide.globals.copy()  // Fresh namespace
    runPython(engineCode, { globals: isolatedNamespace })
    runPython(injectUserCode(level, code), { globals: isolatedNamespace })
    postMessage({ type: 'execution-trace', trace })
    isolatedNamespace.destroy()  // Cleanup
}
```

**Key design decisions:**
- **Isolated namespaces:** Each execution gets a fresh copy of globals, preventing student code from polluting subsequent runs
- **No JS timeout:** Python's `MAX_OPS` handles infinite loops, giving us a complete trace up to the cutoff
- **`cache: 'no-store'`:** Fetch svinesti.py without caching to avoid stale code during development

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
6. If operation count exceeds MAX_OPS, gameover with `reason: "timeout"` is traced
7. Trace sent back to main thread for animated playback

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

**Additional fields for saved levels:**
```javascript
{
    id: "uuid",       // unique identifier for updates/deletes
    originRow: 0,     // row offset from compacting (for re-expansion)
    originCol: 0,     // col offset from compacting (for re-expansion)
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

**editor.js** uses the same pattern for color cycling and target toggling:

```javascript
const COLOR_CYCLE = { '.': 'b', 'b': 'g', 'g': 'r', 'r': '.', 'B': 'G', 'G': 'R', 'R': '.' };
const TARGET_CYCLE = { '.': '.', 'b': 'B', 'B': 'b', 'g': 'G', 'G': 'g', 'r': 'R', 'R': 'r' };
```

## Level Editor

The level editor (`editor.js`) uses explicit state with the level format's character representation (`.rgbRGB`). A single `render()` function syncs state to DOM on every change.

**State:**
```javascript
const state = {
    cells: [],           // 1D array of chars: '.rgbRGB'
    nRows, nCols,
    pigIndex: 0,         // index into cells
    pigDir: 'right',
    cursor: 0,           // index (follows mouse or keyboard)
    clipboard: null,     // char when in paint mode, null otherwise
    paintHeld: false,    // spacebar held for continuous keyboard painting
    isMouseDown: false,  // mouse button held for continuous mouse painting
    isDraggingPig: false,
    grid: null,          // grid object for DOM refs
    editingLevelId: null, // ID of saved level being edited, null = new level
    uid: null,           // Public UID for sharing
};
```

**Data-driven cycles:**
```javascript
const COLOR_CYCLE = { '.': 'b', 'b': 'g', 'g': 'r', 'r': '.', 'B': 'G', 'G': 'R', 'R': '.' };
const TARGET_CYCLE = { '.': '.', 'b': 'B', 'B': 'b', 'g': 'G', 'G': 'g', 'r': 'R', 'R': 'r' };
const DIR_CYCLE = { right: 'down', down: 'left', left: 'up', up: 'right' };
```

**Keyboard controls:**
- **Space** — Cycle tile color or rotate pig (hold for continuous paint in paint mode)
- **S** — Toggle target (star) on colored tiles
- **Arrow keys** — Move cursor
- **P** — Move pig to cursor
- **C** — Enter/exit paint mode (copies current tile)

**Mouse controls:**
- **Left-click** — Cycle tile color or rotate pig
- **Right-click** — Toggle target (or exit paint mode)
- **Shift+click** — Copy tile to clipboard, enter paint mode
- **Drag pig** — Move pig to new tile (ghost preview shows destination)
- **Click-drag in paint mode** — Continuous painting

**Paint mode constraints:**
- Cannot paint empty (`.`) onto the pig's tile (pig must stay on colored tile)

**Ghost preview:** When dragging pig or in paint mode, a ghost preview appears on the cursor tile via `::after` pseudo-element. CSS custom properties (`--ghost-pig`, `--ghost-color`, `--ghost-star`) control what's shown.

**Colorblind mode:** Pig remains visible on patterned tiles via `--pig-bg` CSS variable layered on top of colorblind patterns.

**Design:** State-driven with full re-render. The level format's character representation IS the internal state — no conversion needed. Mutations are trivial: update state, call `render()`. No pig element in editor; pig shown via `pig-{dir}` class on tile.

### My Levels (Local Storage)

User-created levels are saved to localStorage under key `'svinesti-custom-levels'`. The sidebar's "My Levels" tab displays these with delete buttons.

**Saved level format:**
```javascript
{
    id: "uuid",           // crypto.randomUUID() - internal storage ID
    uid: "X7bK9f2A",      // public UID for sharing
    name: "Brave Tiger",  // randomly generated two-word name
    nRows, nCols, grid, start, dir,  // standard level fields
    originRow: 2,         // row offset for re-expansion
    originCol: 3,         // col offset for re-expansion
}
```

**Compact/Expand cycle:**
- `compact(level)` — Trims empty rows/cols, stores `originRow`/`originCol` to preserve original position
- `expand(level)` — Restores to 9×16 canvas, placing content at stored origin

This allows levels to be stored efficiently while maintaining their original canvas position when reloaded for editing.

**Storage functions:**
- `getCustomLevels()` — Returns array from localStorage
- `saveCustomLevel(level)` — Appends new level (with generated ID)
- `updateCustomLevel(id, levelData)` — Updates existing level by ID
- `deleteCustomLevel(id)` — Removes level by ID

**Random name generator:** New levels get a randomly generated two-word name (e.g., "Brave Tiger") plus a UID. Click the dice button to regenerate. The name field is readonly.

**Save flow:**
1. User edits level (name auto-generated with UID, can regenerate via dice button)
2. Click Save → validates level, compacts grid
3. If `editingLevelId` is null: creates new level with UUID
4. If `editingLevelId` exists: updates existing level
5. Dispatches `'levels-updated'` custom event to refresh sidebar

**Sidebar behavior:**
- In editor mode, only "My Levels" tab is visible (others hidden via CSS)
- Delete button appears on hover (trash icon)
- List auto-refreshes when `'levels-updated'` event fires

### Community Levels

Students can share levels to a central community pool via Google Sheets. No teacher setup required.

**Architecture:**
- **Google Sheet** — Stores submissions (Timestamp, Level as base64 JSON)
- **Apps Script** — Single endpoint: GET returns levels, POST submits new level

**Submission flow (editor.js):**
1. Click "Share to Community" → validate level (including DFS reachability)
2. POST JSON `{level: base64}` to `COMMUNITY_LEVELS_URL`
3. Server validates, fixes name/UID if needed, appends to sheet
4. Dispatch `'community-levels-updated'` event to invalidate cache

**Fetch flow (main.js):**
1. Community tab clicked → `community.showTab()`
2. If no cache: GET `COMMUNITY_LEVELS_URL`
3. Parse response (one base64 level per line)
4. Cache and display via `populateLevelList()`

**Constants:**
```javascript
// main.js and editor.js use the same endpoint
const COMMUNITY_LEVELS_URL = 'https://script.google.com/macros/s/.../exec';
```

**Setup scripts (appscript/):**
- `main.gs` — API endpoints (doGet, doPost), level validation (DFS reachability)
- `names.gs` — Name validation and generation

## Sidebar Level List

The sidebar is hidden by default with a green "LEVELS" pull-tab visible on the left edge (20% from top). Click the tab to open; click outside (or on the tab again) to close. Mode toggle clicks don't close the sidebar.

The sidebar displays levels as visual thumbnails rather than text buttons. Each thumbnail shows:
- Tile colors using the same `TILE_CLASSES` mapping
- Pig element (same as game grid, created by `createGrid()`)
- Apple icon for target tiles

All grids (game, editor, thumbnails) use `createGrid()` with shared `.tile` and `.pig` classes.

## Keyboard Shortcuts

Shortcuts are managed by `shortcuts.js`, which exports a `createShortcuts(storageKey)` factory function. Each mode creates its own shortcuts instance and calls `enable()`/`disable()` on enter/exit.

**Shortcut features:**
- Rebindable keys (click the key display to rebind)
- Per-shortcut enable/disable (click the row to toggle)
- Master toggle to enable/disable all
- Reset to defaults button
- Persistence via localStorage
- `rebindable: false` option for shortcuts that shouldn't be changed (shows lock icon)

**Game mode shortcuts (managed by game.js):**
- `H` - Play / Pause
- `J` - Step
- `K` - Reset
- `Ctrl+Enter` - Run code (non-rebindable)
- `?` - Help (non-rebindable)

**Global shortcuts (always active):**
- `?` - Toggle help modal (in editor mode)
- `Escape` - Close help modal

## Browser Quirks

### Modifier key keydown timing

When a modifier key (Ctrl, Alt, Shift, Meta) is pressed, browsers are inconsistent about when `keydown` fires:
- Some browsers fire `keydown` immediately when the modifier alone is pressed
- Others wait until a non-modifier key is also pressed

This affects shortcut rebinding: if the user wants to bind `Ctrl+A`, some browsers would fire a `keydown` for `Control` alone before the user presses `A`. The shortcut system handles this by ignoring `keydown` events where `event.key` is a modifier name (`Control`, `Alt`, `Shift`, `Meta`).
