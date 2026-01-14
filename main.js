import * as PigJatin from "./PigJatin/PigJatin.js";

// Set to false to disable splash screen for faster debugging
const ENABLE_SPLASH_SCREEN = false;

// --- UI elements ---

const gid = (id) => document.getElementById(id);
const ui = {
    grid:			gid("grid"),
    codeInput:		gid("code-input"),
    codeOutput:		gid("code-output"),
    levelList:		gid("level-list"),
    btn2:		gid("btn2"),
    btn3:		gid("btn3"),
    speedSlider:	gid("playback-speed"),
    btnPlay:		gid("btn-play"),
    btnPause:		gid("btn-pause"),
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
    playbackToolbar: document.querySelector(".playback-toolbar"),
};

// --- State ---

const state = {
    level: null,
    worker: null,
    workerTimeout: null,
    isSingleStepping: false, // Flag to indicate single-step execution mode
    targetDirection: null, // For sequential turn animation
    playback: {
        status: "idle", // "idle" | "playing" | "paused"
        trace: null,
        index: 0,
    },
};

// --- Status machine ---

const STATUS = {
    idle: {
        editorReadOnly: false,
    },
    playing: {
        editorReadOnly: "nocursor",
    },
    paused: {
        editorReadOnly: false,
    },
};

function syncUI() {
    const s = STATUS[state.playback.status];
    ui.playbackToolbar.className = `playback-toolbar ${state.playback.status}`;
    ui.editor.setOption("readOnly", s.editorReadOnly);
}

function pause() {
    state.playback.status = "paused";
    syncUI();
}

// --- Utilities ---

function setCssVariable(id, val) {
    document.documentElement.style.setProperty(id, val.toString());
}

function selectedLanguage() {
    return document.querySelector('input[name="language-choice"]:checked').value;
}

// TODO: can't this more easily be done using a css transformation?
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

// TODO: Provide a numbered list of all the occurrences of "agent" across all files and ask for confirmation before replacing them with "pig" across the board. 

// --- Board rendering ---

// Direction 0 is right, 1 is down, 2 is left, 3 is up
// Idle frame for each direction
const AGENT_DIRS = ["pigs/right-1.png", "pigs/down-1.png", "pigs/left-1.png", "pigs/up-1.png"];

// TODO: move this to svinesti.py, so that the direction name is included directly in the message move message. Then delete this line from main.js
// Direction names for walking animation classes
const DIR_NAMES = ["right", "down", "left", "up"];

function move(row,col,animationDirection=null){
    setCssVariable("--agent-row", row);
    setCssVariable("--agent-col", col);
	// Add walking animation - animationend handler cleans up and triggers next step
	if (animationDirection !== null) ui.agent.classList.add(`anim-walking-${DIR_NAMES[animationDirection]}`);
}

function turn(direction, animate=false){ // direction: 0=right, 1=down, 2=left, 3=up
	if (animate) {
		// Store target direction and start first half of hop
		state.targetDirection = direction;
		ui.agent.classList.add("anim-hopping-up");
	} else {
		// Instant turn without animation
		ui.agent.style.backgroundImage = `url("${AGENT_DIRS[direction]}")`;
	}
}

function loadLevel(level) {
    if (level === null) return;

	const classLists = {
		".": "empty",
		"r": "red",
		"g": "green",
		"b": "blue",
		"R": "red target",
		"G": "green target",
		"B": "blue target",
	};

    ui.grid.innerHTML = "";

    setCssVariable("--grid-n-rows", level.nRows);
    setCssVariable("--grid-n-cols", level.nCols);

    const cells = level.grid.join("");
    for (let c of cells) {
        const div = document.createElement("div");
        div.className = "game-tile " + classLists[c];
        ui.grid.appendChild(div);
    }

	// The pig needs to be added to the top left grid cell for
	// the CSS animations to work correctly.
    ui.grid.firstElementChild.appendChild(ui.agent);
	const [row,col] = level.start;
	move(row,col);
	turn(level.dir)
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

// --- Playback ---


function step() {
    if (state.playback.status === "idle") return;

    const msg = state.playback.trace[state.playback.index++];
    if (!msg) return;

    switch (msg.type) {
		// highlight the relevant line and make the next step immediately to se the effect of te
		// highlighted line
		case "lineExecuted":
			const lineno = msg.lineno - 1;
			for (let i = 0; i < ui.editor.lineCount(); i++){
				if (i === lineno) ui.editor.addLineClass(i, "background", "highlighted-line");
				else ui.editor.removeLineClass(i, "background", "highlighted-line");
			}
			step();
			break;
        case "move":
			move(msg.pos[0], msg.pos[1], msg.dir); 	
            break;
        case "collected":
            const [r, c] = msg.pos;
            const index = state.level.nCols * r + c;
            ui.grid.children[index].classList.remove("target");
            if (state.playback.status === "playing") step();
            break;
        case "gameover":
            console.log("GAME OVER! YOU", msg.win ? "WIN" : "LOSE");
            playbackStop();
            break;
        case "turn":
			turn(msg.dir, true);
            break;
        case "isColor":
            ui.comparisonTile.className = 'game-tile ' + msg.color.toLowerCase();
            ui.comparisonAnswer.textContent = msg.result ? 'yes' : 'no';

            // Trigger HUD animation - animationend handler continues playback
            ui.colorComparison.classList.add('anim-show-hud');
            break;
    }
}

function playbackInit(trace, singleStep = false) {
    state.playback.index = 0;
    state.playback.trace = trace;

    loadLevel(state.level);

    // Check if we should start in paused mode (for single-stepping)
    if (singleStep) {
        state.playback.status = "paused";
        syncUI();
    } else {
        state.playback.status = "playing";
        syncUI();
        step(); // Kick off the chain - animationend events continue it
    }
}

function playbackStop() {
    state.playback.status = "idle";
    state.playback.trace = null;
    state.playback.index = 0;
    syncUI();
}

function playbackResume() {
    if (state.playback.status === "paused") {
        state.playback.status = "playing";
        syncUI();
        step(); // Kick off the chain - animationend events continue it
        return true;
    }
    return false;
}

/*
  click a level in the list: store the current code, load the new level, load the new code
  click a language tab: store existing code, load new code. 
  slide the animation speed: update the var in css
  slide the font size: update font size
  type in the editor: store the code. Or maybe when it loses focus? 
  
  idle:
      play: run the code on the selected level -> playing
	  step: run the code on the selected level, one step -> paused
	  reset: reload the selected level. We do not need to save the trace, we can just re-run the code. 
  paused:
      play: run the code -> playing
	  step: make another step, no state change.
	  reset: reload the selected level. 
  playing: 
      play: pause -> paused
	  step: pause -> paused
	  reset: reload the selected level. 


	running the code: listening to animationend events and autostepping. (I think I do need to handle animationcanel btw)
	stepping the code: just make one step, but don't autostep (disable the listener?)
	
 * */


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
            playbackInit(event.data.trace, state.isSingleStepping);
            state.isSingleStepping = false;
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
    loadLevel(level);
    ui.codeOutput.textContent = "";
}

function switchLanguage() {
    const currentLang = selectedLanguage();
    const otherLang = currentLang === "python" ? "java" : "python";
    storeCode(otherLang);
    loadCode(currentLang);
    const mode = currentLang === "java" ? "text/x-java" : "python";
    ui.editor.setOption("mode", mode);
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
syncUI(); // Initialize button states

// Set up button handlers (no branching - visibility toggled by CSS)
ui.btnPlay.onclick = submitCode;
ui.btnPause.onclick = pause;
ui.btn2.onclick = () => {
    if (state.playback.status === "idle") {
        state.isSingleStepping = true;
        submitCode();
    } else if (state.playback.status === "playing") {
        pause();
        step();
    } else {
        step();
    }
};
ui.btn3.onclick = playbackStop();

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

ui.speedSlider.addEventListener("input", () => {
    setCssVariable("--animation-speed", `${ui.speedSlider.max - ui.speedSlider.value}ms`);
});

ui.agent.addEventListener("animationend", (e) => {
    e.target.classList.forEach(cls => {
        if (cls.startsWith('anim-')) e.target.classList.remove(cls);
    });

    // Special case: two-phase turn animation
    if (e.animationName === "turn-hop-up") {
        ui.agent.style.backgroundImage = `url("${AGENT_DIRS[state.targetDirection]}")`;
        ui.agent.classList.add("anim-hopping-down");
        return; // Don't continue playback until second phase completes
    }

    // Continue playback chain after animation completes
    if (state.playback.status === "playing") {
        step();
    }
});

ui.readOnlyNotification.onclick = () => {
    if (state.playback.status === "playing") {
        pause();
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
