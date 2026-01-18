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

    // Flags
    isSingleStepping: false,
};

const playback = {
    trace: null,

    load(trace) {
        this.trace = trace.slice().reverse();
    },

    next() {
        return this.trace?.pop();
    },

    clear() {
        this.trace = null;
    },
};

let config = {
    onWorkerReady: null,
};

// --- Shortcuts ---

const shortcuts = createShortcuts('svinesti-game-shortcuts-v1');

// --- Utilities ---

function selectedLanguage() {
    return document.querySelector('.lang-btn.active').dataset.lang;
}

function getAnimSpeed() {
    return ui.speedSlider.max - ui.speedSlider.value;
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

const BUTTON_HANDLERS = {
    idle: {
        btn1: () => submitCode(),
        btn2: () => { state.isSingleStepping = true; submitCode(); },
        btn3: () => enterIdle(),
    },
    playing: {
        btn1: () => enterPaused(),
        btn2: () => { enterPaused(); step(); },
        btn3: () => enterIdle(),
    },
    paused: {
        btn1: () => enterPlaying(),
        btn2: () => step(),
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
    state.isSingleStepping = (status === "paused");

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
        step();
    }
}

export const enterIdle = (opts) => enterState("idle", opts);
export const enterPlaying = (opts) => enterState("playing", opts);
export const enterPaused = (opts) => enterState("paused", opts);

// --- Playback ---

async function moveAnimated(toRow, toCol) {
    const pig = state.grid.pig;
    const fromRect = pig.getBoundingClientRect();
    const toCell = state.grid.getCell(toRow, toCol);
    const toRect = toCell.getBoundingClientRect();

    const dx = toRect.left - fromRect.left;
    const dy = toRect.top - fromRect.top;

    await animations.move(pig, dx, dy, getAnimSpeed());

    state.grid.movePigTo(toRow, toCol);
}

async function step() {
    if (state.status === "idle") return;

    const msg = playback.next();
    if (msg === undefined) return;

    const pig = state.grid.pig;

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
                animations.walk(pig, msg.dir, getAnimSpeed());
                await moveAnimated(msg.pos[0], msg.pos[1]);
                break;

            case "turn":
                await animations.turn(pig, msg.dir, getAnimSpeed());
                break;

            case "isColor":
                ui.comparisonTile.className = 'tile ' + msg.color.toLowerCase();
                ui.comparisonAnswer.textContent = msg.result ? 'yes' : 'no';
                await animations.hudFlash(ui.colorComparisonHud, getAnimSpeed());
                break;

            case "collected":
                const [r, c] = msg.pos;
                state.grid.tiles[r * state.grid.nCols + c].classList.remove("target");
                // No animation - continue immediately
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
                return;
        }
    } catch (e) {
        // Animation was cancelled (user paused/stopped)
        if (e.name === 'AbortError') return;
        throw e;
    }

    // Continue playback chain
    if (state.status === "playing") {
        step(); // Don't await - let it run asynchronously
    }
}

// --- Worker management ---

function hideSplashScreen() {
    if (!ui.splashScreen) return;

    ui.splashScreen.classList.add("fade-out");
    setTimeout(() => {
        ui.splashScreen.style.display = "none";
        config.onWorkerReady?.();
    }, 500);
}

function initWorker() {
    enterIdle();

    console.log("Initializing worker");
    if (state.worker) state.worker.terminate();

    state.worker = new Worker("worker.js");
    state.worker.onmessage = (event) => {
        if (event.data.type === "ready") {
            setTimeout(() => {
                hideSplashScreen();
            }, 1500);
        } else if (event.data.type === "execution-trace") {
            if (state.isSingleStepping) {
                enterPaused({ trace: event.data.trace });
            } else {
                enterPlaying({ trace: event.data.trace });
            }
            state.isSingleStepping = false;
        } else if (event.data.type === "execution-failed") {
            ui.codeOutput.textContent = event.data.errorMessage;
            ui.codeOutput.scrollTop = ui.codeOutput.scrollHeight;
        }
        clearTimeout(state.workerTimeout);
    };
}

// --- Code submission ---

function submitCode() {
    if (state.status === "paused") {
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
