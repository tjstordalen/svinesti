# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Svinesti is a browser-based educational programming game where students control a pig on a grid to collect stars. Students write code in either Python 3 or "PigJatin" (a minimal Java-like language) to guide the pig using movement and color-sensing functions.

## Architecture

### Core Files

- **index.html** - Markup with CodeMirror editor, level selector, and playback controls
- **main.js** - All application logic (see structure below)
- **levels.js** - Level definitions with grid, dimensions, starting position, and direction
- **worker.js** - Web Worker that loads Pyodide and executes student code with 1-second timeout
- **svinesti.py** - Python game engine running in Pyodide. Defines `move()`, `turnLeft()`, `turnRight()`, `isRed()`, `isGreen()`, `isBlue()` and execution tracing

### main.js Structure

Flat procedural style with two structs and plain functions:

```javascript
const ui = { /* DOM element references */ };
const state = {
    level: null,
    worker: null,
    workerTimeout: null,
    currentDir: 0,        // Current pig direction (0=right, 1=down, 2=left, 3=up)
    currentPos: [0, 0],   // Current pig position [row, col]
    highlightedLine: -1,  // Currently highlighted line in editor
    playback: {
        status: "idle",   // "idle" | "playing" | "paused"
        trace: null,      // Array of events from execution
        index: 0,         // Current position in trace
        startPaused: false,
    },
};
```

Sections:
- **UI elements** - DOM references
- **State** - All mutable state
- **Utilities** - `setCssVar()`, `selectedLanguage()`
- **Board rendering** - `drawLevel()`, `moveAgent()`, `rotateAgent()`, `consumeTarget()`, `resetBoard()`
- **Editor** - `highlightLine()`
- **Code storage** - `storeCode()`, `loadCode()` (localStorage persistence)
- **Playback** - `autoplayStart/Stop()`, `step()`, `playbackInit/Stop/Resume()`
- **Worker management** - `initWorker()`
- **Actions** - `selectLevel()`, `switchLanguage()`, `submitCode()`
- **Initialize** - Setup code
- **Event handlers** - UI event wiring

### Event-Driven Playback

The playback system uses **browser animation events** instead of timers to coordinate animations. This ensures animations never overlap and timing stays synchronized regardless of system load.

**How it works:**

1. `step()` processes one trace event and triggers a CSS animation by adding an `anim-*` class
2. When the animation completes, the browser fires `animationend` (bubbles up to `#agent` listener)
3. The event listener removes all `anim-*` classes from `e.target` (generic prefix-based cleanup)
4. The event listener checks if `state.playback.status === "playing"`
5. If yes, it calls `step()` again, creating a chain

```
step() → CSS animation → animationend → cleanup → step() → CSS animation → ...
```

**Animation types:**

| Event | Animation Class | Keyframes | Trigger for next step |
|-------|-----------------|-----------|----------------------|
| `move` | `anim-walking-{dir}` | `walk-{dir}` | `animationend` bubbles to `#agent` |
| `turn` | `anim-hopping-up` → `anim-hopping-down` | `turn-hop-up` → `turn-hop-down` | Two-phase: image swap at peak, then continue |
| `isColor` | `anim-show-hud` | `hud-flash` | `animationend` bubbles from `#color-comparison-hud` to `#agent` |
| `collected` | None | None | Immediate `step()` call |
| `gameover` | None | None | Stops playback |
| `lineExecuted` | None | None | Immediate recursive `step()` call |

**Animation naming convention:**

All animation trigger classes use the `anim-*` prefix. This enables generic cleanup in the `animationend` listener without hardcoded class names. To add a new animation:
1. Create CSS class `#element.anim-your-name { animation: your-keyframes ... }`
2. Add class at call site: `element.classList.add('anim-your-name')`
3. The listener automatically removes it when animation completes

**Why this design:**

- **No timing bugs**: The browser tells us when animations finish, rather than guessing with `setTimeout`
- **Speed slider works instantly**: CSS variable `--animation-speed` is read fresh for each animation
- **Pause/resume is simple**: Just check `status` before calling `step()` - no intervals to manage
- **Clean code**: No flags like `movementInProgress` to track manually
- **Extensible**: Prefix-based cleanup means adding animations doesn't require modifying the listener

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
    dir: 0                    // 0=right, 1=down, 2=left, 3=up
}
```

## Keyboard Shortcuts

- `Ctrl+Enter` - Run code
