
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
	this.stopOrStep   = document.getElementById("playback-stop-or-step");
	this.runCode      = document.getElementById("playback-run-code");
	this.speedSlider  = document.getElementById("playback-speed");

	this.isPlayingBack = false;

	this.trace = null;
	this.traceIndex = 0;

	this.stopOrStep.disabled = true;

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
			this.trace = null;
			this.traceIndex = 0;
			this.isPlayingBack = false;
			this.editor.highlightLine(-1);
			
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

	
	// milliseconds between each step through the trace
	this.currentAutoplayInterval = this.speedSlider.max - this.speedSlider.value;
	this.autoplay = scheduler(() => this.step(), this.currentAutoplayInterval);
	
	this.speedSlider.addEventListener("input", () => {
		this.currentAutoplayInterval = this.speedSlider.max - this.speedSlider.value;	
		this.autoplay.setInterval(this.currentAutoplayInterval);
	});

	this.resume = () => {
		if (editor.getValue() !== this.codeWhenStarted) return false;
		if (this.isPlayingBack && this.isPaused){
			
			this.isPaused = false;
			this.autoplay.start()
			return true
		}
		return false;
	}

	this.init = (trace) => {
		this.codeWhenStarted = editor.getValue();
		this.traceIndex = 0;
		this.trace = trace;
		this.isPlayingBack = true;
		this.isPaused = false;	
		this.stopOrStep.disabled = false;

		this.view.resetGameState(trace[0].level);
		this.traceIndex = 1;
		this.autoplay.stop();
		this.autoplay.start();
	}

	this.stop = () => {
		this.codeWhenStarted = null;
		this.autoplay.stop();
		this.isPlayingBack = false;
		this.trace = null;
		this.traceIndex = 0;
		this.stopOrStep.disabled = true;
	}

	this.stopOrStep.onclick = () => {
		if (!this.isPlayingBack) return; 
		if (!this.isPaused) {
			this.isPaused = true;
			this.autoplay.stop();
		}
		this.step();
	}

}
