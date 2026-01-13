import * as PigJatin from "./PigJatin/PigJatin.js";

// Set to false to disable splash screen for faster debugging
const ENABLE_SPLASH_SCREEN = true;

// --- UI elements ---

const gid = (id) => document.getElementById(id);
const ui = {
    grid:			gid("grid"),
    codeInput:		gid("code-input"),
    codeOutput:		gid("code-output"),
    levelList:		gid("level-list"),
    stepBtn:		gid("playback-step"),
    stopBtn:		gid("playback-stop"),
    speedSlider:	gid("playback-speed"),
    runCodeBtn:		gid("playback-run-code"),
    fontSizeSlider: gid("editor-font-size-slider"),
    sidebar:        gid("sidebar"),
    sidebarToggle:  gid("sidebar-toggle"),
    splashScreen:   gid("splash-screen"),
    readOnlyNotification: gid("editor-readonly-notification"),
    editor: CodeMirror.fromTextArea(gid("code-input"), {
        lineNumbers: true,
        lineWrapping: true,
        mode: "python",
        theme: "default"
    }),
    agent: (() => {
        const div = document.createElement("div");
        div.setAttribute("id", "agent");
        return div;
    })(),
};

// --- State ---

const state = {
    level: null,
    worker: null,
    workerTimeout: null,
    currentDir: 0, // Current agent direction (0=right, 1=down, 2=left, 3=up)
    currentPos: [0, 0], // Current agent position [row, col]
    movementInProgress: false, // Track if pig is currently animating movement
    turnInProgress: false, // Track if pig is currently in turn delay
    highlightedLine: -1, // Currently highlighted line in editor
    playback: {
        status: "idle", // "idle" | "playing" | "paused"
        trace: null,
        index: 0,
        intervalId: null,
    },
};

// --- Utilities ---

function setCssVariable(id, val) {
    document.documentElement.style.setProperty(id, val.toString());
}

function selectedLanguage() {
    return document.querySelector('input[name="language-choice"]:checked').value;
}

function parseCssTime(cssValue) {
    // Parse CSS time value (e.g., "0.9s" or "900ms") and return milliseconds
    const value = parseFloat(cssValue);
    if (cssValue.includes('ms')) {
        return value;
    } else {
        return value * 1000; // assume seconds
    }
}

function syncAnimationSpeed() {
    // Match animation duration to playback interval, slowed to 70%
    const interval = ui.speedSlider.max - ui.speedSlider.value;
    const duration = interval / 0.7; // Slow down to ~70% speed
    setCssVariable("--agent-move-duration", `${duration}ms`);
}

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

// --- Board rendering ---

// Direction 0 is right, 1 is down, 2 is left, 3 is up
// Idle frame for each direction
const AGENT_DIRS = ["pigs/right-1.png", "pigs/down-1.png", "pigs/left-1.png", "pigs/up-1.png"];

// Direction names for walking animation classes
const DIR_NAMES = ["right", "down", "left", "up"];

// Maps each character in a level to the relevant CSS classes
const TILE_CLASSES = {
    ".": "empty",
    "r": "red",
    "g": "green",
    "b": "blue",
    "R": "red target",
    "G": "green target",
    "B": "blue target",
};

function drawLevel(level) {
    ui.grid.innerHTML = "";

	// The layout of the grid is handled in CSS
    setCssVariable("--grid-n-rows", level.nRows);
    setCssVariable("--grid-n-cols", level.nCols);

    const cells = level.grid.join("");
    for (let c of cells) {
        const div = document.createElement("div");
        div.className = "game-tile " + TILE_CLASSES[c];
        ui.grid.appendChild(div);
    }

	// The pig needs to be added to the top left grid cell for
	// the CSS animations to work correctly.
    ui.grid.firstElementChild.appendChild(ui.agent);
}

function moveAgent(pos) {
    const [row, col] = pos;

	// The movement of the pig is animated in CSS
    setCssVariable("--agent-row", row);
    setCssVariable("--agent-col", col);
}

function rotateAgent(dir) {
    state.currentDir = dir;
    ui.agent.style.backgroundImage = `url("${AGENT_DIRS[dir]}")`;
}

function consumeTarget(pos) {
    const [r, c] = pos;
    const index = state.level.nCols * r + c;
    ui.grid.children[index].classList.remove("target");
}

function resetBoard(level) {
    drawLevel(level);
    moveAgent(level.start);
    rotateAgent(level.dir);
    state.currentPos = level.start;
}

// --- Editor ---
function highlightLine(lineno) {
    lineno--;
    const prev = state.highlightedLine;
    if (prev >= 0) {
        ui.editor.removeLineClass(prev, "background", "highlighted-line");
    }
    if (lineno < 0 || lineno > ui.editor.lineCount()) {
        state.highlightedLine = -1;
        return;
    }
    state.highlightedLine = lineno;
    ui.editor.addLineClass(lineno, "background", "highlighted-line");
}

function updateEditorMode() {
    const mode = selectedLanguage() === "java" ? "text/x-java" : "python";
    ui.editor.setOption("mode", mode);
}

// --- Code storage ---

function storeCode(lang = selectedLanguage()) {
    if (!state.level) return;
    const key = state.level.name + lang;
    localStorage.setItem(key, ui.editor.getValue());
}

function loadCode(lang = selectedLanguage()) {
    if (!state.level) return;
    const key = state.level.name + lang;
    const code = localStorage.getItem(key) ?? "";
    ui.editor.setValue(code);
}

// --- Playback ---

function autoplayStart() {
    const interval = ui.speedSlider.max - ui.speedSlider.value;
    state.playback.intervalId = setInterval(step, interval);
}

function autoplayStop() {
    clearInterval(state.playback.intervalId);
    state.playback.intervalId = null;
}

function autoplayUpdateSpeed() {
    syncAnimationSpeed();
    if (state.playback.intervalId) {
        autoplayStop();
        autoplayStart();
    }
}

function step() {
    if (state.playback.status === "idle") return;

    // Don't process next event if turn or movement is still in progress
    if (state.turnInProgress || state.movementInProgress) return;

    const msg = state.playback.trace[state.playback.index];
	state.playback.index++;

    if (!msg) return;

    switch (msg.type) {
        case "move":
            // Add walking animation for current direction
            const walkClass = `walking-${DIR_NAMES[state.currentDir]}`;
            ui.agent.classList.add(walkClass);

            moveAgent(msg.pos);
            state.currentPos = msg.pos;

            // Track movement state
            state.movementInProgress = true;

            // Remove animation class and clear movement flag after it completes
            const durationCss = getComputedStyle(document.documentElement)
                .getPropertyValue('--agent-move-duration').trim();
            const duration = parseCssTime(durationCss);
            setTimeout(() => {
                ui.agent.classList.remove(walkClass);
                state.movementInProgress = false;
            }, duration);
            break;
        case "collected":
            consumeTarget(msg.pos);
            break;
        case "gameover":
            console.log("GAME OVER! YOU", msg.win ? "WIN" : "LOSE");
            playbackStop();
            highlightLine(-1);
            break;
        case "turn":
            // Wait for movement to complete before turning
            if (state.movementInProgress) {
                // Decrement index to retry this turn event on next step
                state.playback.index--;
                return;
            }

            rotateAgent(msg.dir);

            // Set turn in progress and clear after turn duration
            state.turnInProgress = true;
            const turnDurationCss = getComputedStyle(document.documentElement)
                .getPropertyValue('--agent-turn-duration').trim();
            const turnDuration = parseCssTime(turnDurationCss);

            setTimeout(() => {
                state.turnInProgress = false;
            }, turnDuration);
            break;
        case "isColor":
            console.log(`Is color ${msg.color}? ${msg.result}!`);
            // Flash the current tile to show color check
            const [r, c] = state.currentPos;
            const tileIndex = state.level.nCols * r + c;
            const tile = ui.grid.children[tileIndex];
            tile.classList.add(msg.result ? "color-check-true" : "color-check-false");
            setTimeout(() => {
                tile.classList.remove("color-check-true", "color-check-false");
            }, 400);
            break;
        case "lineExecuted":
            highlightLine(msg.lineno);
            break;
    }
}

function playbackInit(trace) {
    state.playback.index = 0;
    state.playback.trace = trace;
    state.playback.status = "playing";
    ui.stepBtn.disabled = false;
    ui.stopBtn.disabled = false;
    state.movementInProgress = false;
    state.turnInProgress = false;
    ui.editor.setOption("readOnly", "nocursor");

    syncAnimationSpeed();
    resetBoard(trace[0].level);
    state.playback.index = 1;
    autoplayStop();
    autoplayStart();
}

function playbackStop() {
    autoplayStop();
    state.playback.status = "idle";
    state.playback.trace = null;
    state.playback.index = 0;
    state.movementInProgress = false;
    state.turnInProgress = false;
    ui.stepBtn.disabled = true;
    ui.stopBtn.disabled = true;
    ui.runCodeBtn.textContent = "Run";
    ui.stopBtn.textContent = "Pause";
    ui.editor.setOption("readOnly", false);
}

function playbackResume() {
    if (state.playback.status === "paused") {
        state.playback.status = "playing";
        autoplayStart();
        ui.runCodeBtn.textContent = "Run";
        ui.stopBtn.textContent = "Pause";
        ui.stopBtn.disabled = false;
        ui.editor.setOption("readOnly", "nocursor");
        return true;
    }
    return false;
}

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
            playbackInit(event.data.trace);
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
    resetBoard(level);
    ui.codeOutput.textContent = "";
    updateEditorMode();
}

function switchLanguage() {
    const currentLang = selectedLanguage();
    const otherLang = currentLang === "python" ? "java" : "python";
    storeCode(otherLang);
    loadCode(currentLang);
    updateEditorMode();
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
ui.stepBtn.disabled = true;
ui.stopBtn.disabled = true;
syncAnimationSpeed();

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

ui.runCodeBtn.onclick = submitCode;

ui.stepBtn.onclick = () => {
    if (state.playback.status === "idle") return;
    if (state.playback.status === "playing") {
        state.playback.status = "paused";
        autoplayStop();
        ui.runCodeBtn.textContent = "Resume";
        ui.stopBtn.textContent = "Reset";
        ui.editor.setOption("readOnly", false);
    }
    step();
};

ui.stopBtn.onclick = () => {
    if (state.playback.status === "playing") {
        // Pause playback and offer Resume/Reset
        state.playback.status = "paused";
        autoplayStop();
        ui.runCodeBtn.textContent = "Resume";
        ui.stopBtn.textContent = "Reset";
        ui.editor.setOption("readOnly", false);
    } else if (state.playback.status === "paused") {
        // Reset everything
        playbackStop();
        resetBoard(state.level);
        highlightLine(-1);
        ui.runCodeBtn.textContent = "Run";
        ui.stopBtn.textContent = "Pause";
    }
};

ui.speedSlider.addEventListener("input", autoplayUpdateSpeed);

ui.fontSizeSlider.addEventListener("input", (e) => {
    ui.editor.getWrapperElement().style.fontSize = e.target.value + "px";
});

ui.editor.on("change", () => {
    storeCode();

    // If paused and user edits code, automatically reset
    if (state.playback.status === "paused") {
        playbackStop();
        resetBoard(state.level);
        highlightLine(-1);
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
    if (event.ctrlKey && event.key === "Enter") submitCode();
});

document.addEventListener("change", (e) => {
    if (e.target.type === "radio" && e.target.name === "language-choice") {
        switchLanguage();
    }
});

ui.sidebarToggle.onclick = () => {
    ui.sidebar.classList.toggle("collapsed");
};

// Run PigJatin tests
PigJatin.loadTestCases("./PigJatin/testcases.txt").then(PigJatin.runTests);
