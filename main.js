import * as PigJatin from "./PigJatin/PigJatin.js";
import * as Editor from "./editor.js";
import {
    ENABLE_SPLASH_SCREEN,
    STATUS,
    TILE_CLASSES,
    KEYFRAMES,
    MOVE_MULTIPLIER,
    TURN_MULTIPLIER,
    HUD_MULTIPLIER,
    WALK_CYCLES,
    pigSpriteUrl,
} from "./constants.js";

// --- UI elements ---

const gid = (id) => document.getElementById(id);
const ui = {
    grid:			gid("grid"),
    codeInput:		gid("code-input"),
    codeOutput:		gid("code-output"),
    levelList:		gid("level-list"),
    btn1:		gid("btn1"),
    btn2:		gid("btn2"),
    btn3:		gid("btn3"),
    speedSlider:	gid("playback-speed"),
    fontSizeSlider: gid("editor-font-size-slider"),
    sidebar:        gid("sidebar"),
    sidebarToggle:  gid("sidebar-toggle"),
    splashScreen:   gid("splash-screen"),
    readOnlyNotification: gid("editor-readonly-notification"),
    helpButton:     gid("help-button"),
    helpModal:      gid("help-modal"),
    helpClose:      gid("help-close"),
    helpOverlay:    document.querySelector(".help-overlay"),
    modePlay:       gid("mode-play"),
    modeEdit:       gid("mode-edit"),
    langPython:     gid("select-lang-python"),
    langJava:       gid("select-lang-java"),
    editor: CodeMirror.fromTextArea(gid("code-input"), {
        lineNumbers: true,
        lineWrapping: true,
        mode: "python",
        theme: "default"
    }),
    agent: gid("agent"),
    colorComparison: gid("color-comparison-hud"),
    comparisonTile: gid("comparison-tile"),
    comparisonAnswer: gid("comparison-answer"),
    playbackToolbar: document.querySelector(".playback-toolbar"),
};

// --- State ---

const state = {
    level: null,
    worker: null,
    workerTimeout: null,
    isSingleStepping: false, // Flag to indicate single-step execution mode
    currentAnimation: null, // Track running animation for cancel on stop
    focusedElementBeforeHelp: null, // Track which element to refocus after help closes
    playback: {
        status: "idle", // "idle" | "playing" | "paused"
        trace: null,
        index: 0,
    },
};

function syncUI() {
    const s = STATUS[state.playback.status];
    ui.playbackToolbar.className = `playback-toolbar ${state.playback.status}`;
    ui.editor.setOption("readOnly", s.editorReadOnly);
}

function pause() {
    state.playback.status = "paused";
    syncUI();
}

// --- Utilities ---

function setCssVariable(id, val) {
    document.documentElement.style.setProperty(id, val.toString());
}

function selectedLanguage() {
    return document.querySelector('.lang-btn.active').dataset.lang;
}

/**
 * Gets current animation base speed from slider (in milliseconds)
 */
function getAnimSpeed() {
    return ui.speedSlider.max - ui.speedSlider.value;
}

function showHelp() {
    // Save currently focused element to restore later
    state.focusedElementBeforeHelp = document.activeElement;
    // Blur editor if it has focus
    if (ui.editor.hasFocus()) {
        ui.editor.getInputField().blur();
    }
    ui.helpModal.classList.add("show");
}

function hideHelp() {
    ui.helpModal.classList.remove("show");
    // Restore focus to previously focused element
    if (state.focusedElementBeforeHelp && state.focusedElementBeforeHelp.focus) {
        state.focusedElementBeforeHelp.focus();
        state.focusedElementBeforeHelp = null;
    }
}

let notificationTimeout = null;
const NOTIFICATION_CLICK = "Click to pause and edit code";
const NOTIFICATION_KEY = "Press i again to pause and edit code";

let lastEditorIPress = 0;  // Timestamp for double-tap i detection

function showReadOnlyNotification(message = NOTIFICATION_CLICK) {
    // Clear any existing timeout
    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
    }

    // Set message and show notification
    ui.readOnlyNotification.textContent = message;
    ui.readOnlyNotification.classList.add("show");

    // Hide after 2 seconds
    notificationTimeout = setTimeout(() => {
        ui.readOnlyNotification.classList.remove("show");
        notificationTimeout = null;
    }, 2000);
}

// --- Shortcut settings ---

const SHORTCUTS_STORAGE_KEY = 'svinesti-shortcuts';
const DEFAULT_SHORTCUTS = {
    'ctrl+enter': false,
    'h': false,
    'j': false,
    'k': false,
    'i': false,
    'ii': false,
    '?': true,  // Always enabled, cannot be disabled
};

let shortcutSettings = loadShortcutSettings();

function loadShortcutSettings() {
    try {
        const saved = localStorage.getItem(SHORTCUTS_STORAGE_KEY);
        if (saved) {
            return { ...DEFAULT_SHORTCUTS, ...JSON.parse(saved) };
        }
    } catch (e) {}
    return { ...DEFAULT_SHORTCUTS };
}

function saveShortcutSettings() {
    localStorage.setItem(SHORTCUTS_STORAGE_KEY, JSON.stringify(shortcutSettings));
}

function isShortcutEnabled(key) {
    return shortcutSettings[key] !== false;
}

function toggleShortcut(key) {
    if (key === '?') return;  // Cannot disable help shortcut
    shortcutSettings[key] = !shortcutSettings[key];
    saveShortcutSettings();
    updateShortcutUI();
}

function setAllShortcuts(enabled) {
    for (const key in shortcutSettings) {
        if (key !== '?') shortcutSettings[key] = enabled;
    }
    saveShortcutSettings();
    updateShortcutUI();
}

function updateShortcutUI() {
    const list = document.getElementById('shortcuts-list');
    const masterToggle = document.getElementById('shortcuts-enabled');
    if (!list || !masterToggle) return;

    // Update individual shortcuts (? is always enabled)
    list.querySelectorAll('li[data-shortcut]').forEach(li => {
        const key = li.dataset.shortcut;
        if (key === '?') return;
        li.classList.toggle('disabled', !shortcutSettings[key]);
    });

    // Update master toggle (checked if ANY toggleable shortcut is enabled)
    const anyEnabled = Object.entries(shortcutSettings)
        .filter(([key]) => key !== '?')
        .some(([, v]) => v);
    masterToggle.checked = anyEnabled;
}

function initShortcutToggles() {
    const list = document.getElementById('shortcuts-list');
    const masterToggle = document.getElementById('shortcuts-enabled');
    if (!list || !masterToggle) return;

    // Click on individual shortcut to toggle (except ?)
    list.querySelectorAll('li[data-shortcut]').forEach(li => {
        if (li.dataset.shortcut === '?') {
            li.style.cursor = 'default';
            return;
        }
        li.addEventListener('click', () => {
            toggleShortcut(li.dataset.shortcut);
        });
    });

    // Master toggle
    masterToggle.addEventListener('change', () => {
        setAllShortcuts(masterToggle.checked);
    });

    // Initialize UI state
    updateShortcutUI();
}

function isNotificationShowing() {
    return ui.readOnlyNotification.classList.contains("show");
}

// TODO: Provide a numbered list of all the occurrences of "agent" across all files and ask for confirmation before replacing them with "pig" across the board. 

// --- Board rendering ---

function updateAgentEdgeClasses(row, col) {
    const nCols = state.level.nCols;

    // Remove edge class
    ui.agent.classList.remove('near-right-edge');

    // Flip to left when there aren't 2 full tiles to the right
    // (HUD is 200% wide, needs 2 tiles of space)
    if (col >= nCols - 2) {
        ui.agent.classList.add('near-right-edge');
    }
}

function getPigCell(row, col) {
    return ui.grid.children[row * state.level.nCols + col];
}

function placePig(row, col) {
    const cell = getPigCell(row, col);
    cell.appendChild(ui.agent);
    updateAgentEdgeClasses(row, col);
}

async function moveAnimated(toRow, toCol) {
    const fromRect = ui.agent.getBoundingClientRect();
    const toCell = getPigCell(toRow, toCol);
    const toRect = toCell.getBoundingClientRect();

    const dx = toRect.left - fromRect.left;
    const dy = toRect.top - fromRect.top;

    // Animate movement
    const animate = ui.agent.animate([
        { translate: '0 0' },
        { translate: `${dx}px ${dy}px` }
    ], {
        duration: getAnimSpeed() * MOVE_MULTIPLIER,
        easing: 'ease-out',
        fill: 'forwards'
    });

    await animate.finished;
    animate.cancel(); // Clear the animation so translate resets

    // Move to actual cell
    placePig(toRow, toCol);
}

function turn(direction) {
    ui.agent.style.backgroundImage = pigSpriteUrl(direction);
}

function loadLevel(level) {
    if (level === null) return;

    ui.grid.innerHTML = "";

    setCssVariable("--grid-n-rows", level.nRows);
    setCssVariable("--grid-n-cols", level.nCols);

    const cells = level.grid.join("");
    for (let c of cells) {
        const div = document.createElement("div");
        div.className = "game-tile " + TILE_CLASSES[c];
        ui.grid.appendChild(div);
    }

	const [row, col] = level.start;
	placePig(row, col);
	turn(level.dir);
}

// --- Code storage ---

function storeCode() {
    if (!state.level) return;
    const key = state.level.name + selectedLanguage();
    localStorage.setItem(key, ui.editor.getValue());
}

function loadCode() {
    if (!state.level) return;
    const key = state.level.name + selectedLanguage();
    const code = localStorage.getItem(key) ?? "";
    ui.editor.setValue(code);
}

// --- Playback ---


async function step() {
    if (state.playback.status === "idle") return;

    const msg = state.playback.trace[state.playback.index++];
    if (!msg) return;

    try {
        switch (msg.type) {
            case "lineExecuted":
                const lineno = msg.lineno - 1;
                for (let i = 0; i < ui.editor.lineCount(); i++) {
                    if (i === lineno) ui.editor.addLineClass(i, "background", "highlighted-line");
                    else ui.editor.removeLineClass(i, "background", "highlighted-line");
                }
                // Continue immediately to next trace event (skip pause for line highlights)
                step();
                return;

            case "move":
                // Run walk animation and movement in parallel
                const walkDuration = getAnimSpeed() * MOVE_MULTIPLIER / WALK_CYCLES;
                state.currentAnimation = ui.agent.animate(
                    KEYFRAMES.WALK[msg.dir],
                    { duration: walkDuration, easing: 'steps(4)', iterations: WALK_CYCLES }
                );

                await moveAnimated(msg.pos[0], msg.pos[1]);
                state.currentAnimation = null;
                break;

            case "turn":
                // Phase 1: hop up
                const hopUpDuration = getAnimSpeed() * TURN_MULTIPLIER * 0.33;
                state.currentAnimation = ui.agent.animate(KEYFRAMES.HOP_UP, {
                    duration: hopUpDuration,
                    easing: 'ease-out',
                    fill: 'forwards'
                });
                await state.currentAnimation.finished;

                // Swap image at peak
                ui.agent.style.backgroundImage = pigSpriteUrl(msg.dir);

                // Phase 2: hop down
                const hopDownDuration = getAnimSpeed() * TURN_MULTIPLIER * 0.66;
                state.currentAnimation = ui.agent.animate(KEYFRAMES.HOP_DOWN, {
                    duration: hopDownDuration,
                    easing: 'ease-in',
                    fill: 'forwards'
                });
                await state.currentAnimation.finished;

                // Reset transform
                ui.agent.style.transform = '';
                state.currentAnimation = null;
                break;

            case "isColor":
                ui.comparisonTile.className = 'game-tile ' + msg.color.toLowerCase();
                ui.comparisonAnswer.textContent = msg.result ? 'yes' : 'no';

                const hudDuration = getAnimSpeed() * HUD_MULTIPLIER;
                state.currentAnimation = ui.colorComparison.animate(KEYFRAMES.HUD_FLASH, {
                    duration: hudDuration,
                    easing: 'ease-in-out'
                });
                await state.currentAnimation.finished;
                state.currentAnimation = null;
                break;

            case "collected":
                const [r, c] = msg.pos;
                const index = state.level.nCols * r + c;
                ui.grid.children[index].classList.remove("target");
                // No animation - continue immediately
                break;

            case "gameover":
                console.log("GAME OVER! YOU", msg.win ? "WIN" : "LOSE");
                playbackStop();
                return;
        }
    } catch (e) {
        // Animation was cancelled (user paused/stopped)
        if (e.name === 'AbortError') return;
        throw e;
    }

    // Continue playback chain
    if (state.playback.status === "playing") {
        step(); // Don't await - let it run asynchronously
    }
}

function playbackInit(trace, singleStep = false) {
    state.playback.index = 0;
    state.playback.trace = trace;

    loadLevel(state.level);

    // Check if we should start in paused mode (for single-stepping)
    if (singleStep) {
        state.playback.status = "paused";
        syncUI();
    } else {
        state.playback.status = "playing";
        syncUI();
        step(); // Kick off the chain - animationend events continue it
    }
}

function playbackStop() {
    // Cancel ALL animations on the pig (walk + translate can run in parallel)
    ui.agent.getAnimations().forEach(a => a.cancel());
    state.currentAnimation = null;

    state.playback.status = "idle";
    state.playback.trace = null;
    state.playback.index = 0;
    syncUI();

    // Clear line highlighting
    for (let i = 0; i < ui.editor.lineCount(); i++) {
        ui.editor.removeLineClass(i, "background", "highlighted-line");
    }

    // Reset the board to initial state
    loadLevel(state.level);
}

function playbackResume() {
    if (state.playback.status === "paused") {
        state.playback.status = "playing";
        syncUI();
        step(); // Kick off the chain - animationend events continue it
        return true;
    }
    return false;
}

// State-dependent behavior for playback controls
const BEHAVIOR = {
    idle: {
        btn1: () => submitCode(),
        btn2: () => { state.isSingleStepping = true; submitCode(); },
        btn3: () => playbackStop(),
    },
    playing: {
        btn1: () => pause(),
        btn2: () => { pause(); step(); },
        btn3: () => playbackStop(),
    },
    paused: {
        btn1: () => playbackResume(),
        btn2: () => step(),
        btn3: () => playbackStop(),
    },
};

function dispatch(action) {
    BEHAVIOR[state.playback.status][action]();
}


// --- Worker management ---

function hideSplashScreen() {
    if (!ENABLE_SPLASH_SCREEN || !ui.splashScreen) return;

    ui.splashScreen.classList.add("fade-out");
    setTimeout(() => {
        ui.splashScreen.style.display = "none";
        showHelp();
    }, 500); // Match CSS transition duration
}

function initWorker() {
    playbackStop();

    console.log("Initializing worker");
    if (state.worker) state.worker.terminate();

    state.worker = new Worker("worker.js");
    state.worker.onmessage = (event) => {
        if (event.data.type === "ready") {
            // Hide splash screen when worker is ready (after minimum 1.5s)
            setTimeout(() => {
                hideSplashScreen();
            }, 1500);
        } else if (event.data.type === "execution-trace") {
            playbackInit(event.data.trace, state.isSingleStepping);
            state.isSingleStepping = false;
        } else if (event.data.type === "execution-failed") {
            ui.codeOutput.textContent = event.data.errorMessage;
            ui.codeOutput.scrollTop = ui.codeOutput.scrollHeight;
        }
        clearTimeout(state.workerTimeout);
    };
}

// --- Actions ---

function selectLevel(level) {
    playbackStop();
    storeCode();
    state.level = level;
    loadCode();
    loadLevel(level);
    ui.codeOutput.textContent = "";
}

function switchLanguage(newLang) {
    const currentLang = selectedLanguage();
    if (currentLang === newLang) return;

    storeCode();

    // Toggle active state
    ui.langPython.classList.toggle('active', newLang === 'python');
    ui.langJava.classList.toggle('active', newLang === 'java');

    loadCode();
    const mode = newLang === "java" ? "text/x-java" : "python";
    ui.editor.setOption("mode", mode);
}

function submitCode() {
    if (playbackResume()) return;

    ui.codeOutput.textContent = "";
    let program = ui.editor.getValue();

    if (selectedLanguage() === "java") {
        const [success, error, code] = PigJatin.generatePythonCode(program);
        if (!success) {
            ui.codeOutput.textContent = error.msg;
            ui.codeOutput.scrollTop = ui.codeOutput.scrollHeight;
            return;
        }
        program = code;
    }

    state.worker.postMessage({
        code: program,
        level: JSON.stringify(state.level)
    });

    state.workerTimeout = setTimeout(initWorker, 1000);
}

// --- Initialize ---

// Hide splash screen immediately if disabled, show help
if (!ENABLE_SPLASH_SCREEN && ui.splashScreen) {
    ui.splashScreen.style.display = "none";
    showHelp();
}

initWorker();
syncUI(); // Initialize button states

// Initialize font size from slider
ui.editor.getWrapperElement().style.fontSize = ui.fontSizeSlider.value + "px";

// Set up button handlers
ui.btn1.onclick = () => dispatch("btn1");
ui.btn2.onclick = () => dispatch("btn2");
ui.btn3.onclick = () => dispatch("btn3");

// Prepare levels: if the starting position has a star (uppercase letter),
// convert it to just the tile (lowercase) so the pig doesn't start on a star.
for (let lvl of levels) {
    const [r, c] = lvl.start;
    const row = lvl.grid[r].split("");
    row[c] = row[c].toLowerCase() || row[c];
    lvl.grid[r] = row.join("");
}

// Build level list
for (let lvl of levels) {
    const item = document.createElement("li");
    const btn = document.createElement("button");
    item.appendChild(btn);
    btn.textContent = lvl.name;
    ui.levelList.appendChild(item);

    btn.addEventListener("click", () => {
        selectLevel(lvl);
        ui.levelList.querySelectorAll("li button").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
    });
}

// Select first level
ui.levelList.querySelector("li button").click();

// --- Event handlers ---

ui.readOnlyNotification.onclick = () => {
    if (state.playback.status === "playing") {
        pause();
        ui.readOnlyNotification.classList.remove("show");
    }
};

ui.fontSizeSlider.addEventListener("input", (e) => {
    ui.editor.getWrapperElement().style.fontSize = e.target.value + "px";
});

ui.editor.on("change", () => {
    storeCode();

    // If paused and user edits code, automatically reset
    if (state.playback.status === "paused") {
        playbackStop();
    }
});

// Show notification when trying to interact with read-only editor
ui.editor.on("mousedown", (cm, event) => {
    if (cm.getOption("readOnly")) {
        showReadOnlyNotification();
    }
});

ui.editor.on("keydown", (cm, event) => {
    if (cm.getOption("readOnly")) {
        showReadOnlyNotification();
    }
});

document.addEventListener("keydown", (event) => {
    // Run code
    if (event.ctrlKey && event.key === "Enter" && isShortcutEnabled('ctrl+enter')) {
        submitCode();
        return;
    }

    // Toggle help
    if (event.key === "?" && isShortcutEnabled('?')) {
        event.preventDefault();
        if (ui.helpModal.classList.contains("show")) {
            hideHelp();
        } else {
            showHelp();
        }
        return;
    }

    // Close help with Escape (undocumented)
    if (event.key === "Escape" && ui.helpModal.classList.contains("show")) {
        event.preventDefault();
        hideHelp();
        return;
    }

    // Playback shortcuts (only when not typing in editor)
    if (!ui.editor.hasFocus()) {
        // i = focus editor
        if (event.key === "i" && isShortcutEnabled('i')) {
            event.preventDefault();
            if (ui.editor.getOption("readOnly")) {
                if (isNotificationShowing()) {
                    // Second press - pause and focus
                    pause();
                    ui.readOnlyNotification.classList.remove("show");
                    ui.editor.focus();
                    ui.editor.setCursor(ui.editor.getCursor());
                } else {
                    // First press - show notification
                    showReadOnlyNotification(NOTIFICATION_KEY);
                }
            } else {
                ui.editor.focus();
                ui.editor.setCursor(ui.editor.getCursor());
            }
            return;
        }

        // h, j, k = btn1, btn2, btn3
        if (event.key === "h" && isShortcutEnabled('h')) { event.preventDefault(); dispatch("btn1"); return; }
        if (event.key === "j" && isShortcutEnabled('j')) { event.preventDefault(); dispatch("btn2"); return; }
        if (event.key === "k" && isShortcutEnabled('k')) { event.preventDefault(); dispatch("btn3"); return; }
    } else {
        // Escape or double-tap i = unfocus editor
        if (event.key === "Escape" && isShortcutEnabled('ii')) {
            event.preventDefault();
            ui.editor.getInputField().blur();
            return;
        }
        if (event.key === "i" && isShortcutEnabled('ii')) {
            const now = Date.now();
            if (now - lastEditorIPress < 300) {
                event.preventDefault();
                // Delete the first 'i' that was typed
                ui.editor.execCommand("delCharBefore");
                ui.editor.getInputField().blur();
                lastEditorIPress = 0;
                return;
            }
            lastEditorIPress = now;
        }
    }
});

// Language button handlers
ui.langPython.onclick = () => switchLanguage('python');
ui.langJava.onclick = () => switchLanguage('java');

ui.sidebarToggle.onclick = () => {
    ui.sidebar.classList.toggle("collapsed");
};

// Help modal handlers
ui.helpButton.onclick = showHelp;
ui.helpClose.onclick = hideHelp;
ui.helpOverlay.onclick = hideHelp;

// Initialize shortcut toggles
initShortcutToggles();

// --- Editor Integration ---

// Initialize editor module
Editor.initEditorUI();

// Build custom levels section in sidebar
function buildCustomLevelsList() {
    // Remove existing custom levels section if present
    const existingSection = document.getElementById("custom-levels-section");
    if (existingSection) {
        existingSection.remove();
    }

    // Only show if there are custom levels
    if (Editor.editorState.customLevels.length === 0) return;

    // Create custom levels section
    const section = document.createElement("div");
    section.id = "custom-levels-section";
    section.innerHTML = `
        <div class="sidebar-header" style="border-top: 1px solid var(--color-border);">
            <h2>Custom Levels</h2>
        </div>
    `;

    const list = document.createElement("ul");
    list.id = "custom-level-list";
    list.className = "level-list";
    list.style.cssText = "list-style: none; margin: 0; padding: 8px;";

    for (const lvl of Editor.editorState.customLevels) {
        const item = document.createElement("li");
        item.style.marginBottom = "4px";

        const btn = document.createElement("button");
        btn.textContent = lvl.name;
        btn.style.cssText = `
            display: flex;
            align-items: center;
            width: 100%;
            padding: 12px 16px;
            border: none;
            border-radius: 6px;
            background: transparent;
            color: var(--color-text);
            font-size: 0.95rem;
            font-weight: 500;
            cursor: pointer;
            text-align: left;
        `;

        btn.addEventListener("click", () => {
            // Exit edit mode if active
            if (Editor.editorState.active) {
                Editor.exitEditMode();
            }
            selectLevel(lvl);
            // Update selection styling
            ui.levelList.querySelectorAll("li button").forEach(b => b.classList.remove("selected"));
            list.querySelectorAll("button").forEach(b => b.classList.remove("selected"));
            btn.classList.add("selected");
        });

        item.appendChild(btn);
        list.appendChild(item);
    }

    section.appendChild(list);
    ui.levelList.parentElement.appendChild(section);
}

// Set callback for when levels are saved
Editor.setOnLevelSaved(() => {
    buildCustomLevelsList();
});

// Build initial custom levels list
buildCustomLevelsList();

// Mode toggle handlers
ui.modePlay.onclick = () => {
    if (!Editor.editorState.active) return;

    const editedLevel = Editor.exitEditMode();
    // Reload the current level (or the edited one if we want to test it)
    loadLevel(state.level);
};

ui.modeEdit.onclick = () => {
    if (Editor.editorState.active) return;

    // Stop any playback
    playbackStop();

    // Enter edit mode with a fresh level
    Editor.enterEditMode();
};

// Run PigJatin tests
PigJatin.loadTestCases("./PigJatin/testcases.txt").then(PigJatin.runTests);
