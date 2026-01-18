// game.js - Game mode (grid, code editor, playback)

import * as PigJatin from "./PigJatin/PigJatin.js";
import { animations, pigSpriteUrl } from "./animations.js";
import { createShortcuts } from "./shortcuts.js";
import { TILE_CLASSES } from "./levels.js";
import { ui } from "./ui.js";

// --- State ---

const state = {
    // Level
    level: null,

    // Playback
    status: "idle",       // "idle" | "playing" | "paused"
    trace: null,
    index: 0,
    currentDirection: null,

    // Worker
    worker: null,
    workerTimeout: null,

    // Flags
    isSingleStepping: false,
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

function setCssVar(name, value) {
    document.documentElement.style.setProperty(name, value.toString());
}

function removeEditorHighlight() {
    for (let i = 0; i < ui.editor.lineCount(); i++) {
        ui.editor.removeLineClass(i, "background", "highlighted-line");
    }
}

// --- Grid rendering ---

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

function updatePigEdgeClasses(row, col) {
    ui.pig.classList.toggle('near-right-edge', col >= state.level.nCols - 2);
}

function placePig(row, col) {
    getCell(row, col).appendChild(ui.pig);
    updatePigEdgeClasses(row, col);
}

function loadLevel(level) {
    if (level === null) return;

    ui.pig.getAnimations().forEach(a => a.cancel());
    ui.pig.style.transform = '';

    renderGrid(level);

    const [row, col] = level.start;
    placePig(row, col);
    ui.pig.style.backgroundImage = pigSpriteUrl(level.dir);
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

export function enterIdle({ resetBoard = true } = {}) {
    // State
    state.status = "idle";
    state.isSingleStepping = false;
    state.trace = null;
    state.index = 0;

    // UI
    ui.playbackToolbar.className = "playback-toolbar idle";
    ui.editor.setOption("readOnly", false);
    ui.btn1.classList.remove("pauseIcon");
    ui.btn1.classList.add("playIcon");
    removeEditorHighlight();

    // Behavior
    ui.btn1.onclick = submitCode;
    ui.btn2.onclick = () => { state.isSingleStepping = true; submitCode(); };
    ui.btn3.onclick = () => enterIdle();

    if (resetBoard) {
        ui.pig.getAnimations().forEach(a => a.cancel());
        loadLevel(state.level);
    }
}

export function enterPlaying({ trace = null } = {}) {
    // State
    state.status = "playing";
    state.isSingleStepping = false;

    if (trace !== null) {
        state.trace = trace;
        state.index = 0;
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

export function enterPaused({ trace = null } = {}) {
    // State
    state.status = "paused";
    state.isSingleStepping = true;

    if (trace !== null) {
        state.trace = trace;
        state.index = 0;
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

// --- Playback ---

async function moveAnimated(toRow, toCol) {
    const fromRect = ui.pig.getBoundingClientRect();
    const toCell = getCell(toRow, toCol);
    const toRect = toCell.getBoundingClientRect();

    const dx = toRect.left - fromRect.left;
    const dy = toRect.top - fromRect.top;

    await animations.move(ui.pig, dx, dy, getAnimSpeed());

    placePig(toRow, toCol);
}

async function step() {
    if (state.status === "idle") return;

    const msg = state.trace[state.index++];
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
                animations.walk(ui.pig, msg.dir, getAnimSpeed());
                await moveAnimated(msg.pos[0], msg.pos[1]);
                break;

            case "turn":
                await animations.turn(ui.pig, msg.dir, getAnimSpeed());
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
                    animations.celebrate(ui.pig);
                } else {
                    const gridWrapper = document.getElementById('grid-wrapper');
                    animations.lose(ui.pig, state.currentDirection, gridWrapper);
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
