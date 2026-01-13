import * as PigJatin from "./PigJatin/PigJatin.js";

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
    editor: CodeMirror.fromTextArea(gid("code-input"), {
        lineNumbers: true,
        lineWrapping: true,
        mode: "python",
        theme: "default"
    }),
    agent: null,
};

// --- State ---

const state = {
    level: null,
    worker: null,
    workerTimeout: null,
    playback: {
        status: "idle", // "idle" | "playing" | "paused"
        trace: null,
        index: 0,
        codeWhenStarted: null,
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

// --- Board rendering ---

// Direction 0 is right, 1 is down, and so on.
const AGENT_DIRS = ["img/right.png", "img/down.png", "img/left.png", "img/up.png"];

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

    ui.agent = document.createElement("div");
    ui.agent.setAttribute("id", "agent");

	// The pig needs to be added to the top left grid cell for
	// the CSS animatins to work correctly.
    ui.grid.firstElementChild.appendChild(ui.agent);
}

function moveAgent(pos) {
    const [row, col] = pos;

	// The movement of the pig is animated in CSS
    setCssVariable("--agent-row", row);
    setCssVariable("--agent-col", col);
}

function rotateAgent(dir) {
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
}

// --- Editor ---
function highlightLine(lineno) {
    lineno--;
    const prev = ui.editor.highlightedLine;
    if (prev !== undefined && prev >= 0) {
        ui.editor.removeLineClass(prev, "background", "highlighted-line");
    }
    if (lineno < 0 || lineno > ui.editor.lineCount()) {
        ui.editor.highlightedLine = undefined;
        return;
    }
    ui.editor.highlightedLine = lineno;
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
    if (state.playback.intervalId) {
        autoplayStop();
        autoplayStart();
    }
}

function step() {
    if (state.playback.status === "idle") return;

    const msg = state.playback.trace[state.playback.index];
	state.playback.index++;

    if (!msg) return;

    switch (msg.type) {
        case "move":
            moveAgent(msg.pos);
            break;
        case "collected":
            consumeTarget(msg.pos);
            break;
        case "gameover":
            console.log("GAME OVER! YOU", msg.win ? "WIN" : "LOSE");
            autoplayStop();
            state.playback.trace = null;
            state.playback.index = 0;
            state.playback.status = "idle";
            highlightLine(-1);
            ui.stepBtn.disabled = true;
            ui.stopBtn.disabled = true;
            ui.runCodeBtn.textContent = "Run";
            ui.stopBtn.textContent = "Stop";
            break;
        case "turn":
            rotateAgent(msg.dir);
            break;
        case "isColor":
            console.log(`Is color ${msg.color}? ${msg.result}!`);
            break;
        case "lineExecuted":
            highlightLine(msg.lineno);
            break;
    }
}

function playbackInit(trace) {
    state.playback.codeWhenStarted = ui.editor.getValue();
    state.playback.index = 0;
    state.playback.trace = trace;
    state.playback.status = "playing";
    ui.stepBtn.disabled = false;
    ui.stopBtn.disabled = false;

    resetBoard(trace[0].level);
    state.playback.index = 1;
    autoplayStop();
    autoplayStart();
}

function playbackStop() {
    state.playback.codeWhenStarted = null;
    autoplayStop();
    state.playback.status = "idle";
    state.playback.trace = null;
    state.playback.index = 0;
    ui.stepBtn.disabled = true;
    ui.stopBtn.disabled = true;
    ui.runCodeBtn.textContent = "Run";
    ui.stopBtn.textContent = "Stop";
}

function playbackResume() {
    if (ui.editor.getValue() !== state.playback.codeWhenStarted) return false;
    if (state.playback.status === "paused") {
        state.playback.status = "playing";
        autoplayStart();
        ui.runCodeBtn.textContent = "Run";
        ui.stopBtn.textContent = "Stop";
        ui.stopBtn.disabled = false;
        return true;
    }
    return false;
}

// --- Worker management ---

function initWorker() {
    playbackStop();

    console.log("Initializing worker");
    if (state.worker) state.worker.terminate();

    state.worker = new Worker("worker.js");
    state.worker.onmessage = (event) => {
        if (event.data.type === "execution-trace") {
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

initWorker();
ui.stepBtn.disabled = true;
ui.stopBtn.disabled = true;

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
    } else if (state.playback.status === "paused") {
        // Reset everything
        playbackStop();
        resetBoard(state.level);
        highlightLine(-1);
        ui.runCodeBtn.textContent = "Run";
        ui.stopBtn.textContent = "Stop";
    }
};

ui.speedSlider.addEventListener("input", autoplayUpdateSpeed);

ui.fontSizeSlider.addEventListener("input", (e) => {
    ui.editor.getWrapperElement().style.fontSize = e.target.value + "px";
});

ui.editor.on("change", storeCode);

document.addEventListener("keydown", (event) => {
    if (event.ctrlKey && event.key === "Enter") submitCode();
});

document.addEventListener("change", (e) => {
    if (e.target.type === "radio" && e.target.name === "language-choice") {
        switchLanguage();
    }
});

// Run PigJatin tests
PigJatin.loadTestCases("./PigJatin/testcases.txt").then(PigJatin.runTests);
