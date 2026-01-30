// config.js - Centralized configuration for Svinesti
//
// This file contains all tweakable constants that future maintainers
// might want to modify. Import what you need from this file.
//
// Organization:
//   1. Timing / Animation
//   2. Colors (JS-only; UI colors in assets/css/variables.css)
//   3. Infinite Loop Detection
//   4. Keyboard Shortcuts
//   5. Storage Keys
//   6. Game Mechanics
//   7. Community
//   8. External Dependencies
//   9. Default Preferences
//  10. Grid Defaults
//  11. Feature Flags
//  12. Text / Messages
//  13. PigJatin Configuration

// =============================================================================
// 1. TIMING / ANIMATION
// =============================================================================

// Gameplay animation multipliers. These are relative to the value on the slider
// that ajudsts playback speed. Modify these values to speed up or slow down
// animations across the board, or to change their speed relative to each other
// (e.g., maybe turns take too long? Then reduce TURN_MULTIPLIER) 
export const MOVE_MULTIPLIER = 2;       // Movement animation duration
export const TURN_MULTIPLIER = 1.5;     // Turn animation duration
export const HUD_MULTIPLIER = 3;        // Color comparison HUD duration
// The number of full cyclings of the walking sprites per move() event
// Must be integer. The higher the number, the faster the pig will move
// its legs. 
export const WALK_CYCLES = 2;           

// Delay multiplier for line highlight. Without this, unanimated code (e.g., 
// x = x + 1) would zoom by in milliseconds. 
export const LINE_PAUSE_MULTIPLIER = 1.5; 

// Fixed animation durations (milliseconds) that do not depend on the speed slider.
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
//
// ┌─────────────────────────────────────────────────────────────────────────┐
// │  To change the app's color scheme, edit: assets/css/variables.css              │
// └─────────────────────────────────────────────────────────────────────────┘
//
// Only JS-specific colors that can't reference CSS variables are defined here.

// Notification colors (used in JS animations)
export const NOTIFY_COLOR_INFO = 'rgba(90, 145, 120, 0.95)';   // sage green
export const NOTIFY_COLOR_ERROR = 'rgba(60, 60, 70, 0.95)';    // dark slate

// Confetti colors (JS-only, not in CSS)
export const CONFETTI_COLORS = [
    '#FF8A8A',  // pink
    '#58E0B8',  // teal
    '#85D0FF',  // blue
    '#FFD700',  // gold
    '#FF6B6B',  // red
    '#4ECDC4',  // cyan
];

// =============================================================================
// 3. INFINITE LOOP DETECTION
// =============================================================================

export const MAX_OPS = 10000; // NOTE: MUST BE MANUALLY UPDATED IN svinesti.py ALSO
// We play the last TIMEOUT_TRACE_REPLAY events when an infinite loop is detected
export const TIMEOUT_TRACE_REPLAY = 100; 
export const TIMEOUT_NOTIFICATION_DURATION = 10000; // ms

// =============================================================================
// 4. KEYBOARD SHORTCUTS
// =============================================================================

// Default key bindings - game mode
export const DEFAULT_SHORTCUTS = {
    playPause: 'h',
    step: 'j',
    reset: 'k',
    runCode: 'ctrl+enter',  // non-rebindable
    help: '?',              // non-rebindable
    closeHelp: 'Escape',
};

// Default key bindings - editor mode
export const DEFAULT_EDITOR_SHORTCUTS = {
    edit: {
        cycleColor:   ' ',
        toggleTarget: 's',
        moveUp:       'arrowup',
        moveDown:     'arrowdown',
        moveLeft:     'arrowleft',
        moveRight:    'arrowright',
        movePig:      'p',
        enterPaint:   'c',
    },
    paint: {
        paste:     ' ',
        moveUp:    'arrowup',
        moveDown:  'arrowdown',
        moveLeft:  'arrowleft',
        moveRight: 'arrowright',
        exitPaint: 'c',
    },
};

// Modifier keys (ignored during rebinding until a non-modifier is pressed)
export const MODIFIER_KEYS = ['Control', 'Alt', 'Shift', 'Meta'];

// Lock icon shake duration (ms)
export const LOCK_SHAKE_DURATION = 300;

// =============================================================================
// 5. STORAGE KEYS
// =============================================================================

export const STORAGE_KEY_SHORTCUTS = 'svinesti-game-shortcuts-v1';
export const STORAGE_KEY_CUSTOM_LEVELS = 'svinesti-custom-levels';
export const STORAGE_KEY_STARRED = 'svinesti-starred';
export const STORAGE_KEY_PREFERENCES = 'svinesti-preferences';
export const STORAGE_KEY_CODE = 'svinesti-code';
export const STORAGE_KEY_SECRETS = 'svinesti-secrets';
export const STORAGE_KEY_EDITOR_EDIT = 'svinesti-editor-edit-v1';
export const STORAGE_KEY_EDITOR_PAINT = 'svinesti-editor-paint-v1';

// =============================================================================
// 6. GAME MECHANICS
// =============================================================================

// Turn direction constants (used by Python too)
export const TURN_LEFT = -1;
export const TURN_RIGHT = 1;

// Editor click cycling order
export const COLOR_CYCLE = ['empty', 'blue', 'green', 'red']; // wraps to empty

// =============================================================================
// 7. COMMUNITY
// =============================================================================

// Community levels server endpoint (Google Apps Script)
export const COMMUNITY_URL = 'https://script.google.com/macros/s/AKfycbx7E3orvYuZP38EOtsprrnSGlYzvLiryftHpLw-SAHKxsqIlL1TdmxsYWhhKIscia5reg/exec';
export const COMMUNITY_REFRESH_INTERVAL = 3 * 60 * 1000;  // 3 minutes
export const COMMUNITY_SHARE_TIMEOUT = 60000;             // Server response wait

// =============================================================================
// 8. EXTERNAL DEPENDENCIES
// =============================================================================

export const PYODIDE_CDN_URL = 'https://cdn.jsdelivr.net/pyodide/v0.28.1/full/pyodide.js';
export const PYODIDE_WORKER_URL = 'https://cdn.jsdelivr.net/pyodide/v0.28.1/full/pyodide.mjs';
export const ANTLR_CDN_URL = 'https://cdn.jsdelivr.net/npm/antlr4@4.13.2/+esm';

// Icons (for JS-generated elements; HTML uses paths directly)
const icon = (name) => `assets/icons/${name}.svg`;
export const ICON = {
    TRASH:   icon('trash3-fill'),
    REFRESH: icon('arrow-counterclockwise'),
    LOCK:    icon('lock'),
};

// =============================================================================
// 9. DEFAULT PREFERENCES
// =============================================================================

export const DEFAULT_PREFERENCES = {
    colorblind: false,
    communityConsent: false,
    showHelpOnStart: true,
    playbackSpeed: 150,
    editorFontSize: 16,
    communityViewMode: 'thumbnails',
};

// =============================================================================
// 10. GRID DEFAULTS
// =============================================================================

export const DEFAULT_GRID_ROWS = 9;
export const DEFAULT_GRID_COLS = 16;

// =============================================================================
// 11. FEATURE FLAGS
// =============================================================================

export const ENABLE_SPLASH_SCREEN = true;
export const SVINESTI_PY_NO_CACHE = false;

// =============================================================================
// 12. TEXT / MESSAGES
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
    'Do you have an <a href="infinite-loop.html" target="_blank">infinite loop</a>?';

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

// Sidebar messages
export const SIDEBAR_LOADING = 'Loading community levels...';
export const SIDEBAR_TRASH_EMPTY = 'Trash is empty';
export const SIDEBAR_NO_COMMUNITY_LEVELS = 'No community levels yet.<br>Share your levels from the Level Creator!';
export const SIDEBAR_SEARCH_PLACEHOLDER = 'Search levels...';
export const SIDEBAR_NO_MATCHES = 'No levels match your search.';
export const SIDEBAR_SERVER_ERROR = 'Could not reach server';
export const SIDEBAR_NO_NEW_LEVELS = 'No new levels';
export const SIDEBAR_ENABLE_COMMUNITY_FIRST = 'Enable Community Levels in Help menu first';

// =============================================================================
// 13. PIGJATIN CONFIGURATION
// =============================================================================

// Allowed functions in PigJatin
export const PIGJATIN_STATEMENT_FUNCTIONS = ['move', 'turnLeft', 'turnRight'];
export const PIGJATIN_EXPRESSION_FUNCTIONS = ['isRed', 'isBlue', 'isGreen'];

// Editor tab/indent size (used by CodeMirror and PigJatin transpiler)
export const EDITOR_TAB_SIZE = 4;
