// config.js - Centralized configuration for Svinesti
//
// This file contains all tweakable constants that future maintainers
// might want to modify. Import what you need from this file.
//
// Organization:
//   1. Timing / Animation
//   2. Colors
//   3. Sizes / Layout
//   4. Infinite Loop Detection
//   5. Keyboard Shortcuts
//   6. Storage Keys
//   7. Game Mechanics
//   8. Default Level (Editor)
//   9. External Dependencies
//  10. Feature Flags
//  11. Text / Messages

// =============================================================================
// 1. TIMING / ANIMATION
// =============================================================================

// Gameplay animation multipliers (relative to speed slider value)
export const MOVE_MULTIPLIER = 2;       // Movement animation duration
export const TURN_MULTIPLIER = 1.5;     // Turn animation duration
export const HUD_MULTIPLIER = 3;        // Color comparison HUD duration
export const WALK_CYCLES = 2;           // Sprite animation cycles per move
export const LINE_PAUSE_MULTIPLIER = 1.5; // Delay multiplier for line highlight

// Fixed animation durations (milliseconds)
export const CELEBRATE_DURATION = 1500;
export const LOSE_DURATION = 600;
export const TIMEOUT_GRID_DURATION = 150;
export const TIMEOUT_GRID_ITERATIONS = 6;
export const TIMEOUT_PIG_DURATION = 180;
export const TIMEOUT_PIG_ITERATIONS = 5;
export const NOTIFY_DURATION_DEFAULT = 2500;
export const FLASH_DURATION_DEFAULT = 3000;
export const CONFETTI_CLEANUP_DELAY = 5000;
export const SPLASH_FADE_DURATION = 500;

// Animation details
export const CELEBRATE_JUMP_HEIGHTS = [-40, -30, -15]; // pixels, decreasing bounces
export const SHAKE_TRANSLATION = { x: 8, y: 4 };       // pixels
export const TIMEOUT_GRID_ROTATION = 2;                // degrees
export const DIE_ROTATION = { leftRight: 180, upDown: 90 }; // degrees

// Confetti parameters
export const CONFETTI_COUNT = 200;
export const CONFETTI_DURATION_RANGE = [2, 4];         // seconds
export const CONFETTI_DELAY_RANGE = [0, 0.7];          // seconds
export const CONFETTI_DRIFT_RANGE = [-50, 50];         // pixels horizontal
export const CONFETTI_ROTATION_RANGE = [-360, 360];    // degrees

// =============================================================================
// 2. COLORS
// =============================================================================

// Brand/UI palette (CSS variable values)
export const COLORS = {
    header: '#7eb09b',
    headerDark: '#6a9985',
    interactive: '#5a9178',
    interactiveLight: '#7eb09b',
    interactiveDark: '#4a7a68',
    bg: '#f5f7fa',
    surface: '#ffffff',
    border: '#e1e5eb',
    text: '#2d3748',
    textMuted: '#718096',
};

// Tile colors
export const TILE_COLORS = {
    empty: '#FAF7F2',
    red: '#FF8A8A',
    green: '#58E0B8',
    blue: '#85D0FF',
};

// Notification colors
export const NOTIFY_COLOR_INFO = 'rgba(90, 145, 120, 0.95)';   // sage green
export const NOTIFY_COLOR_ERROR = 'rgba(60, 60, 70, 0.95)';    // dark slate

// Error flash/glow color
export const ERROR_GLOW_COLOR = 'rgba(255, 80, 80, 0.7)';
export const ERROR_GLOW_COLOR_STRONG = 'rgba(255, 80, 80, 0.8)';

// Confetti colors
export const CONFETTI_COLORS = [
    '#FF8A8A',  // pink
    '#58E0B8',  // teal
    '#85D0FF',  // blue
    '#FFD700',  // gold
    '#FF6B6B',  // red
    '#4ECDC4',  // cyan
];

// Code editor line highlight
export const LINE_HIGHLIGHT_COLOR = 'rgba(139, 224, 26, 0.25)';

// =============================================================================
// 3. SIZES / LAYOUT
// =============================================================================

// Global layout
export const HEADER_HEIGHT = 56;        // pixels
export const SIDEBAR_WIDTH = 480;       // pixels
export const BORDER_RADIUS = {
    sm: 6,
    md: 10,
    lg: 16,
};

// Code editor panel
export const CODE_SECTION_WIDTH = 480;      // pixels, default
export const CODE_SECTION_MIN_WIDTH = 400;  // pixels
export const CODE_SECTION_MAX_WIDTH = 560;  // pixels
export const EDITOR_FONT_SIZE = 16;         // pixels
export const BUTTON_WIDTH = 70;             // pixels
export const CODE_OUTPUT_MIN_HEIGHT = 60;   // pixels

// Game elements
export const PIG_SPRITE_SIZE = 90;          // percent of tile
export const TARGET_APPLE_SIZE = 40;        // percent of tile
export const TARGET_APPLE_POSITION = 30;    // percent from top-left
export const COMPARISON_TILE_SIZE = 32;     // pixels
export const COLOR_HUD_MAX_WIDTH = 180;     // pixels
export const COLOR_HUD_MARGIN = 8;          // pixels

// Confetti piece sizes
export const CONFETTI_SIZE = 10;            // pixels (square/circle)
export const CONFETTI_RIBBON_WIDTH = 8;     // pixels
export const CONFETTI_RIBBON_HEIGHT = 16;   // pixels

// Splash screen
export const SPLASH_PIG_WIDTH = 450;        // pixels
export const SPLASH_PIG_HEIGHT = 225;       // pixels
export const SPLASH_TITLE_SIZE = 5;         // rem
export const SPLASH_SHADOW_WIDTH = 200;     // pixels
export const SPLASH_SHADOW_HEIGHT = 40;     // pixels

// Help modal
export const HELP_MODAL_MAX_WIDTH = 1100;   // pixels
export const HELP_MODAL_MAX_HEIGHT = 85;    // vh percent
export const RESPONSIVE_BREAKPOINT = 900;   // pixels

// Near-right-edge threshold for HUD positioning
export const HUD_EDGE_THRESHOLD = 2;        // columns from right edge

// =============================================================================
// 4. INFINITE LOOP DETECTION
// =============================================================================

export const MAX_OPS = 10000;               // Operations before timeout
export const TIMEOUT_TRACE_REPLAY = 100;    // Events to replay on timeout
export const TIMEOUT_NOTIFICATION_DURATION = 10000; // ms

// =============================================================================
// 5. KEYBOARD SHORTCUTS
// =============================================================================

// Default key bindings
export const DEFAULT_SHORTCUTS = {
    playPause: 'h',
    step: 'j',
    reset: 'k',
    runCode: 'ctrl+enter',  // non-rebindable
    help: '?',              // non-rebindable
    closeHelp: 'Escape',
};

// Modifier keys (ignored during rebinding until a non-modifier is pressed)
export const MODIFIER_KEYS = ['Control', 'Alt', 'Shift', 'Meta'];

// Lock icon shake duration (ms)
export const LOCK_SHAKE_DURATION = 300;

// =============================================================================
// 6. STORAGE KEYS
// =============================================================================

export const STORAGE_KEY_SHORTCUTS = 'svinesti-game-shortcuts-v1';
export const STORAGE_KEY_CUSTOM_LEVELS = 'svinesti-custom-levels';

// =============================================================================
// 7. GAME MECHANICS
// =============================================================================

// Direction system
export const DIR_NAMES = ['right', 'down', 'left', 'up'];
export const DIR_VECTORS = [
    [0, 1],   // right: row stays, col increases
    [1, 0],   // down: row increases, col stays
    [0, -1],  // left: row stays, col decreases
    [-1, 0],  // up: row decreases, col stays
];
export const TURN_LEFT = -1;
export const TURN_RIGHT = 1;

// Editor click cycling order
export const COLOR_CYCLE = ['empty', 'blue', 'green', 'red']; // wraps to empty
export const PIG_DIR_CYCLE = ['right', 'down', 'left', 'up']; // wraps to right

// Tile character mapping (grid format)
export const TILE_CHAR_TO_CLASS = {
    '.': 'empty',
    'r': 'red',
    'g': 'green',
    'b': 'blue',
    'R': 'red target',
    'G': 'green target',
    'B': 'blue target',
};

// =============================================================================
// 8. DEFAULT LEVEL (Editor)
// =============================================================================

export const DEFAULT_LEVEL = {
    name: 'New Level',
    nRows: 9,
    nCols: 16,
    grid: [
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        'b...............',
    ],
    start: [8, 0],
    dir: 'right',
};

// =============================================================================
// 9. EXTERNAL DEPENDENCIES
// =============================================================================

export const PYODIDE_CDN_URL = 'https://cdn.jsdelivr.net/pyodide/v0.28.1/full/pyodide.js';

// Sprite path pattern: use pigSpritePath(dir, num) to generate
export const PIG_SPRITE_DIR = 'pigs';
export const pigSpritePath = (dir, num = 1) => `${PIG_SPRITE_DIR}/${dir}-${num}.png`;
export const pigSpriteUrl = (dir, num = 1) => `url("${pigSpritePath(dir, num)}")`;

// Target icon
export const TARGET_ICON_PATH = 'img/golden-apple.png';

// =============================================================================
// 10. FEATURE FLAGS
// =============================================================================

export const ENABLE_SPLASH_SCREEN = true;
export const SVINESTI_PY_NO_CACHE = true;  // Use cache: 'no-store' for dev

// =============================================================================
// 11. TEXT / MESSAGES
// =============================================================================

// Fallback names
export const DEFAULT_LEVEL_NAME_FALLBACK = 'Untitled';
export const CUSTOM_LEVEL_NAME = 'Custom';

// UI text
export const CODE_OUTPUT_PLACEHOLDER = 'Output will appear here...';
export const SHORTCUTS_LABEL_ENABLE = 'Enable shortcuts';
export const SHORTCUTS_HINT = 'Click to toggle, click key to change';
export const SHORTCUTS_RESET_TITLE = 'Reset to defaults';

// Infinite loop message
export const INFINITE_LOOP_OUTPUT_MESSAGE =
    'Infinite loop detected after 10,000 operations.\n' +
    'Replaying the last part to show where it got stuck.';
export const INFINITE_LOOP_NOTIFICATION_HTML =
    'Do you have an <a href="help/infinite-loop.html" target="_blank">infinite loop</a>?';

// Validation error messages (editor)
export const VALIDATION_ERRORS = {
    invalidData: 'Invalid level data',
    noTargets: 'Level must have at least one target',
    pigOnEmpty: 'Pig must be on a colored tile',
    unreachableTiles: 'All colored tiles must be reachable from the pig',
};

// Notification messages
export const NOTIFICATION_PAUSED_TO_EDIT = 'Paused to edit code';
export const NOTIFICATION_LINK_COPIED = 'Link copied to clipboard!';
export const NOTIFICATION_LEVEL_SAVED = 'Level saved!';

// =============================================================================
// PigJatin Configuration
// =============================================================================

// Allowed functions in PigJatin
export const PIGJATIN_STATEMENT_FUNCTIONS = ['move', 'turnLeft', 'turnRight'];
export const PIGJATIN_EXPRESSION_FUNCTIONS = ['isRed', 'isBlue', 'isGreen'];

// Python indentation for transpiled code
export const PIGJATIN_INDENT = '    '; // 4 spaces

// Tab replacement in student code
export const TAB_REPLACEMENT = '    '; // 4 spaces
