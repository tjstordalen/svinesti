# CLAUDE.md

## Project Overview

Svinesti is a browser-based educational programming game where students control a pig on a grid to collect stars. Students write code in Python 3 or "PigJatin" (a minimal Java-like language) to guide the pig using movement and color-sensing functions.

## Architecture

### Core Files

| File | Purpose |
|------|---------|
| `app.js` | Central state: mode, levels, preferences, code, starred, ready. Each export object encapsulates its own state and persistence |
| `constants.js` | Internal contracts: strings that must match across JS/Python (directions, event types, worker messages, modes) |
| `main.js` | App shell: help modal, sidebar, event handlers, initialization |
| `game.js` | Game mode: code editor, playback state machine, worker communication |
| `grid.js` | `createGrid()` factory for game/editor/thumbnails. Returns `{tiles[], pig, getCell(), placePig()}` |
| `editor.js` | Level editor: state-driven with `render()` on every change |
| `animations.js` | Web Animations API functions: walk, move, turn, hudFlash, celebrate, lose, timeout, notify, flash, confetti |
| `community.js` | Community levels: fetching, sharing, Google server interaction |
| `worker.js` | Pyodide web worker, isolated namespaces per execution |
| `svinesti.py` | Python game engine with line tracing and infinite loop detection (MAX_OPS = 10,000) |
| `sidebar.js` | Sidebar tabs: Default, My Levels, Community, Trash. Type-based card rendering with `makeLevelItemCard()` |
| `shortcuts.js` | Keyboard shortcut factory with rebinding, persistence, enable/disable lifecycle |

### Supporting Files

- `levels.js` — Level definitions and `DEFAULT_LEVEL`
- `names.js` — Random name generator and UID generator
- `PigJatin/` — ANTLR4 grammar, transpiler, and tests
- `css/` — Modular stylesheets (base, layout, header, sidebar, code-editor, game, help, splash)
- `help/` — Static help pages (infinite-loop.html)
- `appscript/` — Google Apps Script for community backend

## Level Format

```javascript
{
    name: "Level 1",
    nRows: 7,
    nCols: 8,
    grid: ["......bB", ...],  // r,g,b = tiles; R,G,B = tiles with stars; . = empty
    start: [6, 0],            // [row, col]
    dir: "right"              // "right" | "down" | "left" | "up"
}
// Saved levels add: id (UUID), uid (public sharing ID), originRow/originCol (for compact/expand)
```

## Key Patterns

### Data-Driven Mappings

Prefer lookup tables over conditionals:

```javascript
// constants.js - shared across files
const TILE_CLASSES = { ".": "empty", "r": "red", "g": "green", "b": "blue", "R": "red target", ... };

// editor.js - local mappings derived from constants where possible
const DIR_CYCLE = Object.fromEntries(DIRECTIONS.map((d, i) => [d, DIRECTIONS[(i + 1) % 4]]));
const COLOR_CYCLE = { '.': 'b', 'b': 'g', 'g': 'r', 'r': '.', 'B': 'G', 'G': 'R', 'R': '.' };
```

### State Objects (app.js)

Each export object encapsulates its state (`_data`, `_storage`, etc.) and persistence (`_load()`, `_persist()`). The `init()` function calls `_load()` on each.

- `mode` — `_current`, `get()`, `set()`, `isEditor()`, `isGame()`
- `prefs` — `_data`, individual prefs like `colorblind.get()`/`.set()`
- `levels` — `_data`, `_callbacks`, `builtIn()`, `custom()`, `save()`, `update()`, `delete()`, `onChange()`
- `starred` — `_uids`, `is(uid)`, `set(uid, value)` (community level stars)
- `code` — `_storage`, `get(levelKey, language)`, `set(levelKey, language, value)`
- `ready` — `_done`, `_callbacks`, `is()`, `on(cb)`, `set()`

Persistence via localStorage: `svinesti-custom-levels`, `svinesti-starred`, `svinesti-preferences`, `svinesti-code`

### CSS Conventions

- Tile colors use standalone classes: `.red`, `.green`, `.blue`, `.empty` (not `.tile-red`)
- Pig sprites use standalone classes: `.pig-right`, `.pig-down`, `.pig-left`, `.pig-up`
- `.tile` and `.pig` classes shared across game grid, editor grid, and sidebar thumbnails
- All gameplay animations use Web Animations API; only splash screen uses CSS keyframes

## Playback System

### Event Types

| Event | Behavior |
|-------|----------|
| `lineExecuted` | Highlight line + pause for `LINE_PAUSE_MULTIPLIER * animSpeed` |
| `move` | Sprite walk animation + translation to adjacent cell |
| `turn` | Hop up → swap sprite → hop down |
| `isColor` | Flash color comparison HUD |
| `collected` | Remove `.target` class (instant) |
| `gameover` | Win: `celebrate()`. Lose: `lose()`. Timeout: `timeout()` |

### Line Number Attachment

Python's `trace()` method attaches `lineno` to events:
- `lineExecuted` events are pushed normally
- Animated events (move, turn, isColor) pop the preceding `lineExecuted` and copy its `lineno`
- Consequence events (collected, gameover) inherit `lineno` from previous event

This allows JS to highlight the correct line AS the animation plays.

### Abort Handling

Animation functions catch `AbortError` (from cancelled animations) and return `animations.ABORT` constant. Callers must check for `ABORT` to exit early — e.g., skip `movePigTo()` after a cancelled move animation.

## Infinite Loop Detection

Python-side only (no JS timeout). `svinesti.py` uses `sys.settrace()` to count every line executed in student code. When `op_count > MAX_OPS` (10,000), traces gameover with `reason: "timeout"` and raises `GracefulExit`. JS detects this, shows error notification, truncates trace to last 100 events for replay.

## Worker Architecture

Module worker (`{ type: "module" }`) that imports from `constants.js`. Each execution gets `pyodide.globals.copy()` for a fresh namespace, preventing student code from polluting subsequent runs. Worker posts `MSG.READY` when Pyodide loads → `app.ready.set()` → splash hides.

## Level Editor

State-driven with `render()` on every change. The level format's character representation (`.rgbRGB`) IS the internal state.

**Constraints:**
- Cannot paint empty (`.`) onto the pig's tile — pig must stay on colored tile
- Levels compact (trim empty rows/cols) on save, expand to 9×16 on edit

**Keyboard:** `Space` (cycle color/rotate pig), `S` (toggle star), arrows (cursor), `P` (place pig), `C` (paint mode)

**Mouse:** Left-click (cycle/rotate), right-click (toggle star), shift+click (enter paint mode), drag pig to move

**Ghost preview:** CSS custom properties `--ghost-pig`, `--ghost-color`, `--ghost-star` control preview on cursor tile.

## Community Levels

Requires user consent before any Google server contact. Defense in depth: consent checked at both caller level and fetch level.

`community.js` exports: `getLevels()`, `onChange(cb)`, `sendStar(uid, starred)`, `submitLevel(base64)`

Levels stored in Google Sheet (base64-encoded JSON). Polling checks version number every 3 minutes.

## Game Mode Shortcuts

- `H` — Play / Pause
- `J` — Step
- `K` — Reset
- `Ctrl+Enter` — Run code (non-rebindable)
- `?` — Help (non-rebindable)

Shortcuts managed by `shortcuts.js` factory. Each mode calls `enable()`/`disable()` on enter/exit.

## Development

```bash
# Run locally (required for module imports)
python -m http.server 8000

# Regenerate ANTLR parser (if PigJatin.g4 modified)
antlr4 -Dlanguage=JavaScript -visitor PigJatin/PigJatin.g4 -o PigJatin/antlr
```
