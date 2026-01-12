import * as PigJatin from "./PigJatin/PigJatin.js";

// --- State ---

const app = {
    selectedLevel: null,
    worker: null,
    rebootTimeout: null
};

// --- Board rendering ---

function createBoardView(gridDiv) {
    const setCssVar = (id, val) => document.documentElement.style.setProperty(id, val.toString());
    const dirs = ["img/right.png", "img/down.png", "img/left.png", "img/up.png"];
    let agent = null;
    let nCols = 0;

    function populateGrid(state) {
        gridDiv.innerHTML = "";

        const nRows = state.grid.length;
        nCols = state.grid[0].length;
        setCssVar("--grid-n-rows", nRows);
        setCssVar("--grid-n-cols", nCols);

        const cells = state.grid.join("");
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
            gridDiv.appendChild(div);
        }

        agent = document.createElement("div");
        agent.setAttribute("id", "agent");
        gridDiv.firstElementChild.appendChild(agent);
    }

    function moveAgent(pos) {
        const [row, col] = pos;
        setCssVar("--agent-row", row);
        setCssVar("--agent-col", col);
    }

    function rotateAgent(dir) {
        agent.style.backgroundImage = `url("${dirs[dir]}")`;
    }

    function consumeTarget(pos) {
        const [r, c] = pos;
        const index = nCols * r + c;
        gridDiv.children[index].classList.remove("target");
    }

    function resetGameState(state) {
        populateGrid(state);
        moveAgent(state.pos);
        rotateAgent(state.dir);
    }

    return { resetGameState, moveAgent, rotateAgent, consumeTarget };
}

// --- Playback control ---

function createScheduler(task, interval) {
    let intervalId = null;
    let currentInterval = interval;

    return {
        start: () => intervalId = setInterval(task, currentInterval),
        stop: () => { clearInterval(intervalId); intervalId = null; },
        setInterval: (newInterval) => {
            currentInterval = newInterval;
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = setInterval(task, currentInterval);
            }
        }
    };
}

function createPlaybackHandler(editor, boardView) {
    const stopOrStepBtn = document.getElementById("playback-stop-or-step");
    const speedSlider = document.getElementById("playback-speed");

    let trace = null;
    let traceIndex = 0;
    let isPlayingBack = false;
    let isPaused = false;
    let codeWhenStarted = null;

    stopOrStepBtn.disabled = true;

    function step() {
        if (!isPlayingBack) return;

        const msg = trace[traceIndex++];
        if (!msg) return;

        switch (msg.type) {
            case "move":
                boardView.moveAgent(msg.pos);
                break;
            case "collected":
                boardView.consumeTarget(msg.pos);
                break;
            case "gameover":
                console.log("GAME OVER! YOU", msg.win ? "WIN" : "LOSE");
                trace = null;
                traceIndex = 0;
                isPlayingBack = false;
                editor.highlightLine(-1);
                break;
            case "turn":
                boardView.rotateAgent(msg.dir);
                break;
            case "isColor":
                console.log(`Is color ${msg.color}? ${msg.result}!`);
                break;
            case "lineExecuted":
                editor.highlightLine(msg.lineno);
                break;
        }
    }

    const currentAutoplayInterval = () => speedSlider.max - speedSlider.value;
    const autoplay = createScheduler(step, currentAutoplayInterval());

    speedSlider.addEventListener("input", () => {
        autoplay.setInterval(currentAutoplayInterval());
    });

    stopOrStepBtn.onclick = () => {
        if (!isPlayingBack) return;
        if (!isPaused) {
            isPaused = true;
            autoplay.stop();
        }
        step();
    };

    function init(newTrace) {
        codeWhenStarted = editor.getValue();
        traceIndex = 0;
        trace = newTrace;
        isPlayingBack = true;
        isPaused = false;
        stopOrStepBtn.disabled = false;

        boardView.resetGameState(trace[0].level);
        traceIndex = 1;
        autoplay.stop();
        autoplay.start();
    }

    function stop() {
        codeWhenStarted = null;
        autoplay.stop();
        isPlayingBack = false;
        trace = null;
        traceIndex = 0;
        stopOrStepBtn.disabled = true;
    }

    function resume() {
        if (editor.getValue() !== codeWhenStarted) return false;
        if (isPlayingBack && isPaused) {
            isPaused = false;
            autoplay.start();
            return true;
        }
        return false;
    }

    return { init, stop, resume };
}

// --- Editor setup ---

function setupEditor(codeInput) {
    const editor = CodeMirror.fromTextArea(codeInput, {
        lineNumbers: true,
        lineWrapping: true,
        mode: "python",
        theme: "default"
    });

    editor.highlightLine = (lineno) => {
        lineno--;
        const prev = editor.highlightedLine;
        if (prev !== undefined && prev >= 0) {
            editor.removeLineClass(prev, "background", "highlighted-line");
        }
        if (lineno < 0 || lineno > editor.lineCount()) {
            editor.highlightedLine = undefined;
            return;
        }
        editor.highlightedLine = lineno;
        editor.addLineClass(lineno, "background", "highlighted-line");
    };

    return editor;
}

// --- Worker management ---

function initWorker(playback, codeOutput) {
    if (playback) playback.stop();

    console.log("Initializing worker");
    if (app.worker) app.worker.terminate();

    app.worker = new Worker("worker.js");
    app.worker.onmessage = (event) => {
        if (event.data.type === "execution-trace") {
            playback.init(event.data.trace);
        } else if (event.data.type === "execution-failed") {
            codeOutput.textContent = event.data.errorMessage;
            codeOutput.scrollTop = codeOutput.scrollHeight;
        }
        clearTimeout(app.rebootTimeout);
    };
}

// --- Code storage ---

function selectedLanguage() {
    const selectedRadio = document.querySelector('input[name="language-choice"]:checked');
    return selectedRadio.value;
}

function storeCode(editor) {
    if (!app.selectedLevel) return;
    const key = app.selectedLevel.name + selectedLanguage();
    localStorage.setItem(key, editor.getValue());
}

function loadCode(editor) {
    if (!app.selectedLevel) return;
    const key = app.selectedLevel.name + selectedLanguage();
    const code = localStorage.getItem(key) ?? "";
    editor.setValue(code);
}

function updateEditorMode(editor) {
    const mode = selectedLanguage() === "java" ? "text/x-java" : "python";
    editor.setOption("mode", mode);
}

// --- Initialize ---

const codeOutput = document.getElementById("code-output");
const editor = setupEditor(document.getElementById("code-input"));
const boardView = createBoardView(document.getElementById("grid"));
const playback = createPlaybackHandler(editor, boardView);

initWorker(playback, codeOutput);

// Prepare levels (remove target from starting position)
for (let lvl of levels) {
    const [r, c] = lvl.pos;
    const tmp = [...lvl.grid[r]];
    tmp[c] = tmp[c].toLowerCase();
    lvl.grid[r] = tmp.join("");
}

// Build level list
const levelList = document.getElementById("level-list");

for (let lvl of levels) {
    const item = document.createElement("li");
    const btn = document.createElement("button");
    item.appendChild(btn);
    btn.textContent = lvl.name;
    btn.level = lvl;
    levelList.appendChild(item);

    btn.addEventListener("click", () => {
        storeCode(editor);
        app.selectedLevel = btn.level;
        loadCode(editor);
        boardView.resetGameState(btn.level);
        levelList.querySelectorAll("li button").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        codeOutput.textContent = "";
        updateEditorMode(editor);
    });
}

// Select first level
levelList.querySelector("li button").click();

// --- Event handlers ---

function submitCode() {
    if (playback.resume()) return;

    codeOutput.textContent = "";
    let program = editor.getValue();

    if (selectedLanguage() === "java") {
        const [success, error, code] = PigJatin.generatePythonCode(program);
        if (!success) {
            codeOutput.textContent = error.msg;
            codeOutput.scrollTop = codeOutput.scrollHeight;
            return;
        }
        program = code;
    }

    app.worker.postMessage({
        code: program,
        level: JSON.stringify(app.selectedLevel)
    });

    app.rebootTimeout = setTimeout(() => initWorker(playback, codeOutput), 1000);
}

document.getElementById("playback-run-code").onclick = submitCode;

document.addEventListener("keydown", (event) => {
    if (event.ctrlKey && event.key === "Enter") submitCode();
});

editor.on("change", () => storeCode(editor));

document.getElementById("editor-font-size-slider").addEventListener("input", (e) => {
    editor.getWrapperElement().style.fontSize = e.target.value + "px";
});

document.addEventListener("change", (e) => {
    if (e.target.type === "radio" && e.target.name === "language-choice") {
        const other = selectedLanguage() === "python" ? "java" : "python";
        const key = app.selectedLevel.name + other;
        localStorage.setItem(key, editor.getValue());
        loadCode(editor);
        updateEditorMode(editor);
    }
});

// Run PigJatin tests
PigJatin.loadTestCases("./PigJatin/testcases.txt").then(PigJatin.runTests);
