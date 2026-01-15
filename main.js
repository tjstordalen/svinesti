import * as PigJatin from "./PigJatin/PigJatin.js";
import * as Editor from "./editor.js";

// Set to false to disable splash screen for faster debugging
const ENABLE_SPLASH_SCREEN = false;

// --- UI elements ---

const gid = (id) => document.getElementById(id);
const ui = {
    grid:			gid("grid"),
    codeInput:		gid("code-input"),
    codeOutput:		gid("code-output"),
    levelList:		gid("level-list"),
    btn2:		gid("btn2"),
    btn3:		gid("btn3"),
    speedSlider:	gid("playback-speed"),
    btnPlay:		gid("btn-play"),
    btnPause:		gid("btn-pause"),
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

// --- Status machine ---

const STATUS = {
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
    return document.querySelector('input[name="language-choice"]:checked').value;
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

// TODO: can't this more easily be done using a css transformation?
let notificationTimeout = null;
function showReadOnlyNotification() {
    // Clear any existing timeout
    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
    }

    // Show notification
    ui.readOnlyNotification.classList.add("show");

    // Hide after 2 seconds
    notificationTimeout = setTimeout(() => {
        ui.readOnlyNotification.classList.remove("show");
        notificationTimeout = null;
    }, 2000);
}

// TODO: Provide a numbered list of all the occurrences of "agent" across all files and ask for confirmation before replacing them with "pig" across the board. 

// --- Board rendering ---

// Direction 0 is right, 1 is down, 2 is left, 3 is up
// Idle frame for each direction
const AGENT_DIRS = ["pigs/right-1.png", "pigs/down-1.png", "pigs/left-1.png", "pigs/up-1.png"];

// TODO: move this to svinesti.py, so that the direction name is included directly in the message move message. Then delete this line from main.js
// Direction names for walking animation classes
const DIR_NAMES = ["right", "down", "left", "up"];

// Keyframe definitions for Web Animations API
const WALK_KEYFRAMES = {
    right: [
        { backgroundImage: 'url("pigs/right-1.png")' },
        { backgroundImage: 'url("pigs/right-2.png")' },
        { backgroundImage: 'url("pigs/right-3.png")' },
        { backgroundImage: 'url("pigs/right-2.png")' },
        { backgroundImage: 'url("pigs/right-1.png")' }
    ],
    down: [
        { backgroundImage: 'url("pigs/down-1.png")' },
        { backgroundImage: 'url("pigs/down-2.png")' },
        { backgroundImage: 'url("pigs/down-3.png")' },
        { backgroundImage: 'url("pigs/down-2.png")' },
        { backgroundImage: 'url("pigs/down-1.png")' }
    ],
    left: [
        { backgroundImage: 'url("pigs/left-1.png")' },
        { backgroundImage: 'url("pigs/left-2.png")' },
        { backgroundImage: 'url("pigs/left-3.png")' },
        { backgroundImage: 'url("pigs/left-2.png")' },
        { backgroundImage: 'url("pigs/left-1.png")' }
    ],
    up: [
        { backgroundImage: 'url("pigs/up-1.png")' },
        { backgroundImage: 'url("pigs/up-2.png")' },
        { backgroundImage: 'url("pigs/up-3.png")' },
        { backgroundImage: 'url("pigs/up-2.png")' },
        { backgroundImage: 'url("pigs/up-1.png")' }
    ]
};

const HOP_UP_KEYFRAMES = [
    { transform: 'translateY(0) scale(0.97, 1.03)', offset: 0 },
    { transform: 'translateY(-3%) scale(1.01, 0.99)', offset: 1 }
];

const HOP_DOWN_KEYFRAMES = [
    { transform: 'translateY(-3%) scale(1.01, 0.99)', offset: 0 },
    { transform: 'translateY(0) scale(0.95, 1.05)', offset: 0.25 },
    { transform: 'translateY(0) scale(1, 1)', offset: 0.30 },
    { transform: 'translateY(0) scale(1, 1)', offset: 1 }
];

const HUD_FLASH_KEYFRAMES = [
    { opacity: 0, offset: 0 },
    { opacity: 1, offset: 0.15 },
    { opacity: 1, offset: 0.85 },
    { opacity: 0, offset: 1 }
];

// Animation speed multipliers (from CSS variables)
const MOVE_MULTIPLIER = 2;
const TURN_MULTIPLIER = 1.5;
const HUD_MULTIPLIER = 3;
const WALK_CYCLES = 2;

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

function move(row, col) {
    setCssVariable("--agent-row", row);
    setCssVariable("--agent-col", col);
    updateAgentEdgeClasses(row, col);
}

function turn(direction) {
    ui.agent.style.backgroundImage = `url("${AGENT_DIRS[direction]}")`;
}

function loadLevel(level) {
    if (level === null) return;

	const classLists = {
		".": "empty",
		"r": "red",
		"g": "green",
		"b": "blue",
		"R": "red target",
		"G": "green target",
		"B": "blue target",
	};

    ui.grid.innerHTML = "";

    setCssVariable("--grid-n-rows", level.nRows);
    setCssVariable("--grid-n-cols", level.nCols);

    const cells = level.grid.join("");
    for (let c of cells) {
        const div = document.createElement("div");
        div.className = "game-tile " + classLists[c];
        ui.grid.appendChild(div);
    }

	// The pig needs to be added to the top left grid cell for
	// the CSS animations to work correctly.
    ui.grid.firstElementChild.appendChild(ui.agent);
	const [row,col] = level.start;
	move(row,col);
	turn(level.dir)
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
                // No animation - continue immediately
                break;

            case "move":
                move(msg.pos[0], msg.pos[1]);

                // Animate walking
                const walkDuration = getAnimSpeed() * MOVE_MULTIPLIER / WALK_CYCLES;
                state.currentAnimation = ui.agent.animate(
                    WALK_KEYFRAMES[DIR_NAMES[msg.dir]],
                    { duration: walkDuration, easing: 'steps(4)', iterations: WALK_CYCLES }
                );
                await state.currentAnimation.finished;
                state.currentAnimation = null;
                break;

            case "turn":
                // Phase 1: hop up
                const hopUpDuration = getAnimSpeed() * TURN_MULTIPLIER * 0.33;
                state.currentAnimation = ui.agent.animate(HOP_UP_KEYFRAMES, {
                    duration: hopUpDuration,
                    easing: 'ease-out',
                    fill: 'forwards'
                });
                await state.currentAnimation.finished;

                // Swap image at peak
                ui.agent.style.backgroundImage = `url("${AGENT_DIRS[msg.dir]}")`;

                // Phase 2: hop down
                const hopDownDuration = getAnimSpeed() * TURN_MULTIPLIER * 0.66;
                state.currentAnimation = ui.agent.animate(HOP_DOWN_KEYFRAMES, {
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
                state.currentAnimation = ui.colorComparison.animate(HUD_FLASH_KEYFRAMES, {
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
    // Cancel any running animation to ensure clean visual state
    if (state.currentAnimation) {
        state.currentAnimation.cancel();
        state.currentAnimation = null;
    }

    state.playback.status = "idle";
    state.playback.trace = null;
    state.playback.index = 0;
    syncUI();
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

/*
  click a level in the list: store the current code, load the new level, load the new code
  click a language tab: store existing code, load new code. 
  slide the animation speed: update the var in css
  slide the font size: update font size
  type in the editor: store the code. Or maybe when it loses focus? 
  
  idle:
      play: run the code on the selected level -> playing
	  step: run the code on the selected level, one step -> paused
	  reset: reload the selected level. We do not need to save the trace, we can just re-run the code. 
  paused:
      play: run the code -> playing
	  step: make another step, no state change.
	  reset: reload the selected level. 
  playing: 
      play: pause -> paused
	  step: pause -> paused
	  reset: reload the selected level. 


	running the code: listening to animationend events and autostepping. (I think I do need to handle animationcanel btw)
	stepping the code: just make one step, but don't autostep (disable the listener?)
	
 * */


// --- Worker management ---

function hideSplashScreen() {
    if (!ENABLE_SPLASH_SCREEN || !ui.splashScreen) return;

    ui.splashScreen.classList.add("fade-out");
    setTimeout(() => {
        ui.splashScreen.style.display = "none";
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

function switchLanguage() {
    const currentLang = selectedLanguage();
    const otherLang = currentLang === "python" ? "java" : "python";
    storeCode(otherLang);
    loadCode(currentLang);
    const mode = currentLang === "java" ? "text/x-java" : "python";
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

// Hide splash screen immediately if disabled
if (!ENABLE_SPLASH_SCREEN && ui.splashScreen) {
    ui.splashScreen.style.display = "none";
}

initWorker();
syncUI(); // Initialize button states

// Set up button handlers (no branching - visibility toggled by CSS)
ui.btnPlay.onclick = submitCode;
ui.btnPause.onclick = pause;
ui.btn2.onclick = () => {
    if (state.playback.status === "idle") {
        state.isSingleStepping = true;
        submitCode();
    } else if (state.playback.status === "playing") {
        pause();
        step();
    } else {
        step();
    }
};
ui.btn3.onclick = playbackStop;

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

ui.speedSlider.addEventListener("input", () => {
    setCssVariable("--animation-speed", `${ui.speedSlider.max - ui.speedSlider.value}ms`);
});

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
    if (event.ctrlKey && event.key === "Enter") {
        submitCode();
        return;
    }

    // Toggle help
    if (event.key === "?") {
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
});

document.addEventListener("change", (e) => {
    if (e.target.type === "radio" && e.target.name === "language-choice") {
        switchLanguage();
    }
});

ui.sidebarToggle.onclick = () => {
    ui.sidebar.classList.toggle("collapsed");
};

// Help modal handlers
ui.helpButton.onclick = showHelp;
ui.helpClose.onclick = hideHelp;
ui.helpOverlay.onclick = hideHelp;

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

    // Enter edit mode with current level
    Editor.enterEditMode(state.level);
};

// Run PigJatin tests
PigJatin.loadTestCases("./PigJatin/testcases.txt").then(PigJatin.runTests);
