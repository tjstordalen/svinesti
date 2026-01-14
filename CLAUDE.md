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
    isSingleStepping: false,  // Flag to indicate single-step execution mode
    currentAnimation: null,   // Track running animation for cancel on stop
    playback: {
        status: "idle",       // "idle" | "playing" | "paused"
        trace: null,          // Array of events from execution
        index: 0,             // Current position in trace
    },
};
```

Sections:
- **UI elements** - DOM references
- **State** - All mutable state
- **Utilities** - `setCssVar()`, `selectedLanguage()`, `getAnimSpeed()`
- **Keyframe definitions** - Constants for Web Animations API (`WALK_KEYFRAMES`, `HOP_UP/DOWN_KEYFRAMES`, etc.)
- **Board rendering** - `move()`, `turn()`, `loadLevel()`
- **Code storage** - `storeCode()`, `loadCode()` (localStorage persistence)
- **Playback** - `step()` (async), `playbackInit/Stop/Resume()`, `pause()`
- **Worker management** - `initWorker()`
- **Actions** - `selectLevel()`, `switchLanguage()`, `submitCode()`
- **Initialize** - Setup code
- **Event handlers** - UI event wiring

### Promise-Based Playback (Web Animations API)

The playback system uses the **Web Animations API** with async/await to coordinate animations sequentially. This provides clear control flow and ensures animations complete before continuing.

**How it works:**

1. `step()` is an async function that processes one trace event
2. For animated events, it calls `element.animate(keyframes, options)` which returns an Animation object
3. `await animation.finished` pauses execution until the animation completes
4. After animation completes (or immediately for non-animated events), execution continues
5. If `status === "playing"`, `step()` calls itself recursively (non-blocking)

```
step() → animate() → await finished → step() → animate() → ...
```

**Animation types:**

| Event | Implementation | Behavior |
|-------|---------------|----------|
| `move` | `ui.agent.animate(WALK_KEYFRAMES[dir], {...})` | Walking animation, then continue |
| `turn` | Two sequential animations: hop up → swap image → hop down | Two-phase turn with image swap at peak |
| `isColor` | `ui.colorComparison.animate(HUD_FLASH_KEYFRAMES, {...})` | Flash HUD, then continue |
| `collected` | No animation | Immediate `step()` call |
| `gameover` | No animation | Stops playback |
| `lineExecuted` | No animation | Immediate recursive `step()` call |

**Keyframe definitions:**

All keyframes are defined in JavaScript constants at the top of main.js:
- `WALK_KEYFRAMES` - Object with keyframes for each direction (right, down, left, up)
- `HOP_UP_KEYFRAMES` / `HOP_DOWN_KEYFRAMES` - Turn animation phases
- `HUD_FLASH_KEYFRAMES` - Color comparison HUD fade in/out

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
    dir: 0                    // 0=right, 1=down, 2=left, 3=up
}
```

## Keyboard Shortcuts

- `Ctrl+Enter` - Run code
