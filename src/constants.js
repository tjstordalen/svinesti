// constants.js - Internal contracts (do not change without updating all consumers)
//
// These are strings that must match across JS and Python files. Changing them
// requires updating all consumers, including svinesti.py.
//
// Python contract: svinesti.py must use identical strings for:
// - DIR_NAMES = ["right", "down", "left", "up"]
// - Event types: "move", "turn", "lineExecuted", "isColor", "collected", "gameover"
// - Reason: "timeout"

// =============================================================================
// DIRECTIONS
// =============================================================================

// Order matters - used for index arithmetic in svinesti.py
export const DIRECTIONS = ['right', 'down', 'left', 'up'];

export const DIR = {
    RIGHT: 'right',
    DOWN: 'down',
    LEFT: 'left',
    UP: 'up',
};

// =============================================================================
// TILE CHARACTERS
// =============================================================================

// Tile character to CSS class mapping
export const TILE_CLASSES = {
    '.': 'empty',
    'r': 'red',
    'g': 'green',
    'b': 'blue',
    'R': 'red target',
    'G': 'green target',
    'B': 'blue target',
};

// =============================================================================
// EVENT TYPES (svinesti.py <-> game.js contract)
// =============================================================================

export const EVENT = {
    LINE_EXECUTED: 'lineExecuted',
    MOVE: 'move',
    TURN: 'turn',
    IS_COLOR: 'isColor',
    COLLECTED: 'collected',
    GAMEOVER: 'gameover',
};

// =============================================================================
// WORKER MESSAGES (worker.js <-> game.js contract)
// =============================================================================

export const MSG = {
    READY: 'ready',
    TRACE: 'execution-trace',
    FAILED: 'execution-failed',
};

// =============================================================================
// APP MODES
// =============================================================================

export const MODE = {
    GAME: 'game',
    EDITOR: 'editor',
};

// =============================================================================
// PLAYBACK STATUS
// =============================================================================

export const STATUS = {
    IDLE: 'idle',
    PLAYING: 'playing',
    PAUSED: 'paused',
};

// =============================================================================
// SIDEBAR TAB TYPES
// =============================================================================

export const TAB = {
    DEFAULT: 'default',
    CUSTOM: 'custom',
    COMMUNITY: 'community',
    TRASH: 'trash',
};

// =============================================================================
// GAMEOVER REASONS
// =============================================================================

export const REASON = {
    TIMEOUT: 'timeout',
};
