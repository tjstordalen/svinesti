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
    setCssVar("--grid-n-rows", level.nRows);
    setCssVar("--grid-n-cols", level.nCols);

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
    const index = state.level.nCols * r + c;
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

    const msg = state.playback.trace[state.playback.index++];
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
            state.playback.trace = null;
            state.playback.index = 0;
            state.playback.status = "idle";
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
    state.playback.codeWhenStarted = ui.editor.getValue();
    state.playback.index = 0;
    state.playback.trace = trace;
    state.playback.status = "playing";
    ui.stopOrStepBtn.disabled = false;

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
    ui.stopOrStepBtn.disabled = true;
}

function playbackResume() {
    if (ui.editor.getValue() !== state.playback.codeWhenStarted) return false;
    if (state.playback.status === "paused") {
        state.playback.status = "playing";
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
        clearTimeout(state.workerTimeout);
    };
}

// --- Actions ---

function selectLevel(level) {
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
    if (state.playback.status === "idle") return;
    if (state.playback.status === "playing") {
        state.playback.status = "paused";
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
        switchLanguage();
    }
});

// Run PigJatin tests
PigJatin.loadTestCases("./PigJatin/testcases.txt").then(PigJatin.runTests);
