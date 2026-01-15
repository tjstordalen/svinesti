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
    CELEBRATE: [
        { transform: 'translateY(0) scale(1, 1)', offset: 0 },
        { transform: 'translateY(-40px) scale(1.05, 0.95)', offset: 0.25 },
        { transform: 'translateY(0) scale(0.95, 1.05)', offset: 0.4 },
        { transform: 'translateY(-30px) scale(1.03, 0.97)', offset: 0.6 },
        { transform: 'translateY(0) scale(0.97, 1.03)', offset: 0.75 },
        { transform: 'translateY(-15px) scale(1.02, 0.98)', offset: 0.9 },
        { transform: 'translateY(0) scale(1, 1)', offset: 1 },
    ],
    SHAKE: [
        { transform: 'translate(0, 0)', offset: 0 },
        { transform: 'translate(-8px, 4px)', offset: 0.1 },
        { transform: 'translate(8px, -4px)', offset: 0.2 },
        { transform: 'translate(-8px, -4px)', offset: 0.3 },
        { transform: 'translate(8px, 4px)', offset: 0.4 },
        { transform: 'translate(-8px, 4px)', offset: 0.5 },
        { transform: 'translate(8px, -4px)', offset: 0.6 },
        { transform: 'translate(-8px, -4px)', offset: 0.7 },
        { transform: 'translate(8px, 4px)', offset: 0.8 },
        { transform: 'translate(-4px, 2px)', offset: 0.9 },
        { transform: 'translate(0, 0)', offset: 1 },
    ],
};

// Animation speed multipliers
export const MOVE_MULTIPLIER = 2;
export const TURN_MULTIPLIER = 1.5;
export const HUD_MULTIPLIER = 3;
export const WALK_CYCLES = 2;
