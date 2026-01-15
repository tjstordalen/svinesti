// Debug/config
export const ENABLE_SPLASH_SCREEN = false;

// Playback status machine
export const STATUS = {
    idle: {
        editorReadOnly: false,
    },
    playing: {
        editorReadOnly: "nocursor",
    },
    paused: {
        editorReadOnly: false,
    },
};

// Direction names
export const DIR_NAMES = ["right", "down", "left", "up"];

// Map grid characters to CSS classes
export const TILE_CLASSES = {
    ".": "empty",
    "r": "red",
    "g": "green",
    "b": "blue",
    "R": "red target",
    "G": "green target",
    "B": "blue target",
};

// Sprite URL helper
export function pigSpriteUrl(dir, num = 1) {
    return `url("pigs/${dir}-${num}.png")`;
}

// Generate walk keyframes for a direction
function makeWalkKeyframes(dir) {
    return [
        { backgroundImage: pigSpriteUrl(dir, 1) },
        { backgroundImage: pigSpriteUrl(dir, 2) },
        { backgroundImage: pigSpriteUrl(dir, 3) },
        { backgroundImage: pigSpriteUrl(dir, 2) },
        { backgroundImage: pigSpriteUrl(dir, 1) },
    ];
}

// Keyframe definitions for Web Animations API
export const KEYFRAMES = {
    WALK: {
        right: makeWalkKeyframes("right"),
        down: makeWalkKeyframes("down"),
        left: makeWalkKeyframes("left"),
        up: makeWalkKeyframes("up"),
    },
    // Anticipation squash, then rise and stretch horizontally
    HOP_UP: [
        { transform: 'translateY(0) scale(0.97, 1.03)', offset: 0 },   // crouch
        { transform: 'translateY(-3%) scale(1.01, 0.99)', offset: 1 } // airborne
    ],
    // Land with impact squash, then settle to normal
    HOP_DOWN: [
        { transform: 'translateY(-3%) scale(1.01, 0.99)', offset: 0 },    // airborne
        { transform: 'translateY(0) scale(0.95, 1.05)', offset: 0.25 },   // land squash
        { transform: 'translateY(0) scale(1, 1)', offset: 0.30 },         // recover
        { transform: 'translateY(0) scale(1, 1)', offset: 1 }             // hold
    ],
    HUD_FLASH: [
        { opacity: 0, offset: 0 },
        { opacity: 1, offset: 0.15 },
        { opacity: 1, offset: 0.85 },
        { opacity: 0, offset: 1 }
    ],
};

// Animation speed multipliers
export const MOVE_MULTIPLIER = 2;
export const TURN_MULTIPLIER = 1.5;
export const HUD_MULTIPLIER = 3;
export const WALK_CYCLES = 2;
