
// A component that allows two modes: 
// - edit mode, where the user types into a text area
// - display mode, where the content is not editable but
// exactly one line will be highlighted

function TextHighlighter(containerDiv){
	this.container     = containerDiv;
	this.editWindow    = document.createElement("textarea")
	this.displayWindow = document.createElement("div"); 
	this.container.appendChild(this.editWindow);
	this.container.appendChild(this.displayWindow);
		
	this.editWindow.classList.add("edit-window");
	this.displayWindow.classList.add("display-window");

	
	// edit mode by default
	this.isDisplayMode = false;
	this.displayWindow.classList.add("hidden");

	this.highlightLine = (lineno) => {
		if (lineno === this.lineToHighlight) return;
		const currentLine = this.lineToHighlight || 1;
		this.displayWindow.children[currentLine-1].classList.remove("highlight");
		this.lineToHighlight = lineno;
		this.displayWindow.children[lineno-1].classList.add("highlight");
	}
	

	this.toggleMode = () => {
		
		this.editWindow.classList.toggle("hidden");
		this.displayWindow.classList.toggle("hidden");
		this.isDisplayMode = !this.isDisplayMode;

		if (this.isDisplayMode){
			// Wrap each line of the text area input in a <span> and add the text to the display window.
			// This can be done by just replacing newlines with </span><span>, but that would enable
			// injection attacks. So we manually set the textContent instead
			this.displayWindow.innerHTML = "";
			const text = this.editWindow.value;
			const lines = text.split(/\r?\n|\r/);
			for (let line of lines){
				const span = document.createElement("span");
				span.textContent = line ;
				this.displayWindow.append(span);
			}
		}
		this.lineToHighlight = 1;
		
	}

}
