


function PlaybackHandler(playbackControls, editor, boardView){
	this.view = boardView;
	this.editor = editor;
	this.controls = playbackControls;
	this.playOrPause  = document.getElementById("playback-play-pause");
	this.faster       = document.getElementById("playback-faster");
	this.slower       = document.getElementById("playback-slower");
	this.stepForward  = document.getElementById("playback-step-forward");
	this.stepBackward = document.getElementById("playback-step-backward");

	this.isPlayingBack = false;
	this.buttons = this.controls.querySelectorAll("button");
	this.buttons.forEach((b) => b.disabled = true);

	this.trace = null;
	this.traceIndex = 0;

	this.init = (trace) => {
		console.log("Calling init with trace")
		console.log(trace);
		this.traceIndex = 0;
		this.trace = trace;
		this.isPlayingBack = true;
		this.buttons.forEach((b) => b.disabled = false);


		this.view.resetGameState(trace[0].level);
		this.traceIndex = 1;
	}
	

	this.stop = () => {
		this.isPlayingBack = false;
		this.buttons.forEach((b) => b.disabled = true);
		this.trace = null;
		this.traceIndex = 0;
	}


	this.step = () => {
		if (!this.isPlayingBack){
			return;
		}
		const msg = this.trace[this.traceIndex++];

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

}
