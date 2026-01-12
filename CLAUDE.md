# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Svinesti is a browser-based educational programming game where students control a pig on a grid to collect stars. Students write code in either Python 3 or "PigJatin" (a minimal Java-like language) to guide the pig using movement and color-sensing functions.

## Architecture

### Core Components

- **index.html** - Main entry point with CodeMirror editor, level selector, and playback controls
- **svinesti.py** - Python game engine running in Pyodide (browser-based Python). Defines the game state, available functions (`move()`, `turnLeft()`, `turnRight()`, `isRed()`, `isGreen()`, `isBlue()`), and execution tracing
- **worker.js** - Web Worker that loads Pyodide and executes student code in an isolated namespace with a 1-second timeout
- **BoardView.js** - Renders the game grid and pig sprite, handles visual updates
- **PlaybackHandler.js** - Controls animation playback of execution traces (step, play/pause, speed)
- **levels.js** - Level definitions as JSON objects with grid, starting position, and direction

### PigJatin Language (Java-like alternative)

Located in `PigJatin/`:
- **PigJatin.g4** - ANTLR4 grammar defining the language (supports if/else, while loops, int/boolean variables, expressions)
- **PigJatin.js** - Entry point for transpilation and test runner
- **visitors.js** - ANTLR visitor implementations for static analysis and Python code generation
- **ErrorListeners.js** - Custom error handling for tokenization and parsing
- **testcases.txt** - Test cases using `#EXPECT <ERROR_TYPE> [name]` directives

### Execution Flow

1. User writes code in CodeMirror editor (Python or PigJatin)
2. If PigJatin: code is transpiled to Python via ANTLR-generated parser
3. Python code is sent to web worker running Pyodide
4. svinesti.py wraps user code in `submitted_code()` function and executes with line tracing
5. Execution generates a trace of events (moves, turns, collections, game over)
6. Trace is sent back to main thread for animated playback

## Development

### Regenerating ANTLR Parser

If `PigJatin.g4` is modified, regenerate the JavaScript parser:
```bash
antlr4 -Dlanguage=JavaScript -visitor PigJatin/PigJatin.g4 -o PigJatin/antlr
```

### Running Locally

Serve with any static HTTP server (required for module imports and fetch):
```bash
python -m http.server 8000
```

### Testing PigJatin

Tests run automatically on page load. Check browser console for results. Test format in `testcases.txt`:
```
#EXPECT OK testName
<valid code here>

#EXPECT SEMANTIC_ERROR testName
<code with semantic error>
```

## Grid Format

Level grids use single characters:
- `.` - Empty tile (stepping here loses the game)
- `r`, `g`, `b` - Red, green, blue tiles (walkable)
- `R`, `G`, `B` - Same colors with a star (must collect all to win)
