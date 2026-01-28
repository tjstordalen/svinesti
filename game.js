// game.js - Game mode (grid, code editor, playback)

import * as PigJatin from "./PigJatin/PigJatin.js";
import * as animations from "./animations.js";
import * as Shortcuts from "./shortcuts.js";
import * as app from "./app.js";
import { createGrid } from "./grid.js";
import { ui } from "./ui.js";

// --- State ---

// TODO: CTRL+ENTER does not execute code 


const state = {
    // Level
    level: null,
    grid: null,

    // Playback
    status: "idle",       // "idle" | "playing" | "paused"

    // Worker
    worker: null,
    pendingResolve: null,
};

const playback = {
    trace: null, 

    load(trace) {
		// reverse the trace so the next message is always trace.pop()
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
        } finally { // don't brick the stepping button if something unexpected happens
            this.stepping = false;
        }
    },
};

// --- Shortcuts ---

const shortcuts = Shortcuts.new('svinesti-game-shortcuts-v1');

// --- Utilities ---

const LINE_PAUSE_MULTIPLIER = 1.5;

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

function highlightLine(lineno) {
	removeEditorHighlight();
	// line numbers are zero indexed
	ui.editor.addLineClass(lineno - 1, "background", "highlighted-line");
}

// --- Grid rendering ---

function loadLevel(level) {
    if (level === null) return;
    state.grid = createGrid(ui.grid, level.nRows, level.nCols, level);

	// the color comparison hud only appears when playing the game. 
	// not in the level editor or in the thumbnail viewer
    state.grid.pig.appendChild(ui.colorComparisonHud);
}

// --- Code storage ---

function levelKey(level) {
    return level.id || level.name;
}

// --- Language switching ---

function switchLanguage(newLang) {
    const currentLang = selectedLanguage();
    if (currentLang === newLang) return;

    if (state.level) {
        app.code.set(levelKey(state.level), currentLang, ui.editor.getValue());
    }

    ui.langPython.classList.toggle('active', newLang === 'python');
    ui.langJava.classList.toggle('active', newLang === 'java');

    if (state.level) {
        ui.editor.setValue(app.code.get(levelKey(state.level), newLang));
    }
    const mode = newLang === "java" ? "text/x-java" : "python";
    ui.editor.setOption("mode", mode);
    ui.editor.setOption("indentUnit", 4);
}

// --- State machine ---
// this constrols, among other things, the behavior of the buttons depending on
// what the program is currently doing

async function submitAndEnter(enterFn) {
    ui.codeOutput.textContent = "";
    const code = getCode();
    if (code === null) return;
    let trace = await execute(code);
    if (!trace) return;

    // Check if trace ends with timeout - show notification and animation immediately
    const lastEvent = trace[trace.length - 1];
    if (lastEvent?.reason === "timeout") {
        ui.codeOutput.textContent =
            "Infinite loop detected after 10,000 operations.\n" +
            "Replaying the last part to show where it got stuck.";
        animations.flash(ui.codeOutput);
        ui.gameNotification.innerHTML = 'Do you have an <a href="help/infinite-loop.html" target="_blank">infinite loop</a>?';
        animations.notify(ui.gameNotification, null, false, 10000, "light");

        const discarded = trace.slice(0, -100);
        const kept = trace.slice(-100);

        // Set up grid and fast-forward to where tail begins
        loadLevel(state.level);
        for (const msg of discarded) {
            applyEventSilent(msg);
        }
        playback.load(kept);

        // Enter state without trace (skips loadLevel since we already did it)
        enterFn({});
        animations.timeout(document.getElementById('grid-wrapper'), state.grid.pig);
        return;
    }

    enterFn({ trace });
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
    const p = pig.parentElement; // this is a tile
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
            // Standalone line (loops, assignments) - add brief pause for to "animate". 
            await new Promise(r => setTimeout(r, getAnimSpeed() * LINE_PAUSE_MULTIPLIER));
            break;

        case "move":
			// moves the legs
            animations.walk(pig, msg.dir, getAnimSpeed());
			// CLAUDO: these checks against animations.ABORT don't matter. I think the only relevant one is 
			// CLAUDO: the one in the moveAnimated function. 
			// moves the pig
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
			// CLAUDO: rename the class target to "apple" accross all files, perhaps? 
            state.grid.tiles[r * state.grid.nCols + c].classList.remove("target");
            break;

        case "gameover":
            // We do not play the timeout animation here, as we start that
			// immediately when a timeout is noticed. See submitAndEnter()
            if (msg.win) {
                animations.celebrate(pig);
            }
			// CLAUDO why not check against loss explicitly? I don't renember the msg.reason string but you can find it
			else if (msg.reason !== "timeout") {
                const gridWrapper = document.getElementById('grid-wrapper');
                animations.lose(pig, gridWrapper);
            }
            enterIdle({ resetBoard: false });
            return "done";
    }
}

function applyEventSilent(msg) {
    switch (msg.type) {
        case 'move':
            state.grid.movePigTo(msg.pos[0], msg.pos[1]);
            break;
        case 'turn':
            state.grid.pig.className = 'pig pig-' + msg.dir;
            break;
        case 'collected':
            const [r, c] = msg.pos;
            state.grid.tiles[r * state.grid.nCols + c].classList.remove('target');
            break;
    }
}

// --- Worker management ---

function resolveExecution(result) {
    state.pendingResolve?.(result);
    state.pendingResolve = null;
}

function initWorker() {
    enterIdle();
// CLAUDO: scan all the files and determine if there are any magic strings we should rather use constants for. 
    state.worker = new Worker("worker.js");
    state.worker.onmessage = ({ data }) => {
        switch (data.type) {
            case "ready":
                app.ready.set();
                break;
            case "execution-trace":
                resolveExecution(data.trace);
                break;
            case "execution-failed":
                ui.codeOutput.textContent = data.errorMessage;
                ui.codeOutput.scrollTop = ui.codeOutput.scrollHeight;
                animations.flash(ui.codeOutput);
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
        animations.flash(ui.codeOutput);
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
    });
}

// --- Event handlers (internal) ---

function attachEventHandlers() {
    // Font size
    ui.fontSizeSlider.addEventListener("input", (e) => {
        const size = parseInt(e.target.value, 10);
        ui.editor.getWrapperElement().style.fontSize = size + "px";
        app.prefs.editorFontSize.set(size);
    });

    // Playback speed
    ui.speedSlider.addEventListener("input", () => {
        app.prefs.playbackSpeed.set(getAnimSpeed());
    });

    // Editor change - save updated code, and auto-reset if editing during pause
	// (because the trace that we have in memory becomes invalidated when you modify the code)
    ui.editor.on("change", () => {
        if (state.level) {
            app.code.set(levelKey(state.level), selectedLanguage(), ui.editor.getValue());
        }
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

const unlessFocused = (fn) => () => {
    if (ui.editor.hasFocus()) return false;
    fn();
};

function registerShortcuts() {
    shortcuts.register({
        id:     "play-pause",
        name:   "Play / Pause",
        action: unlessFocused(() => ui.btn1.click()),
        key:    "h",
    });
    shortcuts.register({
        id:     "step",
        name:   "Step",
        action: unlessFocused(() => ui.btn2.click()),
        key:    "j",
    });
    shortcuts.register({
        id:     "reset",
        name:   "Reset",
        action: unlessFocused(() => ui.btn3.click()),
        key:    "k",
    });
    shortcuts.register({
        id:         "run-code",
        name:       "Run code",
        action:     () => { ui.editor.getInputField().blur(); submitAndEnter(enterPlaying); },
        key:        "ctrl+enter",
        rebindable: false,
    });
    shortcuts.register({
        id:         "help",
        name:       "Help",
        action:     () => ui.helpButton.click(),
        key:        "?",
        rebindable: false,
    });
}

// --- Public API ---

export function init() {
    // Initialize sliders from preferences
    ui.fontSizeSlider.value = app.prefs.editorFontSize.get();
    ui.editor.getWrapperElement().style.fontSize = app.prefs.editorFontSize.get() + "px";
    ui.speedSlider.value = ui.speedSlider.max - app.prefs.playbackSpeed.get();

    // Attach event handlers
    attachEventHandlers();

    // Register and initialize shortcuts
    registerShortcuts();
    shortcuts.init(ui.gameShortcutsContainer);

    // Initialize worker (triggers app.ready.set() when Pyodide loads)
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
    if (state.level) {
        app.code.set(levelKey(state.level), selectedLanguage(), ui.editor.getValue());
    }
    state.level = level;
    ui.editor.setValue(app.code.get(levelKey(level), selectedLanguage()));
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
