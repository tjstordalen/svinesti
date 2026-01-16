import * as PigJatin from "./PigJatin/PigJatin.js";
import * as Editor from "./editor.js";
import * as CustomLevels from "./customLevels.js";
import * as Animations from "./animations.js";
import * as Shortcuts from "./shortcuts.js";
import { pigSpriteUrl } from "./animations.js";
import { levels, TILE_CLASSES } from "./levels.js";

const ENABLE_SPLASH_SCREEN = false;

// --- UI elements ---

const gid = (id) => document.getElementById(id);
const ui = {
    grid:			gid("grid"),
    codeInput:		gid("code-input"),
    codeOutput:		gid("code-output"),
    levelList:		gid("level-list"),
    btn1:			gid("btn1"),
    btn2:			gid("btn2"),
    btn3:			gid("btn3"),
    speedSlider:	gid("playback-speed"),
    fontSizeSlider: gid("editor-font-size-slider"),
    sidebar:        gid("sidebar"),
    sidebarToggle:  gid("sidebar-toggle"),
    splashScreen:   gid("splash-screen"),
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
    gameNotification: gid("game-notification"),
};

// --- State ---

const state = {
    level: null,
    worker: null,
    workerTimeout: null,
    isSingleStepping: false, // Flag to indicate single-step execution mode
    focusedElementBeforeHelp: null, // Track which element to refocus after help closes
    currentDirection: null, // Track pig's current direction during playback
    playback: {
        status: "idle", // "idle" | "playing" | "paused"
        trace: null,
        index: 0,
    },
};


function enterIdle(resetBoard = true) {
	// State
	state.playback.status = "idle";
	state.isSingleStepping = false;
	state.playback.trace = null;
	state.playback.index = 0;

	// UI
	ui.playbackToolbar.className = "playback-toolbar idle";
	ui.editor.setOption("readOnly", false);
	ui.btn1.classList.remove("pauseIcon");
	ui.btn1.classList.add("playIcon");

	// Clear line highlighting
	for (let i = 0; i < ui.editor.lineCount(); i++) {
		ui.editor.removeLineClass(i, "background", "highlighted-line");
	}

	// Behavior
	ui.btn1.onclick = () => submitCode();
	ui.btn2.onclick = () => { state.isSingleStepping = true; submitCode(); };
	ui.btn3.onclick = () => enterIdle();

	// TODO: deal with this logic somewhere else. e.g. in the reset button handler, instead of 
	// in the enter idle handler. 
	if (resetBoard) {
		ui.agent.getAnimations().forEach(a => a.cancel());
		loadLevel(state.level);
	}
}

function enterPlaying(newTrace = null) {
	// TODO: deal with the trace setting elsewhere
	// State
	state.playback.status = "playing";
	state.isSingleStepping = false;

	if (newTrace !== null) {
		state.playback.trace = newTrace;
		state.playback.index = 0;
		state.currentDirection = state.level.dir;
		loadLevel(state.level);
	}

	// UI
	ui.playbackToolbar.className = "playback-toolbar playing";
	ui.editor.setOption("readOnly", "nocursor");
	ui.btn1.classList.remove("playIcon");
	ui.btn1.classList.add("pauseIcon");

	// Behavior
	ui.btn1.onclick = () => enterPaused();
	ui.btn2.onclick = () => { enterPaused(); step(); };
	ui.btn3.onclick = () => enterIdle();

	// Start playback
	step();
}

function enterPaused(newTrace = null) {
	// TODO: deal with the trace setting elsewhere
	// State
	state.playback.status = "paused";
	state.isSingleStepping = true;

	if (newTrace !== null) {
		state.playback.trace = newTrace;
		state.playback.index = 0;
		state.currentDirection = state.level.dir;
		loadLevel(state.level);
	}

	// UI
	ui.playbackToolbar.className = "playback-toolbar paused";
	ui.editor.setOption("readOnly", false);
	ui.btn1.classList.remove("pauseIcon");
	ui.btn1.classList.add("playIcon");

	// Behavior
	ui.btn1.onclick = () => enterPlaying();
	ui.btn2.onclick = () => step();
	ui.btn3.onclick = () => enterIdle();
}

// --- Utilities ---

function setCssVariable(id, val) {
    document.documentElement.style.setProperty(id, val.toString());
}

function selectedLanguage() {
    return document.querySelector('.lang-btn.active').dataset.lang;
}

/*
 * Gets current animation base speed from slider (in milliseconds)
 */
// TODO: replace Anim with Animation consistently over all files.
function getAnimSpeed() {
    return ui.speedSlider.max - ui.speedSlider.value;
}

function showHelp() {
    // Save currently focused element to restore later
    state.focusedElementBeforeHelp = document.activeElement;
	// TODO: pause here
    // Blur editor if it has focus
    if (ui.editor.hasFocus()) {
        ui.editor.getInputField().blur();
    }
    ui.helpModal.classList.add("show");
}

function hideHelp() {
	// TODO: unpause if we were playing 
    ui.helpModal.classList.remove("show");
    // Restore focus to previously focused element
    if (state.focusedElementBeforeHelp && state.focusedElementBeforeHelp.focus) {
        state.focusedElementBeforeHelp.focus();
        state.focusedElementBeforeHelp = null;
    }
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

    await Animations.move(ui.agent, dx, dy, getAnimSpeed());

    // Move to actual cell
    placePig(toRow, toCol);
}

function turn(direction) {
    ui.agent.style.backgroundImage = pigSpriteUrl(direction);
}

function loadLevel(level) {
    if (level === null) return;

    // Cancel and reset pig animations/transforms
    ui.agent.getAnimations().forEach(a => a.cancel());
    ui.agent.style.transform = '';

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
                Animations.walk(ui.agent, msg.dir, getAnimSpeed());
                await moveAnimated(msg.pos[0], msg.pos[1]);
                break;

            case "turn":
                await Animations.turn(ui.agent, msg.dir, getAnimSpeed());
                state.currentDirection = msg.dir;
                break;

            case "isColor":
                ui.comparisonTile.className = 'game-tile ' + msg.color.toLowerCase();
                ui.comparisonAnswer.textContent = msg.result ? 'yes' : 'no';
                await Animations.hudFlash(ui.colorComparison, getAnimSpeed());
                break;

            case "collected":
                const [r, c] = msg.pos;
                const index = state.level.nCols * r + c;
                ui.grid.children[index].classList.remove("target");
                // No animation - continue immediately
                break;

            case "gameover":
                console.log("GAME OVER! YOU", msg.win ? "WIN" : "LOSE");
                if (msg.win) {
                    showWinAnimation();
                    Animations.celebrate(ui.agent);
                } else {
                    const gridWrapper = document.getElementById('grid-wrapper');
                    Animations.lose(ui.agent, state.currentDirection, gridWrapper);
                }
                enterIdle(false);
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
    enterIdle();

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
            if (state.isSingleStepping) {
                enterPaused(event.data.trace);
            } else {
                enterPlaying(event.data.trace);
            }
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
    enterIdle();
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
    if (state.playback.status === "paused") {
        enterPlaying();
        return;
    }

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

// Initialize font size from slider
ui.editor.getWrapperElement().style.fontSize = ui.fontSizeSlider.value + "px";

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

ui.fontSizeSlider.addEventListener("input", (e) => {
    ui.editor.getWrapperElement().style.fontSize = e.target.value + "px";
});

ui.editor.on("change", () => {
    storeCode();

    // If paused and user edits code, automatically reset
    if (state.playback.status === "paused") {
        enterIdle();
    }
});

// Show notification when trying to interact with read-only editor
ui.editor.on("mousedown", (cm, event) => {
    if (cm.getOption("readOnly") && state.playback.status === "playing") {
        enterPaused();
        Animations.notify(ui.gameNotification, "Paused to edit code");
    }
});

ui.editor.on("keydown", (cm, event) => {
    if (cm.getOption("readOnly") && state.playback.status === "playing") {
        enterPaused();
        Animations.notify(ui.gameNotification, "Paused to edit code");
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

// --- Editor Integration ---

// Initialize editor module
Editor.initEditorUI();

// Build custom levels section in sidebar
CustomLevels.init(ui, selectLevel);

const CONFETTI_COLORS = ['#FF8A8A', '#58E0B8', '#85D0FF', '#FFD700', '#FF6B6B', '#4ECDC4'];

function showWinAnimation() {
    const container = document.getElementById('confetti-container');
    if (!container) return;

    // Clear any existing confetti
    container.innerHTML = '';

    // Create confetti pieces
    const numPieces = 40;
    for (let i = 0; i < numPieces; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';

        // Random shape
        const shapes = ['square', 'circle', 'ribbon'];
        confetti.classList.add(shapes[Math.floor(Math.random() * shapes.length)]);

        // Random color
        confetti.style.backgroundColor = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];

        // Random position
        confetti.style.left = Math.random() * 100 + '%';

        // Random animation properties
        const duration = 2 + Math.random() * 2; // 2-4 seconds
        const drift = (Math.random() - 0.5) * 100; // -50 to 50px
        const rotation = Math.random() * 720 - 360; // -360 to 360 degrees

        confetti.style.setProperty('--drift', drift + 'px');
        confetti.style.setProperty('--rotation', rotation + 'deg');
        confetti.style.animationDuration = duration + 's';
        confetti.style.animationDelay = Math.random() * 0.5 + 's';

        container.appendChild(confetti);
    }

    // Clean up after animation
    setTimeout(() => {
        container.innerHTML = '';
    }, 5000);
}

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
    enterIdle();

    // Enter edit mode with a fresh level
    Editor.enterEditMode();
};

// Run PigJatin tests
PigJatin.loadTestCases("./PigJatin/testcases.txt").then(PigJatin.runTests);

// --- Shortcuts (new system) ---

function toggleHelp() {
    if (ui.helpModal.classList.contains("show")) {
        hideHelp();
    } else {
        showHelp();
    }
}

Shortcuts.register("toggle-help", "Toggle help", toggleHelp, "?");
Shortcuts.register("run-code", "Run code", submitCode, "ctrl+enter");
Shortcuts.register("play-pause", "Play / Pause", () => ui.btn1.click(), "h");
Shortcuts.register("step", "Step", () => ui.btn2.click(), "j");
Shortcuts.register("reset", "Reset", () => ui.btn3.click(), "k");
Shortcuts.register("focus-editor", "Focus editor", () => {
    if (ui.editor.hasFocus()) return;
    if (ui.editor.getOption("readOnly") && state.playback.status === "playing") {
        enterPaused();
        Animations.notify(ui.gameNotification, "Paused to edit code");
    }
    ui.editor.focus();
    ui.editor.setCursor(ui.editor.getCursor());
}, "i");
Shortcuts.register("escape", "Escape", () => {
    // Close help if open
    if (ui.helpModal.classList.contains("show")) {
        hideHelp();
        return;
    }
    // Unfocus editor if focused
    if (ui.editor.hasFocus()) {
        ui.editor.getInputField().blur();
    }
}, "escape");
Shortcuts.initialize(gid("shortcuts-container"));
