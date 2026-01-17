import * as PigJatin from "./PigJatin/PigJatin.js";
import { animations, pigSpriteUrl } from "./animations.js";
import * as Shortcuts from "./shortcuts.js";
import * as Editor from "./editor.js";
import { levels, TILE_CLASSES } from "./levels.js";
import { ui } from "./ui.js";

const ENABLE_SPLASH_SCREEN = false;

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

function setCssVar(name, value) {
    document.documentElement.style.setProperty(name, value.toString());
}

function renderGrid(level) {
    ui.grid.innerHTML = '';
    setCssVar('--grid-n-rows', level.nRows);
    setCssVar('--grid-n-cols', level.nCols);

    const cells = level.grid.join('');
    for (const char of cells) {
        const tile = document.createElement('div');
        tile.className = 'tile ' + TILE_CLASSES[char];
        ui.grid.appendChild(tile);
    }
}

function getCell(row, col) {
    return ui.grid.children[row * state.level.nCols + col];
}

function updateAgentEdgeClasses(row, col) {
    // Flip HUD to left when near right edge (HUD needs 2 tiles of space)
    ui.agent.classList.toggle('near-right-edge', col >= state.level.nCols - 2);
}

function placePig(row, col) {
    getCell(row, col).appendChild(ui.agent);
    updateAgentEdgeClasses(row, col);
}

async function moveAnimated(toRow, toCol) {
    const fromRect = ui.agent.getBoundingClientRect();
    const toCell = getCell(toRow, toCol);
    const toRect = toCell.getBoundingClientRect();

    const dx = toRect.left - fromRect.left;
    const dy = toRect.top - fromRect.top;

    await animations.move(ui.agent, dx, dy, getAnimSpeed());

    placePig(toRow, toCol);
}

function loadLevel(level) {
    if (level === null) return;

    // Cancel and reset pig animations/transforms
    ui.agent.getAnimations().forEach(a => a.cancel());
    ui.agent.style.transform = '';

    renderGrid(level);

    const [row, col] = level.start;
    placePig(row, col);
    ui.agent.style.backgroundImage = pigSpriteUrl(level.dir);
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
                animations.walk(ui.agent, msg.dir, getAnimSpeed());
                await moveAnimated(msg.pos[0], msg.pos[1]);
                break;

            case "turn":
                await animations.turn(ui.agent, msg.dir, getAnimSpeed());
                state.currentDirection = msg.dir;
                break;

            case "isColor":
                ui.comparisonTile.className = 'tile ' + msg.color.toLowerCase();
                ui.comparisonAnswer.textContent = msg.result ? 'yes' : 'no';
                await animations.hudFlash(ui.colorComparison, getAnimSpeed());
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
                    animations.celebrate(ui.agent);
                } else {
                    const gridWrapper = document.getElementById('grid-wrapper');
                    animations.lose(ui.agent, state.currentDirection, gridWrapper);
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
	if (document.body.classList.contains('editor-mode')) {
		console.log("We are now loading in the editor");
        Editor.load(level);
        return;
    }
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
    // showHelp(); // TODO: REMOVE THIS LINE - temporarily disabled for editor development
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
        animations.notify(ui.gameNotification, "Paused to edit code");
    }
});

ui.editor.on("keydown", (cm, event) => {
    if (cm.getOption("readOnly") && state.playback.status === "playing") {
        enterPaused();
        animations.notify(ui.gameNotification, "Paused to edit code");
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

// Mode toggle handlers
ui.modePlay.onclick = () => {
    document.body.classList.remove('editor-mode');
    ui.playPane.hidden = false;
    ui.editorPane.hidden = true;
    ui.modePlay.classList.add("active");
    ui.modeEdit.classList.remove("active");
};

ui.modeEdit.onclick = () => {
    document.body.classList.add('editor-mode');
    enterIdle();
    ui.playPane.hidden = true;
    ui.editorPane.hidden = false;
    ui.modePlay.classList.remove("active");
    ui.modeEdit.classList.add("active");
    Editor.enter();
};

// TODO: REMOVE THIS LINE - temporarily open editor pane on load for development
ui.modeEdit.click();

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

Shortcuts.register("play-pause", "Play / Pause", () => ui.btn1.click(), "h", { ctrlNote: true });
Shortcuts.register("step", "Step", () => ui.btn2.click(), "j", { ctrlNote: true });
Shortcuts.register("reset", "Reset", () => ui.btn3.click(), "k");
Shortcuts.register("focus-editor", "Focus editor", () => {
    if (ui.editor.hasFocus()) return;
    if (ui.editor.getOption("readOnly") && state.playback.status === "playing") {
        enterPaused();
        animations.notify(ui.gameNotification, "Paused to edit code");
    }
    ui.editor.focus();
    ui.editor.setCursor(ui.editor.getCursor());
}, "i");
Shortcuts.register("unfocus-editor", "Unfocus editor", () => {
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
Shortcuts.register("toggle-help", "Toggle help", toggleHelp, "?");
Shortcuts.initialize(ui.shortcutsContainer);
