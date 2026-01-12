import * as PigJatin from "./PigJatin/PigJatin.js";

// --- UI elements ---

const ui = {
    grid: document.getElementById("grid"),
    codeInput: document.getElementById("code-input"),
    codeOutput: document.getElementById("code-output"),
    levelList: document.getElementById("level-list"),
    stopOrStepBtn: document.getElementById("playback-stop-or-step"),
    speedSlider: document.getElementById("playback-speed"),
    runCodeBtn: document.getElementById("playback-run-code"),
    fontSizeSlider: document.getElementById("editor-font-size-slider"),
    editor: null,
    agent: null,
};

// --- State ---

const state = {
    selectedLevel: null,
    worker: null,
    rebootTimeout: null,
    // playback
    trace: null,
    traceIndex: 0,
    isPlayingBack: false,
    isPaused: false,
    codeWhenStarted: null,
    autoplayIntervalId: null,
    // board
    nCols: 0,
};

// --- Utilities ---

function setCssVar(id, val) {
    document.documentElement.style.setProperty(id, val.toString());
}

function selectedLanguage() {
    return document.querySelector('input[name="language-choice"]:checked').value;
}

// --- Board rendering ---

const AGENT_DIRS = ["img/right.png", "img/down.png", "img/left.png", "img/up.png"];

function drawLevel(level) {
    ui.grid.innerHTML = "";

    const nRows = level.grid.length;
    state.nCols = level.grid[0].length;
    setCssVar("--grid-n-rows", nRows);
    setCssVar("--grid-n-cols", state.nCols);

    const cells = level.grid.join("");
    for (let c of cells) {
        const div = document.createElement("div");
        div.classList.add("game-tile");
        if (c === ".") {
            div.classList.add("empty");
        } else {
            div.classList.add(c.toLowerCase());
            if (c.toUpperCase() === c) {
                div.classList.add("target");
            }
        }
        ui.grid.appendChild(div);
    }

    ui.agent = document.createElement("div");
    ui.agent.setAttribute("id", "agent");
    ui.grid.firstElementChild.appendChild(ui.agent);
}

function moveAgent(pos) {
    const [row, col] = pos;
    setCssVar("--agent-row", row);
    setCssVar("--agent-col", col);
}

function rotateAgent(dir) {
    ui.agent.style.backgroundImage = `url("${AGENT_DIRS[dir]}")`;
}

function consumeTarget(pos) {
    const [r, c] = pos;
    const index = state.nCols * r + c;
    ui.grid.children[index].classList.remove("target");
}

function resetBoard(level) {
    drawLevel(level);
    moveAgent(level.pos);
    rotateAgent(level.dir);
}

// --- Editor ---

function setupEditor() {
    ui.editor = CodeMirror.fromTextArea(ui.codeInput, {
        lineNumbers: true,
        lineWrapping: true,
        mode: "python",
        theme: "default"
    });
}

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

function storeCode() {
    if (!state.selectedLevel) return;
    const key = state.selectedLevel.name + selectedLanguage();
    localStorage.setItem(key, ui.editor.getValue());
}

function loadCode() {
    if (!state.selectedLevel) return;
    const key = state.selectedLevel.name + selectedLanguage();
    const code = localStorage.getItem(key) ?? "";
    ui.editor.setValue(code);
}

// --- Playback ---

function autoplayStart() {
    const interval = ui.speedSlider.max - ui.speedSlider.value;
    state.autoplayIntervalId = setInterval(step, interval);
}

function autoplayStop() {
    clearInterval(state.autoplayIntervalId);
    state.autoplayIntervalId = null;
}

function autoplayUpdateSpeed() {
    if (state.autoplayIntervalId) {
        autoplayStop();
        autoplayStart();
    }
}

function step() {
    if (!state.isPlayingBack) return;

    const msg = state.trace[state.traceIndex++];
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
            state.trace = null;
            state.traceIndex = 0;
            state.isPlayingBack = false;
            highlightLine(-1);
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
    state.codeWhenStarted = ui.editor.getValue();
    state.traceIndex = 0;
    state.trace = trace;
    state.isPlayingBack = true;
    state.isPaused = false;
    ui.stopOrStepBtn.disabled = false;

    resetBoard(trace[0].level);
    state.traceIndex = 1;
    autoplayStop();
    autoplayStart();
}

function playbackStop() {
    state.codeWhenStarted = null;
    autoplayStop();
    state.isPlayingBack = false;
    state.trace = null;
    state.traceIndex = 0;
    ui.stopOrStepBtn.disabled = true;
}

function playbackResume() {
    if (ui.editor.getValue() !== state.codeWhenStarted) return false;
    if (state.isPlayingBack && state.isPaused) {
        state.isPaused = false;
        autoplayStart();
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
        clearTimeout(state.rebootTimeout);
    };
}

// --- Actions ---

function selectLevel(level) {
    storeCode();
    state.selectedLevel = level;
    loadCode();
    resetBoard(level);
    ui.codeOutput.textContent = "";
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
        level: JSON.stringify(state.selectedLevel)
    });

    state.rebootTimeout = setTimeout(initWorker, 1000);
}

// --- Initialize ---

setupEditor();
initWorker();
ui.stopOrStepBtn.disabled = true;

// Prepare levels (remove target from starting position)
for (let lvl of levels) {
    const [r, c] = lvl.pos;
    const tmp = [...lvl.grid[r]];
    tmp[c] = tmp[c].toLowerCase();
    lvl.grid[r] = tmp.join("");
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

ui.stopOrStepBtn.onclick = () => {
    if (!state.isPlayingBack) return;
    if (!state.isPaused) {
        state.isPaused = true;
        autoplayStop();
    }
    step();
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
        const other = selectedLanguage() === "python" ? "java" : "python";
        const key = state.selectedLevel.name + other;
        localStorage.setItem(key, ui.editor.getValue());
        loadCode();
        updateEditorMode();
    }
});

// Run PigJatin tests
PigJatin.loadTestCases("./PigJatin/testcases.txt").then(PigJatin.runTests);
