// animations.js - All game animations using Web Animations API
//
// How Web Animations API works:
//   element.animate(keyframes, options) starts an animation and returns an Animation object.
//   - keyframes: array of style snapshots, browser interpolates between them
//   - options: { duration, easing, iterations, fill, delay }
//   - fill: 'forwards' keeps final state, 'none' (default) reverts to original
//   - The Animation object has .finished (Promise) and .cancel() method
//
// Pattern in this file:
//   - KEYFRAMES object holds reusable keyframe arrays
//   - Animation functions call element.animate() with appropriate keyframes/options
//   - Async functions await animation.finished to sequence multi-part animations
//   - handleAbortException wraps async functions to catch cancellation gracefully

// --- Timing multipliers (relative to base animSpeed from UI slider) ---

const MOVE_MULTIPLIER = 2;    // movement takes 2x base speed
const TURN_MULTIPLIER = 1.5;  // turn takes 1.5x base speed
const HUD_MULTIPLIER = 3;     // HUD flash takes 3x base speed
const WALK_CYCLES = 2;        // number of walk sprite cycles during movement

// --- Sprite helpers ---

/** Returns CSS url() for a pig sprite image */
export function pigSpriteUrl(dir, num = 1) {
    return `url("pigs/${dir}-${num}.png")`;
}

/** Generates walk keyframes: cycles through 3 sprite frames (1→2→3→2→1) */
function makeWalkKeyframes(dir) {
    return [
        { backgroundImage: pigSpriteUrl(dir, 1) },
        { backgroundImage: pigSpriteUrl(dir, 2) },
        { backgroundImage: pigSpriteUrl(dir, 3) },
        { backgroundImage: pigSpriteUrl(dir, 2) },
        { backgroundImage: pigSpriteUrl(dir, 1) },
    ];
}

/** Generates confetti fall keyframes with given drift and rotation (randomized by caller) */
function makeConfettiKeyframes(drift, rotation) {
    return [
        { opacity: 1, transform: 'translateY(-20px) translateX(0) rotate(0deg)' },
        { opacity: 0.7, transform: `translateY(100vh) translateX(${drift}px) rotate(${rotation}deg)` }
    ];
}

// --- Keyframe definitions ---

const KEYFRAMES = {
    // WALK: sprite animation for pig's legs moving while walking
    // Each direction has its own set of 3 sprites
    WALK: {
        right: makeWalkKeyframes("right"),
        down: makeWalkKeyframes("down"),
        left: makeWalkKeyframes("left"),
        up: makeWalkKeyframes("up"),
    },

    // HOP_UP: first phase of turn animation
    // Pig squishes horizontally and hops up slightly
    HOP_UP: [
        { transform: 'translateY(0) scale(0.97, 1.03)', offset: 0 },
        { transform: 'translateY(-3%) scale(1.01, 0.99)', offset: 1 }
    ],

    // HOP_DOWN: second phase of turn animation
    // Pig lands with a slight squash, then returns to normal
    HOP_DOWN: [
        { transform: 'translateY(-3%) scale(1.01, 0.99)', offset: 0 },
        { transform: 'translateY(0) scale(0.95, 1.05)', offset: 0.25 },  // squash on land
        { transform: 'translateY(0) scale(1, 1)', offset: 0.30 },        // settle
        { transform: 'translateY(0) scale(1, 1)', offset: 1 }
    ],

    // HUD_FLASH: color comparison popup fades in, holds, fades out
    HUD_FLASH: [
        { opacity: 0, offset: 0 },
        { opacity: 1, offset: 0.15 },   // quick fade in
        { opacity: 1, offset: 0.85 },   // hold visible
        { opacity: 0, offset: 1 }       // fade out
    ],

    // CELEBRATE: victory bounce - pig jumps with decreasing height
    CELEBRATE: [
        { transform: 'translateY(0) scale(1, 1)', offset: 0 },
        { transform: 'translateY(-40px) scale(1.05, 0.95)', offset: 0.25 },  // big jump
        { transform: 'translateY(0) scale(0.95, 1.05)', offset: 0.4 },       // land squash
        { transform: 'translateY(-30px) scale(1.03, 0.97)', offset: 0.6 },   // medium jump
        { transform: 'translateY(0) scale(0.97, 1.03)', offset: 0.75 },      // land
        { transform: 'translateY(-15px) scale(1.02, 0.98)', offset: 0.9 },   // small jump
        { transform: 'translateY(0) scale(1, 1)', offset: 1 },               // settle
    ],

    // SHAKE: loss animation for grid - rapid back-and-forth movement
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

    // NOTIFICATION: toast message fades in quickly, holds, fades out
    NOTIFICATION: [
        { opacity: 0, offset: 0 },
        { opacity: 1, offset: 0.05 },   // very quick fade in
        { opacity: 1, offset: 0.95 },   // hold
        { opacity: 0, offset: 1 },      // fade out
    ],

    // TIMEOUT_GRID: worker timeout (student code ran too long, likely infinite loop)
    // Grid wobbles with pulsing red glow
    TIMEOUT_GRID: [
        { transform: 'rotate(0deg)', boxShadow: '0 0 40px rgba(255, 80, 80, 0.8)' },
        { transform: 'rotate(2deg)', boxShadow: '0 0 60px rgba(255, 80, 80, 0.8)' },
        { transform: 'rotate(-2deg)', boxShadow: '0 0 60px rgba(255, 80, 80, 0.8)' },
        { transform: 'rotate(0deg)', boxShadow: '0 0 40px rgba(255, 80, 80, 0.8)' }
    ],

    // TIMEOUT_PIG: worker timeout - pig ragdolls around in cell
    // Offset upward since pig sprite sits lower in cell than center
    TIMEOUT_PIG: [
        { transform: 'translate(-15%, -20%) rotate(-20deg)' },
        { transform: 'translate(15%, -15%) rotate(25deg)' },
        { transform: 'translate(10%, 5%) rotate(-15deg)' },
        { transform: 'translate(-10%, 0%) rotate(20deg)' },
        { transform: 'translate(0, -5%) rotate(0deg)' }
    ],
};

// --- Abort handling ---

// Sentinel value returned when animation is cancelled
const ABORT = "abort";

/**
 * Wraps an async animation function to catch AbortError gracefully.
 *
 * When the user clicks pause or reset, we call animation.cancel() to stop
 * any running animations immediately. This causes the browser to reject
 * the animation.finished promise with an AbortError.
 *
 * This wrapper catches that error and returns ABORT instead of throwing,
 * so callers can check for ABORT and exit the playback loop cleanly.
 */
function handleAbortException(fn) {
    return async (...args) => {
        try {
            await fn(...args);
        } catch (e) {
            if (e.name === "AbortError") return ABORT;
            throw e;
        }
    };
}

// --- Helper to get pig's current direction from its CSS class ---

function getDirection(pig) {
    for (const dir of ['right', 'down', 'left', 'up']) {
        if (pig.classList.contains('pig-' + dir)) return dir;
    }
}

// --- Animation functions ---

/**
 * Walk sprite animation - pig's legs move while walking.
 * Runs concurrently with move() - doesn't await, just starts and returns.
 */
function walk(pig, direction, animSpeed) {
    const walkDuration = animSpeed * MOVE_MULTIPLIER / WALK_CYCLES;
    return pig.animate(
        KEYFRAMES.WALK[direction],
        { duration: walkDuration, easing: 'steps(4)', iterations: WALK_CYCLES }
    );
}

/**
 * Movement animation - pig slides from one cell to another.
 * Uses fill:'forwards' to hold position, then cancel() to reset
 * (caller moves pig to new cell in DOM after animation).
 */
async function moveThrowsAbort(pig, dx, dy, animSpeed) {
    const anim = pig.animate([
        { translate: '0 0' },
        { translate: `${dx}px ${dy}px` }
    ], {
        duration: animSpeed * MOVE_MULTIPLIER,
        easing: 'ease-out',
        fill: 'forwards'
    });

    await anim.finished;
    anim.cancel();  // reset translate so DOM position takes over
}

/**
 * Turn animation - pig hops up, swaps sprite at peak, lands with squash.
 * Two-phase animation with sprite swap in between.
 */
async function turnThrowsAbort(pig, direction, animSpeed) {
    // Phase 1: hop up with slight horizontal squish
    const hopUp = pig.animate(KEYFRAMES.HOP_UP, {
        duration: animSpeed * TURN_MULTIPLIER * 0.33,
        easing: 'ease-out',
        fill: 'forwards'
    });
    await hopUp.finished;

    // Swap sprite at peak of hop
    pig.style.backgroundImage = pigSpriteUrl(direction);
    pig.className = 'pig pig-' + direction;

    // Phase 2: land with squash effect
    const hopDown = pig.animate(KEYFRAMES.HOP_DOWN, {
        duration: animSpeed * TURN_MULTIPLIER * 0.66,
        easing: 'ease-in',
        fill: 'forwards'
    });
    await hopDown.finished;

    pig.style.transform = '';  // reset any lingering transform
}

/**
 * HUD flash - shows color comparison result (isRed/isGreen/isBlue).
 * Popup fades in, holds to show result, fades out.
 */
async function hudFlashThrowsAbort(hud, animSpeed) {
    const anim = hud.animate(KEYFRAMES.HUD_FLASH, {
        duration: animSpeed * HUD_MULTIPLIER,
        easing: 'ease-in-out'
    });
    await anim.finished;
}

/**
 * Victory celebration - pig bounces with decreasing height + confetti.
 */
function celebrate(pig) {
    confetti(document.getElementById('confetti-container'));
    pig.animate(KEYFRAMES.CELEBRATE, {
        duration: 1500,
        easing: 'ease-out'
    });
}

// Parameters for pig falling over on loss (direction-dependent)
const DIE_PARAMS = {
    right: { rotation: 180, dx: '0', dy: '-50%' },
    left:  { rotation: 180, dx: '0', dy: '-50%' },
    up:    { rotation: 90, dx: '30%', dy: '0' },
    down:  { rotation: 90, dx: '30%', dy: '0' },
};

/**
 * Loss animation - grid shakes, pig falls over.
 * Pig rotates and translates based on facing direction.
 */
function lose(pig, gridWrapper) {
    if (gridWrapper) {
        gridWrapper.animate(KEYFRAMES.SHAKE, {
            duration: 600,
            easing: 'ease-out'
        });
    }

    const { rotation, dx, dy } = DIE_PARAMS[getDirection(pig)];
    pig.animate([
        { transform: 'rotate(0deg) translateX(0) translateY(0)' },
        { transform: `rotate(${rotation}deg) translateX(${dx}) translateY(${dy})` }
    ], {
        duration: 600,
        easing: 'ease-out',
        fill: 'forwards'  // stay fallen
    });
}

/**
 * Timeout animation - played when worker times out.
 * This happens when student code runs longer than 1 second (likely an infinite loop).
 * Grid wobbles with pulsing red glow, pig ragdolls around in cell.
 */
function timeout(gridWrapper, pig) {
    gridWrapper.animate(KEYFRAMES.TIMEOUT_GRID, {
        duration: 150,
        iterations: 6
    });
    pig.animate(KEYFRAMES.TIMEOUT_PIG, {
        duration: 180,
        iterations: 5,
        easing: 'ease-in-out'
    });
}

// --- Notification ---

const NOTIFY_COLOR_INFO = 'rgba(90, 145, 120, 0.95)';   // green-ish
const NOTIFY_COLOR_ERROR = 'rgba(180, 80, 80, 0.95)';  // red-ish

/**
 * Toast notification - fades in, holds, fades out.
 * Cancels any existing animation on the element first.
 */
function notify(element, message, isError = false, duration = 2500) {
    element.getAnimations().forEach(a => a.cancel());
    element.textContent = message;
    element.style.background = isError ? NOTIFY_COLOR_ERROR : NOTIFY_COLOR_INFO;

    return element.animate(KEYFRAMES.NOTIFICATION, {
        duration,
        easing: 'ease-in-out',
    });
}

// --- Confetti ---

const CONFETTI_COLORS = ['#FF8A8A', '#58E0B8', '#85D0FF', '#FFD700', '#FF6B6B', '#4ECDC4'];

/**
 * Victory confetti - spawns 200 pieces that fall with random drift/rotation.
 * Auto-cleans up after 5 seconds.
 */
function confetti(container) {
    if (!container) return;
    container.innerHTML = '';

    const numPieces = 200;
    for (let i = 0; i < numPieces; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti';

        // Random shape: square, circle, or ribbon
        const shapes = ['square', 'circle', 'ribbon'];
        piece.classList.add(shapes[Math.floor(Math.random() * shapes.length)]);

        // Random color and position
        piece.style.backgroundColor = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
        piece.style.left = Math.random() * 100 + '%';

        // Random fall parameters
        const duration = 2 + Math.random() * 2;         // 2-4 seconds
        const delay = Math.random() * 0.7;              // 0-0.7 seconds
        const drift = (Math.random() - 0.5) * 100;      // -50 to 50px horizontal
        const rotation = Math.random() * 720 - 360;     // -360 to 360 degrees

        piece.animate(makeConfettiKeyframes(drift, rotation), {
            duration: duration * 1000,
            delay: delay * 1000,
            easing: 'linear',
            fill: 'both'
        });

        container.appendChild(piece);
    }

    setTimeout(() => { container.innerHTML = ''; }, 5000);
}

// --- Exports ---

export const animations = {
    ABORT,
    walk,
    move: handleAbortException(moveThrowsAbort),
    turn: handleAbortException(turnThrowsAbort),
    hudFlash: handleAbortException(hudFlashThrowsAbort),
    celebrate,
    lose,
    timeout,
    notify,
};
