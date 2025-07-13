function BoardView(gridDiv){
    this.grid = gridDiv;
	this.setCssVar = (id,val) => document.documentElement.style.setProperty(id, val.toString());
	
	this.resetGameState = (state) => {
		this.populateGrid(state);
		this.moveAgent(state.pos);
		this.rotateAgent(state.dir);
	}

	this.populateGrid = (state) => {

		this.nRows = state.grid.length;
		this.nCols = state.grid[0].length;
		this.setCssVar("--grid-n-rows", this.nRows); 
		this.setCssVar("--grid-n-cols", this.nCols);		

		const cells = state.grid.join("");
		for (let c of cells) {
			const div = document.createElement("div");
			const isTarget = ["R", "G", "B"].includes(c); 
			if (c === ".") {
				div.classList.add("empty");
			}
			else {
				div.classList.add(c.toLowerCase());
				if (c.toUpperCase() === c) {
					div.classList.add("target");	
				}
			}
			this.grid.appendChild(div);
		}

		const agent = document.createElement("div");
		agent.setAttribute("id", "agent");
		this.grid.firstElementChild.appendChild(agent);
		this.agent = agent;
	}

	this.moveAgent = (pos) => {
		const [row,col] = pos;
		this.setCssVar("--agent-row", row);
		this.setCssVar("--agent-col", col);
	}

	this.dirs = ["img/right.png", "img/down.png", "img/left.png", "img/up.png"]
	this.rotateAgent = (dir) => this.agent.style.backgroundImage = `url("${this.dirs[dir]}")`;

	this.consumeTarget = (pos) => {
		const [r,c] = pos;
		const nc = this.nCols;
		const index = nc * r + c;
		this.grid.children[index].classList.remove("target");
	}
}
