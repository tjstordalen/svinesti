// playback.js - Execution engine (state machine, trace playback, worker)

import { animations, pigSpriteUrl } from "./animations.js";
import { ui } from "./ui.js";

const ENABLE_SPLASH_SCREEN = false;

const state = {
    status: "idle",       // "idle" | "playing" | "paused"
    trace: null,
    index: 0,
    worker: null,
    workerTimeout: null,
    isSingleStepping: false,
    currentDirection: null,
};

let config = {
    loadLevel: null,
    getLevel: null,
    onWorkerReady: null,
    onSubmit: null,
};

export function init(cfg) {
    config = { ...config, ...cfg };
    initWorker();
}

// --- Utilities ---

function getAnimSpeed() {
    return ui.speedSlider.max - ui.speedSlider.value;
}

// --- State machine ---

export function enterIdle(resetBoard = true) {
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

    // Clear line highlighting
    for (let i = 0; i < ui.editor.lineCount(); i++) {
        ui.editor.removeLineClass(i, "background", "highlighted-line");
    }

    // Behavior
    ui.btn1.onclick = () => config.onSubmit();
    ui.btn2.onclick = () => { state.isSingleStepping = true; config.onSubmit(); };
    ui.btn3.onclick = () => enterIdle();

    if (resetBoard) {
        ui.pig.getAnimations().forEach(a => a.cancel());
        config.loadLevel(config.getLevel());
    }
}

export function enterPlaying(newTrace = null) {
    // State
    state.status = "playing";
    state.isSingleStepping = false;

    if (newTrace !== null) {
        state.trace = newTrace;
        state.index = 0;
        state.currentDirection = config.getLevel().dir;
        config.loadLevel(config.getLevel());
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

export function enterPaused(newTrace = null) {
    // State
    state.status = "paused";
    state.isSingleStepping = true;

    if (newTrace !== null) {
        state.trace = newTrace;
        state.index = 0;
        state.currentDirection = config.getLevel().dir;
        config.loadLevel(config.getLevel());
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

function getCell(row, col) {
    return ui.grid.children[row * config.getLevel().nCols + col];
}

function updatePigEdgeClasses(row, col) {
    ui.pig.classList.toggle('near-right-edge', col >= config.getLevel().nCols - 2);
}

function placePig(row, col) {
    getCell(row, col).appendChild(ui.pig);
    updatePigEdgeClasses(row, col);
}

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
                const index = config.getLevel().nCols * r + c;
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
                enterIdle(false);
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
    if (!ENABLE_SPLASH_SCREEN || !ui.splashScreen) return;

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

// --- Public API ---

export function submit(pythonCode) {
    state.worker.postMessage({
        code: pythonCode,
        level: JSON.stringify(config.getLevel())
    });

    state.workerTimeout = setTimeout(initWorker, 1000);
}

export function getStatus() {
    return state.status;
}

export function isStepping() {
    return state.isSingleStepping;
}

export function setStepping(val) {
    state.isSingleStepping = val;
}
