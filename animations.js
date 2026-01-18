// --- Animation constants ---

const MOVE_MULTIPLIER = 2;
const TURN_MULTIPLIER = 1.5;
const HUD_MULTIPLIER = 3;
const WALK_CYCLES = 2;

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

// Generate confetti fall keyframes with drift and rotation
function makeConfettiKeyframes(drift, rotation) {
    return [
        { opacity: 1, transform: 'translateY(-20px) translateX(0) rotate(0deg)' },
        { opacity: 0.7, transform: `translateY(100vh) translateX(${drift}px) rotate(${rotation}deg)` }
    ];
}

// Keyframe definitions for Web Animations API
const KEYFRAMES = {
    WALK: {
        right: makeWalkKeyframes("right"),
        down: makeWalkKeyframes("down"),
        left: makeWalkKeyframes("left"),
        up: makeWalkKeyframes("up"),
    },
    HOP_UP: [
        { transform: 'translateY(0) scale(0.97, 1.03)', offset: 0 },
        { transform: 'translateY(-3%) scale(1.01, 0.99)', offset: 1 }
    ],
    HOP_DOWN: [
        { transform: 'translateY(-3%) scale(1.01, 0.99)', offset: 0 },
        { transform: 'translateY(0) scale(0.95, 1.05)', offset: 0.25 },
        { transform: 'translateY(0) scale(1, 1)', offset: 0.30 },
        { transform: 'translateY(0) scale(1, 1)', offset: 1 }
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
    NOTIFICATION: [
        { opacity: 0, offset: 0 },
        { opacity: 1, offset: 0.05 },
        { opacity: 1, offset: 0.95 },
        { opacity: 0, offset: 1 },
    ],
};

// --- Animation functions ---

/**
 * Plays the walk sprite animation (legs moving)
 * @param {HTMLElement} pig - The pig element
 * @param {string} direction - Direction of movement
 * @param {number} animSpeed - Base animation speed in ms
 * @returns {Animation} - The animation object
 */
function walk(pig, direction, animSpeed) {
    const walkDuration = animSpeed * MOVE_MULTIPLIER / WALK_CYCLES;
    return pig.animate(
        KEYFRAMES.WALK[direction],
        { duration: walkDuration, easing: 'steps(4)', iterations: WALK_CYCLES }
    );
}

/**
 * Plays the movement animation (translation across grid)
 * @param {HTMLElement} pig - The pig element
 * @param {number} dx - Horizontal distance in pixels
 * @param {number} dy - Vertical distance in pixels
 * @param {number} animSpeed - Base animation speed in ms
 * @returns {Promise<void>}
 */
async function move(pig, dx, dy, animSpeed) {
    const anim = pig.animate([
        { translate: '0 0' },
        { translate: `${dx}px ${dy}px` }
    ], {
        duration: animSpeed * MOVE_MULTIPLIER,
        easing: 'ease-out',
        fill: 'forwards'
    });

    await anim.finished;
    anim.cancel(); // Clear the animation so translate resets
}

/**
 * Plays the turn animation (hop up, swap sprite, hop down)
 * @param {HTMLElement} pig - The pig element
 * @param {string} direction - The new direction to face
 * @param {number} animSpeed - Base animation speed in ms
 * @returns {Promise<void>}
 */
async function turn(pig, direction, animSpeed) {
    // Phase 1: hop up
    const hopUp = pig.animate(KEYFRAMES.HOP_UP, {
        duration: animSpeed * TURN_MULTIPLIER * 0.33,
        easing: 'ease-out',
        fill: 'forwards'
    });
    await hopUp.finished;

    // Swap sprite at peak
    pig.style.backgroundImage = pigSpriteUrl(direction);

    // Phase 2: hop down
    const hopDown = pig.animate(KEYFRAMES.HOP_DOWN, {
        duration: animSpeed * TURN_MULTIPLIER * 0.66,
        easing: 'ease-in',
        fill: 'forwards'
    });
    await hopDown.finished;

    // Reset transform
    pig.style.transform = '';
}

/**
 * Plays the HUD flash animation for color comparison
 * @param {HTMLElement} hud - The color comparison HUD element
 * @param {number} animSpeed - Base animation speed in ms
 * @returns {Promise<void>}
 */
async function hudFlash(hud, animSpeed) {
    const anim = hud.animate(KEYFRAMES.HUD_FLASH, {
        duration: animSpeed * HUD_MULTIPLIER,
        easing: 'ease-in-out'
    });
    await anim.finished;
}

/**
 * Plays the celebrate animation on win
 * @param {HTMLElement} pig - The pig element
 */
function celebrate(pig) {
    confetti(document.getElementById('confetti-container'));
    pig.animate(KEYFRAMES.CELEBRATE, {
        duration: 1500,
        easing: 'ease-out'
    });
}

/**
 * Plays the loss animation (shake grid + pig falls over)
 * @param {HTMLElement} pig - The pig element
 * @param {string} direction - Current direction the pig is facing
 * @param {HTMLElement} gridWrapper - The grid wrapper element (optional)
 */
function lose(pig, direction, gridWrapper) {
    if (gridWrapper) {
        gridWrapper.animate(KEYFRAMES.SHAKE, {
            duration: 600,
            easing: 'ease-out'
        });
    }

    const isLeftRight = direction === 'left' || direction === 'right';
    const rotation = isLeftRight ? 180 : 90;
    const translateY = isLeftRight ? '-50%' : '0';
    const translateX = isLeftRight ? '0' : '30%';

    pig.animate([
        { transform: 'rotate(0deg) translateX(0) translateY(0)' },
        { transform: `rotate(${rotation}deg) translateX(${translateX}) translateY(${translateY})` }
    ], {
        duration: 600,
        easing: 'ease-out',
        fill: 'forwards'
    });
}

// Notification colors
const NOTIFY_COLOR_INFO = 'rgba(90, 145, 120, 0.95)';
const NOTIFY_COLOR_ERROR = 'rgba(180, 80, 80, 0.95)';

/**
 * Shows a notification with fade-in, hold, fade-out animation
 * @param {HTMLElement} element - The notification element
 * @param {string} message - Text to display
 * @param {boolean} isError - Use error styling (red) vs info styling (green)
 * @param {number} duration - Total duration in ms (default 2500)
 * @returns {Animation} - The animation object (can be cancelled)
 */
function notify(element, message, isError = false, duration = 2500) {
    // Cancel any existing animation on this element
    element.getAnimations().forEach(a => a.cancel());

    element.textContent = message;
    element.style.background = isError ? NOTIFY_COLOR_ERROR : NOTIFY_COLOR_INFO;

    return element.animate(KEYFRAMES.NOTIFICATION, {
        duration,
        easing: 'ease-in-out',
    });
}

// Confetti colors
const CONFETTI_COLORS = ['#FF8A8A', '#58E0B8', '#85D0FF', '#FFD700', '#FF6B6B', '#4ECDC4'];

/**
 * Shows win confetti animation
 * @param {HTMLElement} container - The confetti container element
 */
function confetti(container) {
    if (!container) return;

    // Clear any existing confetti
    container.innerHTML = '';

    // Create confetti pieces
    const numPieces = 200;
    for (let i = 0; i < numPieces; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti';

        // Random shape
        const shapes = ['square', 'circle', 'ribbon'];
        piece.classList.add(shapes[Math.floor(Math.random() * shapes.length)]);

        // Random color
        piece.style.backgroundColor = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];

        // Random position
        piece.style.left = Math.random() * 100 + '%';

        // Random animation properties
        const duration = 2 + Math.random() * 2; // 2-4 seconds
        const delay = Math.random() * 0.7; // 0-0.5 seconds
        const drift = (Math.random() - 0.5) * 100; // -50 to 50px
        const rotation = Math.random() * 720 - 360; // -360 to 360 degrees

        piece.animate(makeConfettiKeyframes(drift, rotation), {
            duration: duration * 1000,
            delay: delay * 1000,
            easing: 'linear',
            fill: 'both'
        });

        container.appendChild(piece);
    }

    // Clean up after animation
    setTimeout(() => {
        container.innerHTML = '';
    }, 5000);
}

// --- Exports ---

export const animations = {
    walk,
    move,
    turn,
    hudFlash,
    celebrate,
    lose,
    notify,
};
