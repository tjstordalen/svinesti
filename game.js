// game.js - Game mode (grid, code editor, playback)

import * as PigJatin from "./PigJatin/PigJatin.js";
import { animations } from "./animations.js";
import { createShortcuts } from "./shortcuts.js";
import { createGrid } from "./grid.js";
import { ui } from "./ui.js";

// --- State ---

const state = {
    // Level
    level: null,
    grid: null,

    // Playback
    status: "idle",       // "idle" | "playing" | "paused"

    // Worker
    worker: null,
    workerTimeout: null,
    pendingResolve: null,
};

const playback = {
    trace: null, 

    load(trace) {
		// the trace is reversed, so we can take the next one by popping from the end 
        this.trace = trace.slice().reverse();
    },

    next() {
        return this.trace?.pop();
    },

    clear() {
        this.trace = null;
    },

    async play() {
        while (state.status === "playing") {
            const msg = this.next();
            if (msg === undefined) return;

            const result = await processEvent(msg);
            if (result === "done") return;
        }
    },

    stepping: false,

    async step() {
		// disable the step functionality until the animation finishes
		// otherwise, multiple animations can overlap
        if (this.stepping) return;
        this.stepping = true;
        try {
            const msg = this.next();
            if (msg !== undefined) {
                await processEvent(msg);
            }
        } finally {
            this.stepping = false;
        }
    },
};

let config = {
    onWorkerReady: null,
};

// --- Shortcuts ---

const shortcuts = createShortcuts('svinesti-game-shortcuts-v1');

// --- Utilities ---

const LINE_PAUSE_MULTIPLIER = 1.5;

function selectedLanguage() {
    return document.querySelector('.lang-btn.active').dataset.lang;
}

function getAnimSpeed() {
    return ui.speedSlider.max - ui.speedSlider.value;
}

function highlightLine(lineno) {
    for (let i = 0; i < ui.editor.lineCount(); i++) {
        if (i === lineno - 1) ui.editor.addLineClass(i, "background", "highlighted-line");
        else ui.editor.removeLineClass(i, "background", "highlighted-line");
    }
}

function removeEditorHighlight() {
    for (let i = 0; i < ui.editor.lineCount(); i++) {
        ui.editor.removeLineClass(i, "background", "highlighted-line");
    }
}

// --- Grid rendering ---

function loadLevel(level) {
    if (level === null) return;
    state.grid = createGrid(ui.grid, level.nRows, level.nCols, level);
    state.grid.pig.appendChild(ui.colorComparisonHud);
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

// --- Language switching ---

function switchLanguage(newLang) {
    const currentLang = selectedLanguage();
    if (currentLang === newLang) return;

    storeCode();

    ui.langPython.classList.toggle('active', newLang === 'python');
    ui.langJava.classList.toggle('active', newLang === 'java');

    loadCode();
    const mode = newLang === "java" ? "text/x-java" : "python";
    ui.editor.setOption("mode", mode);
}

// --- State machine ---

async function submitAndEnter(enterFn) {
    ui.codeOutput.textContent = "";
    const code = getCode();
    if (code === null) return;
    const trace = await execute(code);
    if (trace) enterFn({ trace });
}

const BUTTON_HANDLERS = {
    idle: {
        btn1: () => submitAndEnter(enterPlaying),
        btn2: () => submitAndEnter(enterPaused),
        btn3: () => enterIdle(),
    },
    playing: {
        btn1: () => enterPaused(),
        btn2: () => { enterPaused(); playback.step(); },
        btn3: () => enterIdle(),
    },
    paused: {
        btn1: () => enterPlaying(),
        btn2: () => playback.step(),
        btn3: () => enterIdle(),
    },
};

function wireButtons(status) {
    const h = BUTTON_HANDLERS[status];
    ui.btn1.onclick = h.btn1;
    ui.btn2.onclick = h.btn2;
    ui.btn3.onclick = h.btn3;
}

function enterState(status, { trace = null, resetBoard = true } = {}) {
    state.status = status;

    // Trace initialization (playing/paused with new trace)
    if (trace !== null) {
        playback.load(trace);
        loadLevel(state.level);
    }

    // Idle-specific resets
    if (status === "idle") {
        playback.clear();
        removeEditorHighlight();
        if (resetBoard && state.grid) {
            state.grid.pig.getAnimations().forEach(a => a.cancel());
            loadLevel(state.level);
        }
    }

    // UI
    ui.playbackToolbar.className = "playback-toolbar " + status;
    ui.editor.setOption("readOnly", status === "playing" ? "nocursor" : false);

    // Buttons
    wireButtons(status);

    // Start playback chain
    if (status === "playing") {
        playback.play();
    }
}

export const enterIdle = (opts) => enterState("idle", opts);
export const enterPlaying = (opts) => enterState("playing", opts);
export const enterPaused = (opts) => enterState("paused", opts);

// --- Playback ---

const DIRECTION_DELTAS = { right: [1, 0], left: [-1, 0], down: [0, 1], up: [0, -1] };

async function moveAnimated(dir, toRow, toCol) {
    const pig = state.grid.pig;
    const p = pig.parentElement; // a tile
    const [mx, my] = DIRECTION_DELTAS[dir];
    const [dx, dy] = [mx * p.offsetWidth, my * p.offsetHeight];

    if (await animations.move(pig, dx, dy, getAnimSpeed()) === animations.ABORT) return animations.ABORT;
    state.grid.movePigTo(toRow, toCol);
}

async function processEvent(msg) {
    const pig = state.grid.pig;

    // Highlight line (attached to animated events, or standalone lineExecuted)
    if (msg.lineno !== undefined) {
        highlightLine(msg.lineno);
    }

    switch (msg.type) {
        case "lineExecuted":
            // Standalone line (loops, assignments) - add brief pause
            await new Promise(r => setTimeout(r, getAnimSpeed() * LINE_PAUSE_MULTIPLIER));
            break;

        case "move":
            animations.walk(pig, msg.dir, getAnimSpeed());
            if (await moveAnimated(msg.dir, msg.pos[0], msg.pos[1]) === animations.ABORT) return;
            break;

        case "turn":
            if (await animations.turn(pig, msg.dir, getAnimSpeed()) === animations.ABORT) return;
            break;

        case "isColor":
            ui.comparisonTile.className = 'tile ' + msg.color.toLowerCase();
            ui.comparisonAnswer.textContent = msg.result ? 'yes' : 'no';
            if (await animations.hudFlash(ui.colorComparisonHud, getAnimSpeed()) === animations.ABORT) return;
            break;

        case "collected":
            const [r, c] = msg.pos;
            state.grid.tiles[r * state.grid.nCols + c].classList.remove("target");
            break;

        case "gameover":
            console.log("GAME OVER! YOU", msg.win ? "WIN" : "LOSE");
            if (msg.win) {
                animations.celebrate(pig);
            } else {
                const gridWrapper = document.getElementById('grid-wrapper');
                animations.lose(pig, gridWrapper);
            }
            enterIdle({ resetBoard: false });
            return "done";
    }
}

// --- Worker management ---

const WORKER_TIMEOUT_MS = 1000;  // restart if hung
const SPLASH_DELAY_MS = 1500;
const FADE_DURATION_MS = 500;

function resolveExecution(result) {
    state.pendingResolve?.(result);
    state.pendingResolve = null;
    clearTimeout(state.workerTimeout);
}

function hideSplashScreen() {
    if (!ui.splashScreen) return;
    ui.splashScreen.classList.add("fade-out");
    setTimeout(() => {
        ui.splashScreen.style.display = "none";
        config.onWorkerReady?.();
    }, FADE_DURATION_MS);
}

function initWorker() {
    enterIdle();
    if (state.worker) state.worker.terminate();

    state.worker = new Worker("worker.js");
    state.worker.onmessage = ({ data }) => {
        switch (data.type) {
            case "ready":
                setTimeout(hideSplashScreen, SPLASH_DELAY_MS);
                break;
            case "execution-trace":
                resolveExecution(data.trace);
                break;
            case "execution-failed":
                ui.codeOutput.textContent = data.errorMessage;
                ui.codeOutput.scrollTop = ui.codeOutput.scrollHeight;
                resolveExecution(null);
                break;
        }
    };
}

// --- Code submission ---

function getCode() {
    const program = ui.editor.getValue();
    if (selectedLanguage() !== "java") return program;

    const [success, error, code] = PigJatin.generatePythonCode(program);
    if (!success) {
        ui.codeOutput.textContent = error.msg;
        ui.codeOutput.scrollTop = ui.codeOutput.scrollHeight;
        return null;
    }
    return code;
}

function execute(code) {
    return new Promise((resolve) => {
        state.pendingResolve = resolve;
        state.worker.postMessage({
            code,
            level: JSON.stringify(state.level)
        });
        // Restart worker if hung (e.g., infinite loop)
        state.workerTimeout = setTimeout(initWorker, WORKER_TIMEOUT_MS);
    });
}

// --- Event handlers (internal) ---

function attachEventHandlers() {
    // Font size
    ui.fontSizeSlider.addEventListener("input", (e) => {
        ui.editor.getWrapperElement().style.fontSize = e.target.value + "px";
    });

    // Editor change - auto-reset when editing during pause
    ui.editor.on("change", () => {
        storeCode();
        if (state.status === "paused") {
            enterIdle();
        }
    });

    // Editor interaction during playback - auto-pause
    ui.editor.on("mousedown", (cm, event) => {
        if (cm.getOption("readOnly") && state.status === "playing") {
            enterPaused();
            animations.notify(ui.gameNotification, "Paused to edit code");
        }
    });

    ui.editor.on("keydown", (cm, event) => {
        if (cm.getOption("readOnly") && state.status === "playing") {
            enterPaused();
            animations.notify(ui.gameNotification, "Paused to edit code");
        }
    });

    // Language buttons
    ui.langPython.onclick = () => switchLanguage('python');
    ui.langJava.onclick = () => switchLanguage('java');
}

// --- Shortcuts (internal) ---

function registerShortcuts() {
    shortcuts.register("play-pause", "Play / Pause", () => ui.btn1.click(), "h", { ctrlNote: true });
    shortcuts.register("step", "Step", () => ui.btn2.click(), "j", { ctrlNote: true });
    shortcuts.register("reset", "Reset", () => ui.btn3.click(), "k");
    shortcuts.register("focus-editor", "Focus editor", () => {
        if (ui.editor.hasFocus()) return;
        if (ui.editor.getOption("readOnly") && state.status === "playing") {
            enterPaused();
            animations.notify(ui.gameNotification, "Paused to edit code");
        }
        ui.editor.focus();
        ui.editor.setCursor(ui.editor.getCursor());
    }, "i");
    shortcuts.register("unfocus-editor", "Unfocus editor", () => {
        if (ui.editor.hasFocus()) {
            ui.editor.getInputField().blur();
        }
    }, "escape");
}

// --- Public API ---

export function init({ shortcutsContainer, onWorkerReady } = {}) {
    config.onWorkerReady = onWorkerReady;

    // Initialize font size from slider
    ui.editor.getWrapperElement().style.fontSize = ui.fontSizeSlider.value + "px";

    // Attach event handlers
    attachEventHandlers();

    // Register and initialize shortcuts
    registerShortcuts();
    if (shortcutsContainer) {
        shortcuts.initialize(shortcutsContainer);
    }

    // Initialize worker
    initWorker();
}

export function enter() {
    shortcuts.enable();
}

export function exit() {
    shortcuts.disable();
    enterIdle();
}

export function selectLevel(level) {
    storeCode();
    state.level = level;
    loadCode();
    loadLevel(level);
    ui.codeOutput.textContent = "";
    enterIdle();
}

export function getLevel() {
    return state.level;
}

export function getStatus() {
    return state.status;
}
