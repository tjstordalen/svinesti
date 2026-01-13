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
    agent: gid("agent"),
    colorComparison: gid("color-comparison-hud"),
    comparisonTile: gid("comparison-tile"),
    comparisonAnswer: gid("comparison-answer"),
};

// --- State ---

const state = {
    level: null,
    worker: null,
    workerTimeout: null,
    currentDir: 0, // Current agent direction (0=right, 1=down, 2=left, 3=up)
    currentPos: [0, 0], // Current agent position [row, col]
    highlightedLine: -1, // Currently highlighted line in editor
    playback: {
        status: "idle", // "idle" | "playing" | "paused"
        trace: null,
        index: 0,
        startPaused: false, // If true, start in paused mode instead of playing
    },
};

// --- Utilities ---

function setCssVariable(id, val) {
    document.documentElement.style.setProperty(id, val.toString());
}

function selectedLanguage() {
    return document.querySelector('input[name="language-choice"]:checked').value;
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

// Maps color names to CSS background colors for comparison HUD
const COLOR_MAP = {
    "red": "#FF8A8A",
    "green": "#58E0B8",
    "blue": "#85D0FF",
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
    step(); // Kick off the chain - animationend events continue it
}

function autoplayStop() {
    // Nothing to do - animationend handler checks status before calling step()
}

function autoplayUpdateSpeed() {
    syncAnimationSpeed();
    // CSS variable is updated - next animation will use new duration
}

function step() {
    if (state.playback.status === "idle") return;

    const msg = state.playback.trace[state.playback.index];
	state.playback.index++;

    if (!msg) return;

    // If this is a lineExecuted event, highlight the line and process the next event immediately
    if (msg.type === "lineExecuted") {
        highlightLine(msg.lineno);
        // Recursively process the next event without delay
        step();
        return;
    }

    switch (msg.type) {
        case "move":
            // Add walking animation - animationend handler cleans up and triggers next step
            ui.agent.classList.add(`walking-${DIR_NAMES[state.currentDir]}`);
            moveAgent(msg.pos);
            state.currentPos = msg.pos;
            break;
        case "collected":
            consumeTarget(msg.pos);
            // No animation - immediately continue the chain
            if (state.playback.status === "playing") step();
            break;
        case "gameover":
            console.log("GAME OVER! YOU", msg.win ? "WIN" : "LOSE");
            playbackStop();
            highlightLine(-1);
            break;
        case "turn":
            // Add turning animation - animationend handler cleans up and triggers next step
            rotateAgent(msg.dir);
            ui.agent.classList.add("turning");
            break;
        case "isColor":
            console.log(`Is color ${msg.color}? ${msg.result}!`);

            // Set the tile to show the queried color
            ui.comparisonTile.className = 'game-tile ' + msg.color.toLowerCase();
            ui.comparisonAnswer.textContent = msg.result ? 'yes' : 'no';

            // Show the HUD with fade in
            ui.colorComparison.classList.add('show');

            // Hide after move duration (same timing as agent movement)
            const interval = ui.speedSlider.max - ui.speedSlider.value;
            const hudDuration = interval / 0.7;
            setTimeout(() => {
                ui.colorComparison.classList.remove('show');
            }, hudDuration);
            break;
    }
}

function playbackInit(trace) {
    state.playback.index = 0;
    state.playback.trace = trace;
    ui.stepBtn.disabled = false;
    ui.stopBtn.disabled = false;

    syncAnimationSpeed();
    resetBoard(trace[0].level);
    state.playback.index = 1;
    autoplayStop();

    // Check if we should start in paused mode (for single-stepping)
    if (state.playback.startPaused) {
        state.playback.status = "paused";
        state.playback.startPaused = false; // Reset flag
        ui.runCodeBtn.textContent = "Resume";
        ui.stopBtn.textContent = "Reset";
        ui.editor.setOption("readOnly", false);
    } else {
        state.playback.status = "playing";
        ui.editor.setOption("readOnly", "nocursor");
        autoplayStart();
    }
}

function playbackStop() {
    autoplayStop();
    state.playback.status = "idle";
    state.playback.trace = null;
    state.playback.index = 0;
    // Step button stays enabled (can start single-step mode from idle)
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
ui.stepBtn.disabled = false; // Step button always enabled (starts single-step mode when idle)
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
    if (state.playback.status === "idle") {
        // Start execution in single-step mode
        state.playback.startPaused = true;
        submitCode();
        return;
    }
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

// Event-driven playback: when animations complete, trigger next step
ui.agent.addEventListener("animationend", (e) => {
    // Clean up animation classes
    if (e.animationName.startsWith("walk-")) {
        ui.agent.classList.remove(`walking-${e.animationName.split("-")[1]}`);
    } else if (e.animationName === "turn-bounce") {
        ui.agent.classList.remove("turning");
    }
    // Continue playback chain
    if (state.playback.status === "playing") {
        step();
    }
});

// HUD uses CSS transition - continue playback when fade-out completes
ui.colorComparison.addEventListener("transitionend", (e) => {
    // Only trigger on fade-out (opacity going to 0), not fade-in
    if (e.propertyName === "opacity" && !ui.colorComparison.classList.contains("show")) {
        if (state.playback.status === "playing") {
            step();
        }
    }
});

ui.readOnlyNotification.onclick = () => {
    if (state.playback.status === "playing") {
        // Pause playback to allow editing
        state.playback.status = "paused";
        autoplayStop();
        ui.runCodeBtn.textContent = "Resume";
        ui.stopBtn.textContent = "Reset";
        ui.editor.setOption("readOnly", false);
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
