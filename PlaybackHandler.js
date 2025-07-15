
function scheduler(task, interval) {
    let intervalId = null;
    let currentInterval = interval;

    return {
        start: () => intervalId = setInterval(task, currentInterval),
        stop: () => clearInterval(intervalId),
		toggle: () => {
			if (intervalId){
				clearInterval(intervalId)
				intervalId = null;
			}
			else {
				intervalId = setInterval(task, currentInterval);
			}
		},
        setInterval: (newInterval) => {
            currentInterval = newInterval;
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = setInterval(task, currentInterval);
            }
        }
    };
}



function PlaybackHandler(playbackControls, editor, boardView){
	this.view = boardView;
	this.editor = editor;
	this.controls = playbackControls;
	this.playOrPause  = document.getElementById("playback-play-pause");
	this.faster       = document.getElementById("playback-faster");
	this.slower       = document.getElementById("playback-slower");
	this.stepForward  = document.getElementById("playback-step-forward");
	this.runCode      = document.getElementById("playback-run-code");



	this.isPlayingBack = false;
	this.buttons = this.controls.querySelectorAll("button");

	this.disableButtons = () => {
		this.buttons.forEach((b) => b.disabled = true);
		this.runCode.disabled = false;
		console.log(this.runCode);
	}

	this.enableButtons = () => this.buttons.forEach((b) => b.disabled = false);

	console.log("what?")
	this.disableButtons();
	console.log(this.runCode.disabled);

	this.trace = null;
	this.traceIndex = 0;



	this.step = () => {
		if (!this.isPlayingBack){
			return;
		}
		const msg = this.trace[this.traceIndex++];
		if (!msg) return;
		switch (msg.type) {
		case "initial-configuration":
			console.err("This should never happen");
			return;

		case "move": 
			this.view.moveAgent(msg.pos)
			break

		case "collected":
			this.view.consumeTarget(msg.pos);
			break;
		case "gameover":
			console.log("GAME OVER! YOU", msg.win? "WIN" : "LOSE")
			break;

		case "turn":
			this.view.rotateAgent(msg.dir);
			break;

		case "isColor":
			console.log(`Is color ${msg.color}? ${msg.result}!`)
			break;

		case "lineExecuted":
			this.editor.highlightLine(msg.lineno);
			break;
		}
	}

	this.stepForward.addEventListener("click", () => this.step());
	
	// milliseconds between each step through the trace
	this.currentAutoplayInterval = 300;
	this.autoplay = scheduler(() => this.step(), this.currentAutoplayInterval);
	this.playOrPause.addEventListener("click", () => this.autoplay.toggle());
	this.faster.addEventListener("click", () => {
		this.currentAutoplayInterval = Math.max(100, this.currentAutoplayInterval - 100);
		this.autoplay.setInterval(this.currentAutoplayInterval);
	});
	this.slower.addEventListener("click", () => {
		this.currentAutoplayInterval = Math.min(1200, this.currentAutoplayInterval + 100);
		this.autoplay.setInterval(this.currentAutoplayInterval);
	});

	this.init = (trace) => {
		this.traceIndex = 0;
		this.trace = trace;
		this.isPlayingBack = true;
		this.enableButtons();

		this.view.resetGameState(trace[0].level);
		this.traceIndex = 1;
		this.autoplay.toggle();
	}
	

	this.stop = () => {
		this.isPlayingBack = false;
		this.disableButtons();
		this.trace = null;
		this.traceIndex = 0;
	}


}
